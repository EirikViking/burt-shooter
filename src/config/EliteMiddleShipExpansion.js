export const ELITE_MIDDLE_SHIP_EXPANSION_VERSION = 1;
export const ELITE_MIDDLE_SHIP_EXPANSION_COUNT = 30;

const expansionAssetPath = (spriteIndex) =>
  `/art/generated/nova-swarm/elites/expansion/nova-elite-expansion-${String(spriteIndex + 1).padStart(2, '0')}-20260714.png`;

const FAMILY_CONFIG = Object.freeze({
  prism_barrage: Object.freeze({
    label: 'Prism barrage',
    health: 13,
    toughness: 1.44,
    speed: 0.8,
    shootDelay: 132,
    radius: 26,
    movementStyles: ['flutter', 'hookTurn', 'fastNeedle'],
    attackStyles: ['forkShot', 'crossShot', 'predictiveShot'],
    cooldownMs: 7600,
    telegraphMs: 720,
    activeMs: 1050,
    vfx: ['prismFan', 'refractedAim', 'crystalMuzzle']
  }),
  meteor_bloom: Object.freeze({
    label: 'Meteor bloom artillery',
    health: 17,
    toughness: 1.58,
    speed: 0.56,
    shootDelay: 158,
    radius: 31,
    movementStyles: ['dashPause', 'spiralIn', 'anchor'],
    attackStyles: ['slowHeavy', 'arcVolley', 'chargeShot'],
    cooldownMs: 8200,
    telegraphMs: 780,
    activeMs: 1150,
    vfx: ['meteorCrown', 'impactForecast', 'mortarHeat']
  }),
  hunter_dash: Object.freeze({
    label: 'Vector dash hunter',
    health: 14,
    toughness: 1.48,
    speed: 0.9,
    shootDelay: 126,
    radius: 25,
    movementStyles: ['feint', 'crossCut', 'fastNeedle'],
    attackStyles: ['needle', 'laneShot', 'predictiveShot'],
    cooldownMs: 7200,
    telegraphMs: 680,
    activeMs: 980,
    vfx: ['dashVector', 'predatorBrackets', 'afterburnBlade']
  }),
  satellite_ring: Object.freeze({
    label: 'Orbiting blade array',
    health: 16,
    toughness: 1.52,
    speed: 0.66,
    shootDelay: 142,
    radius: 29,
    movementStyles: ['orbit', 'escortOrbit', 'mirrorWeave'],
    attackStyles: ['rotatingPair', 'triad', 'forkShot'],
    cooldownMs: 8400,
    telegraphMs: 740,
    activeMs: 1250,
    vfx: ['satelliteHalo', 'knifeOrbit', 'launchNodes']
  }),
  stasis_lattice: Object.freeze({
    label: 'Stasis lattice',
    health: 18,
    toughness: 1.62,
    speed: 0.58,
    shootDelay: 152,
    radius: 31,
    movementStyles: ['turretDrift', 'anchor', 'pulseAdvance'],
    attackStyles: ['stutter', 'warningShot', 'suppressiveLine'],
    cooldownMs: 8800,
    telegraphMs: 850,
    activeMs: 1600,
    vfx: ['stasisClock', 'slowLattice', 'timeFracture']
  }),
  siphon_tether: Object.freeze({
    label: 'Siphon tether',
    health: 19,
    toughness: 1.66,
    speed: 0.62,
    shootDelay: 150,
    radius: 31,
    movementStyles: ['baitRetreat', 'weave', 'corkscrew'],
    attackStyles: ['fanPulse', 'splitLite', 'slowOrb'],
    cooldownMs: 9000,
    telegraphMs: 800,
    activeMs: 1450,
    vfx: ['siphonTether', 'bloodOrbit', 'repairInversion']
  }),
  resonance_command: Object.freeze({
    label: 'Resonance commander',
    health: 17,
    toughness: 1.58,
    speed: 0.68,
    shootDelay: 138,
    radius: 30,
    movementStyles: ['escortOrbit', 'strafe', 'pulseAdvance'],
    attackStyles: ['fan', 'delayedBurst', 'forkShot'],
    cooldownMs: 8600,
    telegraphMs: 760,
    activeMs: 1350,
    vfx: ['commandChorus', 'allyTethers', 'resonanceCrown']
  }),
  warp_ambush: Object.freeze({
    label: 'Warp ambusher',
    health: 14,
    toughness: 1.46,
    speed: 0.94,
    shootDelay: 122,
    radius: 25,
    movementStyles: ['laneSwap', 'crossCut', 'fastNeedle'],
    attackStyles: ['crossShot', 'needle', 'predictiveShot'],
    cooldownMs: 7000,
    telegraphMs: 640,
    activeMs: 1100,
    vfx: ['warpRift', 'ambushEcho', 'phaseKnives']
  }),
  ion_shear: Object.freeze({
    label: 'Ion shear',
    health: 16,
    toughness: 1.54,
    speed: 0.78,
    shootDelay: 136,
    radius: 28,
    movementStyles: ['pincer', 'hookTurn', 'waveDive'],
    attackStyles: ['wide', 'suppressiveLine', 'forkShot'],
    cooldownMs: 7900,
    telegraphMs: 730,
    activeMs: 1080,
    vfx: ['ionScissors', 'crossLaneForecast', 'stormEdges']
  }),
  siege_beacon: Object.freeze({
    label: 'Siege beacon artillery',
    health: 21,
    toughness: 1.72,
    speed: 0.5,
    shootDelay: 164,
    radius: 33,
    movementStyles: ['anchor', 'turretDrift', 'pulseAdvance'],
    attackStyles: ['slowHeavy', 'chargeShot', 'arcVolley'],
    cooldownMs: 9200,
    telegraphMs: 900,
    activeMs: 1300,
    vfx: ['siegeBeacon', 'targetGrid', 'ordnanceDoors']
  })
});

