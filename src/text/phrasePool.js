const RECENT_LIMIT = 2;
const recentByKey = new Map();

function normalizeWeighted(items) {
  return items.map((item) => {
    if (typeof item === 'string') return { value: item, weight: 1 };
    return { value: item.value, weight: item.weight || 1 };
  });
}

function weightedPick(items, key) {
  const list = normalizeWeighted(items);
  const recent = recentByKey.get(key) || [];
  const filtered = list.length > 2
    ? list.filter((item) => !recent.includes(item.value))
    : list;
  const total = filtered.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of filtered) {
    roll -= item.weight;
    if (roll <= 0) {
      recentByKey.set(key, [...recent, item.value].slice(-RECENT_LIMIT));
      return item.value;
    }
  }
  return filtered[filtered.length - 1]?.value || '';
}

function mergeUnique(base, extra) {
  const seen = new Set(base);
  const merged = [...base];
  extra.forEach((value) => {
    if (!seen.has(value)) {
      merged.push(value);
      seen.add(value);
    }
  });
  return merged;
}

const arcadePhrases = [
  'Insert coin. Regret nothing.',
  'The formation union filed a complaint.',
  'Bonus stage detected.',
  'Pixel insurance expired.',
  'Cabinet buttons are doing their best.',
  'The swarm brought choreography.',
  'Attract mode has opinions.',
  'One more run. Obviously.',
  'Boss warning: dramatic entrance pending.',
  'High score gravity increased.',
  'The aliens rehearsed this.',
  'Quarter economy unstable.',
  'Laser etiquette suspended.',
  'Formation leader lost the memo.',
  'Stage manager panicking politely.',
  'Arcade cabinet running hot.',
  'Combo goblet filled with sparks.',
  'Tiny ship. Large responsibilities.',
  'Enemy pattern thinks it is clever.',
  'Power pellet paperwork denied.',
  'Retro danger, modern panic.',
  'Your hitbox sends its regards.',
  'The scoreboard is watching.',
  'Swarm confidence: undeserved.',
  'Boss cape budget approved.'
];

const storyTransmissions = [
  {
    id: 'last-coin',
    levelMin: 1,
    title: 'STATIC MEMORY',
    line: 'One coin woke the cabinet. The pilot still has not decided if that was luck.',
    imageAlias: 'nova-swarm-story-comms-01-20260519'
  },
  {
    id: 'swarm-spiral',
    levelMin: 2,
    title: 'PATTERN DRIFT',
    line: 'The swarm is not chasing. It is arranging itself around every dodge.',
    imageAlias: 'nova-swarm-story-comms-02-20260519'
  },
  {
    id: 'pattern-read',
    levelMin: 4,
    title: 'QUIET READOUT',
    line: 'A small drone maps the lanes. The pilot stops firing at noise and starts reading intent.',
    imageAlias: 'nova-swarm-story-comms-03-20260519'
  },
  {
    id: 'boss-gate',
    levelMin: 7,
    title: 'GATE SIGNAL',
    line: 'Past the boss gate, the lights look less like stars and more like names waiting.',
    imageAlias: 'nova-swarm-story-comms-04-20260519'
  }
];

const fragments = {
  leads: [
    { value: 'Arcade Control', weight: 1.4 },
    { value: 'Cabinet Alert', weight: 1.3 },
    { value: 'Swarm Dispatch', weight: 1.2 },
    { value: 'Quartermaster', weight: 1.1 },
    { value: 'Formation Coach', weight: 1.1 },
    { value: 'Pixel Radio', weight: 1.1 },
    { value: 'Boss Scheduler', weight: 1 }
  ],
  verbs: [
    { value: 'reports', weight: 1.2 },
    { value: 'questions', weight: 1 },
    { value: 'overclocks', weight: 1 },
    { value: 'misreads', weight: 0.9 },
    { value: 'reroutes', weight: 0.9 },
    { value: 'audits', weight: 0.9 },
    { value: 'taunts', weight: 0.8 }
  ],
  objects: [
    { value: 'the bonus wave', weight: 1.2 },
    { value: 'the hitbox', weight: 1.2 },
    { value: 'the laser bill', weight: 1.1 },
    { value: 'the popcorn formation', weight: 1.1 },
    { value: 'the boss entrance', weight: 1.1 },
    { value: 'the coin slot', weight: 1 },
    { value: 'the swarm choreography', weight: 1 },
    { value: 'the panic button', weight: 1 },
    { value: 'the extra life committee', weight: 0.9 }
  ],
  tags: [
    { value: 'classic cabinet energy', weight: 1.2 },
    { value: 'maximum pew-pew compliance', weight: 1.1 },
    { value: 'formation drama', weight: 1 },
    { value: 'boss music confidence', weight: 1 },
    { value: 'tiny ship heroics', weight: 1 },
    { value: 'high-score nonsense', weight: 0.9 }
  ],
  closers: [
    { value: 'Keep firing.', weight: 1.3 },
    { value: 'Dodge stylishly.', weight: 1.2 },
    { value: 'Save the quarters.', weight: 1.1 },
    { value: 'Mind the hitbox.', weight: 1.1 },
    { value: 'Blame the formation.', weight: 1 },
    { value: 'Boss soon.', weight: 1 }
  ]
};

