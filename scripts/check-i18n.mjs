import assert from 'node:assert/strict';
import { de } from '../src/i18n/locales/de.js';
import { en } from '../src/i18n/locales/en.js';
import {
  normalizeLanguageCode,
  resolveLanguage,
  t,
  translateTextForLocale
} from '../src/i18n/index.js';

function flattenKeys(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, entry]) => {
    if (['sourceText', 'patterns'].includes(key)) return [];
    const path = prefix ? `${prefix}.${key}` : key;
    return entry && typeof entry === 'object' && !Array.isArray(entry)
      ? flattenKeys(entry, path)
      : [path];
  });
}

const enKeys = flattenKeys(en);
const deKeys = new Set(flattenKeys(de));
const missingKeys = enKeys.filter((key) => !deKeys.has(key));
assert.deepEqual(missingKeys, [], `German locale is missing keys: ${missingKeys.join(', ')}`);

assert.equal(normalizeLanguageCode('english'), 'en');
assert.equal(normalizeLanguageCode('en-US'), 'en');
assert.equal(normalizeLanguageCode('german'), 'de');
assert.equal(normalizeLanguageCode('de-DE'), 'de');
assert.equal(normalizeLanguageCode('french'), null);

assert.equal(resolveLanguage({
  preference: 'system',
  runtimeInfo: { currentGameLanguage: 'german' }
}), 'de');
assert.equal(resolveLanguage({
  preference: 'system',
  runtimeInfo: { steamLanguage: 'english' }
}), 'en');
assert.equal(resolveLanguage({
  preference: 'en',
  runtimeInfo: { currentGameLanguage: 'german' }
}), 'en');
assert.equal(resolveLanguage({
  preference: 'system',
  runtimeInfo: { currentGameLanguage: 'french' },
  navigatorLanguage: 'fr-FR'
}), 'en');

assert.equal(t('settings.language.system', {}, { locale: 'de' }), 'Systemeinstellung');
assert.equal(translateTextForLocale('de', 'SETTINGS'), 'EINSTELLUNGEN');
assert.equal(translateTextForLocale('de', 'SCORE 1,234'), 'PUNKTZAHL 1,234');
assert.equal(translateTextForLocale('de', 'WAVE 2/5  HOSTILES 8  THREATS 3'), 'WELLE 2/5  GEGNER 8  GEFAHREN 3');
assert.equal(translateTextForLocale('de', 'Reach Level 7'), 'Level 7 erreichen');
assert.equal(translateTextForLocale('de', 'Rank Up: ACE'), 'Rangaufstieg: ASS');
assert.equal(translateTextForLocale('de', 'LOCAL BOARD: QUALIFIED\nGLOBAL BOARD: OFFLINE - LOCAL STILL WORKS'), 'LOKALE LISTE: QUALIFIZIERT\nGLOBALE LISTE: OFFLINE - LOKAL FUNKTIONIERT');
assert.equal(translateTextForLocale('de', 'NEXT SHIP: COMET COURIER'), 'NÄCHSTES SCHIFF: COMET COURIER');
assert.equal(translateTextForLocale('de', 'CAREER LEVEL 21/23 - 2 LEVELS TO GO'), 'KARRIERELEVEL 21/23 - NOCH 2 LEVEL');
assert.equal(translateTextForLocale('de', 'NEXT GOAL: CLIMB ONE GLOBAL RANK'), 'NÄCHSTES ZIEL: EINEN GLOBALEN RANG AUFSTEIGEN');
assert.equal(translateTextForLocale('de', 'SCORE SUBMITTED'), 'PUNKTZAHL GESENDET');
assert.equal(translateTextForLocale('de', 'TYPE NAME FIRST'), 'ZUERST NAMEN EINGEBEN');
assert.equal(translateTextForLocale('de', 'ENTER / SPACE / CLICK - SAME SHIP'), 'ENTER / LEERTASTE / KLICK - GLEICHES SCHIFF');
assert.equal(translateTextForLocale('de', 'Systems reset. Pride damaged. Go again.'), 'Systeme zurückgesetzt. Stolz beschädigt. Weiter.');
assert.match(translateTextForLocale('de', 'Nova Station was built around an impossible arcade cabinet: one coin, one pilot, one clean lane through the dark.'), /Nova Station/);

const glyphProbe = [
  'ä', 'ö', 'ü', 'Ä', 'Ö', 'Ü', 'ß'
].join('');
assert.match(`${Object.values(de.sourceText).join('\n')}\n${glyphProbe}`, /äöüÄÖÜß/);

console.log('i18n checks passed');
