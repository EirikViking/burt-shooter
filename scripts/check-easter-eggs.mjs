import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EASTER_EGG_TOTAL,
  EASTER_EGGS,
  pickEasterEggForLevel
} from '../src/config/EasterEggCatalog.js';

const localeFiles = [
  'de',
  'es',
  'ja',
  'ko',
  'pt-BR',
  'ru',
  'zh-CN'
];

assert.equal(EASTER_EGG_TOTAL, 10, 'easter egg total must stay at 10');
assert.equal(EASTER_EGGS.length, EASTER_EGG_TOTAL, 'catalog count mismatch');

const ids = new Set(EASTER_EGGS.map((egg) => egg.id));
const titles = new Set(EASTER_EGGS.map((egg) => egg.title));
const lines = new Set(EASTER_EGGS.map((egg) => egg.line));
assert.equal(ids.size, EASTER_EGG_TOTAL, 'easter egg ids must be unique');
assert.equal(titles.size, EASTER_EGG_TOTAL, 'easter egg titles must be unique');
assert.equal(lines.size, EASTER_EGG_TOTAL, 'easter egg lines must be unique');

for (const egg of EASTER_EGGS) {
  assert.match(egg.id, /^[a-z0-9_]+$/, `bad easter egg id ${egg.id}`);
  assert(Number.isInteger(egg.minLevel) && egg.minLevel >= 1, `${egg.id} must unlock at or after level 1`);
  assert(Number.isFinite(egg.accent) && Number.isFinite(egg.secondary), `${egg.id} needs numeric colors`);
  assert(typeof egg.title === 'string' && egg.title.length >= 8, `${egg.id} title too short`);
  assert(typeof egg.line === 'string' && egg.line.length >= 24, `${egg.id} line too short`);
}

assert(
  EASTER_EGGS.some((egg) => egg.minLevel === 1) &&
  EASTER_EGGS.some((egg) => egg.minLevel >= 8),
  'easter eggs should appear throughout the run, not only one level'
);

for (let level = 1; level <= 12; level += 1) {
  const picked = pickEasterEggForLevel(level, new Set());
  assert(picked, `picker returned nothing at level ${level}`);
  assert(picked.minLevel <= level, `picker returned locked egg ${picked.id} at level ${level}`);
}

for (const locale of localeFiles) {
  const mod = await import(`../src/i18n/locales/${locale}.js`);
  const sourceText = mod.default?.sourceText || Object.values(mod).find((entry) => entry?.sourceText)?.sourceText || {};
  for (const egg of EASTER_EGGS) {
    assert.equal(typeof sourceText[egg.title], 'string', `${locale} missing title ${egg.title}`);
    assert.equal(typeof sourceText[egg.line], 'string', `${locale} missing line ${egg.line}`);
    assert(sourceText[egg.title].trim(), `${locale} empty title ${egg.title}`);
    assert(sourceText[egg.line].trim(), `${locale} empty line ${egg.line}`);
  }
}

const playScene = readFileSync('src/scenes/PlayScene.js', 'utf8');
assert(playScene.includes('pickEasterEggForLevel'), 'PlayScene must pick from easter egg catalog');
assert(playScene.includes('spawnAmbientEasterEgg'), 'PlayScene must spawn ambient easter eggs');
assert(playScene.includes('lastEasterEgg'), 'PlayScene must expose last easter egg state');
assert(playScene.includes('EASTER_EGG_TOTAL'), 'PlayScene must track catalog total');

const main = readFileSync('src/main.js', 'utf8');
assert(main.includes('lastEasterEgg'), 'render_game_to_text must expose lastEasterEgg');
assert(main.includes('activeEasterEgg'), 'render_game_to_text must expose activeEasterEgg');

console.log(`[easter-eggs] PASS ${EASTER_EGG_TOTAL} localized easter eggs`);
