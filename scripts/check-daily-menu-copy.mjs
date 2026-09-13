import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { getSupportedLanguages, translateTextForLocale } from '../src/i18n/index.js';

const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR || `test-results/daily-menu-copy-${new Date().toISOString().replace(/[:.]/g, '-')}`
);
const source = 'WEEKLY CLEARS: {clears} / 7';
const values = [0, 1, 6, 7];
const forbiddenPrimaryPattern = /[\u25c6\u25c7\ufffd]|WEEK:\s*(?:[.·•◆◇]\s*){3,}/u;
const menuSource = readFileSync('src/scenes/MenuScene.js', 'utf8');
const briefingStart = menuSource.indexOf('getRunModeBriefing()');
const briefingEnd = menuSource.indexOf('getHangarButtonSubLabel()', briefingStart);
const briefingSource = menuSource.slice(briefingStart, briefingEnd);
const localeMatrix = {};

assert.ok(briefingStart >= 0 && briefingEnd > briefingStart, 'Daily primary briefing source must be discoverable');
assert.match(briefingSource, /translateText\('WEEKLY CLEARS: \{clears\} \/ 7'/, 'Daily primary briefing must use explicit weekly-clear language');
assert.doesNotMatch(briefingSource, /formatDailySignalFlightLogSymbols|[\u25c6\u25c7]/u, 'Daily primary briefing must not use symbolic Flight Log markers');
assert.doesNotMatch(briefingSource, /WEEK:\s*/, 'Daily primary briefing must not reintroduce the old WEEK symbol row');

for (const locale of getSupportedLanguages()) {
  localeMatrix[locale] = {};
  for (const clears of values) {
    const rendered = translateTextForLocale(locale, source, { clears });
    assert.ok(rendered, `${locale} ${clears}/7 text`);
    assert.doesNotMatch(rendered, forbiddenPrimaryPattern, `${locale} ${clears}/7 must not contain symbolic or replacement glyphs`);
    assert.doesNotMatch(rendered, /undefined|null/i, `${locale} ${clears}/7 must interpolate`);
    assert.match(rendered, new RegExp(`(?:^|\\D)${clears}\\s*\\/\\s*7(?:\\D|$)`), `${locale} ${clears}/7 value`);
    if (locale !== 'en') {
      assert.notEqual(rendered, source.replace('{clears}', String(clears)), `${locale} needs a natural localized weekly-clear label`);
    }
    localeMatrix[locale][clears] = rendered;
  }
}

mkdirSync(outputDir, { recursive: true });
const reportPath = path.join(outputDir, 'report.json');
writeFileSync(reportPath, JSON.stringify({
  ok: true,
  generatedAt: new Date().toISOString(),
  source,
  values,
  localeMatrix,
  forbiddenCodePoints: ['U+25C6', 'U+25C7', 'U+FFFD'],
  primaryPath: 'MenuScene.getRunModeBriefing dailySignal',
  dedicatedHistoryException: [
    'src/ui/DailySignalCard.js',
    'src/progression/DailySignalRecords.js'
  ]
}, null, 2));
console.log(`[daily-menu-copy] PASS locales=${getSupportedLanguages().length} values=${values.join(',')} report=${reportPath}`);
