import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4362));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-animation-${timestamp()}`);
const levelsToCheck = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function span(values) {
  const numbers = values.filter((value) => Number.isFinite(value));
  if (numbers.length === 0) return 0;
  return Math.max(...numbers) - Math.min(...numbers);
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

const results = [];

try {
  for (const level of levelsToCheck) {
    await page.goto(withQuery(baseUrl, {
      autostart: '1',
      debugBossToken: 'NOVA_DEBUG_2026',
      startAtBoss: '1',
      startLevel: String(level)
    }), { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state?.scene === 'play' && state?.wave?.state === 'BOSS_ACTIVE';
    }, { timeout: 30000 });

    const data = await page.evaluate(() => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const boss = play?.enemyManager?.boss;
      const player = play?.player;
      if (!boss || !player) return { ok: false, reason: 'missing_boss_or_player' };

      boss.entryStartMs = Date.now() - boss.entryDurationMs - 1;
      boss.phase = 3;
      boss.applyPhasePlan?.(3);
      boss.telegraph = {
        type: boss.getSignatureForPhase?.(3) || 'ring',
        label: 'ANIMATION CHECK',
        start: Date.now(),
        duration: 5000
      };
      player.invulnerable = true;
      player.invulnerableTime = 20000;

      const samples = [];
      for (let i = 0; i < 180; i += 1) {
        player.x = game.getWidth() * (0.2 + 0.6 * ((Math.sin(i * 0.04) + 1) / 2));
        player.y = game.getHeight() * 0.82;
        boss.update(2, player.x, player.y);
        if (i % 8 === 0) {
          const node = boss.animationRig?.weaponNodes?.[0] || null;
          samples.push({
            debug: boss.getAnimationDebugState?.() || null,
            scaleX: boss.visualContainer?.scale?.x || 0,
            scaleY: boss.visualContainer?.scale?.y || 0,
            skewX: boss.visualContainer?.skew?.x || 0,
            leftFin: boss.animationRig?.leftFin?.rotation || 0,
            nodeX: node?.x || 0,
            nodeY: node?.y || 0,
            nodeScale: node?.scale?.x || 0
          });
        }
      }

      const state = JSON.parse(window.render_game_to_text());
      const bossState = state.visibleEnemies?.find((enemy) => enemy.kind === 'boss') || null;
      return {
        ok: true,
        level: game.level,
        archetype: boss.profile?.archetype || null,
        movement: boss.moveProfile?.profile || null,
        telemetry: bossState?.bossAnimation || null,
        samples
      };
    });

    const bodyPulseSpan = span(data.samples.map((sample) => sample.debug?.bodyPulse));
    const finSpan = span(data.samples.map((sample) => sample.leftFin));
    const exhaustSpan = span(data.samples.map((sample) => sample.debug?.exhaust));
    const nodeXSpan = span(data.samples.map((sample) => sample.nodeX));
    const nodeYSpan = span(data.samples.map((sample) => sample.nodeY));
    const scaleSpan = span(data.samples.map((sample) => sample.scaleX));
    results.push({
      level,
      archetype: data.archetype,
      movement: data.movement,
      telemetry: data.telemetry,
      nodeCount: data.samples[0]?.debug?.nodeCount || 0,
      bodyPulseSpan: Number(bodyPulseSpan.toFixed(4)),
      finSpan: Number(finSpan.toFixed(4)),
      exhaustSpan: Number(exhaustSpan.toFixed(4)),
      nodeXSpan: Math.round(nodeXSpan),
      nodeYSpan: Math.round(nodeYSpan),
      scaleSpan: Number(scaleSpan.toFixed(4)),
      ok: data.ok &&
        data.telemetry &&
        (data.samples[0]?.debug?.nodeCount || 0) >= 3 &&
        bodyPulseSpan >= 0.005 &&
        finSpan >= 0.055 &&
        exhaustSpan >= 0.055 &&
        nodeXSpan >= 10 &&
        nodeYSpan >= 6 &&
        scaleSpan >= 0.001
    });
  }

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'boss-animation-level10.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const uniqueArchetypes = new Set(results.map((result) => result.archetype).filter(Boolean));
  const report = {
    ok: results.every((result) => result.ok) &&
      uniqueArchetypes.size >= 10 &&
      pageErrors.length === 0 &&
      consoleWarningsOrErrors.length === 0,
    baseUrl,
    uniqueArchetypes: [...uniqueArchetypes],
    results,
    pageErrors,
    consoleWarningsOrErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[boss-animation] PASS archetypes=${uniqueArchetypes.size} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
