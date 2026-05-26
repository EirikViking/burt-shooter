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

const cabinetLogsEn = Object.freeze([
  {
    id: 'first-boss-spawn',
    title: 'CABINET LOG: BOSS RECEIPT',
    role: 'Boss read',
    line: 'First boss this run. Useful read: the entrance is theater. Reset low-center and wait for the first real tell.',
    description: 'Filed when the first boss enters a run. The Cabinet reminds the pilot to use the boss reveal as a reset window instead of drifting into the opening pattern.',
    tip: 'During the boss reveal, settle low-center, stop panic drifting, then dodge after the tell locks.',
    imageAlias: 'nova-swarm-story-comms-04-20260519',
    accent: 0xff6a2a
  },
  {
    id: 'codex-discovery',
    title: 'CABINET LOG: NEW RECEIPT',
    role: 'Codex value',
    line: 'New Codex signal archived: {name}. It pays score now and Career XP later. Knowledge is just currency with worse lighting.',
    description: 'Filed the first time the run discovers a new Codex signal. It explains why scanning new threats is practical progression, not just flavor.',
    tip: 'New signals grant score immediately, count toward Career XP, and can help unlock future ships.',
    imageAlias: 'nova-swarm-story-comms-03-20260519',
    accent: 0x7dffcc
  },
  {
    id: 'near-miss-streak',
    title: 'CABINET LOG: HITBOX BRAG',
    role: 'Near-miss read',
    line: 'Three close dodges in a row. Tiny fact: graze streaks are score, not armor. Stylish panic still has to move.',
    description: 'Filed after the first dangerous near-miss streak in a run. The Cabinet celebrates the score value while warning that close dodges never make the ship safer.',
    tip: 'Use near misses for score, then leave the lane. A graze bonus is not invulnerability.',
    imageAlias: 'nova-swarm-story-comms-02-20260519',
    accent: 0xffd15c
  },
  {
    id: 'wing-trait-hit',
    title: 'CABINET LOG: SIDE HUSTLE',
    role: 'Trait read',
    line: 'Wing shot connected. Those side bullets are not decoration. Let messy waves drift into angled lanes and invoice them.',
    description: 'Filed when a wing-shot trait first lands during a run. It calls out that some ship traits reward positioning enemies into side lanes.',
    tip: 'Wing traits work best when you hold a lane that lets angled shots catch flanks.',
    imageAlias: 'nova-swarm-story-comms-03-20260519',
    accent: 0x66ff99
  },
  {
    id: 'bonus-trait-hit',
    title: 'CABINET LOG: COUNTER AUDIT',
    role: 'Trait timing',
    line: 'Bonus shot landed. The counter counts shots fired, not seconds. Counting while screaming is legally recognized.',
    description: 'Filed when a bonus-shot trait first lands during a run. It teaches that shot counters are driven by firing cadence.',
    tip: 'Fast, steady firing reaches shot-counter traits sooner than waiting for a timer.',
    imageAlias: 'nova-swarm-story-comms-01-20260519',
    accent: 0xa77dff
  },
  {
    id: 'low-life-read',
    title: 'CABINET LOG: ONE HULL LEFT',
    role: 'Survival read',
    line: 'One life left. Useful read: stop chasing coins unless they repair you. The Cabinet cannot refund heroism.',
    description: 'Filed the first time a run reaches one life. It nudges the player away from greedy pickups and back toward survival.',
    tip: 'On one life, prioritize open lanes and recovery pickups over damage greed.',
    imageAlias: 'nova-swarm-story-comms-01-20260519',
    accent: 0xff8f9c
  },
  {
    id: 'boss-mercy-read',
    title: 'CABINET LOG: MERCY WINDOW',
    role: 'Recovery read',
    line: 'Boss mercy triggered. That recovery window is real. Move away now, then shoot after the drama stops standing on you.',
    description: 'Filed when boss mercy prevents immediate follow-up damage. It teaches the player that the recovery window exists and should be spent repositioning.',
    tip: 'After a boss hit, use the mercy window to separate first and fire second.',
    imageAlias: 'nova-swarm-story-comms-04-20260519',
    accent: 0x37f5ff
  },
  {
    id: 'max-lives-read',
    title: 'CABINET LOG: HULL SURPLUS',
    role: 'Sustain read',
    line: 'Max lives reached. Excellent. Now spend that confidence on reading patterns, not auditioning for the next explosion.',
    description: 'Filed when the player reaches the life cap. It turns a reward moment into a reminder that sustain is breathing room, not permission to ignore patterns.',
    tip: 'At max lives, keep collecting score safely. The extra buffer is for mistakes, not for standing still.',
    imageAlias: 'nova-swarm-story-comms-02-20260519',
    accent: 0x7dffcc
  }
]);

