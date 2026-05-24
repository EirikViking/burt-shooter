import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { de } from '../src/i18n/locales/de.js';
import { en } from '../src/i18n/locales/en.js';
import { es } from '../src/i18n/locales/es.js';
import { ru } from '../src/i18n/locales/ru.js';
import { zhCN } from '../src/i18n/locales/zh-CN.js';
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

const locales = [
  ['de', de],
  ['es', es],
  ['ru', ru],
  ['zh-CN', zhCN]
];
const enKeys = flattenKeys(en);
for (const [code, locale] of locales) {
  const localeKeys = new Set(flattenKeys(locale));
  const missingKeys = enKeys.filter((key) => !localeKeys.has(key));
  assert.deepEqual(missingKeys, [], `${code} locale is missing keys: ${missingKeys.join(', ')}`);
}

assert.equal(normalizeLanguageCode('english'), 'en');
assert.equal(normalizeLanguageCode('en-US'), 'en');
assert.equal(normalizeLanguageCode('german'), 'de');
assert.equal(normalizeLanguageCode('de-DE'), 'de');
assert.equal(normalizeLanguageCode('spanish'), 'es');
assert.equal(normalizeLanguageCode('es-ES'), 'es');
assert.equal(normalizeLanguageCode('latam'), 'es');
assert.equal(normalizeLanguageCode('russian'), 'ru');
assert.equal(normalizeLanguageCode('ru-RU'), 'ru');
assert.equal(normalizeLanguageCode('schinese'), 'zh-CN');
assert.equal(normalizeLanguageCode('zh-Hans'), 'zh-CN');
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
  preference: 'system',
  runtimeInfo: { currentGameLanguage: 'schinese' }
}), 'zh-CN');
assert.equal(resolveLanguage({
  preference: 'system',
  runtimeInfo: { steamLanguage: 'russian' }
}), 'ru');
assert.equal(resolveLanguage({
  preference: 'system',
  runtimeInfo: { steamLanguage: 'spanish' }
}), 'es');
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

const criticalSamples = {
  es: {
    'SETTINGS': 'AJUSTES',
    'LAUNCH RUN': 'INICIAR PARTIDA',
    'SCORE 1,234': 'PUNTUACIÓN 1,234',
    'WAVE 2/5  HOSTILES 8  THREATS 3': 'OLEADA 2/5  ENEMIGOS 8  AMENAZAS 3',
    'GAME OVER': 'FIN DE LA PARTIDA',
    'SUBMIT SCORE': 'ENVIAR PUNTUACIÓN',
    'SCORE SUBMITTED': 'PUNTUACIÓN ENVIADA',
    'TYPE NAME FIRST': 'ESCRIBE EL NOMBRE PRIMERO',
    'NEXT GOAL: CLIMB ONE GLOBAL RANK': 'SIGUIENTE OBJETIVO: SUBIR UN RANGO GLOBAL',
    'NOVA LEADERBOARD': 'CLASIFICACIÓN NOVA',
    'GLOBAL SCORE DECK': 'MARCADOR GLOBAL'
  },
  ru: {
    'SETTINGS': 'НАСТРОЙКИ',
    'LAUNCH RUN': 'НАЧАТЬ ЗАБЕГ',
    'SCORE 1,234': 'ОЧКИ 1,234',
    'WAVE 2/5  HOSTILES 8  THREATS 3': 'ВОЛНА 2/5  ВРАГИ 8  УГРОЗЫ 3',
    'GAME OVER': 'ИГРА ОКОНЧЕНА',
    'SUBMIT SCORE': 'ОТПРАВИТЬ ОЧКИ',
    'SCORE SUBMITTED': 'ОЧКИ ОТПРАВЛЕНЫ',
    'TYPE NAME FIRST': 'СНАЧАЛА ВВЕДИТЕ ИМЯ',
    'NEXT GOAL: CLIMB ONE GLOBAL RANK': 'СЛЕДУЮЩАЯ ЦЕЛЬ: ПОДНЯТЬСЯ НА ОДИН ГЛОБАЛЬНЫЙ РАНГ',
    'NOVA LEADERBOARD': 'ТАБЛИЦА NOVA',
    'GLOBAL SCORE DECK': 'ГЛОБАЛЬНАЯ ТАБЛИЦА'
  },
  'zh-CN': {
    'SETTINGS': '设置',
    'LAUNCH RUN': '开始游戏',
    'SCORE 1,234': '分数 1,234',
    'WAVE 2/5  HOSTILES 8  THREATS 3': '波次 2/5  敌人 8  威胁 3',
    'GAME OVER': '游戏结束',
    'SUBMIT SCORE': '提交分数',
    'SCORE SUBMITTED': '分数已提交',
    'TYPE NAME FIRST': '请先输入名字',
    'NEXT GOAL: CLIMB ONE GLOBAL RANK': '下一目标：全球排名上升一位',
    'NOVA LEADERBOARD': 'NOVA 排行榜',
    'GLOBAL SCORE DECK': '全球计分榜'
  }
};

for (const [code, samples] of Object.entries(criticalSamples)) {
  for (const [source, expected] of Object.entries(samples)) {
    assert.equal(translateTextForLocale(code, source), expected, `${code} failed critical sample: ${source}`);
  }
}

const noEnglishCritical = [
  'SETTINGS',
  'LAUNCH RUN',
  'GAME OVER',
  'SUBMIT SCORE',
  'SCORE SUBMITTED',
  'TYPE NAME FIRST',
  'VIEW LEADERBOARD',
  'ENTER PILOT NAME',
  'NOVA LEADERBOARD',
  'GLOBAL SCORE DECK',
  'Loading scores...'
];
for (const [code, locale] of locales) {
  for (const source of noEnglishCritical) {
    const translated = translateTextForLocale(code, source);
    assert.notEqual(translated, source, `${code} leaves critical English text untranslated: ${source}`);
    assert.ok(locale.sourceText[source], `${code} is missing explicit critical source text: ${source}`);
  }
}

const glyphProbe = [
  'ä', 'ö', 'ü', 'Ä', 'Ö', 'Ü', 'ß'
].join('');
assert.match(`${Object.values(de.sourceText).join('\n')}\n${glyphProbe}`, /äöüÄÖÜß/);

assert.match(Object.values(es.sourceText).join('\n'), /ñ|á|é|í|ó|ú|Á|É|Í|Ó|Ú/);
assert.match(Object.values(ru.sourceText).join('\n'), /[А-Яа-я]/);
assert.match(Object.values(zhCN.sourceText).join('\n'), /[\u4e00-\u9fff]/);

const playScene = readFileSync('src/scenes/PlayScene.js', 'utf8');
const enemyManager = readFileSync('src/managers/EnemyManager.js', 'utf8');
for (const marker of ['handleMarketingSpawnKey', 'activateMarketingSpawnMode']) {
  assert.match(playScene, new RegExp(marker), `Missing marketing hotkey marker in PlayScene: ${marker}`);
}
for (const marker of ['spawnMarketingDebugBoss', 'marketingDebugMode']) {
  assert.match(enemyManager, new RegExp(marker), `Missing marketing hotkey marker in EnemyManager: ${marker}`);
}

console.log('i18n checks passed');
