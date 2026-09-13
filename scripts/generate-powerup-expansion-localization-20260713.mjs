import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  POWERUP_META,
  SPECTACLE_EXPANSION_POWERUP_TYPES
} from '../src/config/PowerupCatalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'src', 'i18n', 'powerupExpansionSourceText.js');
const separator = ' ␞ ';
const fields = ['name', 'duration', 'effectDescription', 'read', 'when', 'tip', 'pickupMessage'];
const targets = Object.freeze({
  de: 'de',
  es: 'es',
  ru: 'ru',
  'zh-CN': 'zh-CN',
  'pt-BR': 'pt',
  ko: 'ko',
  ja: 'ja'
});
const translationOverrides = Object.freeze({
  es: Object.freeze({
    'the entire width of the board needs an answer': 'el ancho completo del tablero necesita una respuesta'
  }),
  'pt-BR': Object.freeze({
    'You are still the server. Stay alive or the entire tiny office goes home.': 'Você ainda é o servidor. Fique vivo ou o pequeno escritório inteiro vai para casa.'
  })
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateBlock(values, target, attempt = 0) {
  const query = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: target,
    dt: 't',
    q: values.join(separator)
  });
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`, {
      headers: { 'User-Agent': 'Nova-Swarm-localization-build/1.0' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const translated = (payload?.[0] || []).map((part) => part?.[0] || '').join('');
    const parts = translated.split(separator).map((value) => value.trim());
    if (parts.length !== values.length || parts.some((value) => !value)) {
      throw new Error(`separator mismatch ${parts.length}/${values.length}`);
    }
    return parts;
  } catch (error) {
    if (attempt >= 2 && values.length > 1) {
      const singles = [];
      for (const value of values) {
        singles.push((await translateBlock([value], target, 0))[0]);
        await wait(80);
      }
      return singles;
    }
    if (attempt >= 3) throw error;
    await wait(500 * (attempt + 1));
    return translateBlock(values, target, attempt + 1);
  }
}

async function mapLimited(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
      await wait(90);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => run()));
  return results;
}

const localeMaps = {};
for (const [locale, target] of Object.entries(targets)) {
  const rows = await mapLimited(SPECTACLE_EXPANSION_POWERUP_TYPES, 4, async (type) => {
    const meta = POWERUP_META[type];
    const sourceValues = fields.map((field) => String(meta[field] || ''));
    const translatedValues = await translateBlock(sourceValues, target);
    translatedValues[0] = sourceValues[0];
    sourceValues.forEach((source, index) => {
      translatedValues[index] = translationOverrides[locale]?.[source] || translatedValues[index];
    });
    return sourceValues.map((source, index) => [source, translatedValues[index]]);
  });
  localeMaps[locale] = Object.fromEntries(rows.flat());
  console.log(`[powerup-expansion-localization] ${locale} keys=${Object.keys(localeMaps[locale]).length}`);
}

const output = `// Generated from the reviewed English powerup catalog by scripts/generate-powerup-expansion-localization-20260713.mjs.\n` +
  `// Keep this file deterministic: rerun the generator after changing expansion copy, then review in-game.\n` +
  `const localeMaps = Object.freeze(${JSON.stringify(localeMaps, null, 2)});\n\n` +
  `export function getPowerupExpansionSourceText(localeCode) {\n` +
  `  return localeMaps[localeCode] || Object.freeze({});\n` +
  `}\n`;

await fs.writeFile(outputPath, output, 'utf8');
console.log(`[powerup-expansion-localization] wrote ${outputPath}`);