const localizedCabinetLogs = {
  de: [
    {
      id: 'first-boss-spawn',
      title: 'CABINET-LOG: BOSS-BELEG',
      role: 'Boss-Lesart',
      line: 'Erster Boss in diesem Run. NÃ¼tzlicher Read: Der Auftritt ist Theater. Tief mittig sammeln und auf das erste echte Signal warten.',
      description: 'Wird abgelegt, wenn der erste Boss in einem Run erscheint. Das Cabinet erinnert daran, den Bossauftritt als Reset-Fenster zu nutzen.',
      tip: 'Beim Boss-Intro tief mittig bleiben, Panikdrift stoppen und erst ausweichen, wenn das Signal einrastet.'
    },
    {
      id: 'codex-discovery',
      title: 'CABINET-LOG: NEUER BELEG',
      role: 'Codex-Wert',
      line: 'Neues Codex-Signal archiviert: {name}. Es gibt jetzt Punkte und spÃ¤ter Karriere-XP. Wissen ist nur WÃ¤hrung mit schlechterem Licht.',
      description: 'Wird bei der ersten neuen Codex-Entdeckung eines Runs abgelegt. Es erklÃ¤rt, warum Scans echte Progression sind.',
      tip: 'Neue Signale geben sofort Punkte, zÃ¤hlen fÃ¼r Karriere-XP und helfen bei spÃ¤teren Schiffsfreischaltungen.'
    },
    {
      id: 'near-miss-streak',
      title: 'CABINET-LOG: HITBOX-PROTOKOLL',
      role: 'Near-Miss-Read',
      line: 'Drei knappe AusweichmanÃ¶ver am StÃ¼ck. Kurzfakt: Graze-Serien sind Punkte, keine Panzerung. Stilvolle Panik muss trotzdem wegfliegen.',
      description: 'Wird nach der ersten gefÃ¤hrlichen Near-Miss-Serie abgelegt. Das Cabinet feiert Punkte und warnt vor falscher Sicherheit.',
      tip: 'Near Misses fÃ¼r Punkte nutzen, dann die Lane verlassen. Graze-Bonus ist keine Unverwundbarkeit.'
    },
    {
      id: 'wing-trait-hit',
      title: 'CABINET-LOG: SEITENJOB',
      role: 'Trait-Read',
      line: 'FlÃ¼gelschuss getroffen. Diese Seitenkugeln sind keine Deko. Lass chaotische Wellen in die SchrÃ¤gbahnen treiben und stell Rechnung.',
      description: 'Wird abgelegt, wenn ein FlÃ¼gelschuss-Trait erstmals trifft. Manche Traits belohnen gutes Positionieren in Seitenbahnen.',
      tip: 'FlÃ¼gel-Traits wirken am besten, wenn Gegner in die schrÃ¤gen Flankenlinien geraten.'
    },
    {
      id: 'bonus-trait-hit',
      title: 'CABINET-LOG: ZÃ„HLERPRÃœFUNG',
      role: 'Trait-Timing',
      line: 'Bonusschuss getroffen. Der ZÃ¤hler misst abgefeuerte SchÃ¼sse, nicht Sekunden. ZÃ¤hlen beim Schreien ist rechtlich anerkannt.',
      description: 'Wird abgelegt, wenn ein Bonusschuss-Trait erstmals trifft. Es erklÃ¤rt, dass SchusszÃ¤hler durch Feuerrhythmus laufen.',
      tip: 'Schnelles, gleichmÃ¤ÃŸiges Feuern erreicht ZÃ¤hler-Traits frÃ¼her als Warten auf einen Timer.'
    },
    {
      id: 'low-life-read',
      title: 'CABINET-LOG: EIN RUMPF ÃœBRIG',
      role: 'Ãœberlebens-Read',
      line: 'Ein Leben Ã¼brig. NÃ¼tzlicher Read: Keine MÃ¼nzen jagen, auÃŸer sie reparieren dich. Das Cabinet erstattet keinen Heldentod.',
      description: 'Wird abgelegt, wenn ein Run erstmals auf ein Leben fÃ¤llt. Es lenkt von Gier zurÃ¼ck zu Ãœberleben.',
      tip: 'Bei einem Leben offene Lanes und Reparatur-Pickups vor Schadensgier priorisieren.'
    },
    {
      id: 'boss-mercy-read',
      title: 'CABINET-LOG: GNADENFENSTER',
      role: 'Erholungs-Read',
      line: 'Boss-Mercy ausgelÃ¶st. Dieses Erholungsfenster ist echt. Jetzt Abstand schaffen, danach schieÃŸen.',
      description: 'Wird abgelegt, wenn Boss-Mercy direkten Folgeschaden verhindert. Es erklÃ¤rt, dass das Fenster zum Umpositionieren da ist.',
      tip: 'Nach einem Bosstreffer zuerst trennen, dann feuern.'
    },
    {
      id: 'max-lives-read',
      title: 'CABINET-LOG: RUMPFÃœBERSCHUSS',
      role: 'Sustain-Read',
      line: 'Maximale Leben erreicht. Ausgezeichnet. Gib dieses Selbstvertrauen fÃ¼r Musterlesen aus, nicht fÃ¼r die nÃ¤chste Explosion.',
      description: 'Wird beim Erreichen des Lebencaps abgelegt. Der Bonus ist Atemraum, keine Erlaubnis, Muster zu ignorieren.',
      tip: 'Bei maximalen Leben sicher weiter punkten. Der Puffer ist fÃ¼r Fehler da, nicht fÃ¼r Stillstand.'
    }
  ]
};

