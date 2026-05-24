import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { de } from '../src/i18n/locales/de.js';
import { en } from '../src/i18n/locales/en.js';
import { es } from '../src/i18n/locales/es.js';
import { ja } from '../src/i18n/locales/ja.js';
import { ko } from '../src/i18n/locales/ko.js';
import { ptBR } from '../src/i18n/locales/pt-BR.js';
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
  ['zh-CN', zhCN],
  ['pt-BR', ptBR],
  ['ko', ko],
  ['ja', ja]
];
const forbiddenPlaceholderMarkers = [
  'Texto:',
  '문구:',
  '文言:',
  'Text:',
  'TODO:',
  'MISSING:',
  'FALLBACK:',
  'UNTRANSLATED:'
];

function findForbiddenPlaceholderMarkers(value) {
  const text = String(value ?? '');
  return forbiddenPlaceholderMarkers.filter((marker) => text.includes(marker));
}

const enKeys = flattenKeys(en);
for (const [code, locale] of locales) {
  const localeKeys = new Set(flattenKeys(locale));
  const missingKeys = enKeys.filter((key) => !localeKeys.has(key));
  assert.deepEqual(missingKeys, [], `${code} locale is missing keys: ${missingKeys.join(', ')}`);
}

const sourceLocales = locales.map(([, locale]) => locale);
const sourceTextKeys = new Set(sourceLocales.flatMap((locale) => Object.keys(locale.sourceText || {})));
const allowTodos = process.argv.includes('--allow-i18n-todo');
const todoMarkers = [];
const placeholderMarkers = [];
for (const [code, locale] of locales) {
  for (const [key, value] of Object.entries(locale.sourceText || {})) {
    if (/\b(TODO|TBD|TRANSLATE|UNLOCALIZED)\b/i.test(String(value))) {
      todoMarkers.push(`${code}.sourceText.${key}`);
    }
    const markers = findForbiddenPlaceholderMarkers(value);
    if (markers.length) {
      placeholderMarkers.push(`${code}.sourceText.${key}: ${markers.join(', ')}`);
    }
  }
  for (const key of flattenKeys(locale)) {
    const value = key.split('.').reduce((node, part) => node?.[part], locale);
    const markers = findForbiddenPlaceholderMarkers(value);
    if (markers.length) {
      placeholderMarkers.push(`${code}.${key}: ${markers.join(', ')}`);
    }
  }
}
assert.ok(
  allowTodos || todoMarkers.length === 0,
  `New player-facing text requires localization updates. Update all locales or add an explicit tracked TODO. TODO markers found: ${todoMarkers.join(', ')}`
);
assert.deepEqual(
  placeholderMarkers,
  [],
  `Player-facing placeholder markers are forbidden in locale data:\n${placeholderMarkers.join('\n')}`
);

const patternIds = locales.map(([code, locale]) => [code, (locale.patterns || []).map((pattern) => pattern.id)]);
const referencePatternIds = patternIds[0]?.[1] || [];
for (const [code, ids] of patternIds) {
  assert.deepEqual(ids, referencePatternIds, `${code} locale pattern ids differ from reference pattern ids`);
}

const phrasePool = readFileSync('src/text/phrasePool.js', 'utf8');
for (const marker of [
  'arcadePhrasesDe',
  'storyTransmissionsDe',
  'localizedArcadePhrases',
  'localizedStoryTransmissions',
  'localizedFragments',
  'localizedLabels'
]) {
  assert.match(phrasePool, new RegExp(marker), `phrasePool localization marker missing: ${marker}`);
}