const BLUEPRINTS = Object.freeze([
  ['prism-fang-lancer', 'Prism Fang Lancer', 'Prism barrage lancer', 4, 'prism_barrage', 0, 0xff4fe5, 0x55eaff, 'Split crystal lances announce a three-shot refracted fan. Cross the narrow center before the prism opens.'],
  ['chromawire-refractor', 'Chromawire Refractor', 'Chromatic refractor', 14, 'prism_barrage', 1, 0xff76ee, 0x5c9dff, 'Its five refracted lanes widen after lock. Hold a quiet edge, then cut behind the outer shard.'],
  ['aurora-verdict', 'Aurora Verdict', 'Aurora execution prism', 28, 'prism_barrage', 2, 0xffb4ff, 0x4df8ff, 'Seven bright verdict lines are still a pattern, not a wall. Wait for the center split and take the returning lane.'],

  ['ashfall-mortar', 'Ashfall Mortar', 'Ashfall mortar', 6, 'meteor_bloom', 0, 0xff9b45, 0xffd166, 'Three slow impact seeds fall below the hull. Move after the forecast circles settle, not during the first flash.'],
  ['comet-casket', 'Comet Casket', 'Comet bloom artillery', 18, 'meteor_bloom', 1, 0xff6b4a, 0xffbf5a, 'Its staggered comet bloom rewards one clean lateral move. Do not drift back into the delayed center shell.'],
  ['sunspike-howitzer', 'Sunspike Howitzer', 'Sunspike siege mortar', 32, 'meteor_bloom', 2, 0xffd65a, 0xff4d76, 'The heavy bloom leaves a deliberate seam between salvos. Break the artillery before the next crown ignites.'],

  ['razorwake-harrier', 'Razorwake Harrier', 'Vector dash harrier', 7, 'hunter_dash', 0, 0xff4778, 0x7c8cff, 'The red vector is the dash path. Leave it once, then punish the recovery instead of racing the hull.'],
  ['bloodglass-pursuer', 'Bloodglass Pursuer', 'Bloodglass pursuit craft', 21, 'hunter_dash', 1, 0xff365f, 0xd45cff, 'Twin lock brackets predict its crossing shot. Let the brackets close before spending Phase.'],
  ['voidtalon-executioner', 'Voidtalon Executioner', 'Voidtalon execution hunter', 36, 'hunter_dash', 2, 0x9b5cff, 0xff3f8f, 'It dashes farther and fires faster, but the final vector is honest. Cross behind the talon and keep shooting.'],

  ['halo-nail-sentry', 'Halo Nail Sentry', 'Orbital nail sentry', 8, 'satellite_ring', 0, 0x62f4ff, 0xffd66b, 'Six orbiting nails launch from visible nodes. Slip through the first gap before the halo changes phase.'],
  ['orbit-reaper-array', 'Orbit Reaper Array', 'Reaper satellite array', 24, 'satellite_ring', 1, 0x66d5ff, 0xff6ad5, 'The eight-node ring rotates before release. Match the rotation briefly, then exit through the widest interval.'],
  ['crown-of-knives', 'Crown of Knives', 'Crowned knife satellite', 38, 'satellite_ring', 2, 0xffe36b, 0xff4fa3, 'Ten knives look worse than they are when read as one rotating clock. Move against the crown, never with it.'],

  ['null-choir-arrestor', 'Null Choir Arrestor', 'Local stasis arrestor', 9, 'stasis_lattice', 0, 0x7ee8ff, 0x9b7cff, 'The small clock lattice punishes close firing and dodging. Break range before the final tick.'],
  ['winterclock-warden', 'Winterclock Warden', 'Winterclock field warden', 25, 'stasis_lattice', 1, 0x9cefff, 0x6e8cff, 'Its cold field pulls softly while delaying controls. Use the long telegraph to leave the lattice entirely.'],
  ['deadtime-magistrate', 'Deadtime Magistrate', 'Deadtime field magistrate', 40, 'stasis_lattice', 2, 0xd4f7ff, 0x9c5cff, 'The magistrate owns nearby time, not the whole screen. Disengage during the clock bloom and return on cooldown.'],

  ['leechstar-collector', 'Leechstar Collector', 'Leechstar siphon craft', 10, 'siphon_tether', 0, 0xff557c, 0x65ffbd, 'The tether steals space and repairs nearby hulls. Cut sideways out of the cone, then remove the collector first.'],
  ['crimson-tithe-vessel', 'Crimson Tithe Vessel', 'Crimson tithe siphon', 26, 'siphon_tether', 1, 0xff3f64, 0x5dffc7, 'Its double tether sustains the formation only while the links hold. Break range or break the vessel.'],
  ['gravewell-reclaimer', 'Gravewell Reclaimer', 'Gravewell reclamation ship', 40, 'siphon_tether', 2, 0xc74477, 0x91ffd5, 'The reclaimer pulls harder near the core and converts the moment into repairs. Refuse the center and focus it down.'],

  ['war-hymn-conductor', 'War Hymn Conductor', 'War-hymn command ship', 11, 'resonance_command', 0, 0xffd45c, 0x72e8ff, 'Gold tethers mean nearby guns are accelerating. Silence the conductor before clearing its suddenly brave choir.'],
  ['signal-throne-marshal', 'Signal Throne Marshal', 'Signal-throne marshal', 29, 'resonance_command', 1, 0xffbb55, 0xff69cb, 'The marshal links more allies and adds a measured pulse. Strip the throne from the formation, then clean up.'],
  ['cataclysm-cantor', 'Cataclysm Cantor', 'Cataclysm battle cantor', 40, 'resonance_command', 2, 0xffe27a, 0xff477f, 'Its ten-note command crown turns a wave vicious without making it immortal. Delete the singer, not the symptoms.'],

  ['blinkknife-marauder', 'Blinkknife Marauder', 'Blinkknife ambusher', 12, 'warp_ambush', 0, 0xb06cff, 0x57f4ff, 'Two phase echoes show where it is not. The bright center seam shows where the ambush will actually fire.'],
  ['riftjaw-ambusher', 'Riftjaw Ambusher', 'Riftjaw phase ambusher', 30, 'warp_ambush', 1, 0xd05cff, 0x55c8ff, 'It opens three rifts but commits to one firing vector. Watch the locked brackets, not the decoys.'],
  ['afterimage-butcher', 'Afterimage Butcher', 'Afterimage execution craft', 40, 'warp_ambush', 2, 0xff55d9, 0x7a7cff, 'The butcher phases through the first answer and attacks on the second beat. Delay your dodge until the echo collapses.'],

  ['ion-scissor-corvette', 'Ion Scissor Corvette', 'Ion shear corvette', 15, 'ion_shear', 0, 0x4deaff, 0xff6bd5, 'Two diagonal ion seams cross at the old player position. A short vertical correction clears both blades.'],
  ['stormglass-divider', 'Stormglass Divider', 'Stormglass lane divider', 31, 'ion_shear', 1, 0x52bfff, 0xff8bdc, 'The divider adds a delayed center shear. Cross the first diagonal, then hold instead of correcting twice.'],
  ['blue-ruin-cleaver', 'Blue Ruin Cleaver', 'Blue-ruin ion cleaver', 40, 'ion_shear', 2, 0x58eaff, 0xb46cff, 'The cleaver paints three intersections before firing. Pick the empty corner early and make the ship chase your bullets.'],

  ['doom-beacon-frigate', 'Doom Beacon Frigate', 'Doom-beacon frigate', 16, 'siege_beacon', 0, 0xff5b48, 0xffc85c, 'The beacon marks a sparse missile pair and one mine lane. Move once after the target grid stops following.'],
  ['siege-psalm-dreadlet', 'Siege Psalm Dreadlet', 'Siege-psalm arsenal', 34, 'siege_beacon', 1, 0xff744c, 0xffe06a, 'Its ordnance doors alternate missiles and lane shots. Read the door color and take the opposite route.'],
  ['last-warning-arsenal', 'Last Warning Arsenal', 'Last-warning siege ship', 40, 'siege_beacon', 2, 0xff3d55, 0xffd05c, 'The final arsenal combines every forecast but leaves a wide outside lane. Take it, then punish the long reload.']
]);