localizedCabinetLogs.es = [
  ['CABINET LOG: RECIBO DE JEFE', 'Lectura de jefe', 'Primer jefe de esta partida. Lectura Ãºtil: la entrada es teatro. Baja al centro y espera la primera seÃ±al real.', 'Archivado cuando aparece el primer jefe. Recuerda usar la entrada como ventana para recomponerte.', 'Durante la entrada del jefe, colÃ³cate abajo y al centro; esquiva cuando la seÃ±al se fije.'],
  ['CABINET LOG: NUEVO RECIBO', 'Valor del Codex', 'Nueva seÃ±al del Codex archivada: {name}. Da puntos ahora y XP de carrera despuÃ©s. El conocimiento es moneda con peor iluminaciÃ³n.', 'Archivado con la primera seÃ±al nueva del Codex. Explica por quÃ© escanear amenazas es progreso real.', 'Las seÃ±ales nuevas dan puntos, XP de carrera y progreso de hangares futuros.'],
  ['CABINET LOG: PRESUMIR HITBOX', 'Lectura de roce', 'Tres esquivas cercanas seguidas. Dato breve: las rachas de roce son puntos, no armadura. El pÃ¡nico elegante aÃºn debe moverse.', 'Archivado tras la primera racha peligrosa de near miss.', 'Usa los roces para puntuar y sal del carril. No son invulnerabilidad.'],
  ['CABINET LOG: NEGOCIO LATERAL', 'Lectura de rasgo', 'Disparo de ala conectado. Esas balas laterales no son adorno. Deja que las oleadas entren en los Ã¡ngulos.', 'Archivado cuando un rasgo de disparo lateral impacta por primera vez.', 'Los rasgos de ala brillan cuando colocas enemigos en los flancos.'],
  ['CABINET LOG: AUDITORÃA DE CONTADOR', 'Tiempo de rasgo', 'Disparo extra conectado. El contador cuenta disparos, no segundos. Contar gritando es legal.', 'Archivado cuando un rasgo de disparo extra impacta por primera vez.', 'Disparar con ritmo llena contadores antes que esperar un temporizador.'],
  ['CABINET LOG: UN CASCO RESTANTE', 'Lectura de supervivencia', 'Una vida restante. Lectura Ãºtil: no persigas monedas salvo que reparen. El Cabinet no reembolsa heroÃ­smo.', 'Archivado al caer a una vida por primera vez.', 'Con una vida, prioriza carriles abiertos y reparaciones.'],
  ['CABINET LOG: VENTANA DE PIEDAD', 'Lectura de recuperaciÃ³n', 'Piedad del jefe activada. Esa ventana es real. AlÃ©jate ahora; dispara cuando el drama deje de pisarte.', 'Archivado cuando la piedad del jefe evita daÃ±o seguido.', 'Tras un golpe de jefe, separa primero y dispara despuÃ©s.'],
  ['CABINET LOG: SUPERÃVIT DE CASCO', 'Lectura de sustain', 'Vidas al mÃ¡ximo. Excelente. Usa esa confianza para leer patrones, no para audicionar para la prÃ³xima explosiÃ³n.', 'Archivado al llegar al lÃ­mite de vidas.', 'Con vidas mÃ¡ximas, puntÃºa seguro. El colchÃ³n es para errores.']
].map(([title, role, line, description, tip], index) => ({ id: cabinetLogsEn[index].id, title, role, line, description, tip }));

