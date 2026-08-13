import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  fitMasteryTextScale,
  getMasteryBadgeRegionDebug,
  getShipMasteryBadgeLayout
} from '../src/ui/ShipMasteryBadgeLayout.js';
import { getPlayerDamageCause } from '../src/game/PlayerDamageCause.js';
import { getSecondPolishSourceText } from '../src/i18n/secondPolishSourceText.js';
import { getTyrian125SourceText } from '../src/i18n/tyrian125SourceText.js';
import { setLanguagePreference } from '../src/i18n/index.js';
import { getMicroMessage } from '../src/text/phrasePool.js';

const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || 'test-results/second-polish-rules');
mkdirSync(outputDir, { recursive: true });
const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const clearCounts = [0, 1, 9, 10, 99, 100, 999];
const masteryLayouts = [];
for (const mobile of [false, true]) {
  const layout = getShipMasteryBadgeLayout({ mobile });
  for (const clears of clearCounts) {
    const labelMeasuredWidth = mobile ? 46 : 58;
    const countMeasuredWidth = String(clears).length * (mobile ? 6.2 : 7.2);
    const labelScale = fitMasteryTextScale(labelMeasuredWidth, layout.labelMaxWidth);
    const countScale = fitMasteryTextScale(countMeasuredWidth, layout.countMaxWidth);
    const regions = getMasteryBadgeRegionDebug(layout, {
      labelWidth: labelMeasuredWidth * labelScale,
      countWidth: countMeasuredWidth * countScale
    });
    assert(Object.values(regions.overlaps).every((value) => value === false), `${mobile ? 'mobile' : 'desktop'} mastery overlap at ${clears}: ${JSON.stringify(regions)}`);
    assert.equal(regions.identity.right <= layout.width, true, `mastery identity escaped badge at ${clears}`);
    masteryLayouts.push({ mobile, clears, labelScale, countScale, regions });
  }
}

const expectedCause = {
  enemy_bullet: 'hostile_fire',
  boss_bullet: 'hostile_fire',
  enemy_contact: 'enemy_contact',
  boss_contact: 'enemy_contact',
  ambient_hazard_contact: 'hazard_impact',
  boss_hazard: 'hazard_impact',
  boss_wall: 'hazard_impact',
  unknown: 'core_hit'
};
const damageCauses = Object.fromEntries(Object.entries(expectedCause).map(([source, category]) => {
  const cause = getPlayerDamageCause(source, { translate: (value) => value });
  assert.equal(cause.category, category, `damage cause mismatch for ${source}`);
  assert(!/hitbox/i.test(cause.label), `implementation term leaked for ${source}`);
  return [source, cause];
}));

const requiredLocalizedKeys = [
  'TOURS',
  'SHIP DOWN',
  'HOSTILE FIRE',
  'ENEMY CONTACT',
  'HAZARD IMPACT',
  'CORE HIT',
  'FINAL HIT: {cause}',
  'PRESS A / ANY KEY / CLICK TO CONTINUE',
  'ARROWS: SHIP | ENTER: LAUNCH | X: DETAILS | R: RANDOM | ESC: BACK',
  'STICK: SHIP | A: LAUNCH | X: DETAILS | Y: RANDOM | B: BACK',
  'SECTOR {sector} | HOSTILES {hostiles} | THREATS {threats}'
];
const localizedKeys = {};
for (const locale of ['de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']) {
  const entries = { ...getSecondPolishSourceText(locale), ...getTyrian125SourceText(locale) };
  localizedKeys[locale] = {};
  for (const key of requiredLocalizedKeys) {
    assert(String(entries[key] || '').trim(), `${locale} is missing ${key}`);
    assert.notEqual(entries[key], key, `${locale} retained English fallback for ${key}`);
    localizedKeys[locale][key] = entries[key];
  }
  await setLanguagePreference(locale);
  assert.doesNotMatch(getMicroMessage('lifeLost'), /hitbox/i, `${locale} life-loss copy retained hitbox terminology`);
}
await setLanguagePreference('en');
assert.equal(getMicroMessage('lifeLost'), 'SHIP DOWN');

