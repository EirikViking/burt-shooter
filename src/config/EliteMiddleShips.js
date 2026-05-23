export const ELITE_MIDDLE_SHIP_FULL_UNLOCK_LEVEL = 40;
export const ELITE_MIDDLE_SHIP_ASSET_COUNT = 20;

const assetPath = (index, slug) =>
  `/art/generated/nova-swarm/elites/nova-elite-middle-${String(index).padStart(2, '0')}-${slug}-20260523.png`;

export const ELITE_MIDDLE_SHIPS = [
  {
    id: 'nova_elite_tractor_puller',
    type: 'nova_elite_tractor_puller',
    displayName: 'Grav Hook Interceptor',
    role: 'Tractor puller',
    minLevel: 3,
    unlockLevel: 3,
    spriteIndex: 0,
    asset: assetPath(1, 'tractor-puller'),
    health: 12,
    toughness: 1.45,
    speed: 0.78,
    shootDelay: 126,
    radius: 27,
    scoreValue: 260,
    movementStyle: 'flutter',
    fireStyle: 'needle',
    attackStyle: 'needle',
    specialAbility: 'tractor_pull',
    specialCooldownMs: 7800,
    specialTelegraphMs: 780,
    specialActiveMs: 1280,
    spawnWeight: 1.1,
    tint: 0xd7e8ff,
    accent: 0xff5cff,
    hullTint: 0xffffff,
    targetWidth: 78,
    spriteScale: 1,
    glowAlpha: 0.22,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'tractor_lock_charge',
      active: 'tractor_beam_active',
      death: 'elite_death'
    },
    vfx: ['tractorForceField', 'captureBurst', 'playerDebuffRing'],
    designNote: 'Early readable elite: dodge out of the cone before the status roll lands.'
  },
  {
    id: 'nova_elite_shield_projector',
    type: 'nova_elite_shield_projector',
    displayName: 'Aegis Halo Projector',
    role: 'Shield projector',
    minLevel: 5,
    unlockLevel: 5,
    spriteIndex: 1,
    asset: assetPath(2, 'shield-projector'),
    health: 15,
    toughness: 1.55,
    speed: 0.62,
    shootDelay: 146,
    radius: 30,
    scoreValue: 310,
    movementStyle: 'orbit',
    fireStyle: 'fan',
    attackStyle: 'fan',
    specialAbility: 'shield_projector',
    specialCooldownMs: 8600,
    specialTelegraphMs: 650,
    specialActiveMs: 2800,
    spawnWeight: 0.95,
    tint: 0xa8fbff,
    accent: 0x66ffff,
    hullTint: 0xffffff,
    targetWidth: 82,
    spriteScale: 1,
    glowAlpha: 0.26,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'elite_special_charge',
      active: 'forceField',
      death: 'elite_death'
    },
    vfx: ['shieldAura', 'allyHalo'],
    designNote: 'Turns itself and nearby escorts into a priority shield pocket without boss-grade durability.'
  },
  {
    id: 'nova_elite_drone_carrier',
    type: 'nova_elite_drone_carrier',
    displayName: 'Latchbay Drone Carrier',
    role: 'Drone carrier',
    minLevel: 8,
    unlockLevel: 8,
    spriteIndex: 2,
    asset: assetPath(3, 'drone-carrier'),
    health: 16,
    toughness: 1.55,
    speed: 0.58,
    shootDelay: 138,
    radius: 31,
    scoreValue: 340,
    movementStyle: 'strafe',
    fireStyle: 'triad',
    attackStyle: 'triad',
    specialAbility: 'drone_carrier',
    specialCooldownMs: 9600,
    specialTelegraphMs: 700,
    specialActiveMs: 900,
    spawnWeight: 0.9,
    tint: 0xc088ff,
    accent: 0xff66ff,
    hullTint: 0xffffff,
    targetWidth: 82,
    spriteScale: 1,
    glowAlpha: 0.22,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'elite_special_charge',
      active: 'drone_launch_blip',
      death: 'elite_death'
    },
    vfx: ['droneBayGlow', 'launchSparks'],
    designNote: 'Adds two fragile escorts if ignored; killing the carrier stops reinforcement pressure.'
  },
  {
    id: 'nova_elite_mine_layer',
    type: 'nova_elite_mine_layer',
    displayName: 'Cinder Mine Layer',
    role: 'Mine layer',
    minLevel: 10,
    unlockLevel: 10,
    spriteIndex: 3,
    asset: assetPath(4, 'mine-layer'),
    health: 17,
    toughness: 1.55,
    speed: 0.56,
    shootDelay: 154,
    radius: 31,
    scoreValue: 370,
    movementStyle: 'dashPause',
    fireStyle: 'slowHeavy',
    attackStyle: 'slowHeavy',
    specialAbility: 'mine_layer',
    specialCooldownMs: 7600,
    specialTelegraphMs: 620,
    specialActiveMs: 700,
    spawnWeight: 0.9,
    tint: 0xffc05c,
    accent: 0xff9f4a,
    hullTint: 0xffffff,
    targetWidth: 82,
    spriteScale: 1,
    glowAlpha: 0.2,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'elite_special_charge',
      active: 'boss_net_fire',
      death: 'elite_death'
    },
    vfx: ['mineDropWarning', 'podFlash'],
    designNote: 'Drops slow lane-denial mines with a visible warning rather than instant traps.'
  },
  {
    id: 'nova_elite_sniper_rail',
    type: 'nova_elite_sniper_rail',
    displayName: 'Needleline Rail Sniper',
    role: 'Sniper rail ship',
    minLevel: 12,
    unlockLevel: 12,
    spriteIndex: 4,
    asset: assetPath(5, 'sniper-rail-ship'),
    health: 15,
    toughness: 1.42,
    speed: 0.72,
    shootDelay: 170,
    radius: 25,
    scoreValue: 390,
    movementStyle: 'anchor',
    fireStyle: 'laneShot',
    attackStyle: 'laneShot',
    specialAbility: 'sniper_rail',
    specialCooldownMs: 8200,
    specialTelegraphMs: 980,
    specialActiveMs: 540,
    spawnWeight: 0.8,
    tint: 0xff8aff,
    accent: 0xff55ff,
    hullTint: 0xffffff,
    targetWidth: 86,
    spriteScale: 1,
    glowAlpha: 0.19,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'boss_beam_telegraph',
      active: 'boss_beam_fire',
      death: 'elite_death'
    },
    vfx: ['sniperAimLine', 'railMuzzle'],
    designNote: 'Telegraphs a thin rail line long enough for a lateral dodge.'
  },
  {
    id: 'nova_elite_jammer_disruptor',
    type: 'nova_elite_jammer_disruptor',
    displayName: 'Static Choir Jammer',
    role: 'Jammer disruptor',
    minLevel: 15,
    unlockLevel: 15,
    spriteIndex: 5,
    asset: assetPath(6, 'jammer-disruptor'),
    health: 18,
    toughness: 1.5,
    speed: 0.68,
    shootDelay: 122,
    radius: 29,
    scoreValue: 430,
    movementStyle: 'feint',
    fireStyle: 'stutter',
    attackStyle: 'stutter',
    specialAbility: 'jammer_disruptor',
    specialCooldownMs: 9400,
    specialTelegraphMs: 720,
    specialActiveMs: 800,
    spawnWeight: 0.82,
    tint: 0x88ff88,
    accent: 0x8dff5c,
    hullTint: 0xffffff,
    targetWidth: 84,
    spriteScale: 1,
    glowAlpha: 0.2,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'elite_special_charge',
      active: 'trait_bonus_hit',
      death: 'elite_death'
    },
    vfx: ['jammerPulse', 'antennaStatic'],
    designNote: 'Adds a tiny local cooldown hiccup only when the player stays close.'
  },
  {
    id: 'nova_elite_repair_healer',
    type: 'nova_elite_repair_healer',
    displayName: 'Mender Lattice Healer',
    role: 'Repair healer ship',
    minLevel: 18,
    unlockLevel: 18,
    spriteIndex: 6,
    asset: assetPath(7, 'repair-healer-ship'),
    health: 18,
    toughness: 1.52,
    speed: 0.6,
    shootDelay: 150,
    radius: 30,
    scoreValue: 460,
    movementStyle: 'turretDrift',
    fireStyle: 'fanPulse',
    attackStyle: 'fanPulse',
    specialAbility: 'repair_healer',
    specialCooldownMs: 8800,
    specialTelegraphMs: 650,
    specialActiveMs: 900,
    spawnWeight: 0.76,
    tint: 0x8cffb2,
    accent: 0x39ff88,
    hullTint: 0xffffff,
    targetWidth: 84,
    spriteScale: 1,
    glowAlpha: 0.24,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'elite_special_charge',
      active: 'shield_up',
      death: 'elite_death'
    },
    vfx: ['repairBeam', 'greenPulse'],
    designNote: 'Heals nearby enemies by small chunks; the player can stop the sustain by focusing it.'
  },
  {
    id: 'nova_elite_splitter_clone',
    type: 'nova_elite_splitter_clone',
    displayName: 'Twin-Shell Splitter',
    role: 'Splitter clone ship',
    minLevel: 20,
    unlockLevel: 20,
    spriteIndex: 7,
    asset: assetPath(8, 'splitter-clone-ship'),
    health: 19,
    toughness: 1.52,
    speed: 0.74,
    shootDelay: 136,
    radius: 29,
    scoreValue: 500,
    movementStyle: 'sweep',
    fireStyle: 'crossShot',
    attackStyle: 'crossShot',
    specialAbility: 'splitter_clone',
    specialCooldownMs: 9000,
    specialTelegraphMs: 700,
    specialActiveMs: 700,
    spawnWeight: 0.72,
    tint: 0xff82ff,
    accent: 0xff5ce6,
    hullTint: 0xffffff,
    targetWidth: 82,
    spriteScale: 1,
    glowAlpha: 0.22,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'ghost_phase_shift',
      active: 'drone_launch_blip',
      death: 'elite_death'
    },
    vfx: ['cloneShimmer', 'splitDeathBurst'],
    designNote: 'Splits into weak escorts on death once, creating a cleanup beat rather than a second boss.'
  },
  {
    id: 'nova_elite_barrier_projector',
    type: 'nova_elite_barrier_projector',
    displayName: 'Hardlight Barrier Projector',
    role: 'Barrier projector',
    minLevel: 22,
    unlockLevel: 22,
    spriteIndex: 8,
    asset: assetPath(9, 'barrier-projector'),
    health: 20,
    toughness: 1.6,
    speed: 0.58,
    shootDelay: 154,
    radius: 30,
    scoreValue: 530,
    movementStyle: 'escortOrbit',
    fireStyle: 'warningShot',
    attackStyle: 'warningShot',
    specialAbility: 'barrier_projector',
    specialCooldownMs: 9400,
    specialTelegraphMs: 720,
    specialActiveMs: 2600,
    spawnWeight: 0.68,
    tint: 0x9efbff,
    accent: 0x66f7ff,
    hullTint: 0xffffff,
    targetWidth: 84,
    spriteScale: 1,
    glowAlpha: 0.25,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'elite_special_charge',
      active: 'forceField',
      death: 'elite_death'
    },
    vfx: ['barrierPanels', 'edgeShimmer'],
    designNote: 'Briefly armors itself with obvious hardlight panels; no invulnerable wall.'
  },
  {
    id: 'nova_elite_vortex_gravity',
    type: 'nova_elite_vortex_gravity',
    displayName: 'Vortex Gravity Well',
    role: 'Vortex gravity ship',
    minLevel: 24,
    unlockLevel: 24,
    spriteIndex: 9,
    asset: assetPath(10, 'vortex-gravity-ship'),
    health: 20,
    toughness: 1.58,
    speed: 0.54,
    shootDelay: 146,
    radius: 32,
    scoreValue: 560,
    movementStyle: 'baitRetreat',
    fireStyle: 'splitLite',
    attackStyle: 'splitLite',
    specialAbility: 'vortex_gravity',
    specialCooldownMs: 9800,
    specialTelegraphMs: 860,
    specialActiveMs: 1600,
    spawnWeight: 0.65,
    tint: 0xc77dff,
    accent: 0xb65cff,
    hullTint: 0xffffff,
    targetWidth: 86,
    spriteScale: 1,
    glowAlpha: 0.25,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'time_slow_warp',
      active: 'magnet_pull',
      death: 'elite_death'
    },
    vfx: ['vortexRings', 'gravityPullLines'],
    designNote: 'Applies a soft pull with no damage and a short duration so lanes remain readable.'
  },
  {
    id: 'nova_elite_burst_artillery',
    type: 'nova_elite_burst_artillery',
    displayName: 'Amber Burst Artillery',
    role: 'Burst artillery ship',
    minLevel: 26,
    unlockLevel: 26,
    spriteIndex: 10,
    asset: assetPath(11, 'burst-artillery-ship'),
    health: 21,
    toughness: 1.58,
    speed: 0.48,
    shootDelay: 168,
    radius: 32,
    scoreValue: 590,
    movementStyle: 'spiralIn',
    fireStyle: 'arcVolley',
    attackStyle: 'arcVolley',
    specialAbility: 'burst_artillery',
    specialCooldownMs: 8400,
    specialTelegraphMs: 760,
    specialActiveMs: 620,
    spawnWeight: 0.65,
    tint: 0xffc05c,
    accent: 0xffaa44,
    hullTint: 0xffffff,
    targetWidth: 86,
    spriteScale: 1,
    glowAlpha: 0.2,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'orbital_strike_charge',
      active: 'shoot_heavy',
      death: 'elite_death'
    },
    vfx: ['artilleryCharge', 'mortarMuzzles'],
    designNote: 'Fires a spaced burst, not a dense curtain.'
  },
  {
    id: 'nova_elite_phase_raider',
    type: 'nova_elite_phase_raider',
    displayName: 'Phaseglass Raider',
    role: 'Phase raider',
    minLevel: 28,
    unlockLevel: 28,
    spriteIndex: 11,
    asset: assetPath(12, 'phase-raider'),
    health: 17,
    toughness: 1.42,
    speed: 0.92,
    shootDelay: 118,
    radius: 27,
    scoreValue: 620,
    movementStyle: 'crossCut',
    fireStyle: 'suppressiveLine',
    attackStyle: 'suppressiveLine',
    specialAbility: 'phase_raider',
    specialCooldownMs: 9000,
    specialTelegraphMs: 520,
    specialActiveMs: 1500,
    spawnWeight: 0.62,
    tint: 0xa8fbff,
    accent: 0x66ffff,
    hullTint: 0xffffff,
    targetWidth: 84,
    spriteScale: 1,
    glowAlpha: 0.23,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'ghost_phase_shift',
      active: 'ghost_phase_shift',
      death: 'elite_death'
    },
    vfx: ['phaseShimmer', 'afterImage'],
    designNote: 'Briefly reduces incoming damage while visibly shimmering, encouraging timed focus fire.'
  },
  {
    id: 'nova_elite_lane_blocker',
    type: 'nova_elite_lane_blocker',
    displayName: 'Lane Lock Bastion',
    role: 'Lane blocker',
    minLevel: 30,
    unlockLevel: 30,
    spriteIndex: 12,
    asset: assetPath(13, 'lane-blocker'),
    health: 22,
    toughness: 1.62,
    speed: 0.5,
    shootDelay: 156,
    radius: 34,
    scoreValue: 660,
    movementStyle: 'waveDive',
    fireStyle: 'suppressiveLine',
    attackStyle: 'suppressiveLine',
    specialAbility: 'lane_blocker',
    specialCooldownMs: 9200,
    specialTelegraphMs: 900,
    specialActiveMs: 720,
    spawnWeight: 0.58,
    tint: 0xffc05c,
    accent: 0xffd166,
    hullTint: 0xffffff,
    targetWidth: 88,
    spriteScale: 1,
    glowAlpha: 0.21,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'boss_net_telegraph',
      active: 'boss_net_fire',
      death: 'elite_death'
    },
    vfx: ['laneBlockWarning', 'hardlightBars'],
    designNote: 'Marks lanes before dropping a sparse wall of slow shots.'
  },
  {
    id: 'nova_elite_orb_webber',
    type: 'nova_elite_orb_webber',
    displayName: 'Orbweb Threader',
    role: 'Orb webber',
    minLevel: 32,
    unlockLevel: 32,
    spriteIndex: 13,
    asset: assetPath(14, 'orb-webber'),
    health: 20,
    toughness: 1.55,
    speed: 0.66,
    shootDelay: 138,
    radius: 31,
    scoreValue: 690,
    movementStyle: 'mirrorWeave',
    fireStyle: 'rotatingPair',
    attackStyle: 'rotatingPair',
    specialAbility: 'orb_webber',
    specialCooldownMs: 8400,
    specialTelegraphMs: 720,
    specialActiveMs: 680,
    spawnWeight: 0.58,
    tint: 0xff82ff,
    accent: 0xff5ce6,
    hullTint: 0xffffff,
    targetWidth: 86,
    spriteScale: 1,
    glowAlpha: 0.24,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'boss_web_telegraph',
      active: 'boss_web_fire',
      death: 'elite_death'
    },
    vfx: ['orbWebLines', 'nodePulse'],
    designNote: 'Throws slow web orbs with visible node pulses.'
  },
  {
    id: 'nova_elite_missile_frigate',
    type: 'nova_elite_missile_frigate',
    displayName: 'Redcap Missile Frigate',
    role: 'Missile frigate',
    minLevel: 34,
    unlockLevel: 34,
    spriteIndex: 14,
    asset: assetPath(15, 'missile-frigate'),
    health: 22,
    toughness: 1.6,
    speed: 0.58,
    shootDelay: 150,
    radius: 32,
    scoreValue: 720,
    movementStyle: 'pulseAdvance',
    fireStyle: 'chargeShot',
    attackStyle: 'chargeShot',
    specialAbility: 'missile_frigate',
    specialCooldownMs: 8800,
    specialTelegraphMs: 760,
    specialActiveMs: 680,
    spawnWeight: 0.55,
    tint: 0xff6688,
    accent: 0xff4f72,
    hullTint: 0xffffff,
    targetWidth: 86,
    spriteScale: 1,
    glowAlpha: 0.2,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'elite_special_charge',
      active: 'shoot_heavy',
      death: 'elite_death'
    },
    vfx: ['missileTubeFlash', 'redWarningDots'],
    designNote: 'Launches two slow readable missiles rather than tracking spam.'
  },
  {
    id: 'nova_elite_mirror_decoy',
    type: 'nova_elite_mirror_decoy',
    displayName: 'Mirrorwake Decoy',
    role: 'Mirror decoy ship',
    minLevel: 36,
    unlockLevel: 36,
    spriteIndex: 15,
    asset: assetPath(16, 'mirror-decoy-ship'),
    health: 19,
    toughness: 1.48,
    speed: 0.82,
    shootDelay: 124,
    radius: 30,
    scoreValue: 750,
    movementStyle: 'mirrorWeave',
    fireStyle: 'rotatingPair',
    attackStyle: 'rotatingPair',
    specialAbility: 'mirror_decoy',
    specialCooldownMs: 8800,
    specialTelegraphMs: 620,
    specialActiveMs: 1300,
    spawnWeight: 0.52,
    tint: 0xd8b8ff,
    accent: 0xb388ff,
    hullTint: 0xffffff,
    targetWidth: 88,
    spriteScale: 1,
    glowAlpha: 0.24,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'ghost_phase_shift',
      active: 'ghost_phase_shift',
      death: 'elite_death'
    },
    vfx: ['mirrorDecoyShimmer', 'afterImage'],
    designNote: 'Creates harmless visual decoys that ask for target discipline without extra hitboxes.'
  },
  {
    id: 'nova_elite_pulse_emp',
    type: 'nova_elite_pulse_emp',
    displayName: 'Bluecoil Pulse EMP',
    role: 'Pulse EMP ship',
    minLevel: 38,
    unlockLevel: 38,
    spriteIndex: 16,
    asset: assetPath(17, 'pulse-emp-ship'),
    health: 21,
    toughness: 1.56,
    speed: 0.62,
    shootDelay: 144,
    radius: 31,
    scoreValue: 790,
    movementStyle: 'hookTurn',
    fireStyle: 'forkShot',
    attackStyle: 'forkShot',
    specialAbility: 'pulse_emp',
    specialCooldownMs: 9600,
    specialTelegraphMs: 860,
    specialActiveMs: 620,
    spawnWeight: 0.5,
    tint: 0x8ffcff,
    accent: 0x66d9ff,
    hullTint: 0xffffff,
    targetWidth: 86,
    spriteScale: 1,
    glowAlpha: 0.25,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'elite_special_charge',
      active: 'time_slow_warp',
      death: 'elite_death'
    },
    vfx: ['empPulse', 'capacitorArc'],
    designNote: 'A short close-range pulse; fair because it is radial, telegraphed, and avoidable.'
  },
  {
    id: 'nova_elite_anchor_turret',
    type: 'nova_elite_anchor_turret',
    displayName: 'Anchor Turret Hulk',
    role: 'Anchor turret ship',
    minLevel: 40,
    unlockLevel: 40,
    spriteIndex: 17,
    asset: assetPath(18, 'anchor-turret-ship'),
    health: 26,
    toughness: 1.7,
    speed: 0.46,
    shootDelay: 164,
    radius: 34,
    scoreValue: 860,
    movementStyle: 'anchor',
    fireStyle: 'chargeShot',
    attackStyle: 'chargeShot',
    specialAbility: 'anchor_turret',
    specialCooldownMs: 9000,
    specialTelegraphMs: 760,
    specialActiveMs: 700,
    spawnWeight: 0.46,
    tint: 0xffb45c,
    accent: 0xff8844,
    hullTint: 0xffffff,
    targetWidth: 88,
    spriteScale: 1,
    glowAlpha: 0.2,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'orbital_strike_charge',
      active: 'shoot_heavy',
      death: 'elite_death'
    },
    vfx: ['turretCharge', 'anchorRing'],
    designNote: 'Slow, tough turret threat with a single telegraphed fan burst.'
  },
  {
    id: 'nova_elite_escort_commander',
    type: 'nova_elite_escort_commander',
    displayName: 'Crownline Escort Commander',
    role: 'Escort commander',
    minLevel: 40,
    unlockLevel: 40,
    spriteIndex: 18,
    asset: assetPath(19, 'escort-commander'),
    health: 24,
    toughness: 1.64,
    speed: 0.64,
    shootDelay: 136,
    radius: 33,
    scoreValue: 900,
    movementStyle: 'escortOrbit',
    fireStyle: 'forkShot',
    attackStyle: 'forkShot',
    specialAbility: 'escort_commander',
    specialCooldownMs: 9800,
    specialTelegraphMs: 780,
    specialActiveMs: 1800,
    spawnWeight: 0.44,
    tint: 0xffd166,
    accent: 0xffdd66,
    hullTint: 0xffffff,
    targetWidth: 88,
    spriteScale: 1,
    glowAlpha: 0.23,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'elite_special_charge',
      active: 'achievement',
      death: 'elite_death'
    },
    vfx: ['commandAura', 'escortPips'],
    designNote: 'Buffs nearby escorts briefly; counterplay is isolating or focusing the commander.'
  },
  {
    id: 'nova_elite_hunter',
    type: 'nova_elite_hunter',
    displayName: 'Nightglide Elite Hunter',
    role: 'Late game elite hunter',
    minLevel: 40,
    unlockLevel: 40,
    spriteIndex: 19,
    asset: assetPath(20, 'late-game-elite-hunter'),
    health: 23,
    toughness: 1.62,
    speed: 0.96,
    shootDelay: 112,
    radius: 31,
    scoreValue: 940,
    movementStyle: 'fastNeedle',
    fireStyle: 'predictiveShot',
    attackStyle: 'predictiveShot',
    specialAbility: 'elite_hunter',
    specialCooldownMs: 8200,
    specialTelegraphMs: 620,
    specialActiveMs: 640,
    spawnWeight: 0.42,
    tint: 0xa8ff72,
    accent: 0x7cff44,
    hullTint: 0xffffff,
    targetWidth: 86,
    spriteScale: 1,
    glowAlpha: 0.23,
    sfx: {
      spawn: 'elite_spawn_alert',
      charge: 'boss_beam_telegraph',
      active: 'boss_beam_fire',
      death: 'elite_death'
    },
    vfx: ['hunterLock', 'greenPredatorDash'],
    designNote: 'Late-game priority hunter with fast readable volleys, still far below boss durability.'
  }
];

