import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, VOICE_MIX } from '../src/audio/SoundCatalog.js';
import {
  RUN_MODE_NARRATION_SPECS,
  getRunModeNarrationSpec
} from '../src/config/RunModeNarration.js';
import { getSupportedLanguages, translateTextForLocale } from '../src/i18n/index.js';

const rootDir = path.resolve('.');
const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR || `test-results/run-mode-narration-${new Date().toISOString().replace(/[:.]/g, '-')}`
);
const menuSource = readFileSync(path.join(rootDir, 'src/scenes/MenuScene.js'), 'utf8');
const expectedCards = Object.freeze([
  Object.freeze({
    button: 'tacticalStartBtn',
    menuId: 'launchTactical',
    displayTitle: 'MAYHEM TACTICAL',
    event: 'boss_menu_bark_mode_tactical',
    required: [/\bRanked\b/i, /tactical upgrade/i, /every boss/i]
  }),
  Object.freeze({
    button: 'startBtn',
    menuId: 'launch',
    displayTitle: 'MAYHEM PURE',
    event: 'boss_menu_bark_mode_pure',
    required: [/\bRanked\b/i, /No tactical drafts/i, /original Mayhem ruleset/i]
  }),
  Object.freeze({
    button: 'dailySignalBtn',
    menuId: 'dailySignal',
    displayTitle: 'DAILY CHALLENGE',
    event: 'boss_menu_bark_mode_daily',
    required: [/\bUnranked\b/i, /\blocal\b/i, /fixed ship and route/i, /Sector Ten/i]
  }),
  Object.freeze({
    button: 'scoutRunBtn',
    menuId: 'scout',
    displayTitle: 'SCOUT RUN',
    event: 'boss_menu_bark_mode_scout',
    required: [/\bUnranked practice\b/i, /Choose an anomaly/i, /no career progress/i, /leaderboard submission/i]
  }),
  Object.freeze({
    button: 'sectorStartBtn',
    menuId: 'sectorStart',
    displayTitle: 'SECTOR RUN',
    event: 'boss_menu_bark_mode_sector',
    required: [/\bUnranked checkpoint practice\b/i, /unlocked in Mayhem/i, /records stay local/i]
  }),
  Object.freeze({
    button: 'overrunStartBtn',
    menuId: 'overrun',
    displayTitle: 'OVERRUN TACTICAL',
    event: 'boss_menu_bark_mode_overrun_tactical',
    required: [/Sector Fifty-One/i, /zero score/i, /Damage Up/i, /Rapid Fire/i, /Blink Drive/i, /Focus Lens/i, /Double Shot/i, /sixty-five percent/i]
  })
]);

assert.equal(RUN_MODE_NARRATION_SPECS.length, expectedCards.length, 'selectable mode narration count');
assert.equal(new Set(RUN_MODE_NARRATION_SPECS.map((spec) => spec.event)).size, expectedCards.length, 'narration events must be unique');
assert.equal(new Set(RUN_MODE_NARRATION_SPECS.map((spec) => spec.narrationKey)).size, expectedCards.length, 'narration keys must be unique');

const localeMatrix = {};
for (const locale of getSupportedLanguages()) {
  localeMatrix[locale] = {};
}

