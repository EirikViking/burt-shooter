// Collectible rewards are independent of combat power-ups.
export const BONUS_CORES = Object.freeze([
  ['treasure', 0x52dcff, 1.5, .8],
  ['pursuit', 0xff873e, 2.8, 1.1],
  ['daredevil', 0x80ff99, 2, .95],
  ['survivor', 0xe08cff, 2.6, 1],
  ['hunter', 0xffce62, 3.1, 1.15],
  ['collector', 0x669fff, 2.4, 1],
  ['constellation', 0xff82b2, 1.8, .85],
  ['jackpot', 0xa6ffff, 2.2, .9],
  ['archive', 0xc4a5ff, 2.7, 1.05],
  ['relic', 0xffee78, 3.2, 1.2]
].map(([reward, color, speed, descent], index) => Object.freeze({
  id: `bonus_core_${reward}`, reward, color, speed, descent, index,
  sound: `core_${reward}`,
  art: `/art/core-serpent/core-${String(index + 1).padStart(2, '0')}-imagegen.png`
})));

export function pickBonusCore(roll) {
  return BONUS_CORES[Math.min(9, Math.max(0, Math.floor((Number(roll) || 0) * 10)))];
}
