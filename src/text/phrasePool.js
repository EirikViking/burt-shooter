import { onLanguageChange, t } from '../i18n/index.ts';

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

function buildNewPhrases() {
  return [
  t('phrase.newPhrases.0'),
  t('phrase.newPhrases.1'),
  t('phrase.newPhrases.2'),
  t('phrase.newPhrases.3'),
  t('phrase.newPhrases.4'),
  t('phrase.newPhrases.5'),
  t('phrase.newPhrases.6'),
  t('phrase.newPhrases.7'),
  t('phrase.newPhrases.8'),
  t('phrase.newPhrases.9'),
  t('phrase.newPhrases.10'),
  t('phrase.newPhrases.11'),
  t('phrase.newPhrases.12'),
  t('phrase.newPhrases.13'),
  t('phrase.newPhrases.14'),
  t('phrase.newPhrases.15'),
  t('phrase.newPhrases.16'),
  t('phrase.newPhrases.17'),
  t('phrase.newPhrases.18'),
  t('phrase.newPhrases.19'),
  t('phrase.newPhrases.20'),
  t('phrase.newPhrases.21'),
  t('phrase.newPhrases.22'),
  t('phrase.newPhrases.23'),
  t('phrase.newPhrases.24'),
  t('phrase.newPhrases.25'),
  t('phrase.newPhrases.26'),
  t('phrase.newPhrases.27'),
  t('phrase.newPhrases.28'),
  t('phrase.newPhrases.29'),
  t('phrase.newPhrases.30'),
  t('phrase.newPhrases.31'),
  t('phrase.newPhrases.32'),
  t('phrase.newPhrases.33'),
  t('phrase.newPhrases.34'),
  t('phrase.newPhrases.35'),
  t('phrase.newPhrases.36'),
  t('phrase.newPhrases.37'),
  t('phrase.newPhrases.38'),
  t('phrase.newPhrases.39'),
  t('phrase.newPhrases.40'),
  t('phrase.newPhrases.41'),
  t('phrase.newPhrases.42'),
  t('phrase.newPhrases.43'),
  t('phrase.newPhrases.44'),
  t('phrase.newPhrases.45'),
  t('phrase.newPhrases.46'),
  t('phrase.newPhrases.47'),
  t('phrase.newPhrases.48'),
  t('phrase.newPhrases.49'),
  t('phrase.newPhrases.50'),
  t('phrase.newPhrases.51'),
  t('phrase.newPhrases.52'),
  t('phrase.newPhrases.53'),
  t('phrase.newPhrases.54'),
  t('phrase.newPhrases.55'),
  t('phrase.newPhrases.56'),
  t('phrase.newPhrases.57'),
  t('phrase.newPhrases.58'),
  t('phrase.newPhrases.59'),
  t('phrase.newPhrases.60'),
  t('phrase.newPhrases.61'),
  t('phrase.newPhrases.62'),
  t('phrase.newPhrases.63'),
  t('phrase.newPhrases.64'),
  t('phrase.newPhrases.65'),
  t('phrase.newPhrases.66'),
  t('phrase.newPhrases.67'),
  t('phrase.newPhrases.68'),
  t('phrase.newPhrases.69'),
  t('phrase.newPhrases.70'),
  t('phrase.newPhrases.71'),
  t('phrase.newPhrases.72'),
  t('phrase.newPhrases.73'),
  t('phrase.newPhrases.74'),
  t('phrase.newPhrases.75'),
  t('phrase.newPhrases.76'),
  t('phrase.newPhrases.77'),
  t('phrase.newPhrases.78'),
  t('phrase.newPhrases.79'),
  t('phrase.newPhrases.80'),
  t('phrase.newPhrases.81'),
  t('phrase.newPhrases.82'),
  t('phrase.newPhrases.83'),
  t('phrase.newPhrases.84'),
  t('phrase.newPhrases.85')

  ];
}

let newPhrases = buildNewPhrases();