const hardcodedTextAllowlist = new Set([
  '${unlockedCount} / ${this.rows.length} UNLOCKED',
  'SCORE: ${this.finalScore}',
  'Score ${Number(this.finalScore || 0).toLocaleString(\'en-US\')} | Level ${this.finalLevel || 0}',
  'NAME: ${this.nameInput}${caret}',
  '${translateText(\'PILOT RANK SIGNAL\')} // ${translateText(source)}',
  'Loading... (attempt ${attempt + 1}/4)',
  'Last error: ${this.lastError}',
  'build: ${BUILD_ID}',
  '#${index + 1}',
  'LV ${score.level || 0}',
  '+${bonusAmount}',
  'pVis:${vis} a:${alpha} tex:${texOk} parent:${parent}',
  'S:${score} R:${rank} (seen:${seen}) REV:${rankEv} UI:${uiRankEv}',
  '${trimmed}...',
  'COMBO x${this.comboMultiplier}  (${this.comboCount})',
  'COMBO:${this.comboCount}x${this.comboMultiplier} STREAK:${this.killStreak}',
  'Used ${usageCount} times by players',
  'HULL ${this.selectedIndex + 1}/${this.ships.length}  |  SERIES ${modelIndex}/${modelTotal}  |  ${status}',
  '${unlockedCount}/${this.ships.length} HULLS READY',
  '${role} | ${unlock}',
  '\\u2665',
  'SCORE ${this.formatScore(this.game.score)}',
  'x${mult}',
  'LEVEL ${this.game.level}',
  'LIVES ${this.game.lives}',
  'INCOMING WAVE ${Math.min(waveIndex, waveTotal)}/${waveTotal}',
  '${waveText}  HOSTILES ${activeEnemies}  THREATS ${activeBullets}',
  'Arcade legends and brave initials',
  'The swarm is not invading. It is answering an old arcade signal.\nLaunch before the broadcast learns your name.',
  '⬆ RANK UP! ⬆',
  'ARROWS/STICK: SHIP  |  A/ENTER: LAUNCH  |  X: DETAILS  |  Y/R: RANDOM  |  B/ESC: MENU',
  '☰ MAIN MENU',
  'CREDITS: THE CABINET DENIES EVERYTHING',
  'A Tinyfoundry Games incident report, lightly redacted by mission control.',
  'No cabinets were harmed. One cabinet was promoted to lore compliance.',
  'TINYFOUNDRY GAMES'
]);

function walkJsFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      walkJsFiles(file, files);
    } else if (entry.isFile() && file.endsWith('.js')) {
      files.push(file);
    }
  }
  return files;
}

function lineForOffset(text, offset) {
  return text.slice(0, offset).split(/\r?\n/).length;
}

function normalizeLiteral(raw) {
  return String(raw || '')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .trim();
}

function isSuspiciousPlayerText(value) {
  if (!value || value.length < 3 || value.length > 120) return false;
  if (!/[A-Za-z]/.test(value)) return false;
  if (/^\w+$/.test(value)) return false;
  if (/^[\w./:-]+\.(png|jpg|jpeg|webp|mp3|wav|json|js|css|html)$/i.test(value)) return false;
  return /[a-z]/.test(value) || /\s/.test(value);
}

