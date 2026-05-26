export const SUPPORTED_SHIP_UNLOCK_REQUIREMENT_KEYS = Object.freeze([
  'bestScore',
  'bestSector',
  'totalBossesDefeated',
  'totalWavesCleared',
  'totalRuns',
  'pilotRank',
  'runClears',
  'codexDiscoveries',
  'noHitWaves',
  'noHitSectors',
  'survivedSeconds',
  'specificThreatDiscovered',
  'specificBossDefeated',
  'specificRunThemeSurvived',
  'clearWithLivesRemaining',
  'highestScoreMultiplier'
]);

export const ShipUnlockConfig = Object.freeze([
  {
    shipId: 'nova_ship_01',
    label: 'Available now',
    requirements: {},
    legacyLevel: 1
  },
  {
    shipId: 'nova_ship_02',
    label: 'Finish 1 run or reach sector 2',
    requirementsAny: [{ totalRuns: 1 }, { bestSector: 2 }],
    legacyLevel: 2
  },
  {
    shipId: 'nova_ship_03',
    label: 'Defeat 1 boss',
    requirements: { totalBossesDefeated: 1 },
    legacyLevel: 3
  },
  {
    shipId: 'nova_ship_04',
    label: 'Reach sector 4',
    requirements: { bestSector: 4 },
    legacyLevel: 4
  },
  {
    shipId: 'nova_ship_05',
    label: 'Score 50,000 in one run',
    requirements: { bestScore: 50000 },
    legacyLevel: 5
  },
  {
    shipId: 'nova_ship_06',
    label: 'Defeat 6 total bosses',
    requirements: { totalBossesDefeated: 6 },
    legacyLevel: 7
  },
  {
    shipId: 'nova_ship_07',
    label: 'Discover 40 Threat Codex entries',
    requirements: { codexDiscoveries: 40 },
    legacyLevel: 9
  },
  {
    shipId: 'nova_ship_08',
    label: 'Reach sector 6',
    requirements: { bestSector: 6 },
    legacyLevel: 11
  },
  {
    shipId: 'nova_ship_09',
    label: 'Clear 30 total waves',
    requirements: { totalWavesCleared: 30 },
    legacyLevel: 14
  },
  {
    shipId: 'nova_ship_10',
    label: 'Score 100,000 in one run',
    requirements: { bestScore: 100000 },
    legacyLevel: 17
  },
  {
    shipId: 'nova_ship_11',
    label: 'Reach pilot rank 8',
    requirements: { pilotRank: 8 },
    legacyLevel: 20
  },
  {
    shipId: 'nova_ship_12',
    label: 'Survive 15 minutes',
    requirements: { survivedSeconds: 900 },
    legacyLevel: 23
  },
  {
    shipId: 'nova_ship_13',
    label: 'Defeat 18 total bosses',
    requirements: { totalBossesDefeated: 18 },
    legacyLevel: 26
  },
  {
    shipId: 'nova_ship_14',
    label: 'Discover 75 Threat Codex entries',
    requirements: { codexDiscoveries: 75 },
    legacyLevel: 29
  },
  {
    shipId: 'nova_ship_15',
    label: 'Score 175,000 in one run',
    requirements: { bestScore: 175000 },
    legacyLevel: 32
  },
  {
    shipId: 'nova_ship_16',
    label: 'Complete a no-hit wave or sector',
    requirementsAny: [{ noHitWaves: 1 }, { noHitSectors: 1 }],
    legacyLevel: 35
  },
  {
    shipId: 'nova_ship_17',
    label: 'Reach sector 8',
    requirements: { bestSector: 8 },
    legacyLevel: 38
  },
  {
    shipId: 'nova_ship_18',
    label: 'Defeat 35 total bosses',
    requirements: { totalBossesDefeated: 35 },
    legacyLevel: 41
  },
  {
    shipId: 'nova_ship_19',
    label: 'Survive encounters from 4 run themes',
    requirements: { specificRunThemeSurvived: 4 },
    legacyLevel: 44
  },
  {
    shipId: 'nova_ship_20',
    label: 'Score 300,000 in one run',
    requirements: { bestScore: 300000 },
    legacyLevel: 47
  },
  {
    shipId: 'nova_ship_21',
    label: 'Reach the final climax sector',
    requirements: { bestSector: 10 },
    legacyLevel: 50
  },
  {
    shipId: 'nova_ship_22',
    label: 'Discover 120 Threat Codex entries',
    requirements: { codexDiscoveries: 120 },
    legacyLevel: 53
  },
  {
    shipId: 'nova_ship_23',
    label: 'Clear the current run',
    requirements: { runClears: 1 },
    legacyLevel: 56
  },
  {
    shipId: 'nova_ship_24',
    label: 'Clear with 2 lives remaining or score 500,000',
    requirementsAny: [{ clearWithLivesRemaining: 2 }, { bestScore: 500000 }],
    legacyLevel: 58
  },
  {
    shipId: 'nova_ship_25',
    label: 'Clear the run and discover 145 threats',
    requirements: { runClears: 1, codexDiscoveries: 145 },
    legacyLevel: 60
  }
]);

export const SHIP_UNLOCK_BY_ID = Object.freeze(Object.fromEntries(
  ShipUnlockConfig.map((entry) => [entry.shipId, Object.freeze(entry)])
));

export function getShipUnlockDefinition(shipId) {
  return SHIP_UNLOCK_BY_ID[shipId] || null;
}
