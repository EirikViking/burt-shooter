import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getOverrunMilestoneCelebration } from '../src/config/OverrunMilestoneCelebrations.js';
import { de } from '../src/i18n/locales/de.js';
import { es } from '../src/i18n/locales/es.js';
import { ja } from '../src/i18n/locales/ja.js';
import { ko } from '../src/i18n/locales/ko.js';
import { ptBR } from '../src/i18n/locales/pt-BR.js';
import { ru } from '../src/i18n/locales/ru.js';
import { zhCN } from '../src/i18n/locales/zh-CN.js';
import { translateTextForLocale } from '../src/i18n/index.js';

const locales = [
  ['de', de],
  ['es', es],
  ['ru', ru],
  ['zh-CN', zhCN],
  ['pt-BR', ptBR],
  ['ko', ko],
  ['ja', ja]
];
const identityWhitelist = new Set([
  'Nova Swarm',
  'Cabinet',
  'ENTER',
  'ESC',
  'A',
  'B'
]);
const modalFields = ['title', 'flavor', 'statusLine', 'warning', 'continueText'];
const modalKeys = new Set([
  'OVERRUN MILESTONE',
  'PILOT REPORT',
  'STRAP IN, PILOT. OVERRUN DOES NOT DO EASY.',
  'CLEAR BONUS +{clearBonus}  SPARE HULLS +{livesBonus}'
]);

for (const sector of [10, 20, 30, 40, 50, 60]) {
  const celebration = getOverrunMilestoneCelebration({
    milestoneSector: sector,
    eventKind: sector === 10 ? 'run_clear' : 'overrun_milestone'
  });
  for (const field of modalFields) {
    if (celebration[field]) modalKeys.add(celebration[field]);
  }
  if (celebration.reward?.label) modalKeys.add(celebration.reward.label);
}

const vars = {
  sector: 10,
  nextSector: 11,
  score: '123,456',
  rank: 7,
  lives: 3,
  clearBonus: '10,000',
  livesBonus: '5,000'
};
const failures = [];
for (const key of modalKeys) {
  const english = translateTextForLocale('en', key, vars);
  for (const [code, locale] of locales) {
    const raw = locale.sourceText?.[key];
    if (raw == null) {
      failures.push(`${code}: missing exact Overrun modal key ${JSON.stringify(key)}`);
      continue;
    }
    const translated = translateTextForLocale(code, key, vars);
    if (translated === english && !identityWhitelist.has(key)) {
      failures.push(`${code}: base-English fallback for Overrun modal key ${JSON.stringify(key)}`);
    }
  }
}

const sectorTen = getOverrunMilestoneCelebration({ milestoneSector: 10, eventKind: 'run_clear' });
assert.equal(
  sectorTen.warning,
  'SECTOR {nextSector} WILL NOT BE POLITE',
  'Sector 10 warning must use the same nextSector placeholder as the modal runtime'
);

const evidenceSources = [
  'scripts/check-notification-orchestration.mjs',
  'scripts/check-packaged-nova-command-hud-gate4.mjs'
];
const forbiddenSyntheticFallbacks = [
  /flavor:\s*['"]THE CLEAR GATE OPENS\.['"]/,
  /footerWarning:\s*['"]STRAP IN, PILOT\.['"]/
];
for (const file of evidenceSources) {
  const source = readFileSync(file, 'utf8');
  for (const pattern of forbiddenSyntheticFallbacks) {
    assert.doesNotMatch(
      source,
      pattern,
      `${file} injects a shortened English-only Overrun sentence instead of an established localization key`
    );
  }
}

assert.deepEqual(
  failures,
  [],
  `Overrun modal localization fallbacks detected:\n${failures.join('\n')}`
);
console.log(
  `[overrun-localization] PASS locales=${locales.length + 1} modalKeys=${modalKeys.size} identityWhitelist=${identityWhitelist.size}`
);