localizedCabinetLogs['pt-BR'] = [
  ['CABINET LOG: RECIBO DE CHEFE', 'Leitura de chefe', 'Primeiro chefe desta partida. Leitura Ãºtil: a entrada Ã© teatro. Fique baixo no centro e espere o primeiro sinal real.', 'Arquivado quando o primeiro chefe entra. Lembra que a entrada Ã© uma janela de reset.', 'Na revelaÃ§Ã£o do chefe, fique baixo no centro e desvie depois do sinal travar.'],
  ['CABINET LOG: NOVO RECIBO', 'Valor do Codex', 'Novo sinal do Codex arquivado: {name}. DÃ¡ pontos agora e XP de carreira depois. Conhecimento Ã© moeda com iluminaÃ§Ã£o pior.', 'Arquivado na primeira descoberta nova do Codex.', 'Novos sinais dÃ£o pontos, XP de carreira e progresso para futuras naves.'],
  ['CABINET LOG: HITBOX ORGULHOSA', 'Leitura de raspÃ£o', 'TrÃªs desvios por pouco seguidos. Fato curto: sequÃªncia de raspÃ£o Ã© pontuaÃ§Ã£o, nÃ£o armadura. PÃ¢nico estiloso ainda precisa sair do lugar.', 'Arquivado apÃ³s a primeira sequÃªncia perigosa de near miss.', 'Use near misses para pontuar, depois saia da rota. NÃ£o Ã© invulnerabilidade.'],
  ['CABINET LOG: BICO LATERAL', 'Leitura de traÃ§o', 'Disparo de asa acertou. Essas balas laterais nÃ£o sÃ£o enfeite. Deixe ondas bagunÃ§adas entrarem nos Ã¢ngulos.', 'Arquivado quando um traÃ§o de disparo lateral acerta pela primeira vez.', 'TraÃ§os de asa funcionam melhor quando inimigos entram pelas laterais.'],
  ['CABINET LOG: AUDITORIA DO CONTADOR', 'Tempo de traÃ§o', 'Disparo bÃ´nus acertou. O contador conta tiros disparados, nÃ£o segundos. Contar enquanto grita Ã© reconhecido.', 'Arquivado quando um traÃ§o de disparo bÃ´nus acerta.', 'Disparo constante enche contadores antes que esperar temporizadores.'],
  ['CABINET LOG: UM CASCO SOBRANDO', 'Leitura de sobrevivÃªncia', 'Uma vida restante. Leitura Ãºtil: nÃ£o persiga fichas a menos que reparem vocÃª. O Cabinet nÃ£o reembolsa heroÃ­smo.', 'Arquivado ao chegar a uma vida pela primeira vez.', 'Com uma vida, priorize rotas abertas e reparos.'],
  ['CABINET LOG: JANELA DE MISERICÃ“RDIA', 'Leitura de recuperaÃ§Ã£o', 'MisericÃ³rdia do chefe ativada. Essa janela Ã© real. Afaste-se agora, atire depois.', 'Arquivado quando a misericÃ³rdia do chefe evita dano em sequÃªncia.', 'Depois de um golpe de chefe, separe primeiro e atire depois.'],
  ['CABINET LOG: CASCO EM EXCESSO', 'Leitura de sustain', 'Vidas no mÃ¡ximo. Excelente. Use essa confianÃ§a para ler padrÃµes, nÃ£o para testar a prÃ³xima explosÃ£o.', 'Arquivado ao atingir o limite de vidas.', 'Com vidas no mÃ¡ximo, pontue em seguranÃ§a. O colchÃ£o Ã© para erros.']
].map(([title, role, line, description, tip], index) => ({ id: cabinetLogsEn[index].id, title, role, line, description, tip }));