export const ELITE_MIDDLE_SHIP_IDS = ELITE_MIDDLE_SHIPS.map((profile) => profile.id);
export const ELITE_MIDDLE_SHIP_ASSETS = ELITE_MIDDLE_SHIPS.map((profile) => profile.asset);

const PROFILE_BY_ID = new Map();
for (const profile of ELITE_MIDDLE_SHIPS) {
  PROFILE_BY_ID.set(profile.id, profile);
  PROFILE_BY_ID.set(profile.type, profile);
}

export function getEliteMiddleShipProfile(id) {
  return PROFILE_BY_ID.get(id) || null;
}

export function getEliteMiddleShipsForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return ELITE_MIDDLE_SHIPS.filter((profile) => profile.minLevel <= safeLevel);
}

export function getEliteMiddleShipPoolStats(level) {
  const profiles = getEliteMiddleShipsForLevel(level);
  return {
    level: Math.max(1, Number(level) || 1),
    availableProfiles: profiles.length,
    totalProfiles: ELITE_MIDDLE_SHIPS.length,
    roles: profiles.map((profile) => profile.role),
    fullPoolUnlocked: profiles.length === ELITE_MIDDLE_SHIPS.length
  };
}

export function getEliteMiddleShipMaxActive(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  if (safeLevel >= 40) return 2;
  if (safeLevel >= 30) return 2;
  return 1;
}

