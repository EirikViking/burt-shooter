import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4524));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/ace-bounties-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No available Ace Bounty port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite preview did not become ready at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForEnemy(page) {
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.enemies?.some((enemy) => enemy?.kind === 'enemy'), null, { timeout: 90000 });
}

async function promoteAce(page, variantId, { targetWaveIndex = 0, x = null, y = null } = {}) {
  return page.evaluate(({ variantId: id, targetWaveIndex: wave, x: targetX, y: targetY }) => {
    const play = window.__game?.scenes?.play;
    const enemy = play?.enemyManager?.enemies?.find((entry) => entry?.kind === 'enemy' && !entry.isAce && entry.active !== false);
    if (!play || !enemy) return { ok: false, reason: 'missing_play_or_enemy' };
    play.prepareAceBountyForSector(window.__game.level || 1, { force: true, variantId: id, targetWaveIndex: wave, reason: 'runtime_test' });
    if (play.player) play.player.shootCooldown = 999999;
    const base = { health: enemy.health, maxHealth: enemy.maxHealth, scoreValue: enemy.scoreValue };
    const promoted = play.maybePromoteAceEnemy(enemy, { sector: window.__game.level || 1, waveIndex: wave, slotIndex: 0, count: 1 });
    if (Number.isFinite(targetX)) {
      enemy.x = targetX;
      enemy.formationX = targetX;
      enemy.sprite.x = targetX;
    }
    if (Number.isFinite(targetY)) {
      enemy.y = targetY;
      enemy.formationY = targetY;
      enemy.sprite.y = targetY;
    }
    enemy.state = 'FORMATION';
    enemy.tacticalDiveAt = null;
    enemy.tacticalDiveUsed = true;
    enemy.waitingForEntry = false;
    enemy.active = true;
    enemy.sprite.visible = true;
    enemy.sprite.renderable = true;
    enemy.updateThreatFrame?.(Date.now());
    const bounds = enemy.aceLabel?.getBounds?.();
    window.__aceRuntimeEnemy = enemy;
    return {
      ok: promoted,
      base,
      ace: structuredClone(enemy.getAceDebugState?.()),
      encounter: structuredClone(play.getAceBountyDebugState?.()),
      threatFrame: structuredClone(enemy.threatFrameLayer?._debugThreatFrame || null),
      labelBounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null
    };
  }, { variantId, targetWaveIndex, x, y });
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const failures = [];
const report = { ok: false, baseUrl, outputDir, scenarios: {}, pageErrors, consoleErrors, failures };
try {
  await page.goto(`${baseUrl}?autostart=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player && window.__game?.scenes?.play?.enemyManager, null, { timeout: 90000 });
  await waitForEnemy(page);

  const desktop = await promoteAce(page, 'bulwark_sweep_precision', { x: 960, y: 310 });
  desktop.screenshot = path.join(outputDir, 'ace-bounty-1920x1080.png');
  await page.screenshot({ path: desktop.screenshot, fullPage: true });
  report.scenarios.desktop = desktop;
  if (!desktop.ok || desktop.encounter?.availableVariants !== 1000) failures.push(`desktop Ace state missing: ${JSON.stringify(desktop)}`);
  if (desktop.ace?.id !== 'bulwark_sweep_precision' || desktop.ace?.rewardId !== 'shield') failures.push(`desktop Ace identity mismatch: ${JSON.stringify(desktop.ace)}`);
  if (desktop.ace?.maxHealth <= desktop.base?.maxHealth) failures.push(`Ace health did not increase: ${JSON.stringify(desktop)}`);
  if (desktop.base?.scoreValue !== (await page.evaluate(() => window.__game?.scenes?.play?.enemyManager?.enemies?.find((enemy) => enemy?.isAce)?.scoreValue))) failures.push('Ace promotion changed score value');
  if (desktop.threatFrame?.tier !== 'ace' || desktop.threatFrame?.markerCount !== 7) failures.push(`Ace threat frame mismatch: ${JSON.stringify(desktop.threatFrame)}`);
  if (!/ACE 0001.*SHIELD/.test(desktop.ace?.label || '')) failures.push(`Ace label mismatch: ${desktop.ace?.label}`);
  if (!desktop.labelBounds || desktop.labelBounds.x < 0 || desktop.labelBounds.x + desktop.labelBounds.width > 1920) failures.push(`desktop Ace label outside viewport: ${JSON.stringify(desktop.labelBounds)}`);

  const completion = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const enemy = play.enemyManager.enemies.find((entry) => entry?.isAce && !entry.aceRewardClaimed);
    if (!enemy) throw new Error('promoted Ace missing before completion');
    const killed = enemy.takeDamage(99999);
    play.onEnemyKilled(enemy);
    const duplicate = play.completeAceBounty(enemy);
    return {
      killed,
      duplicate,
      state: structuredClone(play.getAceBountyDebugState()),
      rewardSpawned: play.powerupManager?.powerups?.some((powerup) => powerup.type === 'shield' && powerup.active !== false)
    };
  });
  report.scenarios.completion = completion;
  if (!completion.killed || completion.state?.completedCount !== 1) failures.push(`Ace completion missing: ${JSON.stringify(completion)}`);
  if (!completion.rewardSpawned) failures.push('Ace shield bounty did not spawn');
  if (completion.duplicate !== null || completion.state?.history?.length !== 1) failures.push(`Ace bounty claimed more than once: ${JSON.stringify(completion)}`);

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.tacticalDraftRescansRemaining = 0;
    const enemy = play.enemyManager.enemies.find((entry) => entry?.kind === 'enemy' && !entry.isAce && entry.active !== false);
    if (!enemy) throw new Error('missing second enemy for rescan bounty');
    enemy.applyAceBounty('bulwark_sweep_suppressor');
    enemy.takeDamage(99999);
    play.onEnemyKilled(enemy);
  });
  const rescan = await page.evaluate(() => ({
    remaining: window.__game.scenes.play.tacticalDraftRescansRemaining,
    state: structuredClone(window.__game.scenes.play.getAceBountyDebugState())
  }));
  report.scenarios.rescan = rescan;
  if (rescan.remaining !== 1 || rescan.state?.lastCompletion?.rewardId !== 'rescan') failures.push(`Ace rescan bounty mismatch: ${JSON.stringify(rescan)}`);

  await page.setViewportSize({ width: 840, height: 640 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('de'));
  await page.waitForTimeout(120);
  const localized = await promoteAce(page, 'phantom_ambush_suppressor', { x: 420, y: 300 });
  localized.screenshot = path.join(outputDir, 'ace-bounty-840x640-de.png');
  await page.screenshot({ path: localized.screenshot, fullPage: true });
  report.scenarios.localized = localized;
  if (!localized.ok || !/ASS 1000/.test(localized.ace?.label || '')) failures.push(`German Ace label mismatch: ${localized.ace?.label}`);
  if (/ACE|BOUNTY|REWARD/.test(localized.ace?.label || '')) failures.push(`German Ace label retained English copy: ${localized.ace?.label}`);
  if (!localized.labelBounds || localized.labelBounds.x < 0 || localized.labelBounds.x + localized.labelBounds.width > 840 || localized.labelBounds.y < 0) failures.push(`compact localized Ace label outside viewport: ${JSON.stringify(localized.labelBounds)}`);

  const textState = await readState(page);
  report.scenarios.textState = {
    aceBounties: textState.aceBounties,
    visibleAce: textState.visibleEnemies?.find((enemy) => enemy.ace)?.ace || null
  };
  if (textState.aceBounties?.availableVariants !== 1000) failures.push(`render_game_to_text missing Ace catalog: ${JSON.stringify(textState.aceBounties)}`);
  if (!textState.visibleEnemies?.some((enemy) => enemy.ace?.number === 1000)) failures.push('render_game_to_text missing visible Ace identity');

  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);
  report.ok = failures.length === 0;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) throw new Error(`[ace-bounty-runtime] ${failures.join('; ')}`);
  console.log(`[ace-bounty-runtime] PASS output=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
