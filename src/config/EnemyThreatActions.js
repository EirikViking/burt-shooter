export const ENEMY_THREAT_ACTIONS = [
  {
    id: 'pulse_ring_bloom',
    label: 'Pulse Ring Bloom',
    minLevel: 1,
    tags: ['starter', 'space_pattern'],
    roleTags: ['formation_anchor', 'simple_shooter', 'basic_fodder'],
    telegraphMs: 560,
    cooldownMs: 7800,
    maxActivePerWave: 1,
    dangerBudgetCost: 1,
    weight: 1.15,
    preferredFormations: ['ORBIT_RING', 'GRID', 'DOUBLE_ARC'],
    preferredTactics: ['pulse_net', 'orbit_snare'],
    compatibleMovementStyles: ['pulse', 'orbit', 'anchor', 'sine', 'standard'],
    compatibleFireStyles: ['single', 'double', 'wide', 'fan', 'fanPulse', 'slowOrb'],
    weaponId: 'lime_saw_disc',
    telegraph: 'ring'
  },
  {
    id: 'splitter_seed',
    label: 'Splitter Seed',
    minLevel: 1,
    tags: ['starter', 'delayed', 'fragment'],
    roleTags: ['basic_fodder', 'simple_shooter', 'space_denial'],
    telegraphMs: 520,
    cooldownMs: 7200,
    maxActivePerWave: 2,
    dangerBudgetCost: 1,
    weight: 1.08,
    preferredFormations: ['STAGGERED_WING', 'DOUBLE_ARC', 'GRID'],
    preferredTactics: ['needle_stagger', 'strafe_sweep'],
    compatibleMovementStyles: ['sine', 'chain', 'sweep', 'pulse', 'standard'],
    compatibleFireStyles: ['single', 'double', 'quickChip', 'splitLite', 'slowOrb'],
    weaponId: 'toxic_splinter_seed',
    telegraph: 'ring'
  },
  {
    id: 'crossfire_pair',
    label: 'Crossfire Pair',
    minLevel: 1,
    tags: ['starter', 'formation', 'angled'],
    roleTags: ['fast_scout', 'simple_shooter', 'sniper'],
    telegraphMs: 500,
    cooldownMs: 7600,
    maxActivePerWave: 2,
    dangerBudgetCost: 1,
    weight: 1.05,
    preferredFormations: ['PINCER', 'STAGGERED_WING', 'CROSS_STREAM'],
    preferredTactics: ['crossfire_pincer', 'strafe_sweep'],
    compatibleMovementStyles: ['sweep', 'pincer', 'chain', 'standard'],
    compatibleFireStyles: ['single', 'double', 'crossShot', 'needle', 'offsetPair'],
    weaponId: 'teal_fork_dart',
    telegraph: 'line'
  },
  {
    id: 'lane_cutter',
    label: 'Lane Cutter',
    minLevel: 2,
    tags: ['lane', 'readable_lock'],
    roleTags: ['sniper', 'space_denial', 'formation_anchor'],
    telegraphMs: 650,
    cooldownMs: 9200,
    maxActivePerWave: 1,
    dangerBudgetCost: 2,
    weight: 0.9,
    preferredFormations: ['PINCER', 'SCREEN_DOOR', 'DIAGONAL_RAID', 'CROSS_STREAM'],
    preferredTactics: ['crossfire_pincer', 'weave_wall'],
    compatibleMovementStyles: ['pincer', 'weave_wall', 'needle', 'standard'],
    compatibleFireStyles: ['laneShot', 'needle', 'warningShot', 'suppressiveLine'],
    weaponId: 'white_comet_lance',
    telegraph: 'lane'
  },
  {
    id: 'mine_drop',
    label: 'Mine Drop',
    minLevel: 2,
    tags: ['space_denial', 'mine'],
    roleTags: ['space_denial', 'slow_tank', 'formation_anchor'],
    telegraphMs: 540,
    cooldownMs: 9800,
    maxActivePerWave: 1,
    dangerBudgetCost: 2,
    activeBulletCap: 4,
    weight: 0.86,
    preferredFormations: ['SCREEN_DOOR', 'ORBIT_RING', 'GRID'],
    preferredTactics: ['weave_wall', 'orbit_snare', 'pulse_net'],
    compatibleMovementStyles: ['weave_wall', 'orbit', 'anchor', 'pulse', 'standard'],
    compatibleFireStyles: ['slowOrb', 'slowHeavy', 'warningShot', 'chargeShot'],
    weaponId: 'violet_star_mine',
    telegraph: 'ring'
  },
  {
    id: 'brake_dash_bolt',
    label: 'Brake-Then-Dash Bolt',
    minLevel: 3,
    tags: ['timing', 'dash'],
    roleTags: ['fast_scout', 'sniper', 'charger'],
    telegraphMs: 520,
    cooldownMs: 7600,
    maxActivePerWave: 2,
    dangerBudgetCost: 1,
    weight: 0.94,
    preferredFormations: ['DIAGONAL_RAID', 'SIDEWINDER', 'STAGGERED_WING'],
    preferredTactics: ['rush_feint', 'needle_stagger'],
    compatibleMovementStyles: ['needle', 'feint', 'sweep', 'split_sweep', 'standard'],
    compatibleFireStyles: ['needle', 'quickChip', 'stutter', 'predictiveShot'],
    weaponId: 'cyan_rail_needle',
    telegraph: 'line'
  },
  {
    id: 'telegraph_rail_lance',
    label: 'Telegraph Rail Lance',
    minLevel: 5,
    tags: ['rail', 'locked_target'],
    roleTags: ['sniper', 'disruptor', 'simple_shooter'],
    telegraphMs: 720,
    cooldownMs: 10800,
    maxActivePerWave: 1,
    dangerBudgetCost: 2,
    weight: 0.78,
    preferredFormations: ['DIAGONAL_RAID', 'PINCER', 'CROSS_STREAM'],
    preferredTactics: ['rush_feint', 'needle_stagger', 'crossfire_pincer'],
    compatibleMovementStyles: ['needle', 'pincer', 'ambush', 'standard'],
    compatibleFireStyles: ['needle', 'laneShot', 'warningShot', 'predictiveShot'],
    weaponId: 'cyan_rail_needle',
    telegraph: 'line'
  },
  {
    id: 'boomerang_crescent',
    label: 'Boomerang Crescent',
    minLevel: 5,
    tags: ['arc', 'trickster'],
    roleTags: ['evasive', 'fast_scout', 'disruptor'],
    telegraphMs: 560,
    cooldownMs: 8200,
    maxActivePerWave: 2,
    dangerBudgetCost: 1,
    weight: 0.88,
    preferredFormations: ['SIDEWINDER', 'CROSS_STREAM', 'SPIRAL'],
    preferredTactics: ['split_sweep', 'rush_feint'],
    compatibleMovementStyles: ['split_sweep', 'sweep', 'feint', 'orbit', 'standard'],
    compatibleFireStyles: ['wide', 'crossShot', 'arcVolley', 'rotatingPair'],
    weaponId: 'magenta_crescent',
    telegraph: 'arc'
  },
  {
    id: 'shotgun_fan_feint',
    label: 'Shotgun Fan Feint',
    minLevel: 6,
    tags: ['fan', 'feint'],
    roleTags: ['spread_shooter', 'charger', 'disruptor'],
    telegraphMs: 680,
    cooldownMs: 10500,
    maxActivePerWave: 1,
    dangerBudgetCost: 2,
    weight: 0.76,
    preferredFormations: ['STAGGERED_WING', 'DOUBLE_ARC', 'PINCER'],
    preferredTactics: ['rush_feint', 'split_sweep', 'crossfire_pincer'],
    compatibleMovementStyles: ['feint', 'split_sweep', 'chain', 'standard'],
    compatibleFireStyles: ['fan', 'fanPulse', 'triad', 'forkShot'],
    weaponId: 'white_comet_lance',
    telegraph: 'cone'
  },
  {
    id: 'orbiting_satellites',
    label: 'Orbiting Satellites',
    minLevel: 9,
    tags: ['orbit', 'space_denial'],
    roleTags: ['formation_anchor', 'space_denial', 'escort'],
    telegraphMs: 640,
    cooldownMs: 11800,
    maxActivePerWave: 1,
    dangerBudgetCost: 2,
    activeBulletCap: 6,
    weight: 0.72,
    preferredFormations: ['ORBIT_RING', 'GRID', 'SCREEN_DOOR'],
    preferredTactics: ['orbit_snare', 'pulse_net', 'weave_wall'],
    compatibleMovementStyles: ['orbit', 'anchor', 'pulse', 'weave_wall', 'standard'],
    compatibleFireStyles: ['rotatingPair', 'slowOrb', 'chargeShot', 'fanPulse'],
    weaponId: 'lime_saw_disc',
    telegraph: 'ring'
  }
];