export function getEliteMiddleShipSpawnChance(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  if (safeLevel < 3) return 0;
  if (safeLevel === 3) return 1;
  if (safeLevel < 10) return 0.58;
  if (safeLevel < 20) return 0.68;
  if (safeLevel < 30) return 0.76;
  if (safeLevel < 40) return 1;
  return 1;
}

export function pickEliteMiddleShipForLevel(level, random = Math.random, excludeIds = []) {
  const excluded = new Set(excludeIds);
  const safeLevel = Math.max(1, Number(level) || 1);
  const pool = getEliteMiddleShipsForLevel(safeLevel).filter((profile) => !excluded.has(profile.id));
  if (!pool.length) return null;
  const weights = pool.map((profile) => {
    const age = Math.max(0, safeLevel - profile.minLevel);
    const freshness = age <= 0 ? 2.6 : age <= 3 ? 1.8 : age <= 8 ? 1.25 : 1;
    return (profile.spawnWeight || 1) * freshness;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = (typeof random === 'function' ? random() : Math.random()) * total;
  for (let i = 0; i < pool.length; i += 1) {
    cursor -= weights[i];
    if (cursor <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function planEliteMiddleShipSpawns(level, waveCount, random = Math.random) {
  const safeLevel = Math.max(1, Number(level) || 1);
  const totalWaves = Math.max(0, Number(waveCount) || 0);
  if (safeLevel < 3 || totalWaves < 3) return [];
  if ((typeof random === 'function' ? random() : Math.random()) > getEliteMiddleShipSpawnChance(safeLevel)) {
    return [];
  }

  const maxActive = getEliteMiddleShipMaxActive(safeLevel);
  const targetCount = safeLevel >= 40
    ? Math.min(maxActive, 1 + (((typeof random === 'function' ? random() : Math.random()) < 0.7) ? 1 : 0))
    : safeLevel >= 30
      ? Math.min(maxActive, 1 + (((typeof random === 'function' ? random() : Math.random()) < 0.35) ? 1 : 0))
      : 1;
  const eligibleWaveIndices = [];
  for (let index = 1; index < totalWaves - 1; index += 1) eligibleWaveIndices.push(index);
  if (!eligibleWaveIndices.length) return [];

  const plan = [];
  const usedProfiles = new Set();
  const usedWaves = new Set();
  for (let i = 0; i < targetCount; i += 1) {
    const profile = pickEliteMiddleShipForLevel(safeLevel, random, [...usedProfiles]);
    if (!profile) break;
    const spreadIndex = targetCount <= 1
      ? Math.floor(eligibleWaveIndices.length * 0.5)
      : Math.round((i + 1) * (eligibleWaveIndices.length / (targetCount + 1)));
    let waveIndex = eligibleWaveIndices[Math.max(0, Math.min(eligibleWaveIndices.length - 1, spreadIndex))];
    while (usedWaves.has(waveIndex) && waveIndex < totalWaves - 2) waveIndex += 1;
    if (usedWaves.has(waveIndex)) continue;
    usedProfiles.add(profile.id);
    usedWaves.add(waveIndex);
    plan.push({
      waveIndex,
      eliteMiddleShipId: profile.id
    });
  }
  return plan;
}
