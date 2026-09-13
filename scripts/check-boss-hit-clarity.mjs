import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4367));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-hit-clarity-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
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
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
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
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  if (message.type() === 'error' || message.type() === 'warning') consoleWarningsOrErrors.push(message.text());
});

try {
  mkdirSync(outputDir, { recursive: true });
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
    startAtBoss: '1',
    startLevel: '2'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.wave?.state === 'BOSS_ACTIVE';
  }, { timeout: 30000 });

  const results = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    const player = play?.player;
    if (!game || !play || !boss || !player) throw new Error('Missing boss test surface');

    const width = game.getWidth?.() || 1280;
    const height = game.getHeight?.() || 720;
    boss.x = width / 2;
    boss.y = Math.max(120, boss.y || 120);
    if (boss.sprite) {
      boss.sprite.x = boss.x;
      boss.sprite.y = boss.y;
    }
    player.x = width / 2;
    player.y = height * 0.8;
    player.invulnerable = true;
    player.invulnerableTime = 12000;

    const runCase = (name, laneWidth, details) => {
      play.bossHazards = [];
      boss.safeLanes = [{
        kind: 'aimed-edges',
        width: laneWidth,
        angle: Math.PI / 2,
        label: 'TEST WARNING'
      }];
      const hazard = play.registerBossHazardFromBoss(boss, details.category || 'regular', {
        ...details,
        playerX: player.x,
        playerY: player.y
      });
      return {
        name,
        laneWidth,
        hazard: hazard ? {
          kind: hazard.kind,
          type: hazard.type,
          attack: hazard.attack,
          spread: hazard.spread,
          radius: hazard.radius
        } : null,
        ok: Boolean(hazard) && Number(hazard.spread) <= laneWidth + 0.0001
      };
    };

    return [
      runCase('regular-fan-level2', 0.3, { category: 'regular', type: 'fan', attack: 'fan' }),
      runCase('regular-sniper-beam', 0.07, { category: 'regular', type: 'aim', attack: 'sniper' }),
      runCase('signature-cone-wide-warning', 0.64, { category: 'signature', type: 'cone' }),
      runCase('signature-lance-wide-warning', 0.16, { category: 'signature', type: 'lance' })
    ];
  });

  const failures = results.filter((item) => !item.ok);
  const report = {
    ok: failures.length === 0 && pageErrors.length === 0 && consoleWarningsOrErrors.length === 0,
    baseUrl,
    results,
    failures,
    pageErrors,
    consoleWarningsOrErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[boss-hit-clarity] ${JSON.stringify(failures)}`);
  console.log(`[boss-hit-clarity] PASS ${results.map((item) => `${item.name}:${item.hazard?.spread}`).join(' ')} report=${path.join(outputDir, 'report.json')}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
