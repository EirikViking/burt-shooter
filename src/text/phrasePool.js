import { t } from '../i18n/index.ts';

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

const fragments = {
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

// Trophy Room Taunt System - Top 3 trash talk Bottom 3
const tauntTemplates = [
  // Stokmarknes/Melbu energy
  '{TAUNTER} roper fra kaia i Stokmarknes: {TARGET}, det der e ikkje score, det e symptoma!',
  'Melbu klokka litt for seint: {TARGET}, du e på feil side av midnatt, og feil side av lista.',
  '{TAUNTER}: {TARGET}, Hurtigruta gikk, men du blei igjen på bunn.',
  'Det lukte kai og diesel. {TAUNTER}: {TARGET}, æ trur du mista aimen i råka.',
  '{TAUNTER} til {TARGET}: Småby, store ambisjoner, men du klarte det ikkje.',

  // Kurt Edgar wisdom
  'Kurt Edgar sa: {TARGET}, dette hadde ikkje gått i Harstad heller. {TAUNTER} er enig.',
  '{TAUNTER}: Kurt Edgar ville kalt deg lett oppvarming, {TARGET}.',
  'Kurt Edgar nikker til {TAUNTER}, ser på {TARGET} og ryster på hodet.',
  '{TAUNTER} siterer Kurt: {TARGET}, du må trene mer før du får øl.',

  // Arcade taunts
  '{TAUNTER} smeller bord: {TARGET}, toppen er fin, bunnen e trist!',
  '{TARGET}, {TAUNTER} spør: Kødde du bare, eller?',
  '{TAUNTER}: {TARGET}, æ venta mer, men fikk mindre.',
  'Fra toppen ser {TAUNTER} ned på {TARGET}: Bæ bæ, lille dutten!',

  // Beer/party culture
  '{TAUNTER} til {TARGET}: Du telte feil øl, du telte feil score.',
  '{TARGET}, dette e ikkje din fest. Hilsen {TAUNTER}.',
  '{TAUNTER}: {TARGET}, du blei invitert, men du kom sist.',
  'Øl nummer som ikkje burde telles: {TARGET}. Mvh {TAUNTER}.',

  // Score comparisons
  '{TAUNTER} ({SCORE_T}) til {TARGET} ({SCORE_B}): Se differansen?',
  '{TARGET}, {TAUNTER} e {SCORE_T} poeng bedre. Det e langt.',
  '{TAUNTER} level {LEVEL_T} til {TARGET} level {LEVEL_B}: Kom deg opp!',
  '{TARGET}, toppen e {SCORE_T}, bunnen e {SCORE_B}. Du e bunnen. Hilsen {TAUNTER}.',

  // Late night chaos
  'Nordlys i blikket: {TAUNTER} skinner, {TARGET} slokner.',
  '{TAUNTER} har full kontroll, {TARGET} har ingen.',
  '{TARGET}, {TAUNTER} sa: Dette e kaos, men du e verst.',
  'Klassisk kveld: {TAUNTER} vant, {TARGET} tapte.',

  // Short and punchy
  '{TAUNTER}: {TARGET}, jatta jatta, prøv igjen!',
  '{TARGET}, hut dæ heim! - {TAUNTER}',
  '{TAUNTER} til {TARGET}: Bæ bæ mø!',
  '{TARGET}, hold kjæften og spill bedre! - {TAUNTER}',
  '{TAUNTER}: {TARGET}, dette e hæstkuk!',

  // Diesel/harbor vibes
  '{TAUNTER}: {TARGET}, du lukter diesel og nederlag.',
  'Kaia kaller: {TARGET}, du tilhører bunnen. {TAUNTER} på topp.',
  '{TAUNTER} på brygga, {TARGET} i sjøen.',

  // Confidence
  '{TAUNTER} med selvtillit: {TARGET}, æ e ikkje redd for deg.',
  '{TARGET}, {TAUNTER} kjører på, du kjører av.',
  '{TAUNTER}: {TARGET}, æ vant før du starta.',

  // Extra spicy (still playful)
  '{TAUNTER}: {TARGET}, du e Grandiosa uten ost.',
  '{TARGET} e våt mus, {TAUNTER} e løve.',
  '{TAUNTER} til {TARGET}: Du e lille grisegutten, æ e sjefen.',
  '{TARGET}, {TAUNTER} sa: Sjøge!',

  // Final taunts
  '{TAUNTER}: {TARGET}, this is Stokmarknes, not amateur hour.',
  'Melbu stemning: {TAUNTER} vinner, {TARGET} kjemper.',
  '{TARGET}, alle kjenner alle, men ingen husker deg. - {TAUNTER}',
  '{TAUNTER}: {TARGET}, dette blir nevnt i årevis!',
  'Kurt Edgar overlevde nittitallet, {TAUNTER} overlevde deg, {TARGET}.'
];

export function getLeaderboardTaunt(targetName) {
  const allTaunts = [
    '{TARGET}: Jatta jatta, prøv igjen!',
    '{TARGET}: Hut dæ heim!',
    '{TARGET}: Bæ bæ mø!',
    '{TARGET}: Hold kjæften og spill bedre!',
    '{TARGET}: Dette e hæstkuk!',
    '{TARGET}: Du e for treig!',
    '{TARGET}: Amatør!',
    '{TARGET}: Se og lær!',
    '{TARGET}: Stokmarknes eier deg!',
    '{TARGET}: Kurt Edgar ville skammet seg!'
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
