// One shared budget for ordinary appearances and snake loot. Uniform 2–4
// sector gaps average three sectors and prevent adjacent-sector clusters.
export const rollCoreSectorGap = roll => 2 + Math.min(2, Math.max(0, Math.floor((Number(roll) || 0) * 3)));
export function makeCoreCadence(level, roll = Math.random) {
  return { nextLevel: Math.max(1, Number(level) || 1) - 1 + rollCoreSectorGap(roll()), waveRoll: roll(), entryDelay: 1 + roll() * 3, age: 0, waveKey: '' };
}
export function spendCoreCadence(cadence, level, roll = Math.random) {
  cadence.nextLevel = level + rollCoreSectorGap(roll());
  cadence.waveRoll = roll(); cadence.entryDelay = 1 + roll() * 3; cadence.age = 0; cadence.waveKey = '';
}
