import { getSupportedLanguages } from '../src/i18n/index.js';
import { CODEX_LORE_VERSION } from '../src/i18n/codexLore.js';
import {
  getThreatCodexCatalog,
  getThreatCodexRuntimeDescription,
  getThreatCodexRuntimeTip
} from '../src/config/ThreatCodexCatalog.js';

const failures = [];
const fail = (message) => failures.push(message);
const locales = getSupportedLanguages();
const expectedCategories = [
  'enemies', 'attackPatterns', 'waveTactics', 'powerups', 'augments', 'sectors',
  'elites', 'bosses', 'runThemes', 'cabinetLogs', 'pilotRanks'
];

function flatCatalog(catalog) {
  return expectedCategories.flatMap((category) => (catalog[category] || []).map((entry) => ({ ...entry, category })));
}

function duplicateGroups(rows, field) {
  const groups = new Map();
  for (const row of rows) {
    const value = String(row[field] || '').trim().toLocaleLowerCase();
    const group = groups.get(value) || [];
    group.push(`${row.category}:${row.id}`);
    groups.set(value, group);
  }
  return [...groups.entries()].filter(([value, group]) => value && group.length > 1);
}

function fiveGramPeak(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const words = String(row[field] || '')
      .toLocaleLowerCase()
      .replace(/[^a-z0-9'-]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    for (let index = 0; index <= words.length - 5; index += 1) {
      const gram = words.slice(index, index + 5).join(' ');
      counts.set(gram, (counts.get(gram) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0] || ['', 0];
}

const englishCatalog = getThreatCodexCatalog({ locale: 'en' });
const englishRows = flatCatalog(englishCatalog);
const englishByKey = new Map(englishRows.map((entry) => [`${entry.category}:${entry.id}`, entry]));
const expectedTotal = englishRows.length;

for (const category of expectedCategories) {
  if (!Array.isArray(englishCatalog[category]) || !englishCatalog[category].length) {
    fail(`English Codex is missing category ${category}`);
  }
}

for (const locale of locales) {
  const catalog = locale === 'en' ? englishCatalog : getThreatCodexCatalog({ locale });
  const rows = flatCatalog(catalog);
  if (rows.length !== expectedTotal) fail(`${locale} has ${rows.length} entries; expected ${expectedTotal}`);

  for (const field of ['name', 'description', 'tip']) {
    const duplicates = duplicateGroups(rows, field);
    if (duplicates.length) {
      const preview = duplicates.slice(0, 3).map(([, group]) => group.join(', ')).join(' | ');
      fail(`${locale} has ${duplicates.length} duplicate ${field} group(s): ${preview}`);
    }
  }

  const cjk = ['zh-CN', 'ko', 'ja'].includes(locale);
  const minDescription = cjk ? 100 : 220;
  const minTip = cjk ? 30 : 75;
  for (const entry of rows) {
    const key = `${entry.category}:${entry.id}`;
    const text = `${entry.name || ''} ${entry.description || ''} ${entry.tip || ''}`;
    if (entry.loreVersion !== CODEX_LORE_VERSION) fail(`${locale} ${key} is missing current lore version`);
    if (String(entry.description || '').length < minDescription) fail(`${locale} ${key} description is too short`);
    if (String(entry.tip || '').length < minTip) fail(`${locale} ${key} tip is too short`);
    if (/\{[a-zA-Z0-9_]+\}/.test(text)) fail(`${locale} ${key} contains an unresolved placeholder`);
    if (/\b(?:undefined|null|NaN)\b/.test(text)) fail(`${locale} ${key} contains a broken value`);
    if (locale !== 'en') {
      const english = englishByKey.get(key);
      if (entry.description === english?.description) fail(`${locale} ${key} fell back to the English description`);
      if (entry.tip === english?.tip) fail(`${locale} ${key} fell back to the English tip`);
    }
  }

  const runtimeSignals = ['UNFILED MOON TAXI', 'BAY SIX TEETH RECEIPT'].map((name) => ({
    description: getThreatCodexRuntimeDescription(name, locale),
    tip: getThreatCodexRuntimeTip(name, locale)
  }));
  for (const field of ['description', 'tip']) {
    if (new Set(runtimeSignals.map((entry) => entry[field])).size !== runtimeSignals.length) {
      fail(`${locale} runtime fallback ${field}s are not identity-specific`);
    }
    if (runtimeSignals.some((entry) => !entry[field] || /\{[a-zA-Z0-9_]+\}/.test(entry[field]))) {
      fail(`${locale} runtime fallback ${field} is empty or unresolved`);
    }
  }
}

const retiredBoilerplate = [
  /enters the archive as/i,
  /that is the polite description/i,
  /destroy it before the formation finishes shaping the lane/i,
  /the archive marks that as comedy with a body count/i,
  /read it, laugh once if you have time/i,
  /respect the signature tell first\. damage matters after/i,
  /hard ranks are long-haul bragging rights/i
];
for (const entry of englishRows) {
  const text = `${entry.description} ${entry.tip}`;
  for (const pattern of retiredBoilerplate) {
    if (pattern.test(text)) fail(`retired boilerplate remains in ${entry.category}:${entry.id}: ${pattern}`);
  }
}

for (const field of ['description', 'tip']) {
  const [gram, count] = fiveGramPeak(englishRows, field);
  if (count > 140) fail(`English ${field} five-gram repeats ${count} times: “${gram}”`);
}

const rareChaos = englishCatalog.enemies.filter((entry) => entry.id.startsWith('rare_chaos_visitor_'));
if (rareChaos.length !== 99) fail(`expected 99 rare chaos Codex variants, found ${rareChaos.length}`);
if (rareChaos.some((entry) => !entry.name.includes(' // '))) fail('rare chaos display names must identify both hull and weapon rig');

if (failures.length) {
  console.error(`[codex-copy] FAIL ${failures.length} issue(s)`);
  failures.slice(0, 80).forEach((message) => console.error(`- ${message}`));
  if (failures.length > 80) console.error(`- ... ${failures.length - 80} more`);
  process.exit(1);
}

console.log(`[codex-copy] PASS locales=${locales.length} categories=${expectedCategories.length} entries=${expectedTotal} unique=name+description+tip lore=${CODEX_LORE_VERSION}`);
