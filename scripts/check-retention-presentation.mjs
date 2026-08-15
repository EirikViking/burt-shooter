import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  getRecoverySectorGoal,
  getShipIntroTiming,
  isFloatingComboMilestone,
  isReturningPilot
} from '../src/config/RetentionPresentation.js';
import { setLanguagePreference } from '../src/i18n/index.js';
import { getMicroMessage } from '../src/text/phrasePool.js';

const outputDir = path.resolve('test-results/retention-presentation');
mkdirSync(outputDir, { recursive: true });

assert.equal(isReturningPilot({ totalRuns: 0 }), false);
assert.equal(isReturningPilot({ totalRuns: 1 }), true);

const firstIntro = getShipIntroTiming({ compact: false, returningPilot: false });
const returningIntro = getShipIntroTiming({ compact: false, returningPilot: true });
const compactFirstIntro = getShipIntroTiming({ compact: true, returningPilot: false });
const compactReturningIntro = getShipIntroTiming({ compact: true, returningPilot: true });
const runbackIntro = getShipIntroTiming({ compact: false, returningPilot: true, runbackRestart: true });
assert.equal(firstIntro.totalMs, 3200);
assert.equal(compactFirstIntro.totalMs, 2600);
assert.ok(returningIntro.totalMs <= firstIntro.totalMs * 0.5, 'returning desktop intro should take at most half the first-run time');
assert.ok(compactReturningIntro.totalMs <= compactFirstIntro.totalMs * 0.55, 'returning compact intro should be materially faster');
assert.equal(runbackIntro.totalMs, 420);
assert.ok(runbackIntro.totalMs <= 750, 'warm runback arrival must fit the control-ready budget');
for (const timing of [firstIntro, returningIntro, compactFirstIntro, compactReturningIntro, runbackIntro]) {
  assert.ok(timing.fadeInMs < timing.holdUntilMs);
  assert.ok(timing.holdUntilMs < timing.totalMs);
  assert.ok(timing.impactStartMs < timing.impactEndMs);
  assert.ok(timing.impactEndMs < timing.totalMs);
}

const floatingComboMilestones = Array.from({ length: 42 }, (_, index) => index + 1)
  .filter(isFloatingComboMilestone);
assert.deepEqual(floatingComboMilestones, [3, 5, 10, 15, 20, 25, 30, 40]);

assert.equal(getRecoverySectorGoal({ currentSector: 3, bestSector: 60 }), 5);
assert.equal(getRecoverySectorGoal({ currentSector: 5, bestSector: 7 }), null);
assert.equal(getRecoverySectorGoal({ currentSector: 12, bestSector: 30 }), 13);

const criticalTypes = ['levelStart', 'newWave', 'pause', 'resume', 'lowHealth', 'lifeLost', 'bossIntro'];
const forbiddenCriticalFlavor = /boss entrance|pew-pew|coin slot|popcorn formation|panic button|high-score nonsense|formation drama/i;
const criticalMessages = {};
for (const locale of ['en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']) {
  await setLanguagePreference(locale);
  criticalMessages[locale] = {};
  for (const type of criticalTypes) {
    const samples = Array.from({ length: 16 }, () => getMicroMessage(type));
    assert.equal(new Set(samples).size, 1, `${locale} ${type} should be deterministic in critical play`);
    assert.doesNotMatch(samples[0], forbiddenCriticalFlavor, `${locale} ${type} leaked arcade flavor into critical play`);
    criticalMessages[locale][type] = samples[0];
  }
}
await setLanguagePreference('en');
assert.equal(criticalMessages.en.levelStart, 'NEW WAVE');
assert.equal(criticalMessages.en.lifeLost, 'SHIP DOWN');
for (const messages of Object.values(criticalMessages)) {
  assert.doesNotMatch(messages.lifeLost, /hitbox/i, 'player-facing life-loss copy must describe the damage cause, not implementation geometry');
}
assert.equal(criticalMessages.en.bossIntro, 'BOSS');

const playSceneSource = readFileSync(path.resolve('src/scenes/PlayScene.js'), 'utf8');
assert.doesNotMatch(playSceneSource, /showToast\(getMicroMessage\('levelStart'\)/, 'opening level should not show a random flavor toast');
assert.doesNotMatch(playSceneSource, /getAchievementPopup\(\)/, 'critical progression cards should not include generated fake-achievement copy');

const report = {
  ok: true,
  firstIntro,
  returningIntro,
  compactFirstIntro,
  compactReturningIntro,
  runbackIntro,
  floatingComboMilestones,
  recoveryExamples: {
    sector3Vs60: getRecoverySectorGoal({ currentSector: 3, bestSector: 60 }),
    sector5Vs7: getRecoverySectorGoal({ currentSector: 5, bestSector: 7 }),
    sector12Vs30: getRecoverySectorGoal({ currentSector: 12, bestSector: 30 })
  },
  criticalMessages
};
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`[retention-presentation] PASS report=${path.join(outputDir, 'report.json')}`);
