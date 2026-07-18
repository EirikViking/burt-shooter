import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shipSelect = readFileSync('src/scenes/ShipSelectScene.js', 'utf8');
const main = readFileSync('src/main.js', 'utf8');

const requiredTokens = [
  'function shipRecommendationScore',
  'this.recommendedShip = this.getRecommendedShip()',
  'createRecommendationBanner',
  'updateRecommendationBanner',
  'RECOMMENDED HULL',
  'USING RECOMMENDED HULL',
  'BEST UNLOCKED',
  'HANGAR SAYS THIS ONE HAS THE BEST ODDS',
  'if (!preferredSpriteKey && this.recommendedShip?.spriteKey)',
  'setSelectedShipKey(this.ships[this.selectedIndex].spriteKey)'
];

for (const token of requiredTokens) {
  assert(shipSelect.includes(token), `ShipSelectScene missing recommendation token: ${token}`);
}

assert(
  /banner\.bannerWidth\s*=\s*bannerWidth/.test(shipSelect),
  'recommendation banner must keep stable width for translated text fitting'
);
assert(
  /getShipCombatRole\(this\.recommendedShip/.test(shipSelect),
  'recommendation should explain why the hull is suggested'
);
assert(
  main.includes('shipSelect: selectedShip ?') &&
  main.includes('recommended: shipSelectScene.recommendedShip ?') &&
  main.includes('bannerVisible') &&
  main.includes('selected: shipSelectScene.recommendedShip.spriteKey === selectedShip.spriteKey'),
  'render_game_to_text must expose ship recommendation debug state'
);

const localeFiles = [
  'src/i18n/locales/de.js',
  'src/i18n/locales/es.js',
  'src/i18n/locales/ja.js',
  'src/i18n/locales/ko.js',
  'src/i18n/locales/pt-BR.js',
  'src/i18n/locales/ru.js',
  'src/i18n/locales/zh-CN.js'
];

for (const file of localeFiles) {
  const text = readFileSync(file, 'utf8');
  for (const key of ['RECOMMENDED HULL', 'USING RECOMMENDED HULL', 'BEST UNLOCKED', 'HANGAR SAYS THIS ONE HAS THE BEST ODDS']) {
    assert(text.includes(`'${key}'`), `${file} missing ${key}`);
  }
}

console.log('[ship-recommendation] PASS best unlocked hull is suggested before Launch Run');