const ACTION_CODEX_TIPS = {
  telegraph_rail_lance: 'The warning line locks before the shot. Dodge after lock, not before.',
  lane_cutter: 'Treat the lane marker as a closing door. Step across early or wait.',
  splitter_seed: 'Do not chase the seed. Read the split ring and pass through a gap.',
  mine_drop: 'Clear small enemies before mines shrink your escape lanes.',
  pulse_ring_bloom: 'The ring has intentional gaps. Move once, then hold the lane.',
  crossfire_pair: 'Watch the side ships first. The center lane is often bait.',
  boomerang_crescent: 'Let the curve pass instead of trying to outrun the arc.',
  brake_dash_bolt: 'The hover is the tell. Dodge on the pulse, not on launch.',
  shotgun_fan_feint: 'Find the safe wedge before the fan appears.',
  orbiting_satellites: 'Wait for satellites to release before crossing the enemy lane.'
};

ENEMY_THREAT_ACTIONS.forEach((action) => {
  if (!action.scaledPreviewConfig) {
    action.scaledPreviewConfig = {
      minSeconds: 0,
      telegraphMs: Math.round((action.telegraphMs || 600) * 1.35),
      projectileSpeedMult: 0.78,
      bulletCountMult: 0.65,
      activeCap: Math.max(1, Math.min(action.maxActivePerWave || 1, 1))
    };
  }
  if (!action.codexTip) {
    action.codexTip = ACTION_CODEX_TIPS[action.id] || 'Read the tell first, then move once with purpose.';
  }
});