function defineExpansionElite(blueprint, index) {
  const [slug, displayName, _internalArchetype, minLevel, specialAbility, abilityVariant, accent, tint, designNote] = blueprint;
  const family = FAMILY_CONFIG[specialAbility];
  const spriteIndex = 20 + index;
  const health = Math.min(29, family.health + abilityVariant * 2 + Math.floor(minLevel / 20));
  return Object.freeze({
    id: `nova_elite_${slug.replaceAll('-', '_')}`,
    type: `nova_elite_${slug.replaceAll('-', '_')}`,
    displayName,
    role: family.label,
    abilityLabel: family.label,
    minLevel,
    unlockLevel: minLevel,
    spriteIndex,
    asset: expansionAssetPath(spriteIndex),
    health,
    toughness: family.toughness + abilityVariant * 0.07,
    speed: family.speed + abilityVariant * 0.025,
    shootDelay: Math.max(108, family.shootDelay - abilityVariant * 7),
    radius: family.radius + (abilityVariant === 2 ? 1 : 0),
    scoreValue: 300 + minLevel * 12 + abilityVariant * 70,
    movementStyle: family.movementStyles[abilityVariant],
    fireStyle: family.attackStyles[abilityVariant],
    attackStyle: family.attackStyles[abilityVariant],
    specialAbility,
    abilityVariant,
    specialCooldownMs: family.cooldownMs - abilityVariant * 260,
    specialTelegraphMs: family.telegraphMs + abilityVariant * 45,
    specialActiveMs: family.activeMs + abilityVariant * 170,
    spawnWeight: Math.max(0.72, 1.14 - abilityVariant * 0.12),
    tint,
    accent,
    hullTint: 0xffffff,
    targetWidth: 80 + (family.radius - 25) * 2,
    spriteScale: 1,
    glowAlpha: 0.22 + abilityVariant * 0.025,
    sfx: Object.freeze({
      spawn: 'elite_spawn_alert',
      charge: 'elite_special_charge',
      active: `elite_${slug.replaceAll('-', '_')}_active`,
      death: 'elite_death'
    }),
    vfx: Object.freeze([...family.vfx, `${specialAbility}Variant${abilityVariant + 1}`]),
    designNote
  });
}

export const ELITE_MIDDLE_SHIP_EXPANSION = Object.freeze(BLUEPRINTS.map(defineExpansionElite));
export const ELITE_MIDDLE_SHIP_EXPANSION_ASSETS = Object.freeze(ELITE_MIDDLE_SHIP_EXPANSION.map((profile) => profile.asset));
export const ELITE_MIDDLE_SHIP_EXPANSION_SFX_KEYS = Object.freeze(ELITE_MIDDLE_SHIP_EXPANSION.map((profile) => profile.sfx.active));