function buildFragments() {
  return {
  leads: [
    { value: t('phrase.fragments.leads.0'), weight: 1.5 },
    { value: t('phrase.fragments.leads.1'), weight: 1.2 },
    { value: t('phrase.fragments.leads.2'), weight: 1.2 },
    { value: t('phrase.fragments.leads.3'), weight: 1.1 },
    { value: t('phrase.fragments.leads.4'), weight: 1.1 },
    { value: t('phrase.fragments.leads.5'), weight: 1 },
    { value: t('phrase.fragments.leads.6'), weight: 1 },
    { value: t('phrase.fragments.leads.7'), weight: 0.9 },
    { value: t('phrase.fragments.leads.8'), weight: 0.9 },
    { value: t('phrase.fragments.leads.9'), weight: 0.8 }
  ],
  verbs: [
    { value: t('phrase.fragments.verbs.0'), weight: 1.1 },
    { value: t('phrase.fragments.verbs.1'), weight: 1 },
    { value: t('phrase.fragments.verbs.2'), weight: 1 },
    { value: t('phrase.fragments.verbs.3'), weight: 1 },
    { value: t('phrase.fragments.verbs.4'), weight: 0.9 },
    { value: t('phrase.fragments.verbs.5'), weight: 0.8 },
    { value: t('phrase.fragments.verbs.6'), weight: 0.8 },
    { value: t('phrase.fragments.verbs.7'), weight: 0.8 }
  ],
  objects: [
    { value: t('phrase.fragments.objects.0'), weight: 1.1 },
    { value: t('phrase.fragments.objects.1'), weight: 1.1 },
    { value: t('phrase.fragments.objects.2'), weight: 1.1 },
    { value: t('phrase.fragments.objects.3'), weight: 1.1 },
    { value: t('phrase.fragments.objects.4'), weight: 1.1 },
    { value: t('phrase.fragments.objects.5'), weight: 1 },
    { value: t('phrase.fragments.objects.6'), weight: 1 },
    { value: t('phrase.fragments.objects.7'), weight: 1 },
    { value: t('phrase.fragments.objects.8'), weight: 1 },
    { value: t('phrase.fragments.objects.9'), weight: 1 },
    { value: t('phrase.fragments.objects.10'), weight: 1 },
    { value: t('phrase.fragments.objects.11'), weight: 1 },
    { value: t('phrase.fragments.objects.12'), weight: 2 },
    { value: t('phrase.fragments.objects.13'), weight: 2 },
    { value: t('phrase.fragments.objects.14'), weight: 2 },
    { value: t('phrase.fragments.objects.15'), weight: 2 },
    { value: t('phrase.fragments.objects.16'), weight: 1.6 },
    { value: t('phrase.fragments.objects.17'), weight: 1.6 },
    { value: t('phrase.fragments.objects.18'), weight: 1.6 },
    { value: t('phrase.fragments.objects.19'), weight: 1.6 },
    { value: t('phrase.fragments.objects.20'), weight: 1.4 },
    { value: t('phrase.fragments.objects.21'), weight: 1.6 },
    { value: t('phrase.fragments.objects.22'), weight: 1.4 },
    { value: t('phrase.fragments.objects.23'), weight: 1.4 },
    { value: t('phrase.fragments.objects.24'), weight: 1.4 },
    { value: t('phrase.fragments.objects.25'), weight: 1.6 }
  ],
  tags: [
    { value: t('phrase.fragments.tags.0'), weight: 1 },
    { value: t('phrase.fragments.tags.1'), weight: 1 },
    { value: t('phrase.fragments.tags.2'), weight: 1 },
    { value: t('phrase.fragments.tags.3'), weight: 0.9 },
    { value: t('phrase.fragments.tags.4'), weight: 0.9 },
    { value: t('phrase.fragments.tags.5'), weight: 1.1 },
    { value: t('phrase.fragments.tags.6'), weight: 1.1 },
    { value: t('phrase.fragments.tags.7'), weight: 0.8 },
    { value: t('phrase.fragments.tags.8'), weight: 0.8 },
    { value: t('phrase.fragments.tags.9'), weight: 0.8 },
    { value: t('phrase.fragments.tags.10'), weight: 0.7 }
  ],
  closers: [
    { value: t('phrase.fragments.closers.0'), weight: 1.5 },
    { value: t('phrase.fragments.closers.1'), weight: 1.3 },
    { value: t('phrase.fragments.closers.2'), weight: 1.2 },
    { value: t('phrase.fragments.closers.3'), weight: 1.5 },
    { value: t('phrase.fragments.closers.4'), weight: 1.3 },
    { value: t('phrase.fragments.closers.5'), weight: 1.2 }
  ]

  };
}