function buildCombo() {
  const lead = weightedPick(fragments.leads, 'leads');
  const verb = weightedPick(fragments.verbs, 'verbs');
  const object = weightedPick(fragments.objects, 'objects');
  const tag = weightedPick(fragments.tags, 'tags');
  const closer = weightedPick(fragments.closers, 'closers');
  const patterns = [
    `${lead}: ${closer}`,
    `${lead} ${verb} ${object}.`,
    `${object} - ${tag}.`,
    `${lead} ${verb} ${object} - ${tag}.`,
    `${object}! ${closer}`,
    `${lead}. ${object}. ${closer}`
  ];
  return weightedPick(patterns, 'comboPatterns');
}

function buildShortBurst() {
  const object = weightedPick(fragments.objects, 'shortObjects');
  const closer = weightedPick(fragments.closers, 'shortClosers');
  const patterns = [
    `${object}!`,
    `${object}. ${closer}`,
    `${closer}`,
    `${object} - ${closer}`
  ];
  return weightedPick(patterns, 'shortPatterns');
}

export function extendLevelIntroTexts(base, level, isBossLevel) {
  const baseList = Array.isArray(base) ? base : [];
  const intro = isBossLevel
    ? `BOSS: ${weightedPick(fragments.objects, 'bossObjects')}`
    : `Wave ${level}: ${weightedPick(fragments.objects, 'waveObjects')}`;
  const generated = [
    intro,
    `Wave ${level}: ${buildCombo()}`,
    `Wave ${level}: ${buildShortBurst()}`,
    `Wave ${level}: ${weightedPick(arcadePhrases, 'wavePhrases')}`,
    `Wave ${level}: ${weightedPick(fragments.objects, 'waveObjects2')}`
  ];
  return mergeUnique(baseList, generated);
}

export function extendBossNames(base) {
  const baseList = Array.isArray(base) ? base : [];
  const extras = [
    `BOSS ${weightedPick(arcadePhrases, 'bossPhrases')}`,
    `BOSS ${weightedPick(fragments.objects, 'bossObjects2')}`,
    `BOSS ${buildShortBurst()}`
  ];
  return mergeUnique(baseList, extras);
}

export function extendGameOverTexts(base) {
  const baseList = Array.isArray(base) ? base : [];
  const extras = [
    buildCombo().toUpperCase(),
    `${weightedPick(arcadePhrases, 'gameOverPhrases').toUpperCase()}`,
    `${weightedPick(fragments.objects, 'gameOverObjects').toUpperCase()} OVERLOAD!`
  ];
  return mergeUnique(baseList, extras);
}

export function getLoadingLines() {
  const titleOptions = [
    'BOOTING ARCADE CABINET...',
    'CALIBRATING HITBOX...',
    'COUNTING QUARTERS...',
    'WARMING LASERS...',
    'CALLING THE FORMATION COACH...'
  ];
  const subtitleOptions = [
    'Polishing pixels and pretending this is regulation.',
    `Auto-boot: ${buildShortBurst()}`,
    `Cabinet test: ${buildCombo()}`,
    `Loading bonus stage paperwork - ${weightedPick(arcadePhrases, 'loadingPhrases')}`,
    `Swarm radio says: ${weightedPick(arcadePhrases, 'loadingPhrases2')}`
  ];
  return {
    title: weightedPick(titleOptions, 'loadingTitle'),
    subtitle: weightedPick(subtitleOptions, 'loadingSubtitle')
  };
}

export function getMicroMessage(type) {
  switch (type) {
    case 'levelStart':
      return buildCombo();
    case 'pause':
      return `PAUSE - ${buildShortBurst()}`;
    case 'resume':
      return `RESUME - ${buildShortBurst()}`;
    case 'lowHealth':
      return `LOW LIFE - ${buildShortBurst()}`;
    case 'lifeLost':
      return `SHIP DOWN - ${buildShortBurst()}`;
    case 'newWave':
      return `NEW WAVE - ${buildShortBurst()}`;
    case 'bossIntro':
      return `BOSS - ${buildCombo()}`;
    default:
      return buildShortBurst();
  }
}

export function getAchievementPopup() {
  const achievements = [
    `Fake achievement: ${buildShortBurst()}`,
    `Cabinet-approved chaos: ${buildCombo()}`,
    `Button confidence - ${buildShortBurst()}`,
    `Bonus multiplier - ${buildCombo()}`,
    `Formation invoice - ${buildShortBurst()}`,
    `One more run energy - ${buildCombo()}`
  ];
  return weightedPick(achievements, 'achievement');
}

