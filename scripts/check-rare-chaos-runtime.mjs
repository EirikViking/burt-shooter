import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4540));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/rare-chaos-runtime-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  throw new Error(`No available runtime port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
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
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
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

const report = { baseUrl, outputDir, rowCore: null, rareVisitor: null, phase: null, defeat: null, pageErrors, consoleErrors };
try {
  await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1&debugBossToken=NOVA_DEBUG_2026`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return play?.isReady === true && play?.player && play?.enemyManager && play?.hud;
  }, null, { timeout: 90000 });
  await page.waitForTimeout(900);

  report.rowCore = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.player.invulnerable = true;
    const events = [];
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function patchedRareQaPlay() {
      const track = decodeURIComponent((this.currentSrc || this.src || '').split('/').pop()?.split('?')[0] || '');
      events.push({ bus: (this.currentSrc || this.src || '').includes('/voice/') ? 'voice' : 'sfx', track, at: Date.now() });
      return originalPlay.call(this);
    };
    window.__rareChaosQaAudioEvents = events;
    const start = play.player.triggerRowCore();
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return { start, settings: state.audio || null };
  });
  await page.waitForTimeout(1520);
  report.rowCore.events = await page.evaluate(() => structuredClone(window.__rareChaosQaAudioEvents || []));
  report.rowCore.screenshot = path.join(outputDir, 'row-core-ritual.png');
  await page.screenshot({ path: report.rowCore.screenshot, fullPage: true });
  const rowKeys = report.rowCore.events.filter((entry) => entry.bus === 'sfx').map((entry) => entry.track);
  assert(report.rowCore.start?.started === true, 'Row Core did not start');
  assert(rowKeys.filter((key) => key.includes('nova_row_core_viking_row')).length === 1, `Row Core ritual event count mismatch: ${rowKeys.join(',')}`);
  assert(!rowKeys.some((key) => key.includes('nova_row_core_pickup')), 'Row Core pickup sting still masked the ritual');
  assert(!report.rowCore.events.some((entry) => entry.bus === 'voice' && entry.track.includes('mission_control_powerup')), 'generic powerup voice still overlapped Row Core');
  await page.evaluate(() => {
    const player = window.__game.scenes.play.player;
    player.clearRowCoreTimers();
    player.rowCoreActive = false;
    player.rowCoreStartedAt = 0;
  });

  report.rareVisitor = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.player.invulnerable = true;
    const enemy = play.enemyManager.debugForceRareChaosVisitor(42, 'runtime_qa');
    window.__rareChaosQaEnemy = play.enemyManager.enemies.find((candidate) => candidate?.isRareChaosVisitor && candidate.rareChaosVisitorVariant?.number === 42);
    return { enemy, announcement: structuredClone(play.lastRareChaosVisitorAnnouncement || null) };
  });
  await page.waitForFunction(() => {
    const enemy = window.__rareChaosQaEnemy;
    return enemy?.active === true && enemy?.sprite?.visible === true && enemy?.state === 'FORMATION';
  }, null, { timeout: 12000 });
  await page.waitForFunction(() => {
    const play = window.__game.scenes.play;
    const enemy = window.__rareChaosQaEnemy;
    const liveBullets = (play?.bulletManager?.enemyBullets || []).filter((bullet) => bullet?.active !== false).length;
    return liveBullets > 0 || (enemy?.threatActionExecutionCount || 0) > 0;
  }, null, { timeout: 9000 });
  const live = await page.evaluate(() => {
    const enemy = window.__rareChaosQaEnemy;
    const play = window.__game.scenes.play;
    const bounds = enemy.sprite.getBounds();
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return {
      debug: structuredClone(enemy.getRareChaosVisitorDebugState()),
      bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      aura: Boolean(enemy.rareChaosVisitorVisuals?.aura?.visible),
      crown: Boolean(enemy.rareChaosVisitorVisuals?.crown?.visible),
      label: enemy.rareChaosVisitorVisuals?.label?.text || null,
      audio: state.audio || null,
      textState: state.rareChaosVisitors || null,
      visibleTextEntry: state.visibleEnemies?.find((item) => item.rareChaosVisitor?.number === 42) || null,
      enemyBullets: (play.bulletManager.enemyBullets || []).filter((bullet) => bullet?.active !== false).length,
      threatExecutions: enemy.threatActionExecutionCount || 0
    };
  });
  report.rareVisitor = { ...report.rareVisitor, ...live };
  report.rareVisitor.screenshot = path.join(outputDir, 'rare-chaos-visitor-42.png');
  await page.screenshot({ path: report.rareVisitor.screenshot, fullPage: true });
  assert(live.debug?.number === 42, `wrong rare variant: ${JSON.stringify(live.debug)}`);
  assert(live.debug?.threatAction, 'rare visitor special attack was not armed');
  assert(live.aura && live.crown && /42/.test(live.label || ''), 'rare visitor aura/crown/identity label missing');
  assert(live.bounds.x >= 0 && live.bounds.y >= 0 && live.bounds.x + live.bounds.width <= 1920 && live.bounds.y + live.bounds.height <= 1080, `rare visitor visuals escaped viewport: ${JSON.stringify(live.bounds)}`);
  assert(live.audio.lastVoiceEvent === 'boss_rare_chaos_visitor_warning', `boss warning did not play: ${JSON.stringify(live.audio)}`);
  assert(live.textState?.availableVariants === 99 && live.textState?.waveChance === 0.03, `render text missing rare catalog policy: ${JSON.stringify(live.textState)}`);
  assert(live.visibleTextEntry?.rareChaosVisitor?.number === 42, 'render text missing visible rare visitor identity');
  assert(live.enemyBullets > 0 || live.threatExecutions > 0, `rare visitor never fired: ${JSON.stringify(live)}`);

  report.phase = await page.evaluate(() => {
    const enemy = window.__rareChaosQaEnemy;
    const play = window.__game.scenes.play;
    enemy.takeDamage(enemy.maxHealth * 0.78);
    return {
      debug: structuredClone(enemy.getRareChaosVisitorDebugState()),
      toast: structuredClone(play.getToastDebugState?.() || null),
      audio: JSON.parse(window.render_game_to_text?.() || '{}').audio || null
    };
  });
  await page.waitForTimeout(180);
  report.phase.screenshot = path.join(outputDir, 'rare-chaos-final-tantrum.png');
  await page.screenshot({ path: report.phase.screenshot, fullPage: true });
  assert(report.phase.debug?.phases?.length === 3, `all three armor phases did not trigger: ${JSON.stringify(report.phase.debug)}`);
  assert(report.phase.audio.lastSfxEvent === 'rare_visitor_laser_charge', `final phase audio mismatch: ${JSON.stringify(report.phase.audio)}`);

  report.defeat = await page.evaluate(() => {
    const enemy = window.__rareChaosQaEnemy;
    const play = window.__game.scenes.play;
    const scoreBefore = play.game.score;
    const rewardType = enemy.rareChaosVisitorVariant.rewardPowerupType;
    const destroyed = enemy.takeDamage(enemy.maxHealth + 100);
    play.onEnemyKilled(enemy);
    return {
      destroyed,
      scoreBefore,
      scoreAfter: play.game.score,
      rewardType,
      rewardSpawned: play.powerupManager.powerups.some((powerup) => powerup.type === rewardType && powerup.active !== false),
      defeat: structuredClone(play.lastRareChaosVisitorDefeat || null),
      invulnerable: play.player.invulnerable === true,
      stats: structuredClone(play.enemyManager.rareChaosVisitorStats)
    };
  });
  await page.waitForTimeout(650);
  report.defeat.audio = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}').audio || null);
  report.defeat.screenshot = path.join(outputDir, 'rare-chaos-victory-reward.png');
  await page.screenshot({ path: report.defeat.screenshot, fullPage: true });
  assert(report.defeat.destroyed === true, 'rare visitor did not die');
  assert(report.defeat.scoreAfter > report.defeat.scoreBefore, 'rare visitor did not grant its celebration bonus');
  assert(report.defeat.rewardSpawned, `guaranteed ${report.defeat.rewardType} reward did not spawn`);
  assert(report.defeat.defeat?.number === 42 && report.defeat.stats?.defeated >= 1, `defeat telemetry mismatch: ${JSON.stringify(report.defeat)}`);
  assert(report.defeat.invulnerable, 'rare victory did not grant brief reward invulnerability');
  assert(report.defeat.audio.lastSfxEvent === 'rare_visitor_reward', `reward sting did not play: ${JSON.stringify(report.defeat.audio)}`);
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);

  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[rare-chaos-runtime] PASS row=${rowKeys.join(',')} variant=${live.debug.number} phases=${report.phase.debug.phases.join(',')} reward=${report.defeat.rewardType}`);
  console.log(`[rare-chaos-runtime] screenshots=${outputDir}`);
} catch (error) {
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ ...report, failure: error.message }, null, 2)}\n`);
  throw error;
} finally {
  await browser.close();
  if (server) server.kill();
}