let fragments = buildFragments();

onLanguageChange(() => {
  newPhrases = buildNewPhrases();
  fragments = buildFragments();
});

function buildCombo() {
  const lead = weightedPick(fragments.leads, 'leads');
  const verb = weightedPick(fragments.verbs, 'verbs');
  const object = weightedPick(fragments.objects, 'objects');
  const tag = weightedPick(fragments.tags, 'tags');
  const closer = weightedPick(fragments.closers, 'closers');

  const patterns = [
    t('phrase.combo.patterns.0', { lead, object, closer }),
    t('phrase.combo.patterns.1', { lead, verb, object }),
    t('phrase.combo.patterns.2', { object, tag }),
    t('phrase.combo.patterns.3', { lead, verb, object, tag }),
    t('phrase.combo.patterns.4', { object, closer }),
    t('phrase.combo.patterns.5', { lead, object, closer })
  ];

  return weightedPick(patterns, 'comboPatterns');
}

function buildShortBurst() {
  const object = weightedPick(fragments.objects, 'shortObjects');
  const closer = weightedPick(fragments.closers, 'shortClosers');
  const patterns = [
    t('phrase.short.patterns.0', { object }),
    t('phrase.short.patterns.1', { object, closer }),
    t('phrase.short.patterns.2', { closer }),
    t('phrase.short.patterns.3', { object, closer })
  ];
  return weightedPick(patterns, 'shortPatterns');
}

export function extendLevelIntroTexts(base, level, isBossLevel) {
  const baseList = Array.isArray(base) ? base : [];
  const bossObject = weightedPick(fragments.objects, 'bossObjects');
  const waveObject = weightedPick(fragments.objects, 'waveObjects');
  const intro = isBossLevel
    ? t('phrase.levelIntro.boss', { object: bossObject })
    : t('phrase.levelIntro.wave', { level, content: waveObject });
  const generated = [
    intro,
    t('phrase.levelIntro.wave', { level, content: buildCombo() }),
    t('phrase.levelIntro.wave', { level, content: buildShortBurst() }),
    t('phrase.levelIntro.wave', { level, content: weightedPick(newPhrases, 'waveNew') }),
    t('phrase.levelIntro.wave', { level, content: weightedPick(fragments.objects, 'waveObjects2') })
  ];
  return mergeUnique(baseList, generated);
}

export function extendBossNames(base) {
  const baseList = Array.isArray(base) ? base : [];
  const extras = [
    t('phrase.bossName', { value: weightedPick(newPhrases, 'bossNew') }),
    t('phrase.bossName', { value: weightedPick(fragments.objects, 'bossObjects2') }),
    t('phrase.bossName', { value: buildShortBurst() })
  ];
  return mergeUnique(baseList, extras);
}

export function extendGameOverTexts(base) {
  const baseList = Array.isArray(base) ? base : [];
  const overloadObject = weightedPick(fragments.objects, 'gameOverObjects').toUpperCase();
  const extras = [
    buildCombo().toUpperCase(),
    `${weightedPick(newPhrases, 'gameOverNew').toUpperCase()}`,
    t('phrase.gameOver.overload', { object: overloadObject })
  ];
  return mergeUnique(baseList, extras);
}

