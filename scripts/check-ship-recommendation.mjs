import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  HANGAR_RECOMMENDATION_ACK_KEY,
  acknowledgeHangarRecommendation,
  getHangarRecommendationKey,
  isHangarRecommendationAcknowledged
} from '../src/config/HangarRecommendationSettings.js';

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
  'DISMISS RECOMMENDATION',
  'DISMISS RECOMMENDATION [X]',
  'this.recommendationDismissed = isHangarRecommendationAcknowledged(this.recommendedShip)',
  "this.dismissRecommendation('keyboard')",
  "this.dismissRecommendation('controller')",
  'setSelectedShipKey(this.ships[this.selectedIndex].spriteKey)'
];

for (const token of requiredTokens) {
  assert(shipSelect.includes(token), `ShipSelectScene missing recommendation token: ${token}`);
}

assert(
  /banner\.bannerWidth\s*=\s*bannerWidth/.test(shipSelect),
  'recommendation banner must keep stable width for translated text fitting'
);
assert(!shipSelect.includes('recommendedIndex'), 'recommendation must never force ship selection');
assert(!shipSelect.includes('newlyUnlockedSpriteKey'), 'unlock presentation must not replace the manually selected hull');
assert(
  shipSelect.includes("this.saveSelection(ship.spriteKey, { syncCloud: false })"),
  'manual navigation should persist the last unlocked selection without forcing a cloud write on every step'
);
assert(
  shipSelect.indexOf('else if (canRestoreSelection)') > shipSelect.indexOf('if (preferredSpriteKey && isValidShipKey(preferredSpriteKey))'),
  'saved unlocked selection should be restored after an explicit preferred selection check'
);
assert(
  shipSelect.includes('const compact = width < 760') && !shipSelect.includes('if (!recommended || width < 760) return'),
  'recommendation must stay available on compact layouts'
);
assert(
  /getShipCombatRole\(this\.recommendedShip/.test(shipSelect),
  'recommendation should explain why the hull is suggested'
);
assert(
  main.includes('shipSelect: selectedShip ?') &&
  main.includes('recommended: shipSelectScene.recommendedShip ?') &&
  main.includes('bannerVisible') &&
  main.includes('dismissed: Boolean(shipSelectScene.recommendationDismissed)') &&
  main.includes('recommendationKey: shipSelectScene.recommendationKey || null') &&
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
  for (const key of ['RECOMMENDED HULL', 'USING RECOMMENDED HULL', 'BEST UNLOCKED', 'HANGAR SAYS THIS ONE HAS THE BEST ODDS', 'DISMISS RECOMMENDATION [X]']) {
    assert(text.includes(`'${key}'`), `${file} missing ${key}`);
  }
}

const values = new Map();
const storage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value))
};
const first = { id: 'nova_ship_29', spriteKey: 'nova-player-ship-29.png', unlock: { level: 45 } };
const second = { id: 'nova_ship_30', spriteKey: 'nova-player-ship-30.png', unlock: { level: 50 } };
assert.equal(getHangarRecommendationKey(first), 'nova_ship_29:level-45');
assert.equal(isHangarRecommendationAcknowledged(first, storage), false);
assert.equal(acknowledgeHangarRecommendation(first, storage), true);
assert.equal(isHangarRecommendationAcknowledged(first, storage), true, 'acknowledgement should survive scene reconstruction');
assert.equal(isHangarRecommendationAcknowledged(second, storage), false, 'a different recommendation should remain visible');
assert(values.has(HANGAR_RECOMMENDATION_ACK_KEY), 'acknowledgement should use the stable persisted key');

console.log('[ship-recommendation] PASS advisory recommendation preserves manual selection and persists keyed dismissal');