const matrix = expectedCards.map((expected) => {
  const spec = getRunModeNarrationSpec(expected.menuId);
  assert.ok(spec, `${expected.menuId} needs a narration spec`);
  assert.equal(spec.displayTitle, expected.displayTitle, `${expected.menuId} display title mismatch`);
  assert.equal(spec.event, expected.event, `${expected.menuId} event mismatch`);
  assert.ok(spec.narrationKey, `${expected.menuId} narration localization key`);
  assert.ok(spec.transcriptSource, `${expected.menuId} source transcript`);
  for (const pattern of expected.required) {
    assert.match(spec.transcriptSource, pattern, `${expected.menuId} transcript misses ${pattern}`);
  }

  for (const locale of getSupportedLanguages()) {
    const resolvedText = translateTextForLocale(locale, spec.transcriptSource);
    assert.ok(resolvedText && !resolvedText.includes('undefined'), `${expected.menuId} ${locale} resolved narration text`);
    if (locale !== 'en') {
      assert.notEqual(resolvedText, spec.transcriptSource, `${expected.menuId} ${locale} must not fall back to English narration text`);
    }
    localeMatrix[locale][expected.menuId] = resolvedText;
  }

  const catalog = SFX_CATALOG[spec.event] || [];
  assert.equal(catalog.length, 1, `${expected.menuId} should resolve exactly one stable mode narration clip`);
  const expectedUrl = `/audio/voice/menu-boss-barks/${spec.event}_001.mp3`;
  assert.equal(catalog[0], expectedUrl, `${expected.menuId} catalog clip`);
  assert.ok(AssetManifest.audio.voice.includes(expectedUrl), `${expected.menuId} clip must enter AssetManifest`);
  const diskPath = path.join(rootDir, 'public', expectedUrl.replace(/^\//, ''));
  assert.ok(statSync(diskPath).size > 1000, `${expected.menuId} clip must exist and be non-empty`);
  assert.ok(VOICE_MIX[spec.event], `${expected.menuId} voice mix`);

  assert.match(menuSource, new RegExp(`\\b${expected.button}\\b`), `${expected.menuId} selectable button`);
  assert.match(menuSource, new RegExp(`id:\\s*'${expected.menuId}'`), `${expected.menuId} navigation entry`);

  return {
    modeId: spec.modeId,
    menuId: expected.menuId,
    displayTitle: expected.displayTitle,
    narrationKey: spec.narrationKey,
    event: spec.event,
    sourceTranscript: spec.transcriptSource,
    rankedStatus: spec.rankedStatus,
    mechanicSummary: spec.mechanicSummary,
    audioUrl: expectedUrl
  };
});

for (const [variantId, expected] of Object.entries({
  pure: {
    event: 'boss_menu_bark_mode_overrun_pure',
    required: [/Sector Fifty-One/i, /zero score/i, /no Tactical augments/i, /no .*boss Drafts/i, /sixty-five percent/i]
  },
  locked: {
    event: 'boss_menu_bark_mode_overrun_locked',
    required: [/Overrun locked/i, /Sector Thirty in Mayhem/i, /Sector Fifty-One/i, /sixty-five percent/i]
  }
})) {
  const spec = getRunModeNarrationSpec('overrun', variantId);
  assert.equal(spec.event, expected.event, `overrun ${variantId} narration event`);
  for (const pattern of expected.required) {
    assert.match(spec.transcriptSource, pattern, `overrun ${variantId} transcript misses ${pattern}`);
  }
  for (const locale of getSupportedLanguages()) {
    const resolvedText = translateTextForLocale(locale, spec.transcriptSource);
    assert.ok(resolvedText && !resolvedText.includes('undefined'), `overrun ${variantId} ${locale} resolved narration text`);
    if (locale !== 'en') {
      assert.notEqual(resolvedText, spec.transcriptSource, `overrun ${variantId} ${locale} must not fall back to English narration text`);
    }
  }
}

assert.match(menuSource, /RUN_MODE_NARRATION_SPECS/, 'MenuScene must derive the mode narration mapping from the audited specs');
assert.doesNotMatch(
  menuSource,
  /dailySignal:\s*'boss_menu_bark_launch'/,
  'Daily must never reuse the generic ranked Mayhem launch event'
);
assert.doesNotMatch(
  menuSource,
  /launchTactical:\s*'boss_menu_bark_launch'|launch:\s*'boss_menu_bark_launch'/,
  'Tactical and Pure must not share the generic launch event'
);
assert.match(menuSource, /!isRunModeFocus && this\.hasActiveMenuBossBarkVoice\(\)/, 'deliberate mode dwell must be allowed to replace the previous mode voice');
assert.match(menuSource, /bypassGlobalCooldown:\s*isActivate \|\| isRunModeFocus/, 'deliberate mode dwell must bypass the broader audio cooldown');
assert.match(menuSource, /bypassVoiceLock:\s*isActivate \|\| isRunModeFocus/, 'deliberate mode dwell must replace a previous mode briefing');
assert.match(menuSource, /decision:\s*'scheduled_dwell'/, 'mode narration must instrument dwell decisions');
assert.match(menuSource, /decision:\s*'suppressed_scene_cooldown'/, 'mode narration must instrument cooldown decisions');
assert.match(menuSource, /decision:\s*played \? 'played' : 'audio_rejected'/, 'mode narration must instrument playback decisions');

mkdirSync(outputDir, { recursive: true });
const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  matrix,
  localeMatrix,
  sequenceCoverage: [
    'forward deliberate hover',
    'reverse deliberate hover',
    'random deliberate hover',
    'rapid pointer scrub',
    'leave and re-enter',
    'repeat after cooldown',
    'mouse movement within one card',
    'keyboard focus',
    'controller focus',
    'mouse-to-controller switch'
  ],
  runtimeCompanion: 'scripts/check-menu-voice-overlap.mjs'
};
const reportPath = path.join(outputDir, 'report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`[run-mode-narration] PASS modes=${matrix.length} locales=${getSupportedLanguages().length} report=${reportPath}`);
