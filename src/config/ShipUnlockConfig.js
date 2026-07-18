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
    label: 'Reach sector 4 and pilot rank 1',
    requirements: { bestSector: 4, pilotRank: 1 },
    legacyLevel: 4
  },
  {
    shipId: 'nova_ship_05',
    label: 'Score 50,000 and reach pilot rank 4',
    requirements: { bestScore: 50000, pilotRank: 4 },
    legacyLevel: 5
  },
  {
    shipId: 'nova_ship_06',
    label: 'Defeat 10 bosses and reach pilot rank 4',
    requirements: { totalBossesDefeated: 10, pilotRank: 4 },
    legacyLevel: 7
  },
  {
    shipId: 'nova_ship_07',
    label: 'Discover 45 Codex entries and reach pilot rank 4',
    requirements: { codexDiscoveries: 45, pilotRank: 4 },
    legacyLevel: 9
  },
  {
    shipId: 'nova_ship_08',
    label: 'Reach sector 8 and pilot rank 4',
    requirements: { bestSector: 8, pilotRank: 4 },
    legacyLevel: 11
  },
  {
    shipId: 'nova_ship_09',
    label: 'Clear 45 waves and reach pilot rank 5',
    requirements: { totalWavesCleared: 45, pilotRank: 5 },
    legacyLevel: 14
  },
  {
    shipId: 'nova_ship_10',
    label: 'Score 140,000 in one run',
    requirements: { bestScore: 140000 },
    legacyLevel: 17
  },
  {
    shipId: 'nova_ship_11',
    label: 'Reach pilot rank 9',
    requirements: { pilotRank: 9 },
    legacyLevel: 20
  },
  {
    shipId: 'nova_ship_12',
    label: 'Survive 20 minutes and reach pilot rank 11',
    requirements: { survivedSeconds: 1200, pilotRank: 11 },
    legacyLevel: 23
  },
  {
    shipId: 'nova_ship_13',
    label: 'Defeat 24 total bosses and reach pilot rank 12',
    requirements: { totalBossesDefeated: 24, pilotRank: 12 },
    legacyLevel: 26
  },
  {
    shipId: 'nova_ship_14',
    label: 'Discover 130 Threat Codex entries and reach pilot rank 12',
    requirements: { codexDiscoveries: 130, pilotRank: 12 },
    legacyLevel: 29
  },
  {
    shipId: 'nova_ship_15',
    label: 'Score 220,000 in one run',
    requirements: { bestScore: 220000 },
    legacyLevel: 32
  },
  {
    shipId: 'nova_ship_16',
    label: 'Complete 8 no-hit waves and reach pilot rank 11',
    requirements: { noHitWaves: 8, pilotRank: 11 },
    legacyLevel: 35
  },
  {
    shipId: 'nova_ship_17',
    label: 'Reach sector 12 and pilot rank 9',
    requirements: { bestSector: 12, pilotRank: 9 },
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
    label: 'Survive encounters from 5 run themes and reach pilot rank 13',
    requirements: { specificRunThemeSurvived: 5, pilotRank: 13 },
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
    label: 'Reach sector 15 in overrun and pilot rank 13',
    requirements: { bestSector: 15, pilotRank: 13 },
    legacyLevel: 50
  },
  {
    shipId: 'nova_ship_22',
    label: 'Discover 160 Threat Codex entries and reach pilot rank 14',
    requirements: { codexDiscoveries: 160, pilotRank: 14 },
    legacyLevel: 53
  },
  {
    shipId: 'nova_ship_23',
    label: 'Clear the arcade run 3 times and reach pilot rank 14',
    requirements: { runClears: 3, pilotRank: 14 },
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
    label: 'Clear twice, reach rank 16, and discover 180 threats',
    requirements: { runClears: 2, pilotRank: 16, codexDiscoveries: 180 },
    legacyLevel: 60
  },
  {
    shipId: 'nova_ship_26',
    label: 'Unlocks at Level 30',
    requirements: { bestSector: 30 },
    legacyLevel: 30
  },
  {
    shipId: 'nova_ship_27',
    label: 'Unlocks at Level 35',
    requirements: { bestSector: 35 },
    legacyLevel: 35
  },
  {
    shipId: 'nova_ship_28',
    label: 'Unlocks at Level 40',
    requirements: { bestSector: 40 },
    legacyLevel: 40
  },
  {
    shipId: 'nova_ship_29',
    label: 'Unlocks at Level 45',
    requirements: { bestSector: 45 },
    legacyLevel: 45
  },
  {
    shipId: 'nova_ship_30',
    label: 'Unlocks at Level 50',
    requirements: { bestSector: 50 },
    legacyLevel: 50
  }
]);

export const SHIP_UNLOCK_BY_ID = Object.freeze(Object.fromEntries(
  ShipUnlockConfig.map((entry) => [entry.shipId, Object.freeze(entry)])
));

export function getShipUnlockDefinition(shipId) {
  return SHIP_UNLOCK_BY_ID[shipId] || null;
}