localizedCabinetLogs.ru = [
  ['CABINET LOG: ЧЕК БОССА', 'Чтение босса', 'Первый босс в этом забеге. Полезно: выход это театр. Встань низко по центру и жди первый настоящий сигнал.', 'Архивируется при появлении первого босса. Напоминает использовать выход босса как окно для сброса.', 'На выходе босса держись низко по центру и уклоняйся после фиксации сигнала.'],
  ['CABINET LOG: НОВЫЙ ЧЕК', 'Ценность Codex', 'Новый сигнал Codex в архиве: {name}. Он дает очки сейчас и карьерный XP позже. Знание это валюта с худшим светом.', 'Архивируется при первой новой находке Codex.', 'Новые сигналы дают очки, карьерный XP и прогресс для будущих кораблей.'],
  ['CABINET LOG: ХИТБОКС ХВАСТАЕТСЯ', 'Чтение near miss', 'Три близких уклонения подряд. Факт: серия graze дает очки, не броню. Красивой панике все равно надо двигаться.', 'Архивируется после первой опасной серии near miss.', 'Используй near miss для очков и уходи из линии. Это не неуязвимость.'],
  ['CABINET LOG: БОКОВОЙ БИЗНЕС', 'Чтение трейта', 'Боковой выстрел попал. Эти пули не декор. Заводи грязные волны в угловые линии.', 'Архивируется при первом попадании бокового трейта.', 'Боковые трейты сильнее, когда враги заходят во фланги.'],
  ['CABINET LOG: АУДИТ СЧЕТЧИКА', 'Тайминг трейта', 'Бонусный выстрел попал. Счетчик считает выстрелы, а не секунды. Считать во время крика разрешено.', 'Архивируется при первом попадании бонусного трейта.', 'Ровная стрельба быстрее заполняет счетчики, чем ожидание таймера.'],
  ['CABINET LOG: ОДИН КОРПУС', 'Выживание', 'Одна жизнь. Полезно: не гонись за монетами, если они тебя не чинят. Cabinet не возвращает героизм.', 'Архивируется при первой одной жизни.', 'На одной жизни выбирай свободные линии и ремонт.'],
  ['CABINET LOG: ОКНО ПОЩАДЫ', 'Восстановление', 'Пощада босса сработала. Окно настоящее. Отойди сейчас, стреляй потом.', 'Архивируется, когда пощада босса предотвращает повторный урон.', 'После удара босса сначала разорви дистанцию, потом стреляй.'],
  ['CABINET LOG: ЗАПАС КОРПУСОВ', 'Sustain', 'Жизни на максимуме. Отлично. Трать уверенность на чтение паттернов, а не на кастинг для следующего взрыва.', 'Архивируется при достижении лимита жизней.', 'На максимуме жизней набирай очки безопасно. Запас нужен для ошибок.']
].map(([title, role, line, description, tip], index) => ({ id: cabinetLogsEn[index].id, title, role, line, description, tip }));

