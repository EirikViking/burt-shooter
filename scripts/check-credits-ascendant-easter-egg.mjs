import assert from 'node:assert/strict';
import {
  CREDITS_ASCENDANT_EASTER_EGG_CHANCE,
  CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS,
  CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID,
  HANGAR_PROGRESS_KEY,
  readHangarProgressState,
  rollCreditsAscendantEasterEgg
} from '../src/progression/HangarProgressState.js';

const fakeStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => fakeStorage.get(key) ?? null,
  setItem: (key, value) => fakeStorage.set(key, String(value)),
  removeItem: (key) => fakeStorage.delete(key)
};

assert.equal(CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID, 'nova_ship_30', 'credits ascendant egg should target the endgame ship');
assert.equal(CREDITS_ASCENDANT_EASTER_EGG_CHANCE, 0.002, 'credits ascendant egg chance should stay at 0.2%');
assert.equal(CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS, 25, 'credits ascendant egg should be capped at 25 attempts');

for (let i = 1; i <= CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS; i += 1) {
  const result = rollCreditsAscendantEasterEgg({ random: () => 0.999 });
  assert.equal(result.attempted, true, `miss ${i} should consume an attempt`);
  assert.equal(result.success, false, `miss ${i} should not succeed`);
  assert.equal(result.attempts, i, `miss ${i} should persist attempt count`);
  assert.equal(result.unlocked, false, `miss ${i} should not unlock Eirik`);
}

const capped = rollCreditsAscendantEasterEgg({ random: () => 0 });
assert.equal(capped.attempted, false, 'attempt 26 should be blocked');
assert.equal(capped.exhausted, true, 'attempt 26 should report exhausted');
assert.equal(capped.attempts, CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS, 'attempt cap should remain persisted');
assert.equal(readHangarProgressState().unlockedShipIds.includes(CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID), false, 'missed cap should not unlock Eirik');

fakeStorage.delete(HANGAR_PROGRESS_KEY);
const jackpot = rollCreditsAscendantEasterEgg({ random: () => 0 });
const progress = readHangarProgressState();
assert.equal(jackpot.attempted, true, 'forced jackpot should consume one attempt');
assert.equal(jackpot.success, true, 'forced jackpot should succeed');
assert.equal(jackpot.unlocked, true, 'forced jackpot should unlock Eirik');
assert.equal(progress.creditsAscendantEasterEggFound, true, 'jackpot should persist found state');
assert.equal(progress.creditsAscendantEasterEggAttempts, 1, 'jackpot should persist attempt count');
assert(progress.secretShipUnlockIds.includes(CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID), 'jackpot should mark Eirik as a secret unlock');
assert(progress.unlockedShipIds.includes(CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID), 'jackpot should add Eirik to unlocked ships');

console.log(
  `[credits-ascendant-easter-egg] PASS chance=${CREDITS_ASCENDANT_EASTER_EGG_CHANCE} ` +
  `maxAttempts=${CREDITS_ASCENDANT_EASTER_EGG_MAX_ATTEMPTS} ship=${CREDITS_ASCENDANT_EASTER_EGG_SHIP_ID}`
);
