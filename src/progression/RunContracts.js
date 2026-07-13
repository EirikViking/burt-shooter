import { BUILD_ID } from '../buildInfo.js';
import { RUN_MODES, normalizeRunMode } from '../game/RunMode.js';

export const RUN_CONTRACTS_VERSION = 8;
export const RUN_CONTRACT_ACTIVE_LIMIT = 3;
export const RUN_CONTRACT_REWARDS_ENABLED = true;
export const RUN_CONTRACT_REWARD_XP_BASE = 175;
export const RUN_CONTRACT_REWARD_XP_STEP = 5;
export const RUN_CONTRACT_REWARD_XP_CAP = 420;

const MAYHEM_MODES = Object.freeze([RUN_MODES.RANKED]);

function defineContract(config = {}) {
  return Object.freeze({
    modeLabel: 'Mayhem',
    modes: MAYHEM_MODES,
    accent: 0x37f5ff,
    ...config,
    ...(Array.isArray(config.powerupTypes) ? { powerupTypes: Object.freeze([...config.powerupTypes]) } : {})
  });
}

export const RUN_CONTRACT_CATALOG = Object.freeze([
  defineContract({
    id: 'graze_10',
    title: 'Graze Cadet',
    shortTitle: 'Graze x10',
    description: 'Graze 10 bullets in Mayhem.',
    shortDescription: 'Graze 10 bullets.',
    objective: 'grazes',
    target: 10,
    persistAcrossRuns: true,
    group: 'graze_count',
    accent: 0x9cfbff
  }),
  defineContract({
    id: 'boss_breaker',
    title: 'Boss Breaker',
    shortTitle: 'Boss Breaker',
    description: 'Defeat your first boss in Mayhem.',
    shortDescription: 'Defeat a Mayhem boss.',
    objective: 'boss_defeated',
    target: 1,
    group: 'boss_intro',
    accent: 0xffd15c
  }),
  defineContract({
    id: 'enemy_sweep_1000',
    title: 'Enemy Sweep I',
    shortTitle: '1000 Enemies',
    description: 'Destroy 1000 total enemies in Mayhem.',
    shortDescription: 'Destroy 1000 enemies.',
    objective: 'enemy_defeats',
    target: 1000,
    persistAcrossRuns: true,
    group: 'enemy_kills',
    accent: 0xff8f5a
  }),
  defineContract({
    id: 'support_hunter',
    title: 'Support Hunter',
    shortTitle: 'Support Hunter',
    description: 'Destroy 2 boss support ships.',
    shortDescription: 'Destroy 2 support ships.',
    objective: 'boss_support_defeats',
    target: 2,
    group: 'support_kills',
    accent: 0x7fffd8
  }),
  defineContract({
    id: 'phase_runner',
    title: 'Phase Runner',
    shortTitle: 'Phase Runner',
    description: 'Use Phase through dangerous bullets.',
    shortDescription: 'Phase through dangerous bullets.',
    objective: 'phase_through_danger',
    target: 1,
    group: 'phase',
    accent: 0x9cfbff
  }),
  defineContract({
    id: 'powerup_collector_10',
    title: 'Powerup Pilot I',
    shortTitle: '10 Powerups',
    description: 'Collect 10 powerups in Mayhem.',
    shortDescription: 'Collect 10 powerups.',
    objective: 'powerup_collected',
    target: 10,
    persistAcrossRuns: true,
    group: 'powerup_total',
    accent: 0x66ffdd
  }),
  defineContract({
    id: 'near_miss_streak',
    title: 'Near-Miss Streak',
    shortTitle: 'Near-Miss Streak',
    description: 'Build a 5x near-miss streak.',
    shortDescription: 'Reach a 5x near-miss streak.',
    objective: 'near_miss_streak',
    target: 5,
    group: 'near_miss',
    accent: 0xffef7e
  }),
  defineContract({
    id: 'shield_pickup',
    title: 'Shield Check',
    shortTitle: 'Shield Check',
    description: 'Collect a Shield powerup in Mayhem.',
    shortDescription: 'Collect Shield.',
    objective: 'powerup_collected',
    target: 1,
    powerupTypes: ['shield'],
    group: 'shield_powerup',
    accent: 0x7fffd8
  }),
  defineContract({
    id: 'slow_mo_finisher',
    title: 'Slow-Mo Finisher',
    shortTitle: 'Slow-Mo Finisher',
    description: 'Defeat a boss while Slow Time or Chrono Anchor is active.',
    shortDescription: 'Boss defeat during Slow Time.',
    objective: 'boss_slow_time_defeat',
    target: 1,
    group: 'slow_time',
    accent: 0x63ffe8
  }),
  defineContract({
    id: 'sector_5_survivor',
    title: 'Sector 5 Survivor',
    shortTitle: 'Sector 5 Survivor',
    description: 'Reach Sector 5 without losing a life.',
    shortDescription: 'Reach Sector 5 without life loss.',
    objective: 'sector_no_life_loss',
    target: 1,
    sectorTarget: 5,
    group: 'no_life_sector',
    accent: 0xcaa6ff
  }),
  defineContract({
    id: 'blink_control',
    title: 'Blink Control',
    shortTitle: 'Blink Control',
    description: 'Collect Blink Drive and survive long enough.',
    shortDescription: 'Collect Blink Drive and survive.',
    objective: 'blink_drive_survive',
    target: 1,
    surviveSeconds: 6,
    group: 'blink',
    accent: 0x7df9ff
  }),
  defineContract({
    id: 'sector_3_signal',
    title: 'Sector 3 Signal',
    shortTitle: 'Sector 3',
    description: 'Reach Sector 3 in Mayhem.',
    shortDescription: 'Reach Sector 3.',
    objective: 'sector_reached',
    target: 1,
    sectorTarget: 3,
    group: 'sector_reach',
    accent: 0xcaa6ff
  }),
  defineContract({
    id: 'bomb_pickup',
    title: 'Bomb Drill',
    shortTitle: 'Bomb Drill',
    description: 'Collect a Bomb powerup in Mayhem.',
    shortDescription: 'Collect Bomb.',
    objective: 'powerup_collected',
    target: 1,
    powerupTypes: ['bomb'],
    group: 'bomb_powerup',
    accent: 0xff8f5a
  }),
  defineContract({
    id: 'enemy_sweep_2500',
    title: 'Enemy Sweep II',
    shortTitle: '2500 Enemies',
    description: 'Destroy 2500 total enemies in Mayhem.',
    shortDescription: 'Destroy 2500 enemies.',
    objective: 'enemy_defeats',
    target: 2500,
    persistAcrossRuns: true,
    group: 'enemy_kills',
    accent: 0xffb86a
  }),
  defineContract({
    id: 'graze_50',
    title: 'Graze Pilot',
    shortTitle: 'Graze x50',
    description: 'Graze 50 bullets in Mayhem.',
    shortDescription: 'Graze 50 bullets.',
    objective: 'grazes',
    target: 50,
    persistAcrossRuns: true,
    group: 'graze_count',
    accent: 0x9cfbff
  }),
  defineContract({
    id: 'boss_hunter_10',
    title: 'Boss Hunter I',
    shortTitle: '10 Bosses',
    description: 'Defeat 10 total bosses in Mayhem.',
    shortDescription: 'Defeat 10 bosses.',
    objective: 'boss_defeats',
    target: 10,
    persistAcrossRuns: true,
    group: 'boss_kills',
    accent: 0xffd15c
  }),
  defineContract({
    id: 'support_hunter_10',
    title: 'Support Hunter I',
    shortTitle: '10 Supports',
    description: 'Destroy 10 total boss support ships.',
    shortDescription: 'Destroy 10 support ships.',
    objective: 'boss_support_defeats',
    target: 10,
    persistAcrossRuns: true,
    group: 'support_kills',
    accent: 0x7fffd8
  }),
  defineContract({
    id: 'enemy_variety_50',
    title: 'Enemy Variety I',
    shortTitle: '50 Enemy Types',
    description: 'Destroy 50 different enemy types in Mayhem.',
    shortDescription: 'Destroy 50 enemy types.',
    objective: 'unique_enemy_defeats',
    target: 50,
    persistAcrossRuns: true,
    group: 'enemy_variety',
    accent: 0x66ff9d
  }),
  defineContract({
    id: 'pilot_rank_5',
    title: 'Rank 5 Signal',
    shortTitle: 'Rank 5',
    description: 'Achieve pilot rank 5.',
    shortDescription: 'Achieve rank 5.',
    objective: 'pilot_rank_reached',
    target: 5,
    persistAcrossRuns: true,
    group: 'pilot_rank',
    accent: 0xb6f2ff
  }),
  defineContract({
    id: 'sector_7_signal',
    title: 'Sector 7 Signal',
    shortTitle: 'Sector 7',
    description: 'Reach Sector 7 in Mayhem.',
    shortDescription: 'Reach Sector 7.',
    objective: 'sector_reached',
    target: 1,
    sectorTarget: 7,
    group: 'sector_reach',
    accent: 0xcaa6ff
  }),
  defineContract({
    id: 'slow_time_pickup',
    title: 'Slow Time Drill',
    shortTitle: 'Slow Time Drill',
    description: 'Collect Slow Time in Mayhem.',
    shortDescription: 'Collect Slow Time.',
    objective: 'powerup_collected',
    target: 1,
    powerupTypes: ['slow_time'],
    group: 'slow_time_collect',
    accent: 0x63ffe8
  }),
  defineContract({
    id: 'phase_veteran_10',
    title: 'Phase Veteran',
    shortTitle: '10 Phases',
    description: 'Use Phase 10 times in Mayhem.',
    shortDescription: 'Use Phase 10 times.',
    objective: 'phase_uses',
    target: 10,
    persistAcrossRuns: true,
    group: 'phase',
    accent: 0x9cfbff
  }),
  defineContract({
    id: 'powerup_collector_25',
    title: 'Powerup Pilot II',
    shortTitle: '25 Powerups',
    description: 'Collect 25 powerups in Mayhem.',
    shortDescription: 'Collect 25 powerups.',
    objective: 'powerup_collected',
    target: 25,
    persistAcrossRuns: true,
    group: 'powerup_total',
    accent: 0x66ffdd
  }),
  defineContract({
    id: 'chrono_anchor_pickup',
    title: 'Chrono Anchor Drill',
    shortTitle: 'Chrono Anchor',
    description: 'Collect Chrono Anchor in Mayhem.',
    shortDescription: 'Collect Chrono Anchor.',
    objective: 'powerup_collected',
    target: 1,
    powerupTypes: ['chrono_anchor'],
    group: 'chrono_powerup',
    accent: 0x63ffe8
  }),
  defineContract({
    id: 'extra_life_found',
    title: 'Extra Life Found',
    shortTitle: 'Extra Life',
    description: 'Collect an extra-life powerup in Mayhem.',
    shortDescription: 'Collect an extra life.',
    objective: 'powerup_collected',
    target: 1,
    powerupTypes: ['life', 'super_extra_life'],
    group: 'extra_life_powerup',
    accent: 0x7fffd8
  }),
  defineContract({
    id: 'near_miss_streak_10',
    title: 'Close Call Specialist',
    shortTitle: 'Near-Miss x10',
    description: 'Build a 10x near-miss streak.',
    shortDescription: 'Reach a 10x near-miss streak.',
    objective: 'near_miss_streak',
    target: 10,
    group: 'near_miss',
    accent: 0xffef7e
  }),
  defineContract({
    id: 'sector_10_signal',
    title: 'Sector 10 Signal',
    shortTitle: 'Sector 10 Signal',
    description: 'Reach Sector 10 in Mayhem.',
    shortDescription: 'Reach Sector 10 in Mayhem.',
    objective: 'sector_reached',
    target: 1,
    sectorTarget: 10,
    group: 'sector_reach',
    accent: 0xcaa6ff
  }),
  defineContract({
    id: 'blink_veteran_3',
    title: 'Blink Veteran',
    shortTitle: '3 Blink Drives',
    description: 'Collect 3 Blink Drives in Mayhem.',
    shortDescription: 'Collect 3 Blink Drives.',
    objective: 'powerup_collected',
    target: 3,
    powerupTypes: ['blink_drive'],
    persistAcrossRuns: true,
    group: 'blink',
    accent: 0x7df9ff
  }),
  defineContract({
    id: 'shield_collector_5',
    title: 'Shield Veteran',
    shortTitle: '5 Shields',
    description: 'Collect 5 Shield powerups in Mayhem.',
    shortDescription: 'Collect 5 Shields.',
    objective: 'powerup_collected',
    target: 5,
    powerupTypes: ['shield'],
    persistAcrossRuns: true,
    group: 'shield_powerup',
    accent: 0x7fffd8
  }),
  defineContract({
    id: 'bomb_collector_5',
    title: 'Bombardier',
    shortTitle: '5 Bombs',
    description: 'Collect 5 Bomb powerups in Mayhem.',
    shortDescription: 'Collect 5 Bombs.',
    objective: 'powerup_collected',
    target: 5,
    powerupTypes: ['bomb'],
    persistAcrossRuns: true,
    group: 'bomb_powerup',
    accent: 0xff8f5a
  }),
  defineContract({
    id: 'enemy_sweep_10000',
    title: 'Enemy Sweep III',
    shortTitle: '10000 Enemies',
    description: 'Destroy 10000 total enemies in Mayhem.',
    shortDescription: 'Destroy 10000 enemies.',
    objective: 'enemy_defeats',
    target: 10000,
    persistAcrossRuns: true,
    group: 'enemy_kills',
    accent: 0xffa36a
  }),
  defineContract({
    id: 'boss_hunter_25',
    title: 'Boss Hunter II',
    shortTitle: '25 Bosses',
    description: 'Defeat 25 total bosses in Mayhem.',
    shortDescription: 'Defeat 25 bosses.',
    objective: 'boss_defeats',
    target: 25,
    persistAcrossRuns: true,
    group: 'boss_kills',
    accent: 0xffd15c
  }),
  defineContract({
    id: 'support_hunter_25',
    title: 'Support Hunter II',
    shortTitle: '25 Supports',
    description: 'Destroy 25 total boss support ships.',
    shortDescription: 'Destroy 25 support ships.',
    objective: 'boss_support_defeats',
    target: 25,
    persistAcrossRuns: true,
    group: 'support_kills',
    accent: 0x7fffd8
  }),
  defineContract({
    id: 'enemy_variety_75',
    title: 'Enemy Variety II',
    shortTitle: '75 Enemy Types',
    description: 'Destroy 75 different enemy types in Mayhem.',
    shortDescription: 'Destroy 75 enemy types.',
    objective: 'unique_enemy_defeats',
    target: 75,
    persistAcrossRuns: true,
    group: 'enemy_variety',
    accent: 0x66ff9d
  }),
  defineContract({
    id: 'graze_150',
    title: 'Graze Ace',
    shortTitle: 'Graze x150',
    description: 'Graze 150 bullets in Mayhem.',
    shortDescription: 'Graze 150 bullets.',
    objective: 'grazes',
    target: 150,
    persistAcrossRuns: true,
    group: 'graze_count',
    accent: 0x9cfbff
  }),
  defineContract({
    id: 'point_defense_pickup',
    title: 'Point Defense Drill',
    shortTitle: 'Point Defense',
    description: 'Collect Point Defense in Mayhem.',
    shortDescription: 'Collect Point Defense.',
    objective: 'powerup_collected',
    target: 1,
    powerupTypes: ['point_defense', 'aegis_burst'],
    group: 'point_defense_powerup',
    accent: 0x7fffd8
  }),
  defineContract({
    id: 'repair_pickup',
    title: 'Repair Protocol',
    shortTitle: 'Repair Protocol',
    description: 'Collect a repair-style powerup in Mayhem.',
    shortDescription: 'Collect a repair powerup.',
    objective: 'powerup_collected',
    target: 1,
    powerupTypes: ['nano_patch', 'mercy_protocol', 'life', 'super_extra_life'],
    group: 'repair_powerup',
    accent: 0x66ff9d
  }),
  defineContract({
    id: 'shockwave_pickup',
    title: 'Shockwave Drill',
    shortTitle: 'Shockwave',
    description: 'Collect Shockwave in Mayhem.',
    shortDescription: 'Collect Shockwave.',
    objective: 'powerup_collected',
    target: 1,
    powerupTypes: ['shockwave'],
    group: 'shockwave_powerup',
    accent: 0xffef7e
  }),
  defineContract({
    id: 'sector_15_signal',
    title: 'Sector 15 Signal',
    shortTitle: 'Sector 15',
    description: 'Reach Sector 15 in Mayhem.',
    shortDescription: 'Reach Sector 15.',
    objective: 'sector_reached',
    target: 1,
    sectorTarget: 15,
    group: 'sector_reach',
    accent: 0xcaa6ff
  }),
  defineContract({
    id: 'powerup_collector_50',
    title: 'Powerup Pilot III',
    shortTitle: '50 Powerups',
    description: 'Collect 50 powerups in Mayhem.',
    shortDescription: 'Collect 50 powerups.',
    objective: 'powerup_collected',
    target: 50,
    persistAcrossRuns: true,
    group: 'powerup_total',
    accent: 0x66ffdd
  }),
  defineContract({
    id: 'phase_master_25',
    title: 'Phase Master',
    shortTitle: '25 Phases',
    description: 'Use Phase 25 times in Mayhem.',
    shortDescription: 'Use Phase 25 times.',
    objective: 'phase_uses',
    target: 25,
    persistAcrossRuns: true,
    group: 'phase',
    accent: 0x9cfbff
  }),
  defineContract({
    id: 'boss_hunter_50',
    title: 'Boss Hunter III',
    shortTitle: '50 Bosses',
    description: 'Defeat 50 total bosses in Mayhem.',
    shortDescription: 'Defeat 50 bosses.',
    objective: 'boss_defeats',
    target: 50,
    persistAcrossRuns: true,
    group: 'boss_kills',
    accent: 0xffd15c
  }),
  defineContract({
    id: 'support_hunter_50',
    title: 'Support Hunter III',
    shortTitle: '50 Supports',
    description: 'Destroy 50 total boss support ships.',
    shortDescription: 'Destroy 50 support ships.',
    objective: 'boss_support_defeats',
    target: 50,
    persistAcrossRuns: true,
    group: 'support_kills',
    accent: 0x7fffd8
  }),
  defineContract({
    id: 'enemy_variety_100',
    title: 'Enemy Variety III',
    shortTitle: '100 Enemy Types',
    description: 'Destroy 100 different enemy types in Mayhem.',
    shortDescription: 'Destroy 100 enemy types.',
    objective: 'unique_enemy_defeats',
    target: 100,
    persistAcrossRuns: true,
    group: 'enemy_variety',
    accent: 0x66ff9d
  }),
  defineContract({
    id: 'pilot_rank_10',
    title: 'Rank 10 Signal',
    shortTitle: 'Rank 10',
    description: 'Achieve pilot rank 10.',
    shortDescription: 'Achieve rank 10.',
    objective: 'pilot_rank_reached',
    target: 10,
    persistAcrossRuns: true,
    group: 'pilot_rank',
    accent: 0xb6f2ff
  }),
  defineContract({
    id: 'ranked_launch_3',
    title: 'Ranked Launches I',
    shortTitle: '3 Mayhem Runs',
    description: 'Start 3 Mayhem runs.',
    shortDescription: 'Start 3 Mayhem runs.',
    objective: 'run_starts',
    target: 3,
    persistAcrossRuns: true,
    group: 'run_starts',
    accent: 0xffd15c
  }),
  defineContract({
    id: 'ranked_regular_10',
    title: 'Ranked Launches II',
    shortTitle: '10 Mayhem Runs',
    description: 'Start 10 Mayhem runs.',
    shortDescription: 'Start 10 Mayhem runs.',
    objective: 'run_starts',
    target: 10,
    persistAcrossRuns: true,
    group: 'run_starts',
    accent: 0xffd15c
  }),
  defineContract({
    id: 'enemy_sweep_25000',
    title: 'Enemy Sweep IV',
    shortTitle: '25000 Enemies',
    description: 'Destroy 25000 total enemies in Mayhem.',
    shortDescription: 'Destroy 25000 enemies.',
    objective: 'enemy_defeats',
    target: 25000,
    persistAcrossRuns: true,
    group: 'enemy_kills',
    accent: 0xffc36a
  }),
  defineContract({
    id: 'boss_hunter_100',
    title: 'Boss Hunter IV',
    shortTitle: '100 Bosses',
    description: 'Defeat 100 total bosses in Mayhem.',
    shortDescription: 'Defeat 100 bosses.',
    objective: 'boss_defeats',
    target: 100,
    persistAcrossRuns: true,
    group: 'boss_kills',
    accent: 0xffd15c
  }),
  defineContract({
    id: 'support_hunter_100',
    title: 'Support Hunter IV',
    shortTitle: '100 Supports',
    description: 'Destroy 100 total boss support ships.',
    shortDescription: 'Destroy 100 support ships.',
    objective: 'boss_support_defeats',
    target: 100,
    persistAcrossRuns: true,
    group: 'support_kills',
    accent: 0x7fffd8
  }),
]);

