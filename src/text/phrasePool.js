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
  },
  'pt-BR': {
    leads: [{ value: 'Controle Arcade', weight: 1.4 }, { value: 'Alerta Cabinet', weight: 1.3 }, { value: 'Rádio do enxame', weight: 1.2 }, { value: 'Técnico de formação', weight: 1.1 }],
    verbs: [{ value: 'relata', weight: 1.2 }, { value: 'questiona', weight: 1 }, { value: 'sobrecarrega', weight: 1 }, { value: 'provoca', weight: 0.8 }],
    objects: [{ value: 'a onda bônus', weight: 1.2 }, { value: 'a hitbox', weight: 1.2 }, { value: 'a conta do laser', weight: 1.1 }, { value: 'a formação pipoca', weight: 1.1 }, { value: 'a entrada do chefe', weight: 1.1 }, { value: 'a fenda de ficha', weight: 1 }, { value: 'a coreografia do enxame', weight: 1 }],
    tags: [{ value: 'energia de cabinet clássico', weight: 1.2 }, { value: 'drama de formação', weight: 1 }, { value: 'confiança de música de chefe', weight: 1 }, { value: 'heroísmo de nave pequena', weight: 1 }],
    closers: [{ value: 'Continue atirando.', weight: 1.3 }, { value: 'Desvie com estilo.', weight: 1.2 }, { value: 'Guarde as fichas.', weight: 1.1 }, { value: 'Cuidado com a hitbox.', weight: 1.1 }, { value: 'Chefe em breve.', weight: 1 }]
  },
  ko: {
    leads: [{ value: '아케이드 관제', weight: 1.4 }, { value: 'Cabinet 경보', weight: 1.3 }, { value: '군단 통신', weight: 1.2 }, { value: '편대 코치', weight: 1.1 }],
    verbs: [{ value: '보고합니다', weight: 1.2 }, { value: '의심합니다', weight: 1 }, { value: '과부하시킵니다', weight: 1 }, { value: '도발합니다', weight: 0.8 }],
    objects: [{ value: '보너스 웨이브', weight: 1.2 }, { value: '히트박스', weight: 1.2 }, { value: '레이저 청구서', weight: 1.1 }, { value: '팝콘 편대', weight: 1.1 }, { value: '보스 등장', weight: 1.1 }, { value: '코인 투입구', weight: 1 }, { value: '군단 안무', weight: 1 }],
    tags: [{ value: '고전 cabinet 에너지', weight: 1.2 }, { value: '편대 드라마', weight: 1 }, { value: '보스 음악 자신감', weight: 1 }, { value: '작은 함선의 영웅담', weight: 1 }],
    closers: [{ value: '계속 쏴라.', weight: 1.3 }, { value: '멋지게 피해라.', weight: 1.2 }, { value: '코인을 아껴라.', weight: 1.1 }, { value: '히트박스를 조심해라.', weight: 1.1 }, { value: '곧 보스다.', weight: 1 }]
  },
  ja: {
    leads: [{ value: 'アーケード管制', weight: 1.4 }, { value: 'Cabinet 警報', weight: 1.3 }, { value: 'スウォーム通信', weight: 1.2 }, { value: 'フォーメーションコーチ', weight: 1.1 }],
    verbs: [{ value: '報告', weight: 1.2 }, { value: '疑問視', weight: 1 }, { value: '過負荷', weight: 1 }, { value: '挑発', weight: 0.8 }],
    objects: [{ value: 'ボーナスウェーブ', weight: 1.2 }, { value: 'ヒットボックス', weight: 1.2 }, { value: 'レーザー請求書', weight: 1.1 }, { value: 'ポップコーン編隊', weight: 1.1 }, { value: 'ボス登場', weight: 1.1 }, { value: 'コイン投入口', weight: 1 }, { value: 'スウォームの振り付け', weight: 1 }],
    tags: [{ value: 'クラシック cabinet エネルギー', weight: 1.2 }, { value: '編隊ドラマ', weight: 1 }, { value: 'ボス曲の自信', weight: 1 }, { value: '小さな機体の英雄芸', weight: 1 }],
    closers: [{ value: '撃ち続けろ。', weight: 1.3 }, { value: '華麗に避けろ。', weight: 1.2 }, { value: 'コインを守れ。', weight: 1.1 }, { value: 'ヒットボックスに注意。', weight: 1.1 }, { value: 'もうすぐボス。', weight: 1 }]
  }
};