export function getLoadingLines() {
  const titleOptions = [
    t('phrase.loading.title.0'),
    t('phrase.loading.title.1'),
    t('phrase.loading.title.2'),
    t('phrase.loading.title.3'),
    t('phrase.loading.title.4')
  ];
  const subtitleOptions = [
    t('phrase.loading.subtitle.0'),
    t('phrase.loading.subtitle.1', { burst: buildShortBurst() }),
    t('phrase.loading.subtitle.2', { combo: buildCombo() }),
    t('phrase.loading.subtitle.3', { phrase: weightedPick(newPhrases, 'loadingNew') }),
    t('phrase.loading.subtitle.4', { phrase: weightedPick(newPhrases, 'loadingNew2') })
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
      return t('phrase.micro.pause', { burst: buildShortBurst() });
    case 'resume':
      return t('phrase.micro.resume', { burst: buildShortBurst() });
    case 'lowHealth':
      return t('phrase.micro.lowHealth', { burst: buildShortBurst() });
    case 'lifeLost':
      return t('phrase.micro.lifeLost', { burst: buildShortBurst() });
    case 'newWave':
      return t('phrase.micro.newWave', { burst: buildShortBurst() });
    case 'bossIntro':
      return t('phrase.micro.bossIntro', { combo: buildCombo() });
    default:
      return buildShortBurst();
  }
}

export function getAchievementPopup() {
  const achievements = [
    t('phrase.achievement.0', { burst: buildShortBurst() }),
    t('phrase.achievement.1', { combo: buildCombo() }),
    t('phrase.achievement.2', { burst: buildShortBurst() }),
    t('phrase.achievement.3', { combo: buildCombo() }),
    t('phrase.achievement.4', { burst: buildShortBurst() }),
    t('phrase.achievement.5', { combo: buildCombo() })
  ];
  return weightedPick(achievements, 'achievement');
}

export function getEnemyTaunt() {
  const taunts = [
    t('phrase.enemyTaunt.0', { burst: buildShortBurst() }),
    t('phrase.enemyTaunt.1', { combo: buildCombo() }),
    t('phrase.enemyTaunt.2', { burst: buildShortBurst() }),
    t('phrase.enemyTaunt.3', { combo: buildCombo() }),
    t('phrase.enemyTaunt.4', { burst: buildShortBurst() }),
    t('phrase.enemyTaunt.5', { combo: buildCombo() })
  ];
  return weightedPick(taunts, 'taunt');
}

export function getGameOverComment(score, level) {
  const scoreTag = score >= 10000
    ? t('phrase.gameOver.scoreTag.legendary')
    : score >= 5000
      ? t('phrase.gameOver.scoreTag.strong')
      : t('phrase.gameOver.scoreTag.low');
  const lines = [
    t('phrase.gameOver.comment.0', { scoreTag, burst: buildShortBurst() }),
    t('phrase.gameOver.comment.1', { level, combo: buildCombo() }),
    t('phrase.gameOver.comment.2', { burst: buildShortBurst() }),
    t('phrase.gameOver.comment.3', { burst: buildShortBurst() }),
    t('phrase.gameOver.comment.4', { combo: buildCombo() })
  ];
  return weightedPick(lines, 'gameOverComment');
}

export function getHighscoreComment(hasScores) {
  const lines = hasScores
    ? [
      t('phrase.highscore.comment.0', { burst: buildShortBurst() }),
      t('phrase.highscore.comment.1', { combo: buildCombo() }),
      t('phrase.highscore.comment.2', { burst: buildShortBurst() })
    ]
    : [
      t('phrase.highscore.comment.3', { burst: buildShortBurst() }),
      t('phrase.highscore.comment.4', { burst: buildShortBurst() }),
      t('phrase.highscore.comment.5')
    ];
  return weightedPick(lines, 'highscoreComment');
}