export const RUN_CONTRACT_ORDER_IDS = Object.freeze(RUN_CONTRACT_CATALOG.map((contract) => contract.id));
export const DEFAULT_ACTIVE_RUN_CONTRACT_IDS = Object.freeze(
  RUN_CONTRACT_ORDER_IDS.slice(0, RUN_CONTRACT_ACTIVE_LIMIT)
);

const CONTRACT_BY_ID = new Map(RUN_CONTRACT_CATALOG.map((contract) => [contract.id, contract]));

function floor(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

export function formatRunContractCount(value = 0) {
  return floor(value).toLocaleString('en-US');
}

export function formatRunContractProgressValue(progress = 0, target = 1) {
  const normalizedTarget = Math.max(1, floor(target, 1));
  return {
    progress: formatRunContractCount(Math.min(normalizedTarget, floor(progress))),
    target: formatRunContractCount(normalizedTarget)
  };
}

export function getRunContractOrderNumber(id = '') {
  const index = RUN_CONTRACT_ORDER_IDS.indexOf(String(id || ''));
  return index >= 0 ? index + 1 : 0;
}

export function formatRunContractOrderSlotLabel(contractOrId = '') {
  const id = typeof contractOrId === 'object' && contractOrId
    ? contractOrId.id
    : contractOrId;
  const orderNumber = typeof contractOrId === 'object' && contractOrId
    ? floor(contractOrId.orderNumber) || getRunContractOrderNumber(id)
    : getRunContractOrderNumber(id);
  if (!orderNumber) return '';
  return String(orderNumber).padStart(2, '0');
}

function clampText(value, maxLength = 120) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, maxLength) : '';
}