const play = read('../src/scenes/PlayScene.js');
const scorePopup = read('../src/ui/ScorePopup.js');
const hud = read('../src/ui/HUD.js');
const enemy = read('../src/entities/Enemy.js');
const hangar = read('../src/scenes/ShipSelectScene.js');
const runReport = read('../src/game/RunReport.js');
const gameOver = read('../src/scenes/GameOverScene.js');

assert.match(play, /GAME_OVER_DEATH_HOLD_MS = 620/);
assert.match(play, /GAME_OVER_SKIP_DEBOUNCE_MS = 600/);
assert.match(play, /GAME_OVER_CELEBRATION_DURATION_MS = 1700/);
assert.match(play, /automaticTargetMs: GAME_OVER_DEATH_HOLD_MS \+ GAME_OVER_CELEBRATION_DURATION_MS/);
assert.match(play, /translateText\('FINAL HIT: \{cause\}'/);
assert.match(play, /translateText\('PRESS A \/ ANY KEY \/ CLICK TO CONTINUE'\)/);
assert.match(play, /activateFatalEventBarrier\(source/);
assert.match(play, /if \(this\.isFatalEventBarrierActive\(\)\) \{[\s\S]{0,180}clearDeferredCollisionUiFeedback/);
assert.match(play, /if \(this\.checkCollision\(bullet, this\.player\)\)[\s\S]{0,1800}return;[\s\S]{0,240}if \(!bullet\.nearMissed/);
assert.match(play, /showComboMilestone: false/);
assert.match(play, /compactObjectiveReadyAt = active\.spawnedAt \+ 1000/);
assert.match(play, /duration: 1050/);
assert.match(play, /combatPresentation: 'compact_corner_toast'/);
assert.match(play, /fullTextArchived: true/);
assert.doesNotMatch(play, /duration: 2700[\s\S]{0,180}aceContact/);

assert.match(scorePopup, /setProtectedLayout\(/);
assert.match(scorePopup, /isProtectedPosition\(/);
assert.match(scorePopup, /persistentComboHudActive = true/);
assert.match(scorePopup, /&& !this\.persistentComboHudActive/);
assert.match(scorePopup, /aggregateTarget\?\.aggregateScore/);

assert.match(hud, /translateText\('SECTOR \{sector\} \| HOSTILES \{hostiles\} \| THREATS \{threats\}'/);
assert.doesNotMatch(hud, /`LEVEL: \$\{this\.game\.level\}`/);

assert.doesNotMatch(enemy, /tier: 'fast'/);
assert.doesNotMatch(enemy, /tier: 'threat_action'/);
assert.match(enemy, /simplifiedStandard: true/);
assert.match(enemy, /Number\(this\.maxHealth\) >= 8/);

assert.match(hangar, /translateText\('TOURS'\)/);
assert.match(hangar, /hangarShipMasteryClearsCount/);
assert.match(hangar, /setHangarInputDevice\('controller', 'gamepad'\)/);
assert.match(hangar, /setHangarInputDevice\('keyboard', 'pointerdown'\)/);
assert.match(hangar, /e\.code === 'KeyX'[\s\S]{0,260}openSelectedShipDetails/);

assert.match(runReport, /getPlayerDamageCause\(summary\.finalDeathSource/);
assert.match(runReport, /label: getPlayerDamageCause\(source\)\.label/);
assert.match(gameOver, /void this\.submitSteamScore\(\)/, 'Steam submission must begin asynchronously after results render');

const report = {
  ok: true,
  clearCounts,
  masteryLayouts,
  damageCauses,
  localizedKeys,
  timing: { deathHoldMs: 620, skipDebounceMs: 600, celebrationMs: 1700, naturalTargetMs: 2320 },
  presentation: {
    aceFullCardMs: 1050,
    aceCompactHandoffMs: 1000,
    cabinetCombatMode: 'compact_corner_toast',
    persistentComboHudOwnsMilestones: true
  }
};
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`[second-polish-rules] PASS report=${path.join(outputDir, 'report.json')}`);
