import { getSelectableShips } from '../src/config/ShipMetadata.js';
import {
  SHIP_THREAT_RESPONSE_TARGETS,
  applyThreatResponseToEnemyHealth,
  buildShipThreatResponse,
  calculateSustainedShipDps
} from '../src/config/ShipThreatResponse.js';

const ships = getSelectableShips();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function ratio(value, baseline) {
  return baseline > 0 ? value / baseline : 0;
}

function estimateOpeningWaveClearTime(ship, picks = 0) {
  const response = buildShipThreatResponse(ship, picks);
  const baseEnemyCount = 8;
  const count = Math.ceil(baseEnemyCount * response.enemyCountMult);
  const effectiveFodderHealth = 1 + response.hardenedFodderChance * (response.hardenedFodderHealth - 1);
  const directDraftOutput = picks > 0 ? SHIP_THREAT_RESPONSE_TARGETS.maxDirectDraftOutputMult : 1;
  return (count * effectiveFodderHealth) / (calculateSustainedShipDps(ship) * directDraftOutput);
}

function estimateOpeningBossClearTime(ship, picks = 0) {
  const response = buildShipThreatResponse(ship, picks);
  const directDraftOutput = picks > 0 ? SHIP_THREAT_RESPONSE_TARGETS.maxDirectDraftOutputMult : 1;
  return response.bossHealthMult / (calculateSustainedShipDps(ship) * directDraftOutput);
}

assert(ships.length === 30, `expected 30 selectable ships, found ${ships.length}`);

const rows = ships.map((ship) => {
  const base = buildShipThreatResponse(ship, 0);
  const fivePicks = buildShipThreatResponse(ship, 5);
  for (const [key, value] of Object.entries(base)) {
    if (typeof value === 'number') assert(Number.isFinite(value), `${ship.id} ${key} must be finite`);
  }
  assert(base.enemyCountMult === 1, `${ship.id} must preserve enemy count and score opportunity`);
  assert(base.hardenedFodderChance >= 0 && base.hardenedFodderChance <= 0.91, `${ship.id} hardened chance out of range`);
  assert(base.bossHealthMult >= 1 && base.bossHealthMult <= 1.91, `${ship.id} bossHealthMult out of range`);
  assert(fivePicks.enemyCountMult >= base.enemyCountMult, `${ship.id} Draft picks reduced enemy count response`);
  assert(fivePicks.bossHealthMult >= base.bossHealthMult, `${ship.id} Draft picks reduced boss response`);
  assert(fivePicks.enemyFireDelayMult <= base.enemyFireDelayMult, `${ship.id} Draft picks reduced fire pressure`);
  return {
    id: ship.id,
    name: ship.name,
    dps: Number(base.sustainedDps.toFixed(2)),
    ratio: base.dpsRatio,
    response: base.responseLevel,
    count: base.enemyCountMult,
    hardened: base.hardenedFodderChance,
    durableHp: base.durableHealthMult,
    bossHp: base.bossHealthMult,
    waveTime: Number(estimateOpeningWaveClearTime(ship).toFixed(4)),
    bossTime: Number(estimateOpeningBossClearTime(ship).toFixed(4))
  };
});

const starterShip = ships.find((ship) => ship.id === 'nova_ship_01');
const midShip = ships.find((ship) => ship.id === 'nova_ship_13');
const lateShip = ships.find((ship) => ship.id === 'nova_ship_25');
const eirik = ships.find((ship) => ship.id === 'nova_ship_30');
for (const [label, ship] of [['starter', starterShip], ['mid', midShip], ['late', lateShip], ['Eirik', eirik]]) {
  assert(Boolean(ship), `missing ${label} representative ship`);
}

if (starterShip && midShip && lateShip && eirik) {
  const starter = buildShipThreatResponse(starterShip, 0);
  const eirikBase = buildShipThreatResponse(eirik, 0);
  const eirikDraft = buildShipThreatResponse(eirik, 5);
  assert(starter.responseLevel === 'STANDARD', `starter response should be STANDARD, found ${starter.responseLevel}`);
  assert(starter.enemyCountMult === 1, `starter count response should be neutral, found ${starter.enemyCountMult}`);
  assert(eirikBase.responseLevel === 'APEX', `Eirik response should be APEX, found ${eirikBase.responseLevel}`);
  assert(eirikBase.enemyCountMult === 1, `Eirik must preserve the shared enemy-count and score budget, found ${eirikBase.enemyCountMult}`);
  assert(eirikBase.bossHealthMult >= 1.89, `Eirik should receive about 90% boss health response, found ${eirikBase.bossHealthMult}`);
  assert(eirikDraft.bossHealthMult > eirikBase.bossHealthMult, 'five Draft picks should further raise Eirik boss response');

  const starterWave = estimateOpeningWaveClearTime(starterShip);
  const starterBoss = estimateOpeningBossClearTime(starterShip);
  for (const [label, ship] of [['mid', midShip], ['late', lateShip], ['Eirik', eirik]]) {
    const waveRelative = ratio(estimateOpeningWaveClearTime(ship), starterWave);
    const bossRelative = ratio(estimateOpeningBossClearTime(ship), starterBoss);
    assert(waveRelative >= 0.5, `${label} opening wave clear estimate is still too trivial: ${waveRelative.toFixed(3)}x starter time`);
    assert(bossRelative >= 0.45, `${label} opening boss clear estimate is still too trivial: ${bossRelative.toFixed(3)}x starter time`);
  }
}

let accumulator = 0;
let hardenedCount = 0;
let hardenedHealth = 0;
const apex = eirik ? buildShipThreatResponse(eirik, 0) : null;
for (let index = 0; index < 300; index += 1) {
  const result = applyThreatResponseToEnemyHealth(1, apex, accumulator);
  accumulator = result.accumulator;
  if (result.hardened) {
    hardenedCount += 1;
    hardenedHealth = result.health;
  }
}
assert(hardenedCount >= 252 && hardenedCount <= 256, `APEX deterministic fodder hardening expected about 254/300, found ${hardenedCount}`);
assert(hardenedHealth === 3, `APEX hardened fodder should take three base hits, found ${hardenedHealth}`);

console.table(rows);
if (errors.length) {
  console.error(`[ship-threat-response] FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`[ship-threat-response] PASS ships=${rows.length} hardened=${hardenedCount}/300`);
}