function nowIso() {
  return new Date().toISOString();
}

function uniqueValidIds(values = []) {
  const valid = new Set(CONTRACT_BY_ID.keys());
  const ids = [];
  for (const value of Array.isArray(values) ? values : []) {
    const id = clampText(value, 80);
    if (!valid.has(id) || ids.includes(id)) continue;
    ids.push(id);
  }
  return ids;
}

function uniqueTextIds(values = [], { maxItems = 160, maxLength = 120 } = {}) {
  const ids = [];
  for (const value of Array.isArray(values) ? values : []) {
    const id = clampText(value, maxLength);
    if (!id || ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= maxItems) break;
  }
  return ids;
}

function getContractGroup(contractOrId) {
  const contract = typeof contractOrId === 'object' && contractOrId
    ? contractOrId
    : getRunContractById(contractOrId);
  return clampText(contract?.group || contract?.id || contractOrId, 80);
}

export function getRunContractReward(contractOrId = '') {
  if (!RUN_CONTRACT_REWARDS_ENABLED) return null;
  const contract = typeof contractOrId === 'object' && contractOrId
    ? contractOrId
    : getRunContractById(contractOrId);
  if (!contract?.id) return null;
  const orderNumber = Math.max(1, getRunContractOrderNumber(contract.id) || 1);
  const pilotXp = Math.min(
    RUN_CONTRACT_REWARD_XP_CAP,
    RUN_CONTRACT_REWARD_XP_BASE + (orderNumber - 1) * RUN_CONTRACT_REWARD_XP_STEP
  );
  return {
    type: 'careerXp',
    pilotXp,
    label: `+${formatRunContractCount(pilotXp)} Career XP`
  };
}

