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
    label: 'Reach sector 3',
    requirements: { bestSector: 3 },
    legacyLevel: 4
  },
  {
    shipId: 'nova_ship_05',
    label: 'Score 25,000 in one run',
    requirements: { bestScore: 25000 },
    legacyLevel: 5
  },
  {
    shipId: 'nova_ship_06',
    label: 'Defeat 3 total bosses',
    requirements: { totalBossesDefeated: 3 },
    legacyLevel: 7
  },
  {
    shipId: 'nova_ship_07',
    label: 'Discover 5 Threat Codex entries',
    requirements: { codexDiscoveries: 5 },
    legacyLevel: 9
  },
  {
    shipId: 'nova_ship_08',
    label: 'Reach sector 5',
    requirements: { bestSector: 5 },
    legacyLevel: 11
  },
  {
    shipId: 'nova_ship_09',
    label: 'Clear 10 total waves',
    requirements: { totalWavesCleared: 10 },
    legacyLevel: 14
  },
  {
    shipId: 'nova_ship_10',
    label: 'Score 75,000 in one run',
    requirements: { bestScore: 75000 },
    legacyLevel: 17
  },
  {
    shipId: 'nova_ship_11',
    label: 'Reach pilot rank 6',
    requirements: { pilotRank: 6 },
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
    label: 'Defeat 10 total bosses',
    requirements: { totalBossesDefeated: 10 },
    legacyLevel: 26
  },
  {
    shipId: 'nova_ship_14',
    label: 'Discover 15 Threat Codex entries',
    requirements: { codexDiscoveries: 15 },
    legacyLevel: 29
  },
  {
    shipId: 'nova_ship_15',
    label: 'Score 150,000 in one run',
    requirements: { bestScore: 150000 },
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
    label: 'Defeat 20 total bosses',
    requirements: { totalBossesDefeated: 20 },
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
    label: 'Score 250,000 in one run',
    requirements: { bestScore: 250000 },
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
    label: 'Discover 35 Threat Codex entries',
    requirements: { codexDiscoveries: 35 },
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
    label: 'Clear with 2 lives remaining or score 400,000',
    requirementsAny: [{ clearWithLivesRemaining: 2 }, { bestScore: 400000 }],
    legacyLevel: 58
  },
  {
    shipId: 'nova_ship_25',
    label: 'Clear the run and discover 50 threats',
    requirements: { runClears: 1, codexDiscoveries: 50 },
    legacyLevel: 60
  }
]);

export const SHIP_UNLOCK_BY_ID = Object.freeze(Object.fromEntries(
  ShipUnlockConfig.map((entry) => [entry.shipId, Object.freeze(entry)])
));

export function getShipUnlockDefinition(shipId) {
  return SHIP_UNLOCK_BY_ID[shipId] || null;
}
