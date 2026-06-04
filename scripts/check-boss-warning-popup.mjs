import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4396));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-warning-popup-${timestamp()}`);
const funnyCaptions = [
  'Mission Control is hiding under the desk.',
  'The boss brought paperwork. This is not a drill.',
  'Please stop the boss before it invoices us.',
  'Cabinet says this is fine. Cabinet is lying.',
  'Warning: enormous problem with excellent lighting.'
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
  return next.toString();
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available check port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (fs.existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => fs.existsSync(candidate));
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleWarningsOrErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() !== 'error' && message.type() !== 'warning') return;
  const text = message.text();
  if (/Service worker script missing or invalid/i.test(text)) return;
  consoleWarningsOrErrors.push(text);
});

try {
  fs.mkdirSync(outputDir, { recursive: true });
  await page.addInitScript(() => {
    localStorage.setItem('novaSwarm.language', 'en');
  });
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startAtBoss: '1',
    startLevel: '1'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && window.__game?.scenes?.play?.uiOverlay;
  }, { timeout: 30000 });

  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (!play?.uiOverlay) throw new Error('Missing play scene overlay');
    for (const child of [...play.uiOverlay.children]) {
      if (child.label === 'ui_boss_dossier') {
        play.uiOverlay.removeChild(child);
        child.destroy?.({ children: true });
      }
    }
    play.showBossTaunt('boss_spawn');
  });

  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    const poster = play?.uiOverlay?.children?.find((child) => child.label === 'ui_boss_dossier');
    return Boolean(poster && poster.alpha > 0.8 && poster.children?.some((child) => child.label === 'boss_warning_emblem'));
  }, { timeout: 10000 });

  await page.waitForTimeout(450);
  const screenshot = path.join(outputDir, 'boss-warning-popup.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const report = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const poster = play?.uiOverlay?.children?.find((child) => child.label === 'ui_boss_dossier');
    const texts = [];
    const allUiTexts = [];
    const visit = (node, target) => {
      if (!node) return;
      if (typeof node.text === 'string') target.push(node.text);
      for (const child of node.children || []) visit(child, target);
    };
    visit(poster, texts);
    visit(play?.uiOverlay, allUiTexts);
    const hasNode = (node, label) => Boolean(node?.label === label || (node?.children || []).some((child) => hasNode(child, label)));
    const findNode = (node, label) => {
      if (!node) return null;
      if (node.label === label) return node;
      for (const child of node.children || []) {
        const found = findNode(child, label);
        if (found) return found;
      }
      return null;
    };
    const bossArt = findNode(poster, 'boss_warning_boss_art');
    return {
      poster: poster ? {
        x: poster.x,
        y: poster.y,
        alpha: poster.alpha,
        childCount: poster.children?.length || 0,
        hasEmblem: hasNode(poster, 'boss_warning_emblem'),
        hasBossArt: hasNode(poster, 'boss_warning_boss_art'),
        bossArtContained: Boolean(bossArt?.mask || bossArt?.__bossWarningMasked || bossArt?.__bossWarningContained),
        bossArtSource: bossArt?.__bossWarningSource || null
      } : null,
      texts,
      allUiTexts
    };
  });

  const hasFunnyCaption = report.texts.some((text) => funnyCaptions.includes(text));
  const forbiddenIntroTexts = report.allUiTexts.filter((text) => /NOVA SPARROW|CLASSIFIED COMBAT VESSEL/i.test(text));
  assert(report.poster, 'boss warning poster missing');
  assert(report.poster.hasEmblem, 'boss warning emblem missing');
  assert(report.poster.hasBossArt === true, 'boss spawn warning should show one clipped boss portrait');
  assert(report.poster.bossArtContained === true, 'boss spawn warning portrait should stay contained inside the dossier frame');
  assert(/\/bosses\/|boss-warning-emblems|cached_boss_warning_art/i.test(report.poster.bossArtSource || ''), `boss warning should use boss portrait or clean emblem art, got ${report.poster.bossArtSource}`);
  assert(report.texts.includes('BOSS INCOMING'), `boss warning title missing: ${report.texts.join(' | ')}`);
  assert(hasFunnyCaption, `funny warning caption missing: ${report.texts.join(' | ')}`);
  assert(Math.abs(report.poster.x - 640) > 130, `boss warning blocks the boss lane at x=${report.poster.x}`);
  assert(report.poster.y > 330, `boss warning is too high and can block boss arrival at y=${report.poster.y}`);
  assert(forbiddenIntroTexts.length === 0, `ship intro text overlaps boss warning: ${forbiddenIntroTexts.join(' | ')}`);
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join('; ')}`);
  assert(consoleWarningsOrErrors.length === 0, `console warnings/errors: ${consoleWarningsOrErrors.join('; ')}`);

  const result = {
    ok: true,
    baseUrl,
    screenshot,
    report,
    pageErrors,
    consoleWarningsOrErrors
  };
  fs.writeFileSync(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(`[boss-warning-popup] PASS outputDir=${outputDir}`);
} catch (error) {
  const result = {
    ok: false,
    baseUrl,
    outputDir,
    pageErrors,
    consoleWarningsOrErrors,
    error: error?.stack || String(error)
  };
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