export function getRunContractRewardXp(entryOrId = '') {
  if (!RUN_CONTRACT_REWARDS_ENABLED) return 0;
  const explicit = Math.floor(Number(entryOrId?.reward?.pilotXp ?? entryOrId?.pilotXp));
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return Math.max(0, Math.floor(Number(getRunContractReward(entryOrId?.id || entryOrId)?.pilotXp) || 0));
}

export function getRunContractRewardXpForRun(runContracts = null) {
  if (!RUN_CONTRACT_REWARDS_ENABLED) return 0;
  const completed = Array.isArray(runContracts?.completedThisRun) ? runContracts.completedThisRun : [];
  const seen = new Set();
  return completed.reduce((total, entry) => {
    const id = clampText(entry?.id, 80);
    if (!id || seen.has(id)) return total;
    seen.add(id);
    return total + getRunContractRewardXp(entry);
  }, 0);
}

function orderedCompletedIds(completed = {}, extraIds = []) {
  const valid = new Set([
    ...Object.keys(completed || {}),
    ...uniqueValidIds(extraIds)
  ]);
  return RUN_CONTRACT_ORDER_IDS.filter((id) => valid.has(id));
}

function normalizeCompletion(entry = {}, id = '') {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const count = floor(entry.count, 1);
  const completedAt = clampText(entry.completedAt || entry.lastCompletedAt, 80);
  const contractId = clampText(entry.id || id, 80);
  if (!CONTRACT_BY_ID.has(contractId) || count <= 0) return null;
  return {
    id: contractId,
    count,
    completedAt: completedAt || nowIso(),
    lastRunMode: clampText(entry.lastRunMode, 40) || RUN_MODES.RANKED,
    lastSector: Math.max(1, floor(entry.lastSector, 1)),
    buildVersion: clampText(entry.buildVersion, 80) || BUILD_ID || null
  };
}

function normalizeProgressEntry(entry = {}, id = '') {
  const contractId = clampText(entry?.id || id, 80);
  const contract = getRunContractById(contractId);
  if (!contract) return null;
  const progress = Math.min(contract.target || 1, floor(entry?.progress));
  const result = {
    id: contractId,
    progress,
    target: contract.target || 1,
    updatedAt: clampText(entry?.updatedAt, 80) || nowIso(),
    lastRunMode: clampText(entry?.lastRunMode, 40) || RUN_MODES.RANKED,
    lastSector: Math.max(1, floor(entry?.lastSector, 1))
  };
  if (contract.objective === 'unique_enemy_defeats') {
    result.uniqueIds = uniqueTextIds(entry?.uniqueIds, {
      maxItems: contract.target || 100,
      maxLength: 120
    });
    result.progress = Math.min(contract.target || 1, Math.max(progress, result.uniqueIds.length));
  }
  return result;
}

function selectActiveIds(activeIds = [], completed = {}, { rotateCompleted = false } = {}) {
  const completedSet = new Set(Object.keys(completed || {}));
  const selected = [];
  const selectedGroups = new Set();
  const trySelect = (id, { skipCompleted = false } = {}) => {
    if (selected.length >= RUN_CONTRACT_ACTIVE_LIMIT) return;
    const contract = getRunContractById(id);
    if (!contract || selected.includes(contract.id)) return;
    if (skipCompleted && completedSet.has(contract.id)) return;
    const group = getContractGroup(contract);
    if (selectedGroups.has(group)) return;
    selected.push(contract.id);
    selectedGroups.add(group);
  };
  for (const id of uniqueValidIds(activeIds)) {
    trySelect(id, { skipCompleted: rotateCompleted });
  }
  for (const id of RUN_CONTRACT_ORDER_IDS) {
    trySelect(id, { skipCompleted: true });
  }
  if (selected.length || completedSet.size < RUN_CONTRACT_ORDER_IDS.length) return selected;
  return uniqueValidIds(activeIds)
    .filter((id, index, ids) => ids.findIndex((candidate) => getContractGroup(candidate) === getContractGroup(id)) === index)
    .slice(0, RUN_CONTRACT_ACTIVE_LIMIT);
}

