import { readFileSync } from 'node:fs';
import { NOVA_HUMOR_POOLS, getNovaHumorSourceText, getNovaHumorTranslationCoverage } from '../src/i18n/novaHumorSourceText.js';
import { translateTextForLocale } from '../src/i18n/index.js';
import { tauntDirector } from '../src/game/TauntDirector.js';

const locales = ['de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja'];
const requiredCategories = [
  'start_story',
  'pause',
  'wave_clear_quip',
  'directive_complete_quip',
  'leaderboard_loaded',
  'leaderboard_empty',
  'leaderboard_error'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const category of requiredCategories) {
  assert(Array.isArray(NOVA_HUMOR_POOLS[category]), `missing humor pool: ${category}`);
  assert(NOVA_HUMOR_POOLS[category].length >= 4, `humor pool is too small: ${category}`);
}

const allEnglishLines = requiredCategories.flatMap((category) => NOVA_HUMOR_POOLS[category]);
assert(allEnglishLines.length === 37, `expected 37 authored humor lines, found ${allEnglishLines.length}`);
assert(new Set(allEnglishLines).size === allEnglishLines.length, 'Nova humor source lines must be unique');

for (const locale of locales) {
  const coverage = getNovaHumorTranslationCoverage(locale);
  const sourceText = getNovaHumorSourceText(locale);
  for (const category of requiredCategories) {
    assert(coverage[category]?.localized === coverage[category]?.source, `${locale} coverage mismatch in ${category}`);
    for (const source of NOVA_HUMOR_POOLS[category]) {
      const localized = sourceText[source];
      assert(localized && localized !== source, `${locale} is missing a distinct translation for: ${source}`);
      assert(translateTextForLocale(locale, source) === localized, `${locale} runtime lookup missed: ${source}`);
    }
  }
}

const sceneExpectations = [
  ['src/scenes/MenuScene.js', "getRotatingText('start_story')"],
  ['src/scenes/PlayScene.js', "getRotatingText('pause')"],
  ['src/scenes/PlayScene.js', "getRotatingText('wave_clear_quip')"],
  ['src/scenes/PlayScene.js', "getRotatingText('directive_complete_quip')"],
  ['src/scenes/HighscoreScene.js', "'leaderboard_empty'"],
  ['src/scenes/HighscoreScene.js', "'leaderboard_error'"],
  ['src/scenes/HighscoreScene.js', "'leaderboard_loaded'"]
];
for (const [file, needle] of sceneExpectations) {
  const source = readFileSync(file, 'utf8');
  assert(source.includes(needle), `${file} is missing Nova humor integration: ${needle}`);
}

const originalRandom = Math.random;
try {
  tauntDirector.recentTauntsByCategory.clear();
  const values = [0, 0, 0.26];
  Math.random = () => values.shift() ?? 0.51;
  const first = tauntDirector.getRotatingText('pause');
  const second = tauntDirector.getRotatingText('pause');
  assert(first !== second, 'category-aware humor rotation repeated immediately');
  assert(tauntDirector.getRotationDebugState()?.category === 'pause', 'humor debug state did not track the latest surface');
} finally {
  Math.random = originalRandom;
  tauntDirector.recentTauntsByCategory.clear();
}

console.log(`Nova humor check passed: ${allEnglishLines.length} unique lines across ${requiredCategories.length} surfaces and ${locales.length} translated locales.`);