export function extendLocations(base) {
  const baseList = Array.isArray(base) ? base : [];
  const extras = [
    t('phrase.location.0'),
    t('phrase.location.1'),
    t('phrase.location.2'),
    t('phrase.location.3'),
    t('phrase.location.4'),
    t('phrase.location.5'),
    t('phrase.location.6')
  ];
  return mergeUnique(baseList, extras);
}

export function getAllNewPhrases() {
  return [...newPhrases];
}

// Trophy Room Taunt System - Top 3 trash talk Bottom 3
const tauntTemplates = [
  t('phrase.leaderboard.tauntTemplates.0'),
  t('phrase.leaderboard.tauntTemplates.1'),
  t('phrase.leaderboard.tauntTemplates.2'),
  t('phrase.leaderboard.tauntTemplates.3'),
  t('phrase.leaderboard.tauntTemplates.4'),
  t('phrase.leaderboard.tauntTemplates.5'),
  t('phrase.leaderboard.tauntTemplates.6'),
  t('phrase.leaderboard.tauntTemplates.7'),
  t('phrase.leaderboard.tauntTemplates.8'),
  t('phrase.leaderboard.tauntTemplates.9'),
  t('phrase.leaderboard.tauntTemplates.10'),
  t('phrase.leaderboard.tauntTemplates.11'),
  t('phrase.leaderboard.tauntTemplates.12'),
  t('phrase.leaderboard.tauntTemplates.13'),
  t('phrase.leaderboard.tauntTemplates.14'),
  t('phrase.leaderboard.tauntTemplates.15'),
  t('phrase.leaderboard.tauntTemplates.16'),
  t('phrase.leaderboard.tauntTemplates.17'),
  t('phrase.leaderboard.tauntTemplates.18'),
  t('phrase.leaderboard.tauntTemplates.19'),
  t('phrase.leaderboard.tauntTemplates.20'),
  t('phrase.leaderboard.tauntTemplates.21'),
  t('phrase.leaderboard.tauntTemplates.22'),
  t('phrase.leaderboard.tauntTemplates.23'),
  t('phrase.leaderboard.tauntTemplates.24'),
  t('phrase.leaderboard.tauntTemplates.25'),
  t('phrase.leaderboard.tauntTemplates.26'),
  t('phrase.leaderboard.tauntTemplates.27'),
  t('phrase.leaderboard.tauntTemplates.28'),
  t('phrase.leaderboard.tauntTemplates.29'),
  t('phrase.leaderboard.tauntTemplates.30'),
  t('phrase.leaderboard.tauntTemplates.31'),
  t('phrase.leaderboard.tauntTemplates.32'),
  t('phrase.leaderboard.tauntTemplates.33'),
  t('phrase.leaderboard.tauntTemplates.34'),
  t('phrase.leaderboard.tauntTemplates.35'),
  t('phrase.leaderboard.tauntTemplates.36'),
  t('phrase.leaderboard.tauntTemplates.37'),
  t('phrase.leaderboard.tauntTemplates.38'),
  t('phrase.leaderboard.tauntTemplates.39'),
  t('phrase.leaderboard.tauntTemplates.40'),
  t('phrase.leaderboard.tauntTemplates.41'),
  t('phrase.leaderboard.tauntTemplates.42'),
  t('phrase.leaderboard.tauntTemplates.43'),
  t('phrase.leaderboard.tauntTemplates.44')
];

export function getLeaderboardTaunt(targetName) {
  const allTaunts = [
    t('phrase.leaderboard.taunts.0'),
    t('phrase.leaderboard.taunts.1'),
    t('phrase.leaderboard.taunts.2'),
    t('phrase.leaderboard.taunts.3'),
    t('phrase.leaderboard.taunts.4'),
    t('phrase.leaderboard.taunts.5'),
    t('phrase.leaderboard.taunts.6'),
    t('phrase.leaderboard.taunts.7'),
    t('phrase.leaderboard.taunts.8'),
    t('phrase.leaderboard.taunts.9')
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