function progressForActiveIds(progress = {}, activeIds = [], completed = {}) {
  const active = new Set(activeIds);
  const result = {};
  for (const [id, entry] of Object.entries(progress || {})) {
    if (!active.has(id) || completed[id]) continue;
    const normalized = normalizeProgressEntry(entry, id);
    if (normalized) result[normalized.id] = normalized;
  }
  return result;
}

function buildRunContractDisplayEntry(id, state = {}) {
  const contract = getRunContractById(id);
  if (!contract) return null;
  const completion = state.completed?.[id] || null;
  const savedProgress = state.progress?.[id] || null;
  const orderNumber = getRunContractOrderNumber(id);
  const target = contract.target || 1;
  const completed = Boolean(completion);
  return {
    id,
    orderIndex: orderNumber ? orderNumber - 1 : -1,
    orderNumber,
    orderSlot: formatRunContractOrderSlotLabel({ id, orderNumber }),
    title: contract.title || id,
    shortTitle: contract.shortTitle || contract.title || id,
    description: contract.description || '',
    shortDescription: contract.shortDescription || contract.description || '',
    howTo: getRunContractHowTo(contract),
    modeLabel: contract.modeLabel || 'Mayhem',
    target,
    reward: getRunContractReward(contract),
    progress: completed ? target : Math.min(target, floor(savedProgress?.progress)),
    objective: contract.objective || 'unknown',
    group: getContractGroup(contract),
    accent: contract.accent || 0x37f5ff,
    completed,
    completionCount: floor(completion?.count),
    completedAt: completion?.completedAt || null,
    lastRunMode: completion?.lastRunMode || null,
    lastSector: completion?.lastSector || null
  };
}

function getRunContractHowTo(contract = {}) {
  switch (contract.objective) {
    case 'grazes':
      return 'Fly close to enemy bullets without touching them.';
    case 'boss_defeated':
    case 'boss_defeats':
      return 'Survive to a boss wave, then destroy the boss.';
    case 'enemy_defeats':
      return 'Destroy enemy ships in Mayhem; progress carries between runs.';
    case 'boss_support_defeats':
      return 'During boss fights, shoot the smaller support ships.';
    case 'phase_through_danger':
      return 'Press Phase while a dangerous bullet is about to hit you.';
    case 'powerup_collected':
      return getPowerupRunContractHowTo(contract);
    case 'near_miss_streak':
      return 'Stay close to enemy bullets repeatedly without getting hit.';
    case 'boss_slow_time_defeat':
      return 'Activate Slow Time or Chrono Anchor, then finish a boss before it ends.';
    case 'sector_no_life_loss':
      return 'Reach the target sector without losing any lives.';
    case 'blink_drive_survive':
      return 'Pick up Blink Drive, then stay alive until the timer completes.';
    case 'sector_reached':
      return 'Survive Mayhem until the target sector begins.';
    case 'phase_uses':
      return 'Press Phase in Mayhem; each use counts.';
    case 'unique_enemy_defeats':
      return 'Destroy new enemy types; repeats do not count.';
    case 'pilot_rank_reached':
      return 'Earn Career XP from runs until you reach the required pilot rank.';
    case 'run_starts':
      return 'Start Mayhem from the main menu; each launch counts.';
    default:
      return contract.shortDescription || contract.description || '';
  }
}

function getPowerupRunContractHowTo(contract = {}) {
  const types = Array.isArray(contract.powerupTypes) ? contract.powerupTypes : [];
  if (!types.length) return 'Pick up glowing powerup capsules in Mayhem.';
  if (types.includes('shield')) return 'Pick up a Shield powerup capsule in Mayhem.';
  if (types.includes('bomb')) return 'Pick up a Bomb powerup capsule in Mayhem.';
  if (types.includes('slow_time')) return 'Pick up a Slow Time powerup capsule in Mayhem.';
  if (types.includes('chrono_anchor')) return 'Pick up a Chrono Anchor powerup capsule in Mayhem.';
  if (types.includes('blink_drive')) return 'Pick up a Blink Drive powerup capsule in Mayhem.';
  if (types.includes('point_defense') || types.includes('aegis_burst')) return 'Pick up a Point Defense powerup capsule in Mayhem.';
  if (types.includes('shockwave')) return 'Pick up a Shockwave powerup capsule in Mayhem.';
  if (types.includes('nano_patch') || types.includes('mercy_protocol')) return 'Pick up any repair-style powerup capsule in Mayhem.';
  if (types.includes('life') || types.includes('super_extra_life')) return 'Pick up an extra-life powerup capsule in Mayhem.';
  return 'Pick up glowing powerup capsules in Mayhem.';
}

function getQueuedRunContractEntries(state = {}, limit = RUN_CONTRACT_ACTIVE_LIMIT) {
  const normalized = normalizeRunContractsState(state);
  const activeIds = uniqueValidIds(normalized.activeIds);
  const activeIdSet = new Set(activeIds);
  const reservedGroups = new Set(activeIds
    .filter((id) => !normalized.completed[id])
    .map((id) => getContractGroup(id)));
  const queued = [];
  for (const id of RUN_CONTRACT_ORDER_IDS) {
    if (queued.length >= limit) break;
    if (normalized.completed[id] || activeIdSet.has(id)) continue;
    const group = getContractGroup(id);
    if (reservedGroups.has(group)) continue;
    const entry = buildRunContractDisplayEntry(id, normalized);
    if (!entry) continue;
    queued.push(entry);
    reservedGroups.add(group);
  }
  return queued;
}

function latestIso(...values) {
  let best = '';
  let bestTime = 0;
  for (const value of values.flat()) {
    const text = clampText(value, 80);
    const time = Date.parse(text || '');
    if (Number.isFinite(time) && time > bestTime) {
      best = text;
      bestTime = time;
    }
  }
  return best;
}

function getAllCompletedAt(completed = {}) {
  const allComplete = RUN_CONTRACT_ORDER_IDS.every((id) => completed[id]);
  if (!allComplete) return null;
  return latestIso(RUN_CONTRACT_ORDER_IDS.map((id) => completed[id]?.completedAt)) || nowIso();
}

export function getRunContractCatalog() {
  return RUN_CONTRACT_CATALOG.map((contract) => ({
    ...contract,
    modes: [...contract.modes],
    ...(Array.isArray(contract.powerupTypes) ? { powerupTypes: [...contract.powerupTypes] } : {})
  }));
}

export function getRunContractById(id) {
  return CONTRACT_BY_ID.get(String(id || '')) || null;
}

export function isMaturePilotOrdersProfile(progress = {}) {
  const source = progress && typeof progress === 'object' ? progress : {};
  const bestSector = Math.max(
    floor(source.bestSector, 1),
    floor(source.bestLevel, 1)
  );
  return bestSector >= 10
    || floor(source.totalRuns) >= 8
    || floor(source.totalBossesDefeated) >= 3
    || floor(source.runClears) >= 1;
}

export function getDefaultShowPilotOrders(progress = {}) {
  return !isMaturePilotOrdersProfile(progress);
}

function shouldSeedRunProgress(id) {
  const contract = getRunContractById(id);
  return Boolean(contract?.persistAcrossRuns) || floor(contract?.target) > 1;
}

