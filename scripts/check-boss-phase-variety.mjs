import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4335));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-phase-variety-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
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

function bossFrom(state) {
  return state?.visibleEnemies?.find((enemy) => enemy.kind === 'boss') || null;
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const results = [];

try {
  for (const level of levelsToCheck) {
    await page.goto(withQuery(baseUrl, {
      autostart: '1',
      controlSmoke: '1',
      debugBossToken: 'NOVA_DEBUG_2026',
      'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
      startAtBoss: '1',
      startLevel: String(level)
    }), { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForFunction((expectedLevel) => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      const play = window.__game?.scenes?.play;
      return state?.scene === 'play' && play?.enemyManager && play?._lastStartedLevel === expectedLevel;
    }, level, { timeout: 30000 });

    await page.evaluate(async (expectedLevel) => {
      const play = window.__game?.scenes?.play;
      if (!play?.enemyManager || play.enemyManager.state === 'BOSS_ACTIVE') return;
      play.clearPendingEnemyStart?.();
      play.enemyManager.forceBossStart?.(expectedLevel);
      await play.enemyManager.spawnBoss?.(expectedLevel);
      play.enemyManager.state = 'BOSS_ACTIVE';
      play.enemyManager.bossSpawning = false;
    }, level);

    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      const boss = window.__game?.scenes?.play?.enemyManager?.boss;
      return state?.scene === 'play' && state?.wave?.state === 'BOSS_ACTIVE' && Boolean(boss?.active);
    }, null, { timeout: 30000 });

    const phaseData = await page.evaluate(() => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const boss = play?.enemyManager?.boss;
      const player = play?.player;
      if (!boss || !player) return { ok: false, reason: 'missing_boss_or_player' };

      player.x = game.getWidth() / 2;
      player.y = game.getHeight() * 0.82;
      player.invulnerable = true;
      player.invulnerableTime = 15000;

      const before = JSON.parse(window.render_game_to_text());
      boss.health = boss.maxHealth * 0.74;
      boss.update(1, player.x, player.y);
      const phase2 = JSON.parse(window.render_game_to_text());
      boss.cancelAttackWarning?.('phase_variety_fixture');
      boss.health = boss.maxHealth * 0.39;
      boss.update(1, player.x, player.y);
      const phase3 = JSON.parse(window.render_game_to_text());
      return { ok: true, before, phase2, phase3 };
    });

    const beforeBoss = bossFrom(phaseData.before);
    const phase2Boss = bossFrom(phaseData.phase2);
    const phase3Boss = bossFrom(phaseData.phase3);
    const result = {
      level,
      archetype: phase3Boss?.bossArchetype || beforeBoss?.bossArchetype || null,
      movement: phase3Boss?.bossMovement || beforeBoss?.bossMovement || null,
      baseSignature: beforeBoss?.bossSignature || null,
      phase2Signature: phase2Boss?.bossSignature || phase2Boss?.telegraph?.type || null,
      phase3Signature: phase3Boss?.bossSignature || phase3Boss?.telegraph?.type || null,
      phase2SafeLanes: phase2Boss?.safeLanes || [],
      phase3SafeLanes: phase3Boss?.safeLanes || [],
      phase3Shift: phase3Boss?.phaseShift || null,
      ok: Boolean(
        beforeBoss &&
        phase2Boss?.phase === 2 &&
        phase3Boss?.phase === 3 &&
        phase2Boss?.telegraph &&
        phase3Boss?.telegraph &&
        (phase2Boss?.safeLanes || []).length > 0 &&
        (phase3Boss?.safeLanes || []).length > 0 &&
        Math.abs(phase3Boss?.phaseShift?.targetAnchorOffset || 0) > 0
      )
    };
    results.push(result);
  }

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'boss-phase-variety-level10.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const uniquePhase3Signatures = new Set(results.map((result) => result.phase3Signature).filter(Boolean));
  const uniqueArchetypes = new Set(results.map((result) => result.archetype).filter(Boolean));
  const report = {
    ok: results.every((result) => result.ok) &&
      uniqueArchetypes.size >= 10 &&
      uniquePhase3Signatures.size >= 4 &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0,
    baseUrl,
    uniqueArchetypes: uniqueArchetypes.size,
    uniquePhase3Signatures: [...uniquePhase3Signatures],
    results,
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[boss-phase-variety] PASS archetypes=${uniqueArchetypes.size} phase3Signatures=${uniquePhase3Signatures.size} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