const hardcodedTextHits = [];
const rootsToScan = ['src/scenes', 'src/ui', 'src/managers', 'src/text'];
const literalPatterns = [
  /(?:createText|makeText|new\s+PIXI\.Text)\s*\(\s*(['"`])([\s\S]*?)\1/g,
  /\.text\s*=\s*(['"`])([\s\S]*?)\1/g
];

for (const root of rootsToScan) {
  try {
    statSync(root);
  } catch {
    continue;
  }
  for (const file of walkJsFiles(root)) {
    if (file.includes('/i18n/')) continue;
    const text = readFileSync(file, 'utf8');
    for (const pattern of literalPatterns) {
      for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
        const value = normalizeLiteral(match[2]);
        if (!isSuspiciousPlayerText(value)) continue;
        if (sourceTextKeys.has(value) || hardcodedTextAllowlist.has(value)) continue;
        hardcodedTextHits.push(`${file}:${lineForOffset(text, match.index)} "${value.replace(/\s+/g, ' ')}"`);
      }
    }
  }
}

assert.deepEqual(
  hardcodedTextHits,
  [],
  `New player-facing text requires localization updates. Update all locales or add an explicit tracked TODO. Suspicious hardcoded text found:\n${hardcodedTextHits.join('\n')}`
);

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
assert.equal(normalizeLanguageCode('brazilian'), 'pt-BR');
assert.equal(normalizeLanguageCode('pt-BR'), 'pt-BR');
assert.equal(normalizeLanguageCode('portuguese'), null);
assert.equal(normalizeLanguageCode('koreana'), 'ko');
assert.equal(normalizeLanguageCode('korean'), 'ko');
assert.equal(normalizeLanguageCode('japanese'), 'ja');
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
  preference: 'system',
  runtimeInfo: { steamLanguage: 'brazilian' }
}), 'pt-BR');
assert.equal(resolveLanguage({
  preference: 'system',
  runtimeInfo: { steamLanguage: 'koreana' }
}), 'ko');
assert.equal(resolveLanguage({
  preference: 'system',
  runtimeInfo: { steamLanguage: 'japanese' }
}), 'ja');
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
  },
  'pt-BR': {
    'SETTINGS': 'CONFIGURAÇÕES',
    'LAUNCH RUN': 'INICIAR PARTIDA',
    'SCORE 1,234': 'PONTUAÇÃO 1,234',
    'WAVE 2/5  HOSTILES 8  THREATS 3': 'ONDA 2/5  INIMIGOS 8  AMEAÇAS 3',
    'GAME OVER': 'FIM DE JOGO',
    'SUBMIT SCORE': 'ENVIAR PONTUAÇÃO',
    'SCORE SUBMITTED': 'PONTUAÇÃO ENVIADA',
    'TYPE NAME FIRST': 'DIGITE O NOME PRIMEIRO',
    'NEXT GOAL: CLIMB ONE GLOBAL RANK': 'PRÓXIMO OBJETIVO: SUBIR UM RANK GLOBAL',
    'NOVA LEADERBOARD': 'RANKING NOVA',
    'GLOBAL SCORE DECK': 'RANKING GLOBAL'
  },
  ko: {
    'SETTINGS': '설정',
    'LAUNCH RUN': '게임 시작',
    'SCORE 1,234': '점수 1,234',
    'WAVE 2/5  HOSTILES 8  THREATS 3': '웨이브 2/5  적 8  위협 3',
    'GAME OVER': '게임 오버',
    'SUBMIT SCORE': '점수 제출',
    'SCORE SUBMITTED': '점수 제출됨',
    'TYPE NAME FIRST': '먼저 이름을 입력하세요',
    'NEXT GOAL: CLIMB ONE GLOBAL RANK': '다음 목표: 글로벌 랭크 하나 상승',
    'NOVA LEADERBOARD': 'NOVA 순위표',
    'GLOBAL SCORE DECK': '글로벌 순위표'
  },
  ja: {
    'SETTINGS': '設定',
    'LAUNCH RUN': 'ゲーム開始',
    'SCORE 1,234': 'スコア 1,234',
    'WAVE 2/5  HOSTILES 8  THREATS 3': 'ウェーブ 2/5  敵 8  脅威 3',
    'GAME OVER': 'ゲームオーバー',
    'SUBMIT SCORE': 'スコア送信',
    'SCORE SUBMITTED': 'スコア送信済み',
    'TYPE NAME FIRST': '先に名前を入力',
    'NEXT GOAL: CLIMB ONE GLOBAL RANK': '次の目標: グローバルランクを1つ上げる',
    'NOVA LEADERBOARD': 'NOVAランキング',
    'GLOBAL SCORE DECK': 'グローバルランキング'
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
assert.match(Object.values(ptBR.sourceText).join('\n'), /á|à|â|ã|ç|é|ê|í|ó|ô|õ|ú/i);
assert.match(Object.values(ko.sourceText).join('\n'), /[가-힣]/);
assert.match(Object.values(ja.sourceText).join('\n'), /[\u3040-\u30ff\u4e00-\u9fff]/);
assert.equal(translateTextForLocale('pt-BR', '1 point'), '1 point');
assert.equal(translateTextForLocale('ko', '1 point'), '1 point');
assert.equal(translateTextForLocale('ja', '1 point'), '1 point');
assert.notEqual(translateTextForLocale('ko', 'No scores yet. Start the first legend.'), 'No scores yet. Start the first legend.');
assert.notEqual(translateTextForLocale('ja', 'No scores yet. Start the first legend.'), 'No scores yet. Start the first legend.');

const spanishValues = [
  ...Object.values(es.sourceText),
  ...Object.values(es.settings.language),
  ...Object.values(es.diagnostics)
].map((value) => String(value));
const spanishBadQuestions = spanishValues.filter((value) => value.includes('?') && !value.includes('¿'));
const spanishBadExclamations = spanishValues.filter((value) => value.includes('!') && !value.includes('¡'));
assert.deepEqual(spanishBadQuestions, [], `Spanish strings contain closing ? without opening ¿: ${spanishBadQuestions.join(' | ')}`);
assert.deepEqual(spanishBadExclamations, [], `Spanish strings contain closing ! without opening ¡: ${spanishBadExclamations.join(' | ')}`);
assert.equal(translateTextForLocale('es', 'BOSS DEFEATED! +1000\nHULL REPAIR +1\nMAX LIVES BONUS!'), 'JEFE DERROTADO +1000\nREPARACIÓN DE CASCO +1\nBONUS DE VIDAS MÁXIMAS');

const playScene = readFileSync('src/scenes/PlayScene.js', 'utf8');
const enemyManager = readFileSync('src/managers/EnemyManager.js', 'utf8');
for (const marker of ['handleMarketingSpawnKey', 'activateMarketingSpawnMode']) {
  assert.match(playScene, new RegExp(marker), `Missing marketing hotkey marker in PlayScene: ${marker}`);
}
for (const marker of ['spawnMarketingDebugBoss', 'marketingDebugMode']) {
  assert.match(enemyManager, new RegExp(marker), `Missing marketing hotkey marker in EnemyManager: ${marker}`);
}

console.log('i18n checks passed');