function getPilotRankDisplay(progress = {}) {
  const source = progress && typeof progress === 'object' ? progress : {};
  const index = Math.max(
    floor(source.pilotRank),
    floor(source.highestPilotRank),
    floor(source.bestRank)
  );
  return Math.max(1, index + 1);
}

export function areAllRunContractsComplete(state = {}) {
  const normalized = normalizeRunContractsState(state);
  return RUN_CONTRACT_ORDER_IDS.every((id) => normalized.completedIds.includes(id));
}

export function normalizeRunContractsState(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const completed = {};
  for (const [id, entry] of Object.entries(source.completed || {})) {
    const normalized = normalizeCompletion(entry, id);
    if (normalized) completed[normalized.id] = normalized;
  }
  const completedIds = orderedCompletedIds(completed, source.completedIds);
  const sourceVersion = floor(source.version);
  let activeIds = selectActiveIds(source.activeIds, completed, { rotateCompleted: false });
  const migratedFromOlderCatalog = sourceVersion > 0 && sourceVersion < RUN_CONTRACTS_VERSION;
  if (migratedFromOlderCatalog) {
    activeIds = selectActiveIds(DEFAULT_ACTIVE_RUN_CONTRACT_IDS, completed, { rotateCompleted: false });
  }
  const catalogExpandedWithNewWork = sourceVersion < RUN_CONTRACTS_VERSION
    && completedIds.length > 0
    && completedIds.length < RUN_CONTRACT_ORDER_IDS.length;
  if (catalogExpandedWithNewWork && activeIds.length && activeIds.every((id) => completed[id])) {
    activeIds = selectActiveIds(activeIds, completed, { rotateCompleted: true });
  }
  const progress = progressForActiveIds(source.progress, activeIds, completed);
  if (migratedFromOlderCatalog) {
    delete progress.graze_break_drill;
    delete progress.graze_break_x3;
  }
  const allCompletedAt = getAllCompletedAt(completed);
  const completionNoticeSeen = Boolean(allCompletedAt && (source.completionNoticeSeen || source.completedNoticeSeen || source.allCompleteSeen));
  const completionNoticeSeenAt = completionNoticeSeen
    ? (latestIso(source.completionNoticeSeenAt, source.completedNoticeSeenAt, source.allCompleteSeenAt) || clampText(source.updatedAt, 80) || allCompletedAt || nowIso())
    : null;
  return {
    version: RUN_CONTRACTS_VERSION,
    activeIds,
    completedIds,
    completed,
    progress,
    allCompletedAt,
    completionNoticeSeen,
    completionNoticeSeenAt,
    updatedAt: clampText(source.updatedAt, 80) || nowIso()
  };
}

export function createDefaultRunContractsState() {
  return normalizeRunContractsState();
}

export function prepareRunContractsForEligibleRun(state = {}) {
  const normalized = normalizeRunContractsState(state);
  if (areAllRunContractsComplete(normalized)) return normalized;
  const activeIds = selectActiveIds(normalized.activeIds, normalized.completed, { rotateCompleted: true });
  const progress = {};
  for (const id of activeIds) {
    if (shouldSeedRunProgress(id) && normalized.progress[id] && !normalized.completed[id]) {
      progress[id] = normalized.progress[id];
    }
  }
  return normalizeRunContractsState({
    ...normalized,
    activeIds,
    progress,
    updatedAt: nowIso()
  });
}

export function acknowledgeRunContractCompletionNotice(state = {}) {
  const normalized = normalizeRunContractsState(state);
  if (!areAllRunContractsComplete(normalized) || normalized.completionNoticeSeen) return normalized;
  const acknowledgedAt = nowIso();
  return normalizeRunContractsState({
    ...normalized,
    completionNoticeSeen: true,
    completionNoticeSeenAt: acknowledgedAt,
    updatedAt: acknowledgedAt
  });
}

function mergeProgressEntry(localEntry = null, cloudEntry = null, id = '') {
  const local = normalizeProgressEntry(localEntry, id);
  const cloud = normalizeProgressEntry(cloudEntry, id);
  if (!local) return cloud;
  if (!cloud) return local;
  const contract = getRunContractById(id || local.id || cloud.id);
  if (contract?.objective === 'unique_enemy_defeats') {
    const uniqueIds = uniqueTextIds([...(cloud.uniqueIds || []), ...(local.uniqueIds || [])], {
      maxItems: contract.target || 100,
      maxLength: 120
    });
    return normalizeProgressEntry({
      ...cloud,
      ...local,
      uniqueIds,
      progress: Math.max(local.progress, cloud.progress, uniqueIds.length),
      updatedAt: latestIso(local.updatedAt, cloud.updatedAt) || local.updatedAt || cloud.updatedAt
    }, contract.id);
  }
  if (local.progress > cloud.progress) return local;
  if (cloud.progress > local.progress) return cloud;
  const localTime = Date.parse(local.updatedAt || '') || 0;
  const cloudTime = Date.parse(cloud.updatedAt || '') || 0;
  return cloudTime > localTime ? cloud : local;
}

function mergeProgressState(localProgress = {}, cloudProgress = {}) {
  const ids = new Set([
    ...Object.keys(localProgress || {}),
    ...Object.keys(cloudProgress || {})
  ]);
  const progress = {};
  for (const id of RUN_CONTRACT_ORDER_IDS) {
    if (!ids.has(id)) continue;
    const merged = mergeProgressEntry(localProgress?.[id], cloudProgress?.[id], id);
    if (merged) progress[merged.id] = merged;
  }
  return progress;
}

function hasStoredRunContractState(state = {}) {
  const source = state && typeof state === 'object' && !Array.isArray(state) ? state : {};
  return Boolean(
    (Array.isArray(source.activeIds) && source.activeIds.length > 0) ||
    (Array.isArray(source.completedIds) && source.completedIds.length > 0) ||
    (source.completed && typeof source.completed === 'object' && Object.keys(source.completed).length > 0) ||
    (source.progress && typeof source.progress === 'object' && Object.keys(source.progress).length > 0) ||
    source.completionNoticeSeen === true ||
    source.completedNoticeSeen === true ||
    source.allCompleteSeen === true
  );
}

export function mergeRunContractsState(localState = {}, cloudState = {}) {
  const localHasStoredState = hasStoredRunContractState(localState);
  const local = normalizeRunContractsState(localState);
  const cloud = normalizeRunContractsState(cloudState);
  const completed = { ...local.completed };
  for (const [id, cloudEntry] of Object.entries(cloud.completed)) {
    const localEntry = completed[id];
    if (!localEntry || floor(cloudEntry.count) > floor(localEntry.count)) {
      completed[id] = cloudEntry;
    } else if (floor(cloudEntry.count) === floor(localEntry.count)) {
      const localTime = Date.parse(localEntry.completedAt || '') || 0;
      const cloudTime = Date.parse(cloudEntry.completedAt || '') || 0;
      if (cloudTime > localTime) completed[id] = cloudEntry;
    }
  }
  const completionNoticeSeen = Boolean(local.completionNoticeSeen || cloud.completionNoticeSeen);
  return normalizeRunContractsState({
    activeIds: localHasStoredState && local.activeIds?.length ? local.activeIds : cloud.activeIds,
    completed,
    completedIds: orderedCompletedIds(completed),
    progress: mergeProgressState(local.progress, cloud.progress),
    completionNoticeSeen,
    allCompletedAt: latestIso(local.allCompletedAt, cloud.allCompletedAt),
    completionNoticeSeenAt: latestIso(local.completionNoticeSeenAt, cloud.completionNoticeSeenAt),
    updatedAt: local.updatedAt || cloud.updatedAt || nowIso()
  });
}