localizedCabinetLogs['zh-CN'] = [
  ['CABINET 日志：Boss 收据', 'Boss 阅读', '本局第一个 Boss。实用提示：登场只是演出。待在下方中线，等第一个真正预警锁定。', '第一个 Boss 出现时归档。提醒玩家把登场当作重整窗口。', 'Boss 登场时保持下方中线，等预警锁定后再躲。'],
  ['CABINET 日志：新收据', 'Codex 价值', '新的 Codex 信号已归档：{name}。现在给分，之后给职业 XP。知识只是灯光更差的货币。', '首次发现新 Codex 信号时归档。', '新信号会给分、职业 XP，并推进未来飞船解锁。'],
  ['CABINET 日志：Hitbox 炫耀', '擦弹阅读', '连续三次贴身闪避。小事实：擦弹连段给分，不给护甲。帅气慌张也要移动。', '首次危险 near miss 连段后归档。', '用 near miss 得分，然后离开航道。它不是无敌。'],
  ['CABINET 日志：侧翼生意', '特性阅读', '翼侧弹命中。那些侧弹不是装饰。让混乱波次进入斜线航道再收账。', '翼侧射击特性首次命中时归档。', '翼侧特性在敌人进入侧翼航道时最强。'],
  ['CABINET 日志：计数审计', '特性时机', '奖励弹命中。计数器数的是开火次数，不是秒数。边喊边数也合法。', '奖励射击特性首次命中时归档。', '稳定开火比等计时器更快触发计数特性。'],
  ['CABINET 日志：最后一层 hull', '生存阅读', '只剩一条命。实用提示：除非能修你，否则别追硬币。Cabinet 不报销英雄主义。', '首次掉到一条命时归档。', '一条命时优先开放航道和修复拾取物。'],
  ['CABINET 日志：宽恕窗口', '恢复阅读', 'Boss 宽恕触发。这个恢复窗口是真的。先离开，再等戏剧别踩你时开火。', 'Boss mercy 阻止连续伤害时归档。', '被 Boss 打中后，先拉开距离，再开火。'],
  ['CABINET 日志：hull 盈余', '续航阅读', '生命已满。很好。把信心花在读模式上，不要报名下一次爆炸。', '达到生命上限时归档。', '满生命时安全得分。缓冲是给失误用的。']
].map(([title, role, line, description, tip], index) => ({ id: cabinetLogsEn[index].id, title, role, line, description, tip }));

localizedCabinetLogs.ko = [
  ['CABINET 로그: 보스 영수증', '보스 읽기', '이번 런 첫 보스다. 쓸모 있는 읽기: 등장은 연극이다. 아래 중앙에 잡고 첫 진짜 신호를 기다려라.', '첫 보스가 등장할 때 보관된다. 보스 등장을 리셋 창으로 쓰라는 기록.', '보스 등장 중 아래 중앙을 잡고 신호가 고정된 뒤 피하라.'],
  ['CABINET 로그: 새 영수증', 'Codex 가치', '새 Codex 신호 보관: {name}. 지금은 점수, 나중에는 경력 XP다. 지식은 조명이 나쁜 화폐다.', '새 Codex 신호를 처음 발견할 때 보관된다.', '새 신호는 점수, 경력 XP, 미래 함선 해금에 도움이 된다.'],
  ['CABINET 로그: 히트박스 자랑', '근접 회피 읽기', '근접 회피 세 번 연속. 작은 사실: graze 연속은 점수이지 방어구가 아니다. 멋진 패닉도 움직여야 한다.', '첫 위험한 near miss 연속 후 보관된다.', 'near miss로 점수를 얻고 즉시 라인을 떠나라. 무적이 아니다.'],
  ['CABINET 로그: 측면 영업', '특성 읽기', '윙 샷 명중. 그 측면 탄은 장식이 아니다. 지저분한 웨이브를 비스듬한 라인에 넣어라.', '윙 샷 특성이 처음 명중할 때 보관된다.', '윙 특성은 적을 측면 라인에 두면 가장 좋다.'],
  ['CABINET 로그: 카운터 감사', '특성 타이밍', '보너스 샷 명중. 카운터는 초가 아니라 발사한 탄을 센다. 비명 중 계산도 인정된다.', '보너스 샷 특성이 처음 명중할 때 보관된다.', '꾸준한 발사가 타이머를 기다리는 것보다 카운터를 빨리 채운다.'],
  ['CABINET 로그: 선체 하나 남음', '생존 읽기', '목숨 하나 남았다. 쓸모 있는 읽기: 수리하지 않는 코인은 쫓지 마라. Cabinet은 영웅심을 환불하지 않는다.', '목숨 하나가 되었을 때 보관된다.', '목숨 하나일 때는 열린 라인과 수리 픽업을 우선하라.'],
  ['CABINET 로그: 자비 창', '회복 읽기', '보스 mercy 발동. 이 회복 창은 진짜다. 지금 떨어지고, 드라마가 비킬 때 쏴라.', '보스 mercy가 연속 피해를 막을 때 보관된다.', '보스에게 맞은 뒤 먼저 거리를 벌리고 나중에 쏴라.'],
  ['CABINET 로그: 선체 여유', '유지 읽기', '목숨 최대치. 훌륭하다. 그 자신감은 패턴 읽기에 쓰고 다음 폭발 오디션에는 쓰지 마라.', '목숨 상한에 도달할 때 보관된다.', '최대 목숨일 때 안전하게 점수를 벌어라. 여유분은 실수용이다.']
].map(([title, role, line, description, tip], index) => ({ id: cabinetLogsEn[index].id, title, role, line, description, tip }));

