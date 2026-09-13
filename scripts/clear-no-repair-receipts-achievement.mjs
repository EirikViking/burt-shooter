import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { _electron as electron } from 'playwright';

const TARGET_ID = 'ACH_NO_REPAIR_RECEIPTS';
const ACHIEVEMENT_KEY = 'nova_swarm_achievements_v1';
const QUEUE_KEY = 'nova_swarm_steam_achievement_queue_v1';
const confirmed = process.env.NOVA_SWARM_CONFIRM_CLEAR_NO_REPAIR_RECEIPTS === '1';

if (!confirmed) {
  throw new Error('Set NOVA_SWARM_CONFIRM_CLEAR_NO_REPAIR_RECEIPTS=1 to clear the single approved achievement.');
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve('test-results', `clear-no-repair-receipts-${stamp}`);
fs.mkdirSync(outputDir, { recursive: true });

const app = await electron.launch({
  args: [path.resolve('electron/main.cjs'), '--windowed'],
  cwd: process.cwd(),
  env: {
    ...process.env,
    NOVA_SWARM_STEAM_APP_ID: '4765070',
    STEAM_APP_ID: '4765070'
  },
  timeout: 30000
});

let result;
try {
  const win = await app.firstWindow({ timeout: 30000 });
  await win.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await win.waitForFunction(
    () => Boolean(window.__game?.achievementManager && window.__novaSteamAchievements),
    null,
    { timeout: 30000 }
  );
  await win.waitForTimeout(1200);

  result = await win.evaluate(async ({ targetId, achievementKey, queueKey }) => {
    const steam = window.__novaSteamAchievements;
    const manager = window.__game.achievementManager;
    await steam.requestCurrentStats();

    const beforeSteam = await steam.getUnlockedAchievements();
    const beforeTarget = await steam.getAchievement(targetId);
    const beforeLocal = manager.getUnlocked();
    const beforeStored = JSON.parse(localStorage.getItem(achievementKey) || '{"unlocked":[]}');
    const beforeQueue = JSON.parse(localStorage.getItem(queueKey) || '[]');

    const clear = await steam.clearAchievement(targetId);
    manager.unlockedIds.delete(targetId);
    manager.persist();

    const filteredQueue = Array.isArray(beforeQueue)
      ? beforeQueue.filter((id) => id !== targetId)
      : [];
    localStorage.setItem(queueKey, JSON.stringify(filteredQueue));
    await window.__novaSteamCloudDiagnostics?.sync?.();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const afterSteam = await steam.getUnlockedAchievements();
    const afterTarget = await steam.getAchievement(targetId);
    const afterLocal = manager.getUnlocked();
    const afterStored = JSON.parse(localStorage.getItem(achievementKey) || '{"unlocked":[]}');
    const afterQueue = JSON.parse(localStorage.getItem(queueKey) || '[]');

    return {
      targetId,
      before: {
        steamUnlocked: beforeSteam,
        target: beforeTarget,
        localUnlocked: beforeLocal,
        stored: beforeStored,
        queue: beforeQueue
      },
      clear,
      after: {
        steamUnlocked: afterSteam,
        target: afterTarget,
        localUnlocked: afterLocal,
        stored: afterStored,
        queue: afterQueue
      }
    };
  }, {
    targetId: TARGET_ID,
    achievementKey: ACHIEVEMENT_KEY,
    queueKey: QUEUE_KEY
  });
} finally {
  await app.close().catch(() => {});
}

const beforeOtherSteam = result.before.steamUnlocked.filter((id) => id !== TARGET_ID).sort();
const afterOtherSteam = result.after.steamUnlocked.filter((id) => id !== TARGET_ID).sort();
const beforeOtherLocal = result.before.localUnlocked.filter((id) => id !== TARGET_ID).sort();
const afterOtherLocal = result.after.localUnlocked.filter((id) => id !== TARGET_ID).sort();

assert.equal(result.before.target?.unlocked, true, `${TARGET_ID} was not unlocked before the approved clear.`);
assert.equal(result.clear?.ok, true, `Steam clear failed: ${JSON.stringify(result.clear)}`);
assert.equal(result.after.target?.unlocked, false, `${TARGET_ID} remains unlocked on Steam.`);
assert.equal(result.after.steamUnlocked.includes(TARGET_ID), false, `${TARGET_ID} remains in Steam unlock list.`);
assert.equal(result.after.localUnlocked.includes(TARGET_ID), false, `${TARGET_ID} remains in local manager.`);
assert.equal(result.after.stored?.unlocked?.includes(TARGET_ID), false, `${TARGET_ID} remains in local persisted mirror.`);
assert.equal(result.after.queue.includes(TARGET_ID), false, `${TARGET_ID} remains in Steam retry queue.`);
assert.deepEqual(afterOtherSteam, beforeOtherSteam, 'A different Steam achievement changed during the targeted clear.');
assert.deepEqual(afterOtherLocal, beforeOtherLocal, 'A different local achievement changed during the targeted clear.');

const report = {
  clearedAt: new Date().toISOString(),
  targetId: TARGET_ID,
  steamOtherAchievementsUnchanged: true,
  localOtherAchievementsUnchanged: true,
  beforeSteamCount: result.before.steamUnlocked.length,
  afterSteamCount: result.after.steamUnlocked.length,
  beforeLocalCount: result.before.localUnlocked.length,
  afterLocalCount: result.after.localUnlocked.length,
  clear: result.clear,
  afterTarget: result.after.target
};

fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`[clear-no-repair-receipts] PASS target=${TARGET_ID} Steam ${report.beforeSteamCount}->${report.afterSteamCount} local ${report.beforeLocalCount}->${report.afterLocalCount} report=${path.relative(process.cwd(), path.join(outputDir, 'report.json'))}`);
