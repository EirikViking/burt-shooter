import { getCurrentLanguage } from '../i18n/index.js';

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

const arcadePhrasesDe = [
  'Münze einwerfen. Nichts bereuen.',
  'Die Formation hat offiziell Beschwerde eingelegt.',
  'Bonusphase entdeckt.',
  'Pixelversicherung abgelaufen.',
  'Die Cabinet-Tasten geben ihr Bestes.',
  'Der Schwarm hat Choreografie mitgebracht.',
  'Attract Mode hat eine Meinung.',
  'Noch ein Run. Natürlich.',
  'Bosswarnung: dramatischer Auftritt steht bevor.',
  'Highscore-Schwerkraft erhöht.',
  'Die Aliens haben geprobt.',
  'Münzwirtschaft instabil.',
  'Laser-Etikette ausgesetzt.',
  'Formationsleitung hat das Memo verloren.',
  'Die Bühnenleitung panikiert höflich.',
  'Arcade-Cabinet läuft heiß.',
  'Combo-Becher voller Funken.',
  'Kleines Schiff. Große Verantwortung.',
  'Das Gegnermuster hält sich für schlau.',
  'Power-Pellet-Papierkram abgelehnt.',
  'Retro-Gefahr, moderne Panik.',
  'Deine Hitbox lässt grüßen.',
  'Die Bestenliste schaut zu.',
  'Schwarmvertrauen: unverdient.',
  'Boss-Cape-Budget genehmigt.'
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

const storyTransmissionsDe = [
  {
    id: 'last-coin',
    levelMin: 1,
    title: 'STATISCHE ERINNERUNG',
    line: 'Eine Münze hat das Cabinet geweckt. Der Pilot weiß immer noch nicht, ob das Glück war.',
    imageAlias: 'nova-swarm-story-comms-01-20260519'
  },
  {
    id: 'swarm-spiral',
    levelMin: 2,
    title: 'MUSTERDRIFT',
    line: 'Der Schwarm jagt nicht. Er ordnet sich um jedes Ausweichen herum an.',
    imageAlias: 'nova-swarm-story-comms-02-20260519'
  },
  {
    id: 'pattern-read',
    levelMin: 4,
    title: 'LEISER READOUT',
    line: 'Eine kleine Drone kartiert die Bahnen. Der Pilot schießt nicht mehr auf Rauschen, sondern liest Absicht.',
    imageAlias: 'nova-swarm-story-comms-03-20260519'
  },
  {
    id: 'boss-gate',
    levelMin: 7,
    title: 'TOR-SIGNAL',
    line: 'Hinter dem Boss-Tor sehen die Lichter weniger wie Sterne aus und mehr wie wartende Namen.',
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

const fragmentsDe = {
  leads: [
    { value: 'Arcade-Zentrale', weight: 1.4 },
    { value: 'Cabinet-Alarm', weight: 1.3 },
    { value: 'Schwarmfunk', weight: 1.2 },
    { value: 'Münzmeister', weight: 1.1 },
    { value: 'Formationstrainer', weight: 1.1 },
    { value: 'Pixelradio', weight: 1.1 },
    { value: 'Boss-Planung', weight: 1 }
  ],
  verbs: [
    { value: 'meldet', weight: 1.2 },
    { value: 'hinterfragt', weight: 1 },
    { value: 'überdreht', weight: 1 },
    { value: 'verliest', weight: 0.9 },
    { value: 'leitet um', weight: 0.9 },
    { value: 'prüft', weight: 0.9 },
    { value: 'stichelt gegen', weight: 0.8 }
  ],
  objects: [
    { value: 'die Bonuswelle', weight: 1.2 },
    { value: 'die Hitbox', weight: 1.2 },
    { value: 'die Laserrechnung', weight: 1.1 },
    { value: 'die Popcorn-Formation', weight: 1.1 },
    { value: 'den Boss-Auftritt', weight: 1.1 },
    { value: 'den Münzschlitz', weight: 1 },
    { value: 'die Schwarmchoreografie', weight: 1 },
    { value: 'den Panikknopf', weight: 1 },
    { value: 'das Extraleben-Komitee', weight: 0.9 }
  ],
  tags: [
    { value: 'klassische Cabinet-Energie', weight: 1.2 },
    { value: 'maximale Pew-Pew-Freigabe', weight: 1.1 },
    { value: 'Formationsdrama', weight: 1 },
    { value: 'Bossmusik-Selbstvertrauen', weight: 1 },
    { value: 'kleines Schiff, große Heldentaten', weight: 1 },
    { value: 'Highscore-Unsinn', weight: 0.9 }
  ],
  closers: [
    { value: 'Weiterfeuern.', weight: 1.3 },
    { value: 'Stilvoll ausweichen.', weight: 1.2 },
    { value: 'Münzen retten dich.', weight: 1.1 },
    { value: 'Hitbox beachten.', weight: 1.1 },
    { value: 'Formation beschuldigen.', weight: 1 },
    { value: 'Boss bald.', weight: 1 }
  ]
};

const localizedFragments = {
  es: {
    leads: [{ value: 'Control Arcade', weight: 1.4 }, { value: 'Alerta Cabinet', weight: 1.3 }, { value: 'Radio del enjambre', weight: 1.2 }, { value: 'Entrenador de formación', weight: 1.1 }],
    verbs: [{ value: 'informa de', weight: 1.2 }, { value: 'cuestiona', weight: 1 }, { value: 'sobrecarga', weight: 1 }, { value: 'se burla de', weight: 0.8 }],
    objects: [{ value: 'la oleada bonus', weight: 1.2 }, { value: 'la hitbox', weight: 1.2 }, { value: 'la factura láser', weight: 1.1 }, { value: 'la entrada del jefe', weight: 1.1 }, { value: 'la coreografía del enjambre', weight: 1 }],
    tags: [{ value: 'energía de cabinet clásico', weight: 1.2 }, { value: 'drama de formación', weight: 1 }, { value: 'confianza de música de jefe', weight: 1 }, { value: 'heroísmo de nave pequeña', weight: 1 }],
    closers: [{ value: 'Sigue disparando.', weight: 1.3 }, { value: 'Esquiva con estilo.', weight: 1.2 }, { value: 'Guarda las monedas.', weight: 1.1 }, { value: 'Cuida la hitbox.', weight: 1.1 }, { value: 'Jefe pronto.', weight: 1 }]
  },
  ru: {
    leads: [{ value: 'Аркадный контроль', weight: 1.4 }, { value: 'Сигнал cabinet', weight: 1.3 }, { value: 'Радио роя', weight: 1.2 }, { value: 'Тренер формаций', weight: 1.1 }],
    verbs: [{ value: 'сообщает про', weight: 1.2 }, { value: 'проверяет', weight: 1 }, { value: 'перегружает', weight: 1 }, { value: 'дразнит', weight: 0.8 }],
    objects: [{ value: 'бонусную волну', weight: 1.2 }, { value: 'hitbox', weight: 1.2 }, { value: 'лазерный счет', weight: 1.1 }, { value: 'выход босса', weight: 1.1 }, { value: 'хореографию роя', weight: 1 }],
    tags: [{ value: 'классическая энергия cabinet', weight: 1.2 }, { value: 'драма формации', weight: 1 }, { value: 'уверенность музыки босса', weight: 1 }, { value: 'героизм малого корабля', weight: 1 }],
    closers: [{ value: 'Продолжай стрелять.', weight: 1.3 }, { value: 'Уклоняйся красиво.', weight: 1.2 }, { value: 'Береги монеты.', weight: 1.1 }, { value: 'Следи за hitbox.', weight: 1.1 }, { value: 'Босс скоро.', weight: 1 }]
  },
  'zh-CN': {
    leads: [{ value: '街机控制台', weight: 1.4 }, { value: 'Cabinet 警报', weight: 1.3 }, { value: '虫群通讯', weight: 1.2 }, { value: '阵型教练', weight: 1.1 }],
    verbs: [{ value: '报告', weight: 1.2 }, { value: '质疑', weight: 1 }, { value: '过载', weight: 1 }, { value: '嘲讽', weight: 0.8 }],
    objects: [{ value: '奖励波次', weight: 1.2 }, { value: 'hitbox', weight: 1.2 }, { value: '激光账单', weight: 1.1 }, { value: 'Boss 登场', weight: 1.1 }, { value: '虫群编舞', weight: 1 }],
    tags: [{ value: '经典 cabinet 能量', weight: 1.2 }, { value: '阵型戏剧性', weight: 1 }, { value: 'Boss 音乐自信', weight: 1 }, { value: '小飞船英雄时刻', weight: 1 }],
    closers: [{ value: '继续开火。', weight: 1.3 }, { value: '漂亮地闪避。', weight: 1.2 }, { value: '省下硬币。', weight: 1.1 }, { value: '注意 hitbox。', weight: 1.1 }, { value: 'Boss 快来了。', weight: 1 }]
  }
};

const localizedArcadePhrases = {
  es: ['Mete moneda. No te arrepientas.', 'Fase bonus detectada.', 'El enjambre trae coreografía.', 'Otra partida. Obviamente.', 'Aviso de jefe: entrada dramática pendiente.', 'El marcador está mirando.', 'Tu hitbox manda saludos.'],
  ru: ['Вставь монету. Ни о чем не жалей.', 'Бонусная стадия обнаружена.', 'Рой принес хореографию.', 'Еще один забег. Конечно.', 'Предупреждение: босс готовит драматичный выход.', 'Таблица смотрит.', 'Твой hitbox передает привет.'],
  'zh-CN': ['投币。不要后悔。', '检测到奖励关。', '虫群带来了编队舞步。', '再来一局。当然。', 'Boss 警告：即将隆重登场。', '计分板正在看着你。', '你的 hitbox 向你问好。']
};

const localizedStoryTransmissions = {
  es: [
    { id: 'last-coin', levelMin: 1, title: 'MEMORIA ESTÁTICA', line: 'Una moneda despertó el cabinet. El piloto aún no sabe si aquello fue suerte.', imageAlias: 'nova-swarm-story-comms-01-20260519' },
    { id: 'swarm-spiral', levelMin: 2, title: 'DERIVA DE PATRÓN', line: 'El enjambre no persigue. Se ordena alrededor de cada esquiva.', imageAlias: 'nova-swarm-story-comms-02-20260519' },
    { id: 'pattern-read', levelMin: 4, title: 'LECTURA SILENCIOSA', line: 'Un dron pequeño mapea los carriles. El piloto deja de disparar al ruido y empieza a leer intención.', imageAlias: 'nova-swarm-story-comms-03-20260519' },
    { id: 'boss-gate', levelMin: 7, title: 'SEÑAL DE PUERTA', line: 'Tras la puerta del jefe, las luces parecen menos estrellas y más nombres esperando.', imageAlias: 'nova-swarm-story-comms-04-20260519' }
  ],
  ru: [
    { id: 'last-coin', levelMin: 1, title: 'СТАТИЧНАЯ ПАМЯТЬ', line: 'Одна монета разбудила cabinet. Пилот до сих пор не решил, было ли это везением.', imageAlias: 'nova-swarm-story-comms-01-20260519' },
    { id: 'swarm-spiral', levelMin: 2, title: 'ДРЕЙФ ПАТТЕРНА', line: 'Рой не гонится. Он выстраивается вокруг каждого уклонения.', imageAlias: 'nova-swarm-story-comms-02-20260519' },
    { id: 'pattern-read', levelMin: 4, title: 'ТИХАЯ СВОДКА', line: 'Малый дрон чертит коридоры. Пилот перестает стрелять по шуму и начинает читать намерение.', imageAlias: 'nova-swarm-story-comms-03-20260519' },
    { id: 'boss-gate', levelMin: 7, title: 'СИГНАЛ ВОРОТ', line: 'За воротами босса огни меньше похожи на звезды и больше на ожидающие имена.', imageAlias: 'nova-swarm-story-comms-04-20260519' }
  ],
  'zh-CN': [
    { id: 'last-coin', levelMin: 1, title: '静态记忆', line: '一枚硬币唤醒了 cabinet。飞行员还没决定那是不是运气。', imageAlias: 'nova-swarm-story-comms-01-20260519' },
    { id: 'swarm-spiral', levelMin: 2, title: '弹幕漂移', line: '虫群不是在追你。它正在围绕每一次闪避重新排布。', imageAlias: 'nova-swarm-story-comms-02-20260519' },
    { id: 'pattern-read', levelMin: 4, title: '安静读数', line: '小型无人机标出航道。飞行员不再朝噪声开火，而是开始读懂意图。', imageAlias: 'nova-swarm-story-comms-03-20260519' },
    { id: 'boss-gate', levelMin: 7, title: '大门信号', line: 'Boss 大门后面的光不像星星，更像等待被写下的名字。', imageAlias: 'nova-swarm-story-comms-04-20260519' }
  ]
};

const localizedLabels = {
  de: { wave: 'Welle', overload: 'ÜBERLASTUNG!', pause: 'PAUSE', resume: 'WEITER', lowHealth: 'WENIG LEBEN', lifeLost: 'SCHIFF VERLOREN - HITBOX GETROFFEN!', newWave: 'NEUE WELLE' },
  es: { wave: 'Oleada', overload: 'SOBRECARGA!', pause: 'PAUSA', resume: 'CONTINUAR', lowHealth: 'POCA VIDA', lifeLost: 'NAVE PERDIDA - HITBOX TOCADA!', newWave: 'NUEVA OLEADA' },
  ru: { wave: 'Волна', overload: 'ПЕРЕГРУЗКА!', pause: 'ПАУЗА', resume: 'ПРОДОЛЖИТЬ', lowHealth: 'МАЛО ЖИЗНИ', lifeLost: 'КОРАБЛЬ СБИТ - HITBOX ЗАДЕТ!', newWave: 'НОВАЯ ВОЛНА' },
  'zh-CN': { wave: '波次', overload: '过载！', pause: '暂停', resume: '继续', lowHealth: '生命偏低', lifeLost: '飞船损毁 - 命中 HITBOX！', newWave: '新波次' }
};

function isGerman() {
  return getCurrentLanguage() === 'de';
}

function currentFragments() {
  const language = getCurrentLanguage();
  if (language === 'de') return fragmentsDe;
  return localizedFragments[language] || fragments;
}

function currentArcadePhrases() {
  const language = getCurrentLanguage();
  if (language === 'de') return arcadePhrasesDe;
  return localizedArcadePhrases[language] || arcadePhrases;
}

function currentStoryTransmissions() {
  const language = getCurrentLanguage();
  if (language === 'de') return storyTransmissionsDe;
  return localizedStoryTransmissions[language] || storyTransmissions;
}

function buildCombo() {
  const data = currentFragments();
  const lead = weightedPick(data.leads, 'leads');
  const verb = weightedPick(data.verbs, 'verbs');
  const object = weightedPick(data.objects, 'objects');
  const tag = weightedPick(data.tags, 'tags');
  const closer = weightedPick(data.closers, 'closers');
  const patterns = isGerman()
    ? [
      `${lead}: ${closer}`,
      `${lead} ${verb} ${object}.`,
      `${object} - ${tag}.`,
      `${lead} ${verb} ${object} - ${tag}.`,
      `${object}! ${closer}`,
      `${lead}. ${object}. ${closer}`
    ]
    : [
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
  const data = currentFragments();
  const object = weightedPick(data.objects, 'shortObjects');
  const closer = weightedPick(data.closers, 'shortClosers');
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
  const waveLabel = localizedLabels[getCurrentLanguage()]?.wave || (isGerman() ? 'Welle' : 'Wave');
  const intro = isBossLevel
    ? `BOSS: ${weightedPick(currentFragments().objects, 'bossObjects')}`
    : `${waveLabel} ${level}: ${weightedPick(currentFragments().objects, 'waveObjects')}`;
  const generated = [
    intro,
    `${waveLabel} ${level}: ${buildCombo()}`,
    `${waveLabel} ${level}: ${buildShortBurst()}`,
    `${waveLabel} ${level}: ${weightedPick(currentArcadePhrases(), 'wavePhrases')}`,
    `${waveLabel} ${level}: ${weightedPick(currentFragments().objects, 'waveObjects2')}`
  ];
  return mergeUnique(baseList, generated);
}

export function extendBossNames(base) {
  const baseList = Array.isArray(base) ? base : [];
  const extras = [
    `BOSS ${weightedPick(currentArcadePhrases(), 'bossPhrases')}`,
    `BOSS ${weightedPick(currentFragments().objects, 'bossObjects2')}`,
    `BOSS ${buildShortBurst()}`
  ];
  return mergeUnique(baseList, extras);
}

export function extendGameOverTexts(base) {
  const baseList = Array.isArray(base) ? base : [];
  const labels = localizedLabels[getCurrentLanguage()];
  const upper = (value) => (getCurrentLanguage() === 'zh-CN' ? value : value.toUpperCase());
  const extras = [
    upper(buildCombo()),
    `${upper(weightedPick(currentArcadePhrases(), 'gameOverPhrases'))}`,
    `${upper(weightedPick(currentFragments().objects, 'gameOverObjects'))} ${labels?.overload || (isGerman() ? 'ÜBERLASTUNG!' : 'OVERLOAD!')}`
  ];
  return mergeUnique(baseList, extras);
}

export function getLoadingLines() {
  const localizedLoading = {
    de: {
      titles: ['ARCADE-CABINET STARTET...', 'HITBOX WIRD KALIBRIERT...', 'MÜNZEN WERDEN GEZÄHLT...', 'LASER WERDEN AUFGEWÄRMT...', 'FORMATIONSTRAINER WIRD GERUFEN...'],
      subtitles: ['Pixel werden poliert und alle tun so, als wäre das Vorschrift.', `Auto-Start: ${buildShortBurst()}`, `Cabinet-Test: ${buildCombo()}`, `Bonusphasen-Papierkram lädt - ${weightedPick(currentArcadePhrases(), 'loadingPhrases')}`, `Schwarmfunk sagt: ${weightedPick(currentArcadePhrases(), 'loadingPhrases2')}`]
    },
    es: {
      titles: ['ARRANCANDO CABINET ARCADE...', 'CALIBRANDO HITBOX...', 'CONTANDO MONEDAS...', 'CALENTANDO LÁSERES...', 'LLAMANDO AL ENTRENADOR DE FORMACIONES...'],
      subtitles: ['Puliendo píxeles y fingiendo que es reglamentario.', `Autoarranque: ${buildShortBurst()}`, `Prueba de cabinet: ${buildCombo()}`, `Cargando papeleo de fase bonus - ${weightedPick(currentArcadePhrases(), 'loadingPhrases')}`, `Radio del enjambre dice: ${weightedPick(currentArcadePhrases(), 'loadingPhrases2')}`]
    },
    ru: {
      titles: ['ЗАПУСК ARCADE CABINET...', 'КАЛИБРОВКА HITBOX...', 'СЧИТАЕМ МОНЕТЫ...', 'РАЗОГРЕВАЕМ ЛАЗЕРЫ...', 'ВЫЗЫВАЕМ ТРЕНЕРА ФОРМАЦИЙ...'],
      subtitles: ['Полируем пиксели и делаем вид, что так положено.', `Автозапуск: ${buildShortBurst()}`, `Тест cabinet: ${buildCombo()}`, `Грузим бумаги бонусной стадии - ${weightedPick(currentArcadePhrases(), 'loadingPhrases')}`, `Радио роя сообщает: ${weightedPick(currentArcadePhrases(), 'loadingPhrases2')}`]
    },
    'zh-CN': {
      titles: ['正在启动街机 CABINET...', '正在校准 HITBOX...', '正在数硬币...', '正在预热激光...', '正在呼叫阵型教练...'],
      subtitles: ['正在擦亮像素，并假装这是标准流程。', `自动启动：${buildShortBurst()}`, `Cabinet 测试：${buildCombo()}`, `正在加载奖励关文件 - ${weightedPick(currentArcadePhrases(), 'loadingPhrases')}`, `虫群通讯说：${weightedPick(currentArcadePhrases(), 'loadingPhrases2')}`]
    }
  };
  const localized = localizedLoading[getCurrentLanguage()];
  const titleOptions = localized?.titles || [
    'BOOTING ARCADE CABINET...',
    'CALIBRATING HITBOX...',
    'COUNTING QUARTERS...',
    'WARMING LASERS...',
    'CALLING THE FORMATION COACH...'
  ];
  const subtitleOptions = localized?.subtitles || [
    'Polishing pixels and pretending this is regulation.',
    `Auto-boot: ${buildShortBurst()}`,
    `Cabinet test: ${buildCombo()}`,
    `Loading bonus stage paperwork - ${weightedPick(currentArcadePhrases(), 'loadingPhrases')}`,
    `Swarm radio says: ${weightedPick(currentArcadePhrases(), 'loadingPhrases2')}`
  ];
  return {
    title: weightedPick(titleOptions, 'loadingTitle'),
    subtitle: weightedPick(subtitleOptions, 'loadingSubtitle')
  };
}

export function getMicroMessage(type) {
  const labels = localizedLabels[getCurrentLanguage()];
  switch (type) {
    case 'levelStart':
      return buildCombo();
    case 'pause':
      return `${labels?.pause || 'PAUSE'} - ${buildShortBurst()}`;
    case 'resume':
      return `${labels?.resume || 'RESUME'} - ${buildShortBurst()}`;
    case 'lowHealth':
      return labels ? `${labels.lowHealth} - ${buildShortBurst()}` : `LOW LIFE - ${buildShortBurst()}`;
    case 'lifeLost':
      return labels?.lifeLost || `SHIP DOWN - ${buildShortBurst()}`;
    case 'newWave':
      return `${labels?.newWave || 'NEW WAVE'} - ${buildShortBurst()}`;
    case 'bossIntro':
      return `BOSS - ${buildCombo()}`;
    default:
      return buildShortBurst();
  }
}

export function getAchievementPopup() {
  const achievements = isGerman()
    ? [
      `Fake-Erfolg: ${buildShortBurst()}`,
      `Cabinet-geprüftes Chaos: ${buildCombo()}`,
      `Tastenvertrauen - ${buildShortBurst()}`,
      `Bonusmultiplikator - ${buildCombo()}`,
      `Formationsrechnung - ${buildShortBurst()}`,
      `Noch-ein-Run-Energie - ${buildCombo()}`
    ]
    : [
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
  const taunts = isGerman()
    ? [
      `Gegnerfunk: ${buildShortBurst()}`,
      `Formationszeile: ${buildCombo()}`,
      `Popcorn-Schiff lacht - ${buildShortBurst()}`,
      `Boss-Praktikant sagt: ${buildCombo()}`,
      `Schwarm ruft: ${buildShortBurst()}`,
      `Alien-Trainer murmelt: ${buildCombo()}`
    ]
    : [
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
  const localized = {
    es: {
      tag: score >= 10000 ? 'LEYENDA CABINET' : score >= 5000 ? 'BUENA PARTIDA' : 'CALENTAMIENTO',
      lines: (tag) => [
        `${tag} - ${buildShortBurst()}`,
        `El nivel ${level} se llevó tu moneda - ${buildCombo()}`,
        `Siguiente partida: ${buildShortBurst()}`,
        `Control Arcade dice: ${buildShortBurst()}`,
        `Radio del enjambre dice: ${buildCombo()}`
      ]
    },
    ru: {
      tag: score >= 10000 ? 'ЛЕГЕНДА CABINET' : score >= 5000 ? 'ХОРОШИЙ ЗАБЕГ' : 'РАЗМИНКА',
      lines: (tag) => [
        `${tag} - ${buildShortBurst()}`,
        `Уровень ${level} забрал твою монету - ${buildCombo()}`,
        `Следующий забег: ${buildShortBurst()}`,
        `Аркадный контроль говорит: ${buildShortBurst()}`,
        `Радио роя говорит: ${buildCombo()}`
      ]
    },
    'zh-CN': {
      tag: score >= 10000 ? 'CABINET 传奇' : score >= 5000 ? '漂亮一局' : '热身局',
      lines: (tag) => [
        `${tag} - ${buildShortBurst()}`,
        `等级 ${level} 吃掉了你的硬币 - ${buildCombo()}`,
        `下一局：${buildShortBurst()}`,
        `街机控制台说：${buildShortBurst()}`,
        `虫群通讯说：${buildCombo()}`
      ]
    }
  }[getCurrentLanguage()];
  if (localized) return weightedPick(localized.lines(localized.tag), 'gameOverComment');
  const scoreTag = isGerman()
    ? (score >= 10000 ? 'CABINET-LEGENDE' : score >= 5000 ? 'SOLIDER RUN' : 'AUFWÄRMEN')
    : (score >= 10000 ? 'CABINET LEGEND' : score >= 5000 ? 'SOLID RUN' : 'WARM-UP');
  const lines = isGerman()
    ? [
      `${scoreTag} - ${buildShortBurst()}`,
      `Level ${level} hat deine Münze kassiert - ${buildCombo()}`,
      `Nächster Run: ${buildShortBurst()}`,
      `Arcade-Zentrale sagt: ${buildShortBurst()}`,
      `Schwarmfunk sagt: ${buildCombo()}`
    ]
    : [
      `${scoreTag} - ${buildShortBurst()}`,
      `Level ${level} cashed in your quarter - ${buildCombo()}`,
      `Next run: ${buildShortBurst()}`,
      `Arcade Control says: ${buildShortBurst()}`,
      `Swarm Dispatch says: ${buildCombo()}`
    ];
  return weightedPick(lines, 'gameOverComment');
}

export function getHighscoreComment(hasScores) {
  const localized = {
    es: hasScores
      ? [`El cabinet recuerda - ${buildShortBurst()}`, `Órbita de récord - ${buildCombo()}`, `Iniciales bonus aceptadas: ${buildShortBurst()}`]
      : [`Aún no hay puntuaciones - ${buildShortBurst()}`, `Reclama el primer puesto: ${buildShortBurst()}`, 'La clasificación está sola.'],
    ru: hasScores
      ? [`Cabinet помнит - ${buildShortBurst()}`, `Орбита рекорда - ${buildCombo()}`, `Бонусные инициалы приняты: ${buildShortBurst()}`]
      : [`Очков пока нет - ${buildShortBurst()}`, `Забери первое место: ${buildShortBurst()}`, 'Таблица одинока.'],
    'zh-CN': hasScores
      ? [`Cabinet 记住了 - ${buildShortBurst()}`, `高分轨道 - ${buildCombo()}`, `奖励缩写已接受：${buildShortBurst()}`]
      : [`还没有分数 - ${buildShortBurst()}`, `拿下第一个席位：${buildShortBurst()}`, '排行榜很孤单。']
  }[getCurrentLanguage()];
  if (localized) return weightedPick(localized, 'highscoreComment');
  const lines = isGerman()
    ? (hasScores
      ? [
        `Das Cabinet erinnert sich - ${buildShortBurst()}`,
        `Highscore-Orbit - ${buildCombo()}`,
        `Bonusinitialen akzeptiert: ${buildShortBurst()}`
      ]
      : [
        `Noch keine Punktzahlen - ${buildShortBurst()}`,
        `Hol dir den ersten Platz: ${buildShortBurst()}`,
        'Die Bestenliste ist einsam.'
      ])
    : (hasScores
    ? [
      `The cabinet remembers - ${buildShortBurst()}`,
      `High-score orbit - ${buildCombo()}`,
      `Bonus initials accepted: ${buildShortBurst()}`
    ]
    : [
      `No scores yet - ${buildShortBurst()}`,
      `Claim the first slot: ${buildShortBurst()}`,
      'The scoreboard is lonely.'
    ]);
  return weightedPick(lines, 'highscoreComment');
}

export function extendLocations(base) {
  const baseList = Array.isArray(base) ? base : [];
  const extras = ({
    es: ['ARCADE ORBITAL', 'CINTURÓN NEÓN', 'DERIVA PÍXEL', 'SECTOR EXTRA', 'NÚCLEO CABINET', 'CARRILES LÁSER', 'COLA DE JEFES'],
    ru: ['ОРБИТАЛЬНАЯ АРКАДА', 'НЕОНОВЫЙ ПОЯС', 'ПИКСЕЛЬНЫЙ ДРИФТ', 'БОНУСНЫЙ СЕКТОР', 'ЯДРО CABINET', 'ЛАЗЕРНЫЕ КОРИДОРЫ', 'ОЧЕРЕДЬ БОССОВ'],
    'zh-CN': ['轨道街机', '霓虹带', '像素漂移', '奖励区域', 'Cabinet 核心', '激光航道', 'Boss 队列']
  })[getCurrentLanguage()] || (isGerman()
    ? [
      'ORBITAL-ARCADE',
      'NEONGÜRTEL',
      'PIXELDRIFT',
      'BONUSSEKTOR',
      'CABINET-KERN',
      'LASERBAHNEN',
      'BOSS-WARTESCHLANGE'
    ]
    : [
      'ORBITAL ARCADE',
      'NEON BELT',
      'PIXEL DRIFT',
      'BONUS SECTOR',
      'CABINET CORE',
      'LASER LANES',
      'BOSS QUEUE'
    ]);
  return mergeUnique(baseList, extras);
}

export function getAllNewPhrases() {
  return currentStoryTransmissions().map((beat) => beat.line);
}

export function getStoryTransmission(level = 1) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const transmissions = currentStoryTransmissions();
  let selected = transmissions[0];
  for (const beat of transmissions) {
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
  const allTaunts = isGerman()
    ? [
      '{TARGET}: Münze einwerfen. Nochmal versuchen.',
      '{TARGET}: Hitbox beachten.',
      '{TARGET}: Der Schwarm lacht höflich.',
      '{TARGET}: Erst ausweichen, dann panikieren.',
      '{TARGET}: Deine Initialen wollen Rache.',
      '{TARGET}: Die Bossmusik war nicht beeindruckt.',
      '{TARGET}: Formationen lesen hilft.',
      '{TARGET}: Mehr Pew-Pew.',
      '{TARGET}: Arcade-Zentrale verlangt Verbesserung.',
      '{TARGET}: Noch ein Run repariert alles.'
    ]
    : [
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
  if (isGerman()) {
    const deTemplates = [
      '{TAUNTER}: {TARGET}, deine Hitbox braucht Coaching.',
      '{TAUNTER} schickt {TARGET} ein kostenloses Ausweich-Tutorial.',
      '{TARGET}, {TAUNTER} sagt: Die Formation war nicht so kompliziert.',
      '{TAUNTER} Punktzahl {SCORE_T} gegen {TARGET} Punktzahl {SCORE_B}: Die Bestenliste hat Belege.',
      '{TAUNTER} erreichte Level {LEVEL_T}; {TARGET} erreichte Level {LEVEL_B}. Die Bossmusik hat es gemerkt.',
      '{TARGET}, {TAUNTER} empfiehlt mehr Laser und weniger Ausreden.',
      '{TAUNTER}: {TARGET}, klassischer Cabinet-Fehler. Sehr lehrreich.'
    ];
    const template = weightedPick(deTemplates, 'enhancedTauntDe');
    return template
      .replace('{TAUNTER}', taunterName)
      .replace('{TARGET}', targetName)
      .replace('{SCORE_T}', taunterScore)
      .replace('{SCORE_B}', targetScore)
      .replace('{LEVEL_T}', taunterLevel)
      .replace('{LEVEL_B}', targetLevel);
  }
  const template = weightedPick(tauntTemplates, 'enhancedTaunt');
  return template
    .replace('{TAUNTER}', taunterName)
    .replace('{TARGET}', targetName)
    .replace('{SCORE_T}', taunterScore)
    .replace('{SCORE_B}', targetScore)
    .replace('{LEVEL_T}', taunterLevel)
    .replace('{LEVEL_B}', targetLevel);
}
