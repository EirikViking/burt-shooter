import assert from 'node:assert/strict';
import {
  DAILY_CABINET_SIGNAL_FINISH_SECTOR,
  DAILY_CABINET_SIGNAL_LOANER_SHIPS_V1,
  DAILY_CABINET_SIGNAL_RULES_VERSION,
  canonicalRulesHash,
  deriveDailySignalContract,
  getDailySignalResetSeconds,
  isDailySignalReinforcementSector,
  isDailySignalSuperStormSector,
  validateDailySignalContract
} from '../src/config/DailyCabinetSignal.js';

const now = new Date('2026-07-15T12:34:56.000Z');
const contract = deriveDailySignalContract(now);
const repeated = deriveDailySignalContract('2026-07-15');

assert.deepEqual(contract, repeated, 'same UTC day must derive the same immutable contract');
assert.equal(contract.dailyKey, '2026-07-15');
assert.equal(contract.rulesVersion, DAILY_CABINET_SIGNAL_RULES_VERSION);
assert.equal(contract.finishSector, DAILY_CABINET_SIGNAL_FINISH_SECTOR);
assert.equal(contract.rulesHash, canonicalRulesHash(contract));
assert.ok(DAILY_CABINET_SIGNAL_LOANER_SHIPS_V1.includes(contract.loanerShipKey));
assert.equal(contract.onlineCompetitive, false, 'stage-one Daily Signal must remain local-only');
assert.deepEqual(validateDailySignalContract(contract, { now }), {
  valid: true,
  active: true,
  errors: [],
  contract
});
assert.equal(getDailySignalResetSeconds(contract, now), 41104);

const tampered = { ...contract, finishSector: 11 };
const tamperedValidation = validateDailySignalContract(tampered, { now });
assert.equal(tamperedValidation.valid, false);
assert.ok(tamperedValidation.errors.includes('invalid_finish_sector'));
assert.ok(tamperedValidation.errors.includes('rules_hash_mismatch'));

function assertRehashedTamperRejected(changes, label) {
  const candidate = {
    ...contract,
    ...changes
  };
  candidate.rulesHash = canonicalRulesHash(candidate);
  assert.notEqual(candidate.rulesHash, contract.rulesHash, `${label}: rules hash must cover the changed field`);
  const validation = validateDailySignalContract(candidate, { now });
  assert.equal(validation.valid, false, `${label}: a rehashed mutation must still fail the derived daily contract`);
  assert.ok(validation.errors.some((error) => error.startsWith('contract_mismatch_')), `${label}: expected immutable contract mismatch`);
}

assertRehashedTamperRejected({ seed: `${contract.seed}:mutated` }, 'seed tamper');
assertRehashedTamperRejected({ reinforcementSectors: [...contract.reinforcementSectors, 10] }, 'reinforcement route tamper');
assertRehashedTamperRejected({ superStormSectors: [...contract.superStormSectors, 9] }, 'Super Storm route tamper');
assertRehashedTamperRejected({ validUntil: '2026-07-17T00:00:00.000Z' }, 'expiry extension tamper');
assertRehashedTamperRejected({ loanerShipKey: DAILY_CABINET_SIGNAL_LOANER_SHIPS_V1[5] }, 'loaner tamper');
assertRehashedTamperRejected({ templateId: 'crossfire_blackout', runThemeId: 'crossfire_doctrine' }, 'template tamper');

const expiredValidation = validateDailySignalContract(contract, { now: new Date('2026-07-16T00:00:00.000Z') });
assert.equal(expiredValidation.valid, false);
assert.ok(expiredValidation.errors.includes('expired'));

const calendar = Array.from({ length: 31 }, (_, index) => deriveDailySignalContract(`2026-07-${String(index + 1).padStart(2, '0')}`));
assert.ok(new Set(calendar.map((entry) => entry.loanerShipKey)).size >= 12, 'the explicit loaner roster should visibly rotate');
assert.ok(new Set(calendar.map((entry) => entry.templateId)).size >= 3, 'all route templates should rotate within a month');

const siege = calendar.find((entry) => entry.templateId === 'reinforcement_siege');
assert.ok(siege, 'reinforcement siege must exist in the tested rotation');
assert.equal(isDailySignalReinforcementSector(siege, 3), true);
assert.equal(isDailySignalReinforcementSector(siege, 4), false);
assert.equal(isDailySignalSuperStormSector(siege, 8), true);
assert.equal(isDailySignalSuperStormSector(siege, 9), false);

console.log('[check-daily-signal-contract] PASS', {
  dailyKey: contract.dailyKey,
  loanerShipKey: contract.loanerShipKey,
  templateId: contract.templateId,
  rulesHash: contract.rulesHash,
  finishSector: contract.finishSector,
  onlineCompetitive: contract.onlineCompetitive
});