export function getEnemyTaunt() {
  const taunts = [
    `Enemy radio: ${buildShortBurst()}`,
    `Formation line: ${buildCombo()}`,
    `Popcorn ship laughs - ${buildShortBurst()}`,
    `Boss intern says: ${buildCombo()}`,
    `Swarm shouts: ${buildShortBurst()}`,
    `Alien coach mutters: ${buildCombo()}`
  ];
  return weightedPick(taunts, 'taunt');
}

export function getGameOverComment(score, level) {
  const scoreTag = score >= 10000 ? 'CABINET LEGEND' : score >= 5000 ? 'SOLID RUN' : 'WARM-UP';
  const lines = [
    `${scoreTag} - ${buildShortBurst()}`,
    `Level ${level} cashed in your quarter - ${buildCombo()}`,
    `Next run: ${buildShortBurst()}`,
    `Arcade Control says: ${buildShortBurst()}`,
    `Swarm Dispatch says: ${buildCombo()}`
  ];
  return weightedPick(lines, 'gameOverComment');
}

export function getHighscoreComment(hasScores) {
  const lines = hasScores
    ? [
      `The cabinet remembers - ${buildShortBurst()}`,
      `High-score orbit - ${buildCombo()}`,
      `Bonus initials accepted: ${buildShortBurst()}`
    ]
    : [
      `No scores yet - ${buildShortBurst()}`,
      `Claim the first slot: ${buildShortBurst()}`,
      'The scoreboard is lonely.'
    ];
  return weightedPick(lines, 'highscoreComment');
}

export function extendLocations(base) {
  const baseList = Array.isArray(base) ? base : [];
  const extras = [
    'ORBITAL ARCADE',
    'NEON BELT',
    'PIXEL DRIFT',
    'BONUS SECTOR',
    'CABINET CORE',
    'LASER LANES',
    'BOSS QUEUE'
  ];
  return mergeUnique(baseList, extras);
}

export function getAllNewPhrases() {
  return storyTransmissions.map((beat) => beat.line);
}

export function getStoryTransmission(level = 1) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  let selected = storyTransmissions[0];
  for (const beat of storyTransmissions) {
    if (safeLevel >= beat.levelMin) selected = beat;
  }
  return { ...selected };
}

const tauntTemplates = [
  '{TAUNTER}: {TARGET}, your hitbox filed for vacation.',
  '{TAUNTER}: {TARGET}, the cabinet ate your quarter.',
  '{TAUNTER} sends {TARGET} a complimentary dodge tutorial.',
  '{TARGET}, {TAUNTER} says the formation was not that complicated.',
  '{TAUNTER}: {TARGET}, even the popcorn ships are concerned.',
  '{TAUNTER} score {SCORE_T} to {TARGET} score {SCORE_B}: the scoreboard has receipts.',
  '{TAUNTER} reached level {LEVEL_T}; {TARGET} reached level {LEVEL_B}. Boss music noticed.',
  '{TARGET}, {TAUNTER} recommends more lasers and fewer excuses.',
  '{TAUNTER}: {TARGET}, insert coin and try having spatial awareness.',
  '{TARGET}, the bonus stage called. It wants a braver pilot. - {TAUNTER}',
  '{TAUNTER}: {TARGET}, classic cabinet mistake. Very educational.',
  '{TAUNTER}: {TARGET}, your ship moved like the joystick was sticky.',
  '{TARGET}, {TAUNTER} says the swarm enjoyed the warm-up.',
  '{TAUNTER}: {TARGET}, this was less bullet hell and more bullet oops.',
  '{TAUNTER}: {TARGET}, boss queue denied your application.'
];

export function getLeaderboardTaunt(targetName) {
  const allTaunts = [
    '{TARGET}: Insert coin. Try again.',
    '{TARGET}: Mind the hitbox.',
    '{TARGET}: The swarm is laughing politely.',
    '{TARGET}: Dodge first, panic second.',
    '{TARGET}: Your initials need revenge.',
    '{TARGET}: Boss music was not impressed.',
    '{TARGET}: Formation reading is fundamental.',
    '{TARGET}: Pew harder.',
    '{TARGET}: Arcade Control requests improvement.',
    '{TARGET}: One more run fixes everything.'
  ];
  const taunt = weightedPick(allTaunts, 'leaderboardTaunt');
  return taunt.replace('{TARGET}', targetName);
}

export function getEnhancedLeaderboardTaunt(taunterName, targetName, taunterScore, targetScore, taunterLevel, targetLevel) {
  const template = weightedPick(tauntTemplates, 'enhancedTaunt');
  return template
    .replace('{TAUNTER}', taunterName)
    .replace('{TARGET}', targetName)
    .replace('{SCORE_T}', taunterScore)
    .replace('{SCORE_B}', targetScore)
    .replace('{LEVEL_T}', taunterLevel)
    .replace('{LEVEL_B}', targetLevel);
}