const localizedArcadePhrases = {
  es: ['Mete moneda. No te arrepientas.', 'Fase bonus detectada.', 'El enjambre trae coreografía.', 'Otra partida. Obviamente.', 'Aviso de jefe: entrada dramática pendiente.', 'El marcador está mirando.', 'Tu hitbox manda saludos.'],
  ru: ['Вставь монету. Ни о чем не жалей.', 'Бонусная стадия обнаружена.', 'Рой принес хореографию.', 'Еще один забег. Конечно.', 'Предупреждение: босс готовит драматичный выход.', 'Таблица смотрит.', 'Твой hitbox передает привет.'],
  'zh-CN': ['投币。不要后悔。', '检测到奖励关。', '虫群带来了编队舞步。', '再来一局。当然。', 'Boss 警告：即将隆重登场。', '计分板正在看着你。', '你的 hitbox 向你问好。'],
  'pt-BR': ['Insira ficha. Sem arrependimento.', 'Fase bônus detectada.', 'O enxame trouxe coreografia.', 'Mais uma partida. Óbvio.', 'Aviso de chefe: entrada dramática a caminho.', 'O placar está de olho.', 'Sua hitbox mandou lembranças.'],
  ko: ['코인을 넣어라. 후회는 없다.', '보너스 스테이지 감지.', '군단이 안무를 가져왔다.', '한 판 더. 당연하지.', '보스 경고: 극적인 등장 대기 중.', '점수판이 지켜본다.', '히트박스가 안부를 전한다.'],
  ja: ['コイン投入。後悔なし。', 'ボーナスステージ検出。', 'スウォームが編隊ダンスを持ってきた。', 'もう1回。当然。', 'ボス警告：派手な登場待ち。', 'スコアボードが見ている。', 'ヒットボックスからよろしく。']
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
  ],
  'pt-BR': [
    { id: 'last-coin', levelMin: 1, title: 'MEMÓRIA ESTÁTICA', line: 'Uma ficha acordou o cabinet. O piloto ainda não decidiu se isso foi sorte.', imageAlias: 'nova-swarm-story-comms-01-20260519' },
    { id: 'swarm-spiral', levelMin: 2, title: 'DERIVA DE PADRÃO', line: 'O enxame não está perseguindo. Ele se organiza em volta de cada desvio.', imageAlias: 'nova-swarm-story-comms-02-20260519' },
    { id: 'pattern-read', levelMin: 4, title: 'LEITURA BAIXA', line: 'Um drone pequeno mapeia as rotas. O piloto para de atirar no ruído e começa a ler intenção.', imageAlias: 'nova-swarm-story-comms-03-20260519' },
    { id: 'boss-gate', levelMin: 7, title: 'SINAL DO PORTÃO', line: 'Depois do portão do chefe, as luzes parecem menos estrelas e mais nomes à espera.', imageAlias: 'nova-swarm-story-comms-04-20260519' }
  ],
  ko: [
    { id: 'last-coin', levelMin: 1, title: '정전기 기억', line: '동전 하나가 cabinet을 깨웠다. 조종사는 아직 그게 운이었는지 결정하지 못했다.', imageAlias: 'nova-swarm-story-comms-01-20260519' },
    { id: 'swarm-spiral', levelMin: 2, title: '패턴 표류', line: '군단은 쫓아오는 게 아니다. 모든 회피 주변으로 다시 배열된다.', imageAlias: 'nova-swarm-story-comms-02-20260519' },
    { id: 'pattern-read', levelMin: 4, title: '조용한 판독', line: '작은 드론이 경로를 그린다. 조종사는 소음에 쏘는 일을 멈추고 의도를 읽기 시작한다.', imageAlias: 'nova-swarm-story-comms-03-20260519' },
    { id: 'boss-gate', levelMin: 7, title: '게이트 신호', line: '보스 게이트 너머의 빛은 별보다 기다리는 이름에 더 가깝다.', imageAlias: 'nova-swarm-story-comms-04-20260519' }
  ],
  ja: [
    { id: 'last-coin', levelMin: 1, title: '静電メモリー', line: '1枚のコインが cabinet を起こした。パイロットはまだ、それが運だったのか決めかねている。', imageAlias: 'nova-swarm-story-comms-01-20260519' },
    { id: 'swarm-spiral', levelMin: 2, title: 'パターンドリフト', line: 'スウォームは追っていない。すべての回避を囲むように並び直している。', imageAlias: 'nova-swarm-story-comms-02-20260519' },
    { id: 'pattern-read', levelMin: 4, title: '静かな読取', line: '小型ドローンがレーンを描く。パイロットは雑音を撃つのをやめ、意図を読み始める。', imageAlias: 'nova-swarm-story-comms-03-20260519' },
    { id: 'boss-gate', levelMin: 7, title: 'ゲート信号', line: 'ボスゲートの先の光は、星というより待機中の名前に見える。', imageAlias: 'nova-swarm-story-comms-04-20260519' }
  ]
};

