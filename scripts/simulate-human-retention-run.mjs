import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = Number(process.env.CHECK_PORT) || await findPort(4580);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/human-retention-run-${stamp()}`);
const targetSector = Math.max(3, Number(process.env.TARGET_SECTOR) || 3);

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function findPort(start) {
  for (let portNumber = start; portNumber < start + 30; portNumber += 1) {
    const free = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(portNumber, host);
    });
    if (free) return portNumber;
  }
  throw new Error('No human-retention simulation port available');
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find(existsSync);
}

async function canFetch(url) {
  try { return (await fetch(url, { cache: 'no-store' })).ok; } catch { return false; }
}

async function startPreview() {
  if (await canFetch(baseUrl)) return null;
  const server = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  const started = Date.now();
  while (Date.now() - started < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error('Preview did not start');
}

async function state(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreview();
const browser = await chromium.launch({ headless: true, executablePath: chromePath(), args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
const report = { ok: false, baseUrl, targetSector, startedAt: new Date().toISOString(), samples: [], draftScreenshots: [] };

try {
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.debugInvincible = true;
    play.player.grantInvulnerability(600000, 'human_retention_simulation');
  });

  const startedAt = Date.now();
  let direction = 1;
  let lastDraftCount = 0;
  let lastSampleAt = 0;
  while (Date.now() - startedAt < 180000) {
    const current = await state(page);
    if (current.scene === 'gameOver') throw new Error(`simulation reached Game Over in sector ${current.arcadeRun?.currentSector}`);
    if ((current.arcadeRun?.currentSector || 1) >= targetSector && (current.tacticalDraft?.history?.length || 0) >= targetSector - 1) break;

    if (current.tacticalDraft?.active) {
      await page.keyboard.up('Space').catch(() => {});
      await page.keyboard.up('ArrowLeft').catch(() => {});
      await page.keyboard.up('ArrowRight').catch(() => {});
      if (current.tacticalDraft.history.length === lastDraftCount) {
        const screenshot = path.join(outputDir, `draft-sector-${current.tacticalDraft.sectorCleared}.png`);
        await page.screenshot({ path: screenshot });
        report.draftScreenshots.push(screenshot);
        await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true, null, { timeout: 5000 });
        const preferred = current.tacticalDraft.offers.findIndex((offer) => offer.category === (current.lives <= 1 ? 'defense' : 'offense'));
        const target = preferred >= 0 ? preferred : 1;
        while ((await state(page)).tacticalDraft.focusIndex !== target) {
          const focus = (await state(page)).tacticalDraft.focusIndex;
          await page.keyboard.press(focus < target ? 'ArrowRight' : 'ArrowLeft');
          await page.waitForTimeout(90);
        }
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 5000 });
        lastDraftCount += 1;
      }
      continue;
    }

    await page.keyboard.down('Space');
    const pilot = await page.evaluate(() => {
      const game = window.__game;
      const play = game.scenes.play;
      const player = play.player;
      player.grantInvulnerability(600000, 'human_retention_simulation');
      const targets = (play.enemyManager?.enemies || [])
        .filter((enemy) => enemy?.active !== false && !enemy.waitingForEntry && Number.isFinite(enemy.x))
        .sort((a, b) => {
          if (a.kind === 'boss' && b.kind !== 'boss') return -1;
          if (b.kind === 'boss' && a.kind !== 'boss') return 1;
          return (Number(b.y) || 0) - (Number(a.y) || 0);
        });
      return { playerX: player.x, targetX: targets[0]?.x ?? null };
    });
    const deltaX = pilot.targetX === null ? direction * 120 : pilot.targetX - pilot.playerX;
    const movementKey = Math.abs(deltaX) <= 34 ? null : deltaX > 0 ? 'ArrowRight' : 'ArrowLeft';
    if (movementKey) await page.keyboard.down(movementKey);
    await page.waitForTimeout(360);
    if (movementKey) await page.keyboard.up(movementKey);
    if (pilot.targetX === null) direction *= -1;
    if ((Date.now() - startedAt) % 7000 < 900) {
      await page.keyboard.press('ShiftLeft').catch(() => {});
    }
    if (Date.now() - lastSampleAt > 2500) {
      const sample = await state(page);
      report.samples.push({
        elapsedMs: Date.now() - startedAt,
        sector: sample.arcadeRun?.currentSector,
        wave: sample.wave?.currentWaveNumber,
        phase: sample.wave?.phase,
        enemies: sample.wave?.activeEnemies,
        bullets: sample.arcadeRun?.currentEnemyBulletCount,
        score: sample.score,
        draftCount: sample.tacticalDraft?.history?.length || 0,
        selectedIds: sample.tacticalDraft?.selectedIds || []
      });
      lastSampleAt = Date.now();
    }
  }
  await page.keyboard.up('Space').catch(() => {});
  const finalState = await state(page);
  const finalScreenshot = path.join(outputDir, 'sector-three-live-run.png');
  await page.screenshot({ path: finalScreenshot });
  assert(finalState.arcadeRun?.currentSector >= targetSector, `only reached sector ${finalState.arcadeRun?.currentSector}`);
  assert(finalState.tacticalDraft?.history?.length >= targetSector - 1, `only completed ${finalState.tacticalDraft?.history?.length || 0} drafts`);
  assert(finalState.tacticalDraft?.selectedIds?.length >= targetSector - 1, 'selected augments did not persist through real sectors');
  assert(errors.length === 0, errors.join(' | '));
  report.ok = true;
  report.durationMs = Date.now() - startedAt;
  report.finalScreenshot = finalScreenshot;
  report.final = {
    sector: finalState.arcadeRun.currentSector,
    score: finalState.score,
    lives: finalState.lives,
    wave: finalState.wave,
    draft: finalState.tacticalDraft
  };
  report.errors = errors;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[human-retention-run] PASS sector=${report.final.sector} drafts=${report.final.draft.history.length} durationMs=${report.durationMs} report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  report.error = error.stack || error.message;
  report.errors = errors;
  writeFileSync(path.join(outputDir, 'failure-report.json'), JSON.stringify(report, null, 2));
  console.error(`[human-retention-run] FAIL ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  if (server) server.kill();
}
