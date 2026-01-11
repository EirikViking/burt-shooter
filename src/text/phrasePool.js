const RECENT_LIMIT = 2;
const recentByKey = new Map();

function normalizeWeighted(items) {
  return items.map(item => {
    if (typeof item === 'string') {
      return { value: item, weight: 1 };
    }
    return { value: item.value, weight: item.weight || 1 };
  });
}

function weightedPick(items, key) {
  const list = normalizeWeighted(items);
  const recent = recentByKey.get(key) || [];
  const filtered = list.length > 2
    ? list.filter(item => !recent.includes(item.value))
    : list;
  const total = filtered.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of filtered) {
    roll -= item.weight;
    if (roll <= 0) {
      const nextRecent = [...recent, item.value].slice(-RECENT_LIMIT);
      recentByKey.set(key, nextRecent);
      return item.value;
    }
  }
  return filtered[filtered.length - 1]?.value || '';
}

function mergeUnique(base, extra) {
  const seen = new Set(base);
  const merged = [...base];
  extra.forEach(value => {
    if (!seen.has(value)) {
      merged.push(value);
      seen.add(value);
    }
  });
  return merged;
}

const newPhrases = [
  'Drekka!',
  'Drekka sprit!',
  'Sprit!',
  'Skål!',
  'Hæstkuk!',
  'Grandiosa',
  'Bæ bæ mø',
  'Lille grisegutten',
  'Våt mus',
  'Hold kjæften!',
  'Sjøge!',
  'Lille dutten',
  'Hut dæ heim',
  'Jatta jatta'
];

const fragments = {
  leads: [
    { value: 'Hør her', weight: 1.5 },
    { value: 'Oi oi', weight: 1.2 },
    { value: 'Nå skjer det', weight: 1.2 },
    { value: 'Kurt sier', weight: 1.1 },
    { value: 'Eirik roper', weight: 1.1 },
    { value: 'Stokmarknes melder', weight: 1 },
    { value: 'Melbu svarer', weight: 1 },
    { value: 'Isbjørn status', weight: 0.9 },
    { value: 'Kjøttdeig mode', weight: 0.9 },
    { value: 'Arcade-geist', weight: 0.8 }
  ],
  verbs: [
    { value: 'slenger', weight: 1.1 },
    { value: 'gønner', weight: 1 },
    { value: 'klapper til', weight: 1 },
    { value: 'spammes', weight: 1 },
    { value: 'hamrer', weight: 0.9 },
    { value: 'danser med', weight: 0.8 },
    { value: 'rister', weight: 0.8 },
    { value: 'tuter på', weight: 0.8 }
  ],
  objects: [
    { value: 'Stokmarknes', weight: 1.1 },
    { value: 'Melbu', weight: 1.1 },
    { value: 'Kurt', weight: 1.1 },
    { value: 'Eirik', weight: 1.1 },
    { value: 'Kjøttdeig', weight: 1.1 },
    { value: 'Isbjørn', weight: 1 },
    { value: 'Rølp', weight: 1 },
    { value: 'Gris', weight: 1 },
    { value: 'Mongo', weight: 1 },
    { value: 'Tufs', weight: 1 },
    { value: 'Deili', weight: 1 },
    { value: 'Svin', weight: 1 },
    { value: 'Drekka!', weight: 2 },
    { value: 'Drekka sprit!', weight: 2 },
    { value: 'Sprit!', weight: 2 },
    { value: 'Skål!', weight: 2 },
    { value: 'Hæstkuk!', weight: 1.6 },
    { value: 'Grandiosa', weight: 1.6 },
    { value: 'Bæ bæ mø', weight: 1.6 },
    { value: 'Lille grisegutten', weight: 1.6 },
    { value: 'Våt mus', weight: 1.4 },
    { value: 'Hold kjæften!', weight: 1.6 },
    { value: 'Sjøge!', weight: 1.4 },
    { value: 'Lille dutten', weight: 1.4 },
    { value: 'Hut dæ heim', weight: 1.4 },
    { value: 'Jatta jatta', weight: 1.6 }
  ],
  tags: [
    { value: 'arcade-dust', weight: 1 },
    { value: 'buddy roast', weight: 1 },
    { value: 'rølp deluxe', weight: 1 },
    { value: 'overstyring', weight: 0.9 },
    { value: 'i melkeskjegg', weight: 0.9 },
    { value: 'på turbo', weight: 1.1 },
    { value: 'uten filter', weight: 1.1 },
    { value: 'med sprut', weight: 0.8 },
    { value: 'med prikk', weight: 0.8 },
    { value: 'med svor', weight: 0.8 },
    { value: 'i bøtta', weight: 0.7 }
  ],
  closers: [
    { value: 'Skål!', weight: 1.5 },
    { value: 'Jatta jatta!', weight: 1.3 },
    { value: 'Hut dæ heim!', weight: 1.2 },
    { value: 'Drekka!', weight: 1.5 },
    { value: 'Sprit!', weight: 1.3 },
    { value: 'Bæ bæ mø!', weight: 1.2 }
  ]
};

