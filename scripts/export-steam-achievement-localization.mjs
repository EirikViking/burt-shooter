import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const source = JSON.parse(readFileSync('release/steamworks/achievement-staging-v2.json', 'utf8'));
assert.equal(source.length, 100, 'Steam achievement row layout must be verified before export');
assert.equal(source[0].apiName, 'ACH_RANK_01');
assert.equal(source[80].apiName, 'ACH_FULL_HANGAR_OMEGA');
assert.equal(source[81].apiName, 'ACH_OS_THREE_HULLS');
assert.equal(source[99].apiName, 'ACH_OS_COMPLETE_SET');
// Steamworks retains its original row order for the 81 existing IDs, which is
// different from the runtime catalog order. This order was read back from the
// live achievement editor before generating its NEW_ACHIEVEMENT_* tokens.
const steamIds = [
  ...Array.from({ length: 19 }, (_, index) => `ACH_RANK_${String(index + 1).padStart(2, '0')}`),
  'ACH_GLOBAL_LEADERBOARD', 'ACH_GLOBAL_NUMBER_ONE',
  ...source.slice(42, 51).map((item) => item.apiName),
  ...Array.from({ length: 20 }, (_, index) => `ACH_RANK_${String(index + 20).padStart(2, '0')}`),
  'ACH_EARLY_PILOT',
  ...source.slice(51).map((item) => item.apiName)
];
assert.equal(new Set(steamIds).size, 100);
const liveOrderHash = steamIds.join('\n').split('').reduce(
  (hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0,
  2166136261
).toString(16);
assert.equal(liveOrderHash, '342f3e0e', 'Steamworks row mapping changed; inspect before upload');
const byApiName = new Map(source.map((item) => [item.apiName, item]));
const steamOrder = steamIds.map((id) => {
  const item = byApiName.get(id);
  assert.ok(item, `Unknown Steamworks achievement row ${id}`);
  return item;
});

const languages = [
  ['english', 'en'], ['german', 'de'], ['koreana', 'ko'], ['spanish', 'es'],
  ['schinese', 'zh-CN'], ['russian', 'ru'], ['japanese', 'ja'], ['brazilian', 'pt-BR']
];
const quote = (value) => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
const lines = ['"lang"', '{'];
for (const [steamLanguage, locale] of languages) {
  lines.push(`  ${quote(steamLanguage)}`, '  {', '    "Tokens"', '    {');
  steamOrder.forEach((achievement, index) => {
    const localized = achievement.localization?.[locale];
    assert.ok(localized?.displayName && localized?.description, `${achievement.apiName} missing ${locale}`);
    const key = `NEW_ACHIEVEMENT_${Math.floor(index / 32) + 1}_${index % 32}`;
    lines.push(`      ${quote(`${key}_NAME`)} ${quote(localized.displayName)}`);
    lines.push(`      ${quote(`${key}_DESC`)} ${quote(localized.description)}`);
  });
  lines.push('    }', '  }');
}
lines.push('}', '');
const output = 'release/steamworks/achievement-localization-v2.vdf';
writeFileSync(output, lines.join('\n'), 'utf8');
console.log(`[steam-achievement-localization] ${source.length} definitions x ${languages.length} languages -> ${output}`);