export function startRunContractSession({ runMode = RUN_MODES.RANKED, progress = {} } = {}) {
  const mode = normalizeRunMode(runMode);
  const baseState = normalizeRunContractsState(progress?.runContracts || progress || {});
  const state = mode === RUN_MODES.RANKED ? prepareRunContractsForEligibleRun(baseState) : baseState;
  const activeIds = areAllRunContractsComplete(state) ? [] : state.activeIds;
  return {
    version: RUN_CONTRACTS_VERSION,
    runMode: mode,
    noLifeLost: true,
    allCompleteThisRun: false,
    allCompletedAt: state.allCompletedAt || null,
    active: activeIds.map((id) => {
      const contract = getRunContractById(id);
      const savedProgress = state.progress?.[id] || null;
      const progressValue = contract?.objective === 'pilot_rank_reached'
        ? Math.min(contract.target || 1, Math.max(floor(savedProgress?.progress), getPilotRankDisplay(progress)))
        : shouldSeedRunProgress(id)
          ? Math.min(contract.target || 1, floor(savedProgress?.progress))
          : 0;
      const uniqueIds = contract?.objective === 'unique_enemy_defeats'
        ? uniqueTextIds(savedProgress?.uniqueIds, { maxItems: contract.target || 100, maxLength: 120 })
        : undefined;
        return {
          id,
          progress: progressValue,
          target: contract?.target || 1,
          completed: false,
        eligible: isRunContractEligible(contract, mode) && !state.completed[id],
        completedAt: null,
        ...(uniqueIds ? { uniqueIds } : {})
      };
    }),
    completedThisRun: []
  };
}

export function isRunContractEligible(contract, runMode = RUN_MODES.RANKED) {
  if (!contract) return false;
  const mode = normalizeRunMode(runMode);
  return Array.isArray(contract.modes) && contract.modes.includes(mode);
}

function progressForEvent(contract, item, event, session) {
  const type = String(event?.type || '');
  const current = floor(item.progress);
  switch (contract.objective) {
    case 'grazes':
      return type === 'near_miss' ? current + 1 : current;
    case 'graze_breaks':
      return type === 'graze_break' ? current + 1 : current;
    case 'boss_support_defeats':
      return type === 'boss_support_defeated' ? current + 1 : current;
    case 'boss_slow_time_defeat':
      return type === 'boss_defeated' && event.slowTimeActive === true ? contract.target : current;
    case 'phase_through_danger':
      return type === 'phase_used' && event.dangerous === true ? contract.target : current;
    case 'phase_uses':
      return type === 'phase_used' ? current + 1 : current;
    case 'near_miss_streak':
      return type === 'near_miss' ? Math.max(current, floor(event.streak)) : current;
    case 'blink_drive_survive':
      return type === 'blink_drive_survived' ? current + 1 : current;
    case 'run_starts':
      return type === 'run_started' ? current + 1 : current;
    case 'powerup_collected': {
      if (type !== 'powerup_collected') return current;
      const powerupType = clampText(event.powerupType || event.powerupId || event.typeId, 80);
      if (Array.isArray(contract.powerupTypes) && contract.powerupTypes.length && !contract.powerupTypes.includes(powerupType)) {
        return current;
      }
      return current + 1;
    }
    case 'sector_no_life_loss':
      return type === 'sector_reached' && session.noLifeLost && floor(event.sector, 1) >= floor(contract.sectorTarget || 5, 5)
        ? contract.target
        : current;
    case 'boss_defeated':
      return type === 'boss_defeated' ? contract.target : current;
    case 'boss_defeats':
      return type === 'boss_defeated' ? current + 1 : current;
    case 'enemy_defeats':
      return type === 'enemy_defeated' ? current + Math.max(1, floor(event.count, 1)) : current;
    case 'pilot_rank_reached': {
      if (type !== 'pilot_rank_reached') return current;
      const displayRank = Math.max(
        floor(event.displayRank),
        floor(event.rank),
        floor(event.rankIndex) + 1
      );
      return Math.max(current, displayRank);
    }
    case 'sector_reached':
      return type === 'sector_reached' && floor(event.sector, 1) >= floor(contract.sectorTarget || 10, 10)
        ? contract.target
        : current;
    default:
      return current;
  }
}

export function applyRunContractEvent(session, event = {}) {
  if (!session || typeof session !== 'object') return { session, completed: [] };
  const nextSession = {
    ...session,
    noLifeLost: event.type === 'life_lost' ? false : session.noLifeLost !== false,
    active: [],
    completedThisRun: Array.isArray(session.completedThisRun) ? [...session.completedThisRun] : []
  };
  const completed = [];
  for (const item of Array.isArray(session.active) ? session.active : []) {
    const contract = getRunContractById(item.id);
    if (!contract) continue;
    const nextItem = { ...item };
    nextItem.lastSector = Math.max(1, floor(event.sector, 1));
    if (nextItem.eligible && !nextItem.completed) {
      if (contract.objective === 'unique_enemy_defeats' && String(event?.type || '') === 'enemy_defeated') {
        const enemyType = clampText(event.enemyType || event.threatId || event.enemyId || event.kind, 120);
        const uniqueIds = uniqueTextIds(nextItem.uniqueIds, {
          maxItems: contract.target || 100,
          maxLength: 120
        });
        if (enemyType && !uniqueIds.includes(enemyType)) uniqueIds.push(enemyType);
        nextItem.uniqueIds = uniqueIds.slice(0, contract.target || 100);
        nextItem.progress = Math.min(contract.target, Math.max(floor(nextItem.progress), nextItem.uniqueIds.length));
      } else {
        nextItem.progress = Math.min(contract.target, progressForEvent(contract, nextItem, event, nextSession));
      }
      if (nextItem.progress >= contract.target) {
        nextItem.completed = true;
        nextItem.completedAt = nowIso();
        const completion = {
          id: contract.id,
          completedAt: nextItem.completedAt,
          lastRunMode: nextSession.runMode,
          lastSector: Math.max(1, floor(event.sector, 1)),
          buildVersion: BUILD_ID || null,
          reward: getRunContractReward(contract)
        };
        if (contract.objective === 'unique_enemy_defeats') {
          completion.uniqueIds = uniqueTextIds(nextItem.uniqueIds, {
            maxItems: contract.target || 100,
            maxLength: 120
          });
        }
        completed.push(completion);
        nextSession.completedThisRun.push(completion);
      }
    }
    nextSession.active.push(nextItem);
  }
  return { session: nextSession, completed };
}