function buildCombo() {
  const lead = weightedPick(fragments.leads, 'leads');
  const verb = weightedPick(fragments.verbs, 'verbs');
  const object = weightedPick(fragments.objects, 'objects');
  const tag = weightedPick(fragments.tags, 'tags');
  const closer = weightedPick(fragments.closers, 'closers');

  const patterns = [
    `${lead}: ${object} ${closer}`,
    `${lead} ${verb} ${object}.`,
    `${object} – ${tag}.`,
    `${lead} ${verb} ${object} – ${tag}.`,
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
    `${object} ${closer}`,
    `${closer}`,
    `${object} – ${closer}`
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
    `Wave ${level}: ${weightedPick(newPhrases, 'waveNew')}`,
    `Wave ${level}: ${weightedPick(fragments.objects, 'waveObjects2')}`
  ];
  return mergeUnique(baseList, generated);
}

export function extendBossNames(base) {
  const baseList = Array.isArray(base) ? base : [];
  const extras = [
    `BOSS ${weightedPick(newPhrases, 'bossNew')}`,
    `BOSS ${weightedPick(fragments.objects, 'bossObjects2')}`,
    `BOSS ${buildShortBurst()}`
  ];
  return mergeUnique(baseList, extras);
}

export function extendGameOverTexts(base) {
  const baseList = Array.isArray(base) ? base : [];
  const extras = [
    buildCombo().toUpperCase(),
    `${weightedPick(newPhrases, 'gameOverNew').toUpperCase()}`,
    `${weightedPick(fragments.objects, 'gameOverObjects').toUpperCase()} OVERLOAD!`
  ];
  return mergeUnique(baseList, extras);
}

export function getLoadingLines() {
  const titleOptions = [
    'LASTER INN SPILLET...',
    'LADER OPP RØLP-MOTOR...',
    'KOKER KJØTTDEIG...',
    'POLERER STOKMARKNES...',
    'SPENNER FAST MELBU...'
  ];
  const subtitleOptions = [
    'Holder til i Melbu, men serveren står i Stokmarknes...',
    `Auto-boot: ${buildShortBurst()}`,
    `Kurt & Eirik tester: ${buildCombo()}`,
    `Laster isbjørn.exe – ${weightedPick(newPhrases, 'loadingNew')}`,
    `Stokmarknes sier: ${weightedPick(newPhrases, 'loadingNew2')}`
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
      return `PAUSE – ${buildShortBurst()}`;
    case 'resume':
      return `KJØR – ${buildShortBurst()}`;
    case 'lowHealth':
      return `LAVT LIV – ${buildShortBurst()}`;
    case 'lifeLost':
      return `LIV TAPT – ${buildShortBurst()}`;
    case 'newWave':
      return `NY WAVE – ${buildShortBurst()}`;
    case 'bossIntro':
      return `BOSS – ${buildCombo()}`;
    default:
      return buildShortBurst();
  }
}

export function getAchievementPopup() {
  const achievements = [
    `Fake achievement: ${buildShortBurst()}`,
    `100% rølp: ${buildCombo()}`,
    `Kjappe fingre – ${buildShortBurst()}`,
    `Stokmarknes boost – ${buildCombo()}`,
    `Melbu bonus – ${buildShortBurst()}`,
    `Kurt/Eirik synergy – ${buildCombo()}`
  ];
  return weightedPick(achievements, 'achievement');
}

export function getEnemyTaunt() {
  const taunts = [
    `Fiender: ${buildShortBurst()}`,
    `Rølp-linja: ${buildCombo()}`,
    `Grisegutten ler – ${buildShortBurst()}`,
    `Svinete snytt: ${buildCombo()}`,
    `Mongo roper: ${buildShortBurst()}`,
    `Tufs mumler: ${buildCombo()}`
  ];
  return weightedPick(taunts, 'taunt');
}

export function getGameOverComment(score, level) {
  const scoreTag = score >= 10000 ? 'LEGENDARISK' : score >= 5000 ? 'SKAMSTERK' : 'RØLP-LAV';
  const lines = [
    `${scoreTag} SCORE – ${buildShortBurst()}`,
    `Level ${level} stoppet deg – ${buildCombo()}`,
    `Neste gang: ${buildShortBurst()}`,
    `Kurt sier: ${buildShortBurst()}`,
    `Eirik sier: ${buildCombo()}`
  ];
  return weightedPick(lines, 'gameOverComment');
}

export function getHighscoreComment(hasScores) {
  const lines = hasScores
    ? [
        `Stokmarknes jubler – ${buildShortBurst()}`,
        `Melbu applaud – ${buildCombo()}`,
        `Kjøttdeig bonus: ${buildShortBurst()}`
      ]
    : [
        `Ingen scores ennå – ${buildShortBurst()}`,
        `Bli første: ${buildShortBurst()}`,
        `Jatta jatta, skriv deg inn!`
      ];
  return weightedPick(lines, 'highscoreComment');
}

export function extendLocations(base) {
  const baseList = Array.isArray(base) ? base : [];
  const extras = ['STOKMARKNES', 'MELBU', 'HADSEL', 'SORTLAND', 'LOFOTEN', 'KURT HQ', 'EIRIK ZONE'];
  return mergeUnique(baseList, extras);
}

export function getAllNewPhrases() {
  return [...newPhrases];
}
