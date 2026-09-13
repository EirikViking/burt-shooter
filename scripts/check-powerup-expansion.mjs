import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  POWERUP_META,
  SPECTACLE_EXPANSION_POWERUP_TYPES
} from '../src/config/PowerupCatalog.js';
import { translateTextForLocale } from '../src/i18n/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const managerSource = fs.readFileSync(path.join(root, 'src', 'managers', 'PowerupManager.js'), 'utf8');
const signatures = new Set();
const names = new Set();
const sfx = new Set();
const localizedFields = ['duration', 'effectDescription', 'read', 'when', 'tip', 'pickupMessage'];
const locales = ['de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja'];

assert.equal(SPECTACLE_EXPANSION_POWERUP_TYPES.length, 20, 'the spectacle expansion must add exactly 20 powerups');

for (const type of SPECTACLE_EXPANSION_POWERUP_TYPES) {
  const meta = POWERUP_META[type];
  assert.ok(meta, `${type} is missing catalog metadata`);
  assert.ok(!names.has(meta.name), `${type} duplicates the player-facing name ${meta.name}`);
  names.add(meta.name);
  const signature = JSON.stringify(meta.effect);
  assert.ok(!signatures.has(signature), `${type} duplicates another expansion mechanic signature`);
  signatures.add(signature);
  assert.ok(Object.keys(meta.effect || {}).length >= 3, `${type} needs a multi-part mechanic identity`);
  assert.ok(meta.effectDescription && meta.read && meta.when && meta.tip, `${type} needs complete Codex writing`);
  assert.match(managerSource, new RegExp(`['"]${type}['"]`), `${type} is not present in a random-drop pool`);
  sfx.add(meta.sfx);
  for (const locale of locales) {
    for (const field of localizedFields) {
      const source = meta[field];
      const translated = translateTextForLocale(locale, source);
      assert.notEqual(translated, source, `${type}.${field} is missing ${locale} localization`);
    }
  }
}

assert.ok(sfx.size >= 8, `the expansion should use a varied audio palette, found ${sfx.size}`);
console.log(`[powerup-expansion] PASS powerups=${signatures.size} uniqueNames=${names.size} audioTreatments=${sfx.size} localizedLocales=${locales.length}`);