localizedCabinetLogs.ja = [
  ['CABINETログ: ボス領収書', 'ボス読み', 'このラン最初のボス。役立つ読み: 登場は演出。下中央で立て直し、最初の本物の予告を待て。', '最初のボス登場時に保存される。登場演出をリセット時間として使うための記録。', 'ボス登場中は下中央に構え、予告が固定されてから避ける。'],
  ['CABINETログ: 新規領収書', 'Codex価値', '新しいCodex信号を保存: {name}。今はスコア、後でキャリアXP。知識は照明の悪い通貨だ。', '新しいCodex信号を初発見した時に保存される。', '新信号はスコア、キャリアXP、将来の機体解放に効く。'],
  ['CABINETログ: ヒットボックス自慢', 'ニアミス読み', '近接回避3回連続。小さな事実: graze連続はスコアであって装甲ではない。華麗な混乱も動け。', '最初の危険なnear miss連続後に保存される。', 'near missで稼いだらレーンを離れる。無敵ではない。'],
  ['CABINETログ: サイド稼業', '特性読み', 'ウィングショット命中。側面弾は飾りではない。乱れたウェーブを斜めレーンに入れて請求しろ。', 'ウィングショット特性が初命中した時に保存される。', 'ウィング特性は敵を側面レーンに置くと強い。'],
  ['CABINETログ: カウンター監査', '特性タイミング', 'ボーナスショット命中。カウンターは秒ではなく発射数を数える。叫びながら数えるのも認定済み。', 'ボーナスショット特性が初命中した時に保存される。', '安定して撃つ方がタイマー待ちより早くカウンターを進める。'],
  ['CABINETログ: 残り1船体', '生存読み', '残機1。役立つ読み: 修理しないコインは追うな。Cabinetは英雄行為を返金しない。', '初めて残機1になった時に保存される。', '残機1では開いたレーンと修理ピックアップを優先。'],
  ['CABINETログ: 慈悲ウィンドウ', '回復読み', 'ボスmercy発動。その回復時間は本物だ。今は離れ、演出が足をどけてから撃て。', 'ボスmercyが連続ダメージを防いだ時に保存される。', 'ボス被弾後はまず距離を取り、それから撃つ。'],
  ['CABINETログ: 船体余剰', '維持読み', '残機最大。素晴らしい。その自信はパターン読みへ。次の爆発オーディションには使うな。', '残機上限に到達した時に保存される。', '最大残機では安全に稼ぐ。余裕はミス用だ。']
].map(([title, role, line, description, tip], index) => ({ id: cabinetLogsEn[index].id, title, role, line, description, tip }));

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

function fillCabinetTemplate(text, context = {}) {
  return String(text || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key) => (
    Object.prototype.hasOwnProperty.call(context, key) ? String(context[key]) : full
  ));
}

function currentCabinetLogs() {
  const localized = localizedCabinetLogs[getCurrentLanguage()] || null;
  return cabinetLogsEn.map((entry, index) => ({
    ...entry,
    ...(localized?.[index] || {})
  }));
}

export function getCabinetLogEntries(context = {}) {
  return currentCabinetLogs().map((entry) => ({
    ...entry,
    line: fillCabinetTemplate(entry.line, context),
    description: fillCabinetTemplate(entry.description, context),
    tip: fillCabinetTemplate(entry.tip, context)
  }));
}

export function getCabinetLogEntry(id, context = {}) {
  const entry = getCabinetLogEntries(context).find((item) => item.id === id);
  return entry ? { ...entry } : null;
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