const localizedLabels = {
  de: { wave: 'Welle', overload: 'ÜBERLASTUNG!', pause: 'PAUSE', resume: 'WEITER', lowHealth: 'WENIG LEBEN', lifeLost: 'SCHIFF VERLOREN - HITBOX GETROFFEN!', newWave: 'NEUE WELLE' },
  es: { wave: 'Oleada', overload: 'SOBRECARGA!', pause: 'PAUSA', resume: 'CONTINUAR', lowHealth: 'POCA VIDA', lifeLost: 'NAVE PERDIDA - HITBOX TOCADA!', newWave: 'NUEVA OLEADA' },
  ru: { wave: 'Волна', overload: 'ПЕРЕГРУЗКА!', pause: 'ПАУЗА', resume: 'ПРОДОЛЖИТЬ', lowHealth: 'МАЛО ЖИЗНИ', lifeLost: 'КОРАБЛЬ СБИТ - HITBOX ЗАДЕТ!', newWave: 'НОВАЯ ВОЛНА' },
  'zh-CN': { wave: '波次', overload: '过载！', pause: '暂停', resume: '继续', lowHealth: '生命偏低', lifeLost: '飞船损毁 - 命中 HITBOX！', newWave: '新波次' },
  'pt-BR': { wave: 'Onda', overload: 'SOBRECARGA!', pause: 'PAUSA', resume: 'CONTINUAR', lowHealth: 'VIDA BAIXA', lifeLost: 'NAVE PERDIDA - HITBOX ATINGIDA!', newWave: 'NOVA ONDA' },
  ko: { wave: '웨이브', overload: '과부하!', pause: '일시정지', resume: '계속', lowHealth: '체력 낮음', lifeLost: '함선 격추 - 히트박스 피격!', newWave: '새 웨이브' },
  ja: { wave: 'ウェーブ', overload: 'オーバーロード！', pause: '一時停止', resume: '続ける', lowHealth: 'ライフ低下', lifeLost: '機体撃墜 - ヒットボックス被弾！', newWave: '新ウェーブ' }
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
    },
    'pt-BR': {
      titles: ['INICIANDO CABINET ARCADE...', 'CALIBRANDO HITBOX...', 'CONTANDO FICHAS...', 'AQUECENDO LASERS...', 'CHAMANDO O TÉCNICO DE FORMAÇÃO...'],
      subtitles: ['Polindo pixels e fingindo que isso é protocolo.', `Auto-início: ${buildShortBurst()}`, `Teste do cabinet: ${buildCombo()}`, `Carregando papelada da fase bônus - ${weightedPick(currentArcadePhrases(), 'loadingPhrases')}`, `Rádio do enxame diz: ${weightedPick(currentArcadePhrases(), 'loadingPhrases2')}`]
    },
    ko: {
      titles: ['아케이드 CABINET 부팅 중...', '히트박스 보정 중...', '코인 집계 중...', '레이저 예열 중...', '편대 코치 호출 중...'],
      subtitles: ['픽셀을 닦고 규정인 척하는 중.', `자동 부팅: ${buildShortBurst()}`, `Cabinet 테스트: ${buildCombo()}`, `보너스 스테이지 서류 로드 중 - ${weightedPick(currentArcadePhrases(), 'loadingPhrases')}`, `군단 통신: ${weightedPick(currentArcadePhrases(), 'loadingPhrases2')}`]
    },
    ja: {
      titles: ['アーケード CABINET 起動中...', 'ヒットボックス調整中...', 'コイン集計中...', 'レーザー予熱中...', 'フォーメーションコーチ呼び出し中...'],
      subtitles: ['ピクセルを磨きつつ、規定どおりのふりをしています。', `自動起動：${buildShortBurst()}`, `Cabinet テスト：${buildCombo()}`, `ボーナスステージ書類をロード中 - ${weightedPick(currentArcadePhrases(), 'loadingPhrases')}`, `スウォーム通信：${weightedPick(currentArcadePhrases(), 'loadingPhrases2')}`]
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
  const localized = {
    'pt-BR': [
      `Conquista falsa: ${buildShortBurst()}`,
      `Caos aprovado pelo cabinet: ${buildCombo()}`,
      `Confiança nos botões - ${buildShortBurst()}`,
      `Multiplicador bônus - ${buildCombo()}`,
      `Conta da formação - ${buildShortBurst()}`,
      `Energia de mais uma partida - ${buildCombo()}`
    ],
    ko: [
      `가짜 업적: ${buildShortBurst()}`,
      `Cabinet 승인 혼돈: ${buildCombo()}`,
      `버튼 자신감 - ${buildShortBurst()}`,
      `보너스 배율 - ${buildCombo()}`,
      `편대 청구서 - ${buildShortBurst()}`,
      `한 판 더 에너지 - ${buildCombo()}`
    ],
    ja: [
      `フェイク実績：${buildShortBurst()}`,
      `Cabinet 承認カオス：${buildCombo()}`,
      `ボタン信頼度 - ${buildShortBurst()}`,
      `ボーナス倍率 - ${buildCombo()}`,
      `編隊請求書 - ${buildShortBurst()}`,
      `もう1回エネルギー - ${buildCombo()}`
    ]
  }[getCurrentLanguage()];
  if (localized) return weightedPick(localized, 'achievement');
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
  const localized = {
    'pt-BR': [
      `Rádio inimigo: ${buildShortBurst()}`,
      `Linha de formação: ${buildCombo()}`,
      `Nave pipoca ri - ${buildShortBurst()}`,
      `Estagiário do chefe diz: ${buildCombo()}`,
      `Enxame grita: ${buildShortBurst()}`,
      `Técnico alien murmura: ${buildCombo()}`
    ],
    ko: [
      `적 통신: ${buildShortBurst()}`,
      `편대 라인: ${buildCombo()}`,
      `팝콘 함선이 웃는다 - ${buildShortBurst()}`,
      `보스 인턴: ${buildCombo()}`,
      `군단이 외친다: ${buildShortBurst()}`,
      `외계 코치가 중얼거린다: ${buildCombo()}`
    ],
    ja: [
      `敵通信：${buildShortBurst()}`,
      `編隊ライン：${buildCombo()}`,
      `ポップコーン機が笑う - ${buildShortBurst()}`,
      `ボス見習い：${buildCombo()}`,
      `スウォームが叫ぶ：${buildShortBurst()}`,
      `エイリアンコーチのつぶやき：${buildCombo()}`
    ]
  }[getCurrentLanguage()];
  if (localized) return weightedPick(localized, 'taunt');
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
    },
    'pt-BR': {
      tag: score >= 10000 ? 'LENDA DO CABINET' : score >= 5000 ? 'BOA PARTIDA' : 'AQUECIMENTO',
      lines: (tag) => [
        `${tag} - ${buildShortBurst()}`,
        `O nível ${level} ficou com sua ficha - ${buildCombo()}`,
        `Próxima partida: ${buildShortBurst()}`,
        `Controle Arcade diz: ${buildShortBurst()}`,
        `Rádio do enxame diz: ${buildCombo()}`
      ]
    },
    ko: {
      tag: score >= 10000 ? 'CABINET 전설' : score >= 5000 ? '좋은 런' : '워밍업',
      lines: (tag) => [
        `${tag} - ${buildShortBurst()}`,
        `레벨 ${level}이 코인을 가져갔다 - ${buildCombo()}`,
        `다음 런: ${buildShortBurst()}`,
        `아케이드 관제: ${buildShortBurst()}`,
        `군단 통신: ${buildCombo()}`
      ]
    },
    ja: {
      tag: score >= 10000 ? 'CABINET レジェンド' : score >= 5000 ? '好ラン' : 'ウォームアップ',
      lines: (tag) => [
        `${tag} - ${buildShortBurst()}`,
        `レベル ${level} がコインを回収 - ${buildCombo()}`,
        `次のラン：${buildShortBurst()}`,
        `アーケード管制：${buildShortBurst()}`,
        `スウォーム通信：${buildCombo()}`
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
      : [`还没有分数 - ${buildShortBurst()}`, `拿下第一个席位：${buildShortBurst()}`, '排行榜很孤单。'],
    'pt-BR': hasScores
      ? [`O cabinet lembra - ${buildShortBurst()}`, `Órbita de recorde - ${buildCombo()}`, `Iniciais bônus aceitas: ${buildShortBurst()}`]
      : [`Ainda sem pontuações - ${buildShortBurst()}`, `Pegue a primeira posição: ${buildShortBurst()}`, 'O ranking está sozinho.'],
    ko: hasScores
      ? [`Cabinet이 기억한다 - ${buildShortBurst()}`, `최고 점수 궤도 - ${buildCombo()}`, `보너스 이니셜 승인: ${buildShortBurst()}`]
      : [`아직 점수가 없다 - ${buildShortBurst()}`, `첫 자리를 차지해라: ${buildShortBurst()}`, '순위표가 외롭다.'],
    ja: hasScores
      ? [`Cabinet は覚えている - ${buildShortBurst()}`, `ハイスコア軌道 - ${buildCombo()}`, `ボーナスイニシャル承認：${buildShortBurst()}`]
      : [`まだスコアなし - ${buildShortBurst()}`, `最初の枠を取れ：${buildShortBurst()}`, 'ランキングがひとりぼっち。']
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
    'zh-CN': ['轨道街机', '霓虹带', '像素漂移', '奖励区域', 'Cabinet 核心', '激光航道', 'Boss 队列'],
    'pt-BR': ['ARCADE ORBITAL', 'CINTURÃO NÉON', 'DERIVA PIXEL', 'SETOR BÔNUS', 'NÚCLEO CABINET', 'ROTAS LASER', 'FILA DE CHEFES'],
    ko: ['궤도 아케이드', '네온 벨트', '픽셀 표류', '보너스 섹터', 'Cabinet 코어', '레이저 항로', '보스 대기열'],
    ja: ['オービタルアーケード', 'ネオンベルト', 'ピクセルドリフト', 'ボーナスセクター', 'Cabinet コア', 'レーザーレーン', 'ボス待機列']
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
  const localized = {
    'pt-BR': [
      '{TARGET}: Insira ficha. Tente de novo.',
      '{TARGET}: Cuidado com a hitbox.',
      '{TARGET}: O enxame está rindo com educação.',
      '{TARGET}: Primeiro desvie, depois entre em pânico.',
      '{TARGET}: Suas iniciais querem revanche.',
      '{TARGET}: A música do chefe não ficou impressionada.',
      '{TARGET}: Ler formações ajuda.',
      '{TARGET}: Mais pew-pew.',
      '{TARGET}: Controle Arcade exige melhora.',
      '{TARGET}: Mais uma partida resolve tudo.'
    ],
    ko: [
      '{TARGET}: 코인을 넣어라. 다시 시도.',
      '{TARGET}: 히트박스를 조심해라.',
      '{TARGET}: 군단이 정중하게 웃고 있다.',
      '{TARGET}: 먼저 피하고, 그다음 당황해라.',
      '{TARGET}: 네 이니셜이 복수를 원한다.',
      '{TARGET}: 보스 음악은 감동하지 않았다.',
      '{TARGET}: 편대 읽기는 기본이다.',
      '{TARGET}: 더 세게 pew.',
      '{TARGET}: 아케이드 관제가 개선을 요청한다.',
      '{TARGET}: 한 판 더 하면 다 고쳐진다.'
    ],
    ja: [
      '{TARGET}: コイン投入。もう一度。',
      '{TARGET}: ヒットボックスに注意。',
      '{TARGET}: スウォームが礼儀正しく笑っている。',
      '{TARGET}: まず避けて、それから慌てろ。',
      '{TARGET}: イニシャルがリベンジを求めている。',
      '{TARGET}: ボス曲は感心していない。',
      '{TARGET}: 編隊を読むのは基本。',
      '{TARGET}: もっと pew しろ。',
      '{TARGET}: アーケード管制が改善を要求。',
      '{TARGET}: もう1回で全部直る。'
    ]
  }[getCurrentLanguage()];
  if (localized) {
    const taunt = weightedPick(localized, `leaderboardTaunt-${getCurrentLanguage()}`);
    return taunt.replace('{TARGET}', targetName);
  }
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
  const localizedTemplates = {
    'pt-BR': [
      '{TAUNTER}: {TARGET}, sua hitbox precisa de treino.',
      '{TAUNTER} envia um tutorial de desvio grátis para {TARGET}.',
      '{TARGET}, {TAUNTER} diz: a formação nem era tão complicada.',
      '{TAUNTER} pontuação {SCORE_T} contra {TARGET} pontuação {SCORE_B}: o ranking tem recibos.',
      '{TAUNTER} chegou ao nível {LEVEL_T}; {TARGET} chegou ao nível {LEVEL_B}. A música do chefe percebeu.',
      '{TARGET}, {TAUNTER} recomenda mais lasers e menos desculpas.',
      '{TAUNTER}: {TARGET}, erro clássico de cabinet. Bem educativo.'
    ],
    ko: [
      '{TAUNTER}: {TARGET}, 네 히트박스는 코칭이 필요하다.',
      '{TAUNTER}가 {TARGET}에게 무료 회피 튜토리얼을 보냈다.',
      '{TARGET}, {TAUNTER}의 말: 편대는 그렇게 어렵지 않았다.',
      '{TAUNTER} 점수 {SCORE_T}, {TARGET} 점수 {SCORE_B}: 순위표에 영수증이 있다.',
      '{TAUNTER} 레벨 {LEVEL_T}; {TARGET} 레벨 {LEVEL_B}. 보스 음악이 눈치챘다.',
      '{TARGET}, {TAUNTER}는 더 많은 레이저와 더 적은 변명을 추천한다.',
      '{TAUNTER}: {TARGET}, 고전적인 cabinet 실수. 아주 교육적이다.'
    ],
    ja: [
      '{TAUNTER}: {TARGET}、ヒットボックスにコーチが必要。',
      '{TAUNTER} が {TARGET} に無料回避チュートリアルを送信。',
      '{TARGET}、{TAUNTER} いわく編隊はそこまで複雑ではない。',
      '{TAUNTER} スコア {SCORE_T} 対 {TARGET} スコア {SCORE_B}: ランキングに証拠あり。',
      '{TAUNTER} はレベル {LEVEL_T} 到達、{TARGET} はレベル {LEVEL_B}。ボス曲が気づいた。',
      '{TARGET}、{TAUNTER} はレーザー増量と言い訳削減を推奨。',
      '{TAUNTER}: {TARGET}、クラシック cabinet ミス。かなり勉強になる。'
    ]
  }[getCurrentLanguage()];
  if (localizedTemplates) {
    const template = weightedPick(localizedTemplates, `enhancedTaunt-${getCurrentLanguage()}`);
    return template
      .replace('{TAUNTER}', taunterName)
      .replace('{TARGET}', targetName)
      .replace('{SCORE_T}', taunterScore)
      .replace('{SCORE_B}', targetScore)
      .replace('{LEVEL_T}', taunterLevel)
      .replace('{LEVEL_B}', targetLevel);
  }
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