const ACTION_BY_ID = new Map(ENEMY_THREAT_ACTIONS.map((action) => [action.id, action]));

export function getEnemyThreatAction(id) {
  return ACTION_BY_ID.get(id) || null;
}

export function getEnemyThreatActionsForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return ENEMY_THREAT_ACTIONS.filter((action) => action.minLevel <= safeLevel);
}

export function getThreatBudgetForLevel(level, enemyCount = 0) {
  const safeLevel = Math.max(1, Number(level) || 1);
  const countBoost = enemyCount >= 10 ? 1 : 0;
  if (safeLevel <= 1) return { maxActive: 1, dangerBudget: 1, plannedActions: Math.min(2, Math.max(1, enemyCount)) };
  if (safeLevel <= 4) return { maxActive: 1, dangerBudget: 2, plannedActions: Math.min(2, Math.max(1, enemyCount)) };
  if (safeLevel <= 8) return { maxActive: 2, dangerBudget: 3, plannedActions: Math.min(3, Math.max(1, enemyCount)) };
  if (safeLevel <= 15) return { maxActive: 3, dangerBudget: 4, plannedActions: Math.min(4, Math.max(1, enemyCount)) };
  return { maxActive: Math.min(5, 3 + countBoost), dangerBudget: 5 + countBoost, plannedActions: Math.min(5, Math.max(1, enemyCount)) };
}

export function scoreThreatActionForWave(action, { level = 1, formation = '', tactic = null, enemyProfile = null, slot = 0 } = {}) {
  let score = action.weight || 1;
  const tacticId = typeof tactic === 'string' ? tactic : tactic?.id;
  if (action.preferredFormations?.includes(formation)) score += 2.2;
  if (action.preferredTactics?.includes(tacticId)) score += 1.6;
  if (enemyProfile?.role && action.roleTags?.includes(enemyProfile.role)) score += 1.1;
  if (enemyProfile?.movementStyle && action.compatibleMovementStyles?.includes(enemyProfile.movementStyle)) score += 0.55;
  if (enemyProfile?.fireStyle && action.compatibleFireStyles?.includes(enemyProfile.fireStyle)) score += 0.55;
  if (Math.max(1, Number(level) || 1) === action.minLevel) score += 1.15;
  score += ((slot * 37 + String(action.id).length * 11) % 13) / 100;
  return score;
}

export function pickThreatActionsForWave({ level, formation, tactic, enemyProfiles = [], waveIndex = 0, count = 0 } = {}) {
  const budget = getThreatBudgetForLevel(level, count || enemyProfiles.length);
  const available = getEnemyThreatActionsForLevel(level);
  if (!available.length || budget.plannedActions <= 0) return { budget, assignments: [] };

  const usedIds = new Set();
  const assignments = [];
  const planned = Math.min(budget.plannedActions, enemyProfiles.length || count || budget.plannedActions);
  for (let i = 0; i < planned; i += 1) {
    const slot = (i * 2 + waveIndex) % Math.max(1, enemyProfiles.length || count || 1);
    const enemyProfile = enemyProfiles[slot] || null;
    const ranked = available
      .map((action) => ({
        action,
        score: scoreThreatActionForWave(action, { level, formation, tactic, enemyProfile, slot: slot + waveIndex * 3 })
      }))
      .sort((a, b) => b.score - a.score || a.action.id.localeCompare(b.action.id));
    const picked = ranked.find((entry) => !usedIds.has(entry.action.id)) || ranked[0];
    if (!picked) continue;
    usedIds.add(picked.action.id);
    assignments.push({ slot, actionId: picked.action.id });
  }

  return { budget, assignments };
}
