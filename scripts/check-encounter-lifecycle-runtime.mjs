import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, _electron } from 'playwright';
import { SPACE_SNAKES } from '../src/config/SpaceSnakes.js';
import { CABINET_WONDER_CATALOG } from '../src/game/CabinetWonders.js';

const out = path.resolve(process.env.CHECK_OUTPUT_DIR || 'E:/Codex/tmp/nova-early-encounters-20260914/runtime');
fs.mkdirSync(out, { recursive: true });
const packaged = process.env.NOVA_SWARM_PACKAGED_EXE;
const app = packaged ? await _electron.launch({ executablePath: packaged,
  args: ['--windowed', '--nova-fresh-profile'], env: { ...process.env, TEMP: out, TMP: out,
    NOVA_SWARM_USER_DATA_DIR: path.join(out, 'profile'), NOVA_SWARM_DISABLE_STEAMWORKS: '1' }, timeout: 120000 })
  : await chromium.launch({ channel: 'chrome', headless: true });
const report = { packaged: packaged || null, cases: [] }, logs = [];
try {
  const page = packaged ? await app.firstWindow() : await app.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', message => logs.push(message.text()));
  page.on('pageerror', error => logs.push(`PAGEERROR ${error.message}`));
  if (!packaged) await page.goto(process.env.CHECK_URL || 'http://127.0.0.1:5194', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.scenes?.menu?.astraMenuShip?.ready, null, { timeout: 120000 });
  await page.evaluate(() => { const g = window.__game; return g.startGame(g.scenes.menu.getQuickStartShipKey(), { runMode: 'ranked_tactical' }); });
  await page.waitForFunction(() => window.__game?.scenes.play?.enemyManager?.waves?.length > 0, null, { timeout: 120000 });
  report.fresh = await page.evaluate(() => { const g = window.__game, m = g.scenes.play.enemyManager;
    g.app.ticker.stop(); return { sector: g.level, managerSector: m.level, mystery: m.mysteryDirector.plan.selected, test: g.encounterTest }; });
  assert.equal(report.fresh.sector, 1); assert.equal(report.fresh.managerSector, 1); assert.equal(report.fresh.mystery, false);
  assert.equal(report.fresh.test, null);

  // The ordinary planners still run. Admission checks must also reject a
  // stale late-sector request and each locked species at the spawn boundary.
  report.admission = await page.evaluate(({ snakes, wonder }) => {
    const g = window.__game, p = g.scenes.play, m = p.enemyManager;
    const results = [];
    for (const sector of [1, 2, 3, 5, 6, 10, 11, 30]) {
      g.level = sector; m.startLevel(sector); m.clearEnemies();
      const blockedSnakes = snakes.filter(s => sector < 6 || s.unlockLevel > sector);
      const rejected = blockedSnakes.every(s => m.spawnSpaceSnake(s) === null);
      const d = m.mysteryDirector;
      d.plan = { selected: true, sector, id: 'glass_widow', direct: false };
      const mysteryEligible = d.isCurrentPlan();
      const staleWonder = p.beginCabinetWonderOpportunity({ sector: 60, waveNumber: 2, variant: wonder, reason: 'sector_cadence' });
      results.push({ sector, rejected, lockedSpecies: blockedSnakes.length, mysteryEligible, staleWonder });
    }
    g.level = m.level = 6;
    const snake = m.spawnSpaceSnake(snakes[0]);
    const allowedSnake = Boolean(snake?.sections.length); m.clearEnemies();
    return { results, allowedSnake };
  }, { snakes: SPACE_SNAKES, wonder: CABINET_WONDER_CATALOG[0] });
  for (const r of report.admission.results) {
    assert.ok(r.rejected, `locked snakes rejected at ${r.sector}`);
    assert.equal(r.mysteryEligible, r.sector >= 11, `Veilborn gate at ${r.sector}`);
    assert.equal(r.staleWonder, false, `stale Wonder rejected at ${r.sector}`);
  }
  assert.ok(report.admission.allowedSnake, 'unlocked snake still spawns');

  for (const sector of [30, 51]) {
    // Reproduce the relevant Sector Run / Overrun exit with pending real wave
    // timers, then start a normal run through Game.startGame.
    const result = await page.evaluate(async sector => {
      const g = window.__game, p = g.scenes.play, old = p.enemyManager;
      g.level = sector; old.startLevel(sector);
      old.clearEnemies();
      // A concurrent ordinary formation bypasses the encounter lottery but
      // uses the actual delayed spawn queue. Always leave with work pending.
      old.spawnWave({ ...old.waves.find(w => !w.isChallenge), count: 32, allowConcurrentSpawn: true, skipMystery: true });
      const before = { pending: old.waveSpawnPendingCount, serial: old.waveSpawnSerial };
      window.__retiredEncounterManager = old;
      g.switchScene('menu');
      const afterExit = { pending: old.waveSpawnPendingCount, disposed: old.disposed, enemies: old.enemies.length, serial: old.waveSpawnSerial };
      await g.startGame(g.scenes.menu.getQuickStartShipKey(), { runMode: 'ranked_tactical' });
      const rejected = old.spawnWave({ type: 'BOSS' });
      return { sector, before, afterExit, rejected: rejected === undefined, currentSector: g.level };
    }, sector);
    await page.waitForTimeout(1500);
    result.afterWait = await page.evaluate(() => { const m = window.__retiredEncounterManager;
      return { enemies: m.enemies.length, pending: m.waveSpawnPendingCount, current: m.isCurrentRun() }; });
    report.cases.push(result);
    assert.ok(result.before.pending > 0, 'exercise a live delayed spawn queue');
    assert.equal(result.afterExit.disposed, true); assert.equal(result.afterExit.pending, 0);
    assert.equal(result.afterExit.enemies, 0); assert.ok(result.afterExit.serial > result.before.serial);
    assert.deepEqual(result.afterWait, { enemies: 0, pending: 0, current: false });
    assert.equal(result.currentSector, 1);
  }
  await page.screenshot({ path: path.join(out, 'restart.png') });
  report.passed = true;
  console.log('PASS fresh launch, sector gates, locked species, and delayed-spawn retirement from sectors 30/51');
} finally {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(out, 'console.log'), logs.join('\n'));
  await app.close();
}
