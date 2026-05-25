import { ADDITIONAL_RUN_THEMES } from './RunThemeExpansions.js';

export const RunContentDirectorConfig = {
  enabled: true,
  unseenWeightMult: 2.2,
  seenRecentlyWeightMult: 0.55,
  rarePreviewWeightMult: 0.85,
  masteredContentWeightMult: 0.75,
  runThemePrimaryWeightMult: 1.6,
  runThemeSecondaryWeightMult: 1.25,

  runThemes: [
    {
      id: 'swarm_lattice',
      label: 'Swarm Lattice',
      role: 'Grid pressure',
      description: 'Grid formations, splitter shots, pulse nets, and lane pressure.',
      primaryFormations: ['GRID', 'SCREEN_DOOR', 'DOUBLE_ARC'],
      secondaryFormations: ['ARC', 'STAGGERED_WING'],
      waveTactics: ['pulse_net', 'weave_wall', 'needle_stagger'],
      threatActions: ['splitter_seed', 'pulse_ring_bloom', 'lane_cutter'],
      enemyFamilies: ['formation_anchor', 'space_denial', 'simple_shooter'],
      eliteRoles: ['Shield projector', 'Mine layer'],
      bossArchetypes: ['conductor', 'clock', 'carrier']
    },
    {
      id: 'hunter_wing',
      label: 'Hunter Wing',
      role: 'Aggressive flankers',
      description: 'Dive chains, fast scouts, rail lances, pincer formations, and flank pressure.',
      primaryFormations: ['PINCER', 'DIAGONAL_RAID', 'STAGGERED_WING'],
      secondaryFormations: ['V_SHAPE', 'CROSS_STREAM'],
      waveTactics: ['dive_chain', 'rush_feint', 'crossfire_pincer'],
      threatActions: ['telegraph_rail_lance', 'brake_dash_bolt', 'crossfire_pair'],
      enemyFamilies: ['fast_scout', 'charger', 'sniper'],
      eliteRoles: ['Tractor puller', 'Sniper'],
      bossArchetypes: ['needle', 'jester', 'forge']
    },
    {
      id: 'minefield_protocol',
      label: 'Minefield Protocol',
      role: 'Space control',
      description: 'Mine drops, slow denial, screen-door waves, and tactical pauses.',
      primaryFormations: ['SCREEN_DOOR', 'GRID', 'ORBIT_RING'],
      secondaryFormations: ['BOX', 'DOUBLE_ARC'],
      waveTactics: ['weave_wall', 'pulse_net', 'orbit_snare'],
      threatActions: ['mine_drop', 'lane_cutter', 'splitter_seed'],
      enemyFamilies: ['space_denial', 'slow_tank', 'formation_anchor'],
      eliteRoles: ['Mine layer', 'Shield projector'],
      bossArchetypes: ['monolith', 'carrier', 'vortex']
    },
    {
      id: 'orbit_collapse',
      label: 'Orbit Collapse',
      role: 'Rotating volleys',
      description: 'Orbit rings, spiral enemies, boomerang crescents, and pulse blooms.',
      primaryFormations: ['ORBIT_RING', 'SPIRAL', 'DOUBLE_ARC'],
      secondaryFormations: ['SIDEWINDER', 'GRID'],
      waveTactics: ['orbit_snare', 'split_sweep', 'pulse_net'],
      threatActions: ['orbiting_satellites', 'boomerang_crescent', 'pulse_ring_bloom'],
      enemyFamilies: ['escort', 'evasive', 'formation_anchor'],
      eliteRoles: ['Orbit anchor', 'Disruptor'],
      bossArchetypes: ['vortex', 'choir', 'clock']
    },
    {
      id: 'crossfire_doctrine',
      label: 'Crossfire Doctrine',
      role: 'Flank pressure',
      description: 'Pincer waves, cross streams, angled shots, paired attackers, and lane cutters.',
      primaryFormations: ['PINCER', 'CROSS_STREAM', 'DIAGONAL_RAID'],
      secondaryFormations: ['STAGGERED_WING', 'SCREEN_DOOR'],
      waveTactics: ['crossfire_pincer', 'needle_stagger', 'rush_feint'],
      threatActions: ['crossfire_pair', 'lane_cutter', 'shotgun_fan_feint'],
      enemyFamilies: ['sniper', 'spread_shooter', 'fast_scout'],
      eliteRoles: ['Sniper', 'Disruptor'],
      bossArchetypes: ['needle', 'conductor', 'choir']
    },
    {
      id: 'glitch_parade',
      label: 'Glitch Parade',
      role: 'Readable chaos',
      description: 'Trickster enemies, fakeout shots, erratic motion, and rare variants.',
      primaryFormations: ['SIDEWINDER', 'SPIRAL', 'BOX'],
      secondaryFormations: ['CROSS_STREAM', 'PINCER'],
      waveTactics: ['rush_feint', 'split_sweep', 'ambush_lattice'],
      threatActions: ['shotgun_fan_feint', 'boomerang_crescent', 'brake_dash_bolt'],
      enemyFamilies: ['disruptor', 'evasive', 'elite_tactical'],
      eliteRoles: ['Disruptor', 'Trickster'],
      bossArchetypes: ['jester', 'mirror', 'clock']
    },
    ...ADDITIONAL_RUN_THEMES
  ],

  contentPools: {
    opening: {
      minSeconds: 0,
      maxSeconds: 300,
      enemyLevelMin: 1,
      enemyLevelMax: 8,
      enemyFamilies: ['basic_fodder', 'fast_scout', 'simple_shooter'],
      threatActions: ['pulse_ring_bloom', 'splitter_seed', 'crossfire_pair', 'seed_of_regret', 'forklift_crossfire', 'hesitation_bolt'],
      waveTactics: ['strafe_sweep', 'needle_stagger', 'dive_chain', 'pulse_net', 'receipt_spiral', 'velvet_sawtooth', 'paperclip_parade'],
      formations: ['TUTORIAL_ARC', 'ARC', 'GRID', 'STAGGERED_WING', 'DOUBLE_ARC']
    },
    mid_run: {
      minSeconds: 300,
      maxSeconds: 900,
      enemyLevelMin: 5,
      enemyLevelMax: 22,
      enemyFamilies: ['slow_tank', 'sniper', 'spread_shooter', 'space_denial'],
      threatActions: ['lane_cutter', 'mine_drop', 'brake_dash_bolt', 'boomerang_crescent', 'turnstile_cutter', 'parking_violation', 'crescent_errand', 'missing_slice_fan', 'tiny_moons'],
      waveTactics: ['crossfire_pincer', 'rush_feint', 'orbit_snare', 'weave_wall', 'traffic_court', 'lunar_turnpike', 'static_mandala', 'forklift_lattice', 'comet_queue'],
      formations: ['PINCER', 'SCREEN_DOOR', 'DIAGONAL_RAID', 'ORBIT_RING', 'CROSS_STREAM']
    },
    late_run: {
      minSeconds: 900,
      maxSeconds: 1200,
      enemyLevelMin: 16,
      enemyLevelMax: 36,
      enemyFamilies: ['space_denial', 'charger', 'evasive', 'escort', 'disruptor'],
      threatActions: ['telegraph_rail_lance', 'shotgun_fan_feint', 'orbiting_satellites', 'ion_pin_lance', 'neon_tax_lane', 'confetti_grenade', 'sleepy_satchel', 'halo_tax', 'argument_from_both_sides', 'boomerang_invoice', 'redlight_greenlight', 'paperclip_orbit'],
      waveTactics: ['split_sweep', 'ambush_lattice', 'orbit_snare', 'weave_wall', 'gravity_minute', 'mirror_zipper', 'neon_jury', 'orbit_receiving_line', 'cinder_trellis', 'sidewinder_choir'],
      formations: ['SIDEWINDER', 'SPIRAL', 'SCREEN_DOOR', 'CROSS_STREAM', 'PINCER']
    },
    climax: {
      minSeconds: 1200,
      maxSeconds: 1500,
      enemyLevelMin: 28,
      enemyLevelMax: 44,
      enemyFamilies: ['escort', 'disruptor', 'elite_fodder', 'elite_tactical'],
      threatActions: ['telegraph_rail_lance', 'orbiting_satellites', 'mine_drop', 'shotgun_fan_feint', 'blueprint_lance', 'hush_pod', 'hazard_receipt', 'crown_bloom', 'parallax_trial', 'lunar_backhand', 'false_curtain', 'auditor_fan', 'royal_satellites'],
      waveTactics: ['ambush_lattice', 'split_sweep', 'crossfire_pincer', 'taxiway_squeeze', 'cryptic_horseshoe', 'plasma_bookclub', 'auction_house', 'solar_abacus', 'blackbox_minuet', 'starline_bureaucracy'],
      formations: ['CROSS_STREAM', 'SCREEN_DOOR', 'SPIRAL', 'PINCER', 'ORBIT_RING']
    },
    overrun: {
      minSeconds: 1500,
      maxSeconds: Number.POSITIVE_INFINITY,
      enemyLevelMin: 40,
      enemyLevelMax: 60,
      enemyFamilies: ['elite_fodder', 'elite_tactical', 'disruptor', 'evasive'],
      threatActions: ['telegraph_rail_lance', 'orbiting_satellites', 'mine_drop', 'boomerang_crescent', 'prism_verdict', 'closing_argument', 'hazard_receipt', 'crown_bloom', 'afterburner_receipt', 'auditor_fan', 'royal_satellites'],
      waveTactics: ['ambush_lattice', 'split_sweep', 'rush_feint', 'weave_wall', 'violet_switchboard', 'hazard_square_dance', 'orbiting_small_claims', 'needle_accordion', 'glitch_carousel', 'auric_bottleneck', 'crystal_subcommittee', 'overrun_turntable'],
      formations: ['PINCER', 'CROSS_STREAM', 'SCREEN_DOOR', 'SPIRAL', 'ORBIT_RING']
    }
  }
};

export function getContentPoolForElapsedSeconds(elapsedSeconds = 0) {
  const seconds = Math.max(0, Number(elapsedSeconds) || 0);
  const entries = Object.entries(RunContentDirectorConfig.contentPools);
  const match = entries.find(([, pool]) => seconds >= pool.minSeconds && seconds < pool.maxSeconds);
  if (match) return { id: match[0], ...match[1] };
  return { id: 'overrun', ...RunContentDirectorConfig.contentPools.overrun };
}
