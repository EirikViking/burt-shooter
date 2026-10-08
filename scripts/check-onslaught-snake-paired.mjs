import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ShipData } from '../src/config/ShipData.js';

const out = process.env.CHECK_OUTPUT_DIR;
const phase = process.env.CHECK_PHASE;
if (!out?.toLowerCase().startsWith('e:') || !['baseline', 'candidate'].includes(phase)) throw new Error('Set E: CHECK_OUTPUT_DIR and CHECK_PHASE');
fs.mkdirSync(out, { recursive: true });
const cases = [
  { hull: 'nova_ship_01', snake: 'space_snake_cinder', augments: ['damage_up', 'blink_drive', 'shield'] },
  { hull: 'nova_ship_15', snake: 'space_snake_widow', augments: ['rapid_fire', 'ghost', 'drones'] },
  { hull: 'nova_ship_30', snake: 'space_snake_grave', augments: ['damage_up', 'rapid_fire', 'impact_foam'] }
];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { phase, cases: [], syntheticFixture: true, productionUpload: false, note: 'Same ship/build/sector/snake and keyboard pursuit across phases; staged encounter, not ordinary progression.' };
try {
  for (const [index, scenario] of cases.entries()) {
    if (process.env.CHECK_CASE_INDEX != null && Number(process.env.CHECK_CASE_INDEX) !== index) continue;
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/highscores') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return ['localhost', '127.0.0.1'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto((process.env.CHECK_URL || 'http://127.0.0.1:4197') + `/?offlineLeaderboard=1&qaLives=${Math.max(3, Number(process.env.CHECK_LIVES) || 3)}`);
      await page.waitForFunction(() => window.__game?.scenes?.menu?.astraMenuShip?.ready, null, { timeout: 120000 });
      await page.evaluate(() => {
        const ids = Array.from({ length: 30 }, (_, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`);
        localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({ version: 1, unlockTuningVersion: 3, unlockedShipIds: ids }));
      });
      const shipKey = ShipData.find(ship => ship.id === scenario.hull)?.spriteKey;
      assert.ok(shipKey, scenario.hull);
      await page.evaluate(({ shipKey, augments }) => { void window.__game.startGame(shipKey, { runMode: 'overrun_tactical', reuseOnslaughtLoadout: true, onslaughtAugmentIds: augments }); }, { shipKey, augments: scenario.augments });
      await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'WAVE_ACTIVE', null, { timeout: 120000 });
      const staged = await page.evaluate(async snakeId => {
        const game = window.__game, play = game.scenes.play, manager = play.enemyManager;
        const { createRunPolicy } = await import('/src/game/RunPolicy.js');
        game.isDebugRun = true;
        game.runModeReason = 'onslaught_snake_paired_qa';
        game.pendingHighscore = null;
        game.runPolicy = createRunPolicy({ runMode: game.runMode, isDebugRun: true });
        game.gameId = 'onslaught-snake-paired-v1';
        if (game.contentDirector) game.contentDirector.seed = 'onslaught-snake-paired-v1';
        play.externalPauseSuppressedUntil = Number.MAX_SAFE_INTEGER;
        play.setPaused(false);
        play.introActive = false;
        play.introComplete = true;
        manager.clearPendingWaveSpawns();
        manager.enemies.forEach(enemy => enemy.destroy());
        manager.enemies = [];
        play.clearEnemyBullets();
        manager.level = game.level = 51;
        manager.currentWaveIndex = 2;
        manager.phase = 'WAVES';
        manager.state = 'WAVE_ACTIVE';
        manager.waveEnding = false;
        manager.mayhemReinforcementTriggeredWaves?.add(manager.currentWaveIndex);
        play.player.x = play.gameplayGame.getWidth() * .5;
        play.player.y = play.gameplayGame.getHeight() * .85;
        play.player.invulnerable = false;
        play.player.invulnerableTimer = 0;
        const { getSpaceSnakeProfile } = await import('/src/config/SpaceSnakes.js');
        window.__pairedSnake = manager.spawnSpaceSnake(getSpaceSnakeProfile(snakeId));
        game.lives = Math.max(3, Number(new URLSearchParams(location.search).get('qaLives')) || 3);
        // Keep the isolated encounter out of the authored sector wave scheduler.
        manager.phase = 'MARKETING';
        manager.state = 'MARKETING_DEBUG';
        return { runMode: game.runMode, shipId: game.selectedShipSpriteKey, augmentIds: game.competitionStart?.augmentIds, snake: snakeId, brood: Boolean(window.__pairedSnake?.brood), routeSeed: window.__pairedSnake?.routeSeed, sections: window.__pairedSnake?.sections.length, activeSections: window.__pairedSnake?.sections.filter(section => section.active).length, objectiveCount: manager.getObjectiveEnemyCount(), lives: game.lives };
      }, scenario.snake);
      assert.ok(staged.routeSeed, 'Snake spawned');
      assert.equal(staged.runMode, 'overrun_tactical', 'Onslaught mode remains active in isolated fixture');
      assert.equal(staged.shipId, shipKey, 'Isolated fixture uses requested hull');
      const start = Date.now();
      let moving = null, engagedAt = null, last = null, shotCycles = 0, minLiveSections = staged.sections;
      let lastTargetX = null, lastTargetAt = null;
      await page.keyboard.down('Space');
      while (Date.now() - start < 85000) {
        const state = await page.evaluate(() => {
          const game = window.__game, chain = window.__pairedSnake;
          if (!game || !chain) return { live: null, missingGame: !game, missingChain: !chain };
          const play = game.scenes.play;
          const live = chain.sections.filter(section => section.active);
          const target = live.filter(section => section.y > 0).sort((a, b) => Math.abs(a.x - play.player.x) - Math.abs(b.x - play.player.x))[0];
          return { live: live.length, age: chain.age, x: play.player.x, targetX: target?.x, targetY: target?.y, playerY: play.player.y, lives: game.lives, score: game.score, shots: chain.shots || 0, defeat: play.lastSpaceSnakeDefeat || null, playing: game.currentScene === play, managerState: play.enemyManager.state, managerPhase: play.enemyManager.phase, objectiveCount: play.enemyManager.getObjectiveEnemyCount(), waveEnding: play.enemyManager.waveEnding };
        });
        last = state;
        if (state.live > 0) minLiveSections = Math.min(minLiveSections, state.live);
        if (engagedAt == null && state.age >= 3) engagedAt = Date.now();
        shotCycles = Math.max(shotCycles, state.shots);
        if (!state.live || !state.playing) break;
        const now = Date.now();
        const targetVelocity = Number.isFinite(lastTargetX) && lastTargetAt && now > lastTargetAt
          ? Math.max(-330, Math.min(330, (state.targetX - lastTargetX) * 1000 / (now - lastTargetAt))) : 0;
        const projectileTravelSeconds = Math.max(0, (state.playerY - state.targetY) / 780);
        const predictedX = state.targetX + targetVelocity * projectileTravelSeconds;
        lastTargetX = state.targetX;
        lastTargetAt = now;
        const dx = Number.isFinite(predictedX) ? predictedX - state.x : 0;
        const next = Math.abs(dx) < 22 ? null : dx > 0 ? 'ArrowRight' : 'ArrowLeft';
        if (next !== moving) {
          if (moving) await page.keyboard.up(moving);
          if (next) await page.keyboard.down(next);
          moving = next;
        }
        await page.waitForTimeout(150);
      }
      await page.keyboard.up('Space');
      if (moving) await page.keyboard.up(moving);
      const row = { ...scenario, ...staged, durationSeconds: Number(((Date.now() - (engagedAt || start)) / 1000).toFixed(2)), totalSeconds: Number(((Date.now() - start) / 1000).toFixed(2)), completed: last?.live === 0 && Boolean(last?.defeat?.bounty), livesLost: Math.max(0, staged.lives - (last?.lives || 0)), shotCycles, minLiveSections, remainingSections: last?.live, defeatReward: last?.defeat?.bounty || 0, last, errors };
      report.cases.push(row);
      await page.screenshot({ path: path.join(out, `${phase}-${index + 1}-${scenario.snake}.png`) });
      console.log(`${phase} ${scenario.hull} ${scenario.snake}: ${row.durationSeconds}s ${row.completed ? 'clear' : 'failed'} livesLost=${row.livesLost} cycles=${shotCycles}`);
    } finally {
      fs.writeFileSync(path.join(out, `${phase}-report.json`), JSON.stringify(report, null, 2));
      await context.close();
    }
  }
} finally {
  await browser.close();
}