export function recordRunContractSessionProgress(state = {}, session = {}) {
  const normalized = normalizeRunContractsState(state);
  const progress = { ...normalized.progress };
  for (const item of Array.isArray(session.active) ? session.active : []) {
    const contract = getRunContractById(item.id);
    if (!contract || normalized.completed[item.id]) continue;
    const entry = {
      id: item.id,
      progress: Math.min(contract.target || 1, floor(item.progress)),
      target: contract.target || 1,
      updatedAt: nowIso(),
      lastRunMode: normalizeRunMode(session.runMode),
      lastSector: Math.max(1, floor(item.lastSector, 1))
    };
    if (contract.objective === 'unique_enemy_defeats') {
      entry.uniqueIds = uniqueTextIds(item.uniqueIds, {
        maxItems: contract.target || 100,
        maxLength: 120
      });
      entry.progress = Math.min(contract.target || 1, Math.max(entry.progress, entry.uniqueIds.length));
    }
    const merged = mergeProgressEntry(entry, normalized.progress?.[item.id], item.id);
    if (merged) progress[merged.id] = merged;
  }
  return normalizeRunContractsState({
    ...normalized,
    progress,
    updatedAt: nowIso()
  });
}

export function recordRunContractCompletion(state = {}, completion = {}) {
  const normalized = normalizeRunContractsState(state);
  const contract = getRunContractById(completion.id);
  if (!contract) return normalized;
  const previous = normalized.completed[contract.id];
  const count = floor(previous?.count) + 1;
  const progressEntry = {
    id: contract.id,
    progress: contract.target || 1,
    target: contract.target || 1,
    updatedAt: completion.completedAt || nowIso(),
    lastRunMode: completion.lastRunMode || RUN_MODES.RANKED,
    lastSector: completion.lastSector || 1
  };
  if (contract.objective === 'unique_enemy_defeats') {
    progressEntry.uniqueIds = uniqueTextIds(completion.uniqueIds || normalized.progress?.[contract.id]?.uniqueIds, {
      maxItems: contract.target || 100,
      maxLength: 120
    });
  }
  return normalizeRunContractsState({
    ...normalized,
    completed: {
      ...normalized.completed,
      [contract.id]: {
        id: contract.id,
        count,
        completedAt: completion.completedAt || nowIso(),
        lastRunMode: completion.lastRunMode || RUN_MODES.RANKED,
        lastSector: completion.lastSector || 1,
        buildVersion: completion.buildVersion || BUILD_ID || null,
        reward: completion.reward || getRunContractReward(contract)
      }
    },
    progress: {
      ...normalized.progress,
      [contract.id]: progressEntry
    },
    completedIds: [...new Set([...(normalized.completedIds || []), contract.id])],
    updatedAt: nowIso()
  });
}

export function getRunContractMenuState(progressOrState = {}, options = {}) {
  const state = normalizeRunContractsState(progressOrState?.runContracts || progressOrState || {});
  const allComplete = areAllRunContractsComplete(state);
  const forceCompletionVisible = Boolean(options.forceCompletionVisible);
  const showPilotOrders = options.showPilotOrders !== false;
  const status = !showPilotOrders && !allComplete
    ? 'hidden'
    : allComplete
    ? (state.completionNoticeSeen && !forceCompletionVisible ? 'hidden' : 'complete')
    : 'active';
  const activeIds = status === 'active' ? state.activeIds : [];
  const total = RUN_CONTRACT_ORDER_IDS.length;
  const completedCount = RUN_CONTRACT_ORDER_IDS.filter((id) => state.completed[id]).length;
  return {
    version: state.version,
    title: 'PILOT ORDERS',
    subtitle: completedCount > 0 ? 'Review cleared orders in Ship Hangar.' : 'Learn key Mayhem tactics.',
    status,
    hidden: status === 'hidden',
    disabledBySetting: !showPilotOrders && !allComplete,
    allComplete,
    completionNoticeSeen: Boolean(state.completionNoticeSeen),
    allCompletedAt: state.allCompletedAt || null,
    completionNoticeSeenAt: state.completionNoticeSeenAt || null,
    total,
    completedCount,
    progressLabel: formatRunContractCount(completedCount),
    completionTitle: 'PILOT ORDERS COMPLETE',
    completionBody: 'All starter combat goals cleared.',
    active: activeIds.map((id) => buildRunContractDisplayEntry(id, state)).filter(Boolean),
    next: status === 'active' ? getQueuedRunContractEntries(state, RUN_CONTRACT_ACTIVE_LIMIT) : [],
    completedIds: [...state.completedIds],
    rewardsEnabled: RUN_CONTRACT_REWARDS_ENABLED
  };
}

export function getRunContractCompletionReviewState(progressOrState = {}) {
  const state = normalizeRunContractsState(progressOrState?.runContracts || progressOrState || {});
  const entries = RUN_CONTRACT_ORDER_IDS
    .map((id) => buildRunContractDisplayEntry(id, state))
    .filter(Boolean);
  const completed = entries.filter((entry) => entry.completed);
  const activeIds = new Set(state.activeIds || []);
  const active = entries.filter((entry) => activeIds.has(entry.id) && !entry.completed);
  return {
    version: state.version,
    total: entries.length,
    completedCount: completed.length,
    completed,
    active,
    next: getQueuedRunContractEntries(state, RUN_CONTRACT_ACTIVE_LIMIT),
    pending: entries.filter((entry) => !entry.completed),
    allComplete: entries.length > 0 && completed.length === entries.length,
    allCompletedAt: state.allCompletedAt || null,
    completionNoticeSeen: Boolean(state.completionNoticeSeen)
  };
}

function describeCompletion(completion = {}) {
  const contract = getRunContractById(completion.id);
  const orderNumber = getRunContractOrderNumber(completion.id);
  return {
    id: completion.id,
    orderNumber,
    orderSlot: formatRunContractOrderSlotLabel({ id: completion.id, orderNumber }),
    title: contract?.title || completion.id,
    shortTitle: contract?.shortTitle || contract?.title || completion.id,
    completedAt: completion.completedAt || null,
    lastRunMode: completion.lastRunMode || RUN_MODES.RANKED,
    lastSector: completion.lastSector || 1,
    reward: completion.reward || getRunContractReward(contract)
  };
}

export function getRunContractSessionState(session = null) {
  if (!session || typeof session !== 'object') return null;
  return {
    version: session.version || RUN_CONTRACTS_VERSION,
    runMode: normalizeRunMode(session.runMode),
    noLifeLost: session.noLifeLost !== false,
    allCompleteThisRun: Boolean(session.allCompleteThisRun),
    allCompletedAt: session.allCompletedAt || null,
    active: (session.active || []).map((item) => {
      const contract = getRunContractById(item.id);
      const orderNumber = getRunContractOrderNumber(item.id);
      return {
        id: item.id,
        orderNumber,
        orderSlot: formatRunContractOrderSlotLabel({ id: item.id, orderNumber }),
        title: contract?.title || item.id,
        shortTitle: contract?.shortTitle || contract?.title || item.id,
        progress: floor(item.progress),
        target: floor(item.target || contract?.target || 1, 1),
        group: getContractGroup(contract),
        uniqueCount: Array.isArray(item.uniqueIds) ? uniqueTextIds(item.uniqueIds).length : 0,
        completed: Boolean(item.completed),
        eligible: Boolean(item.eligible),
        completedAt: item.completedAt || null
      };
    }),
    completedThisRun: Array.isArray(session.completedThisRun)
      ? session.completedThisRun.map(describeCompletion)
      : []
  };
}
