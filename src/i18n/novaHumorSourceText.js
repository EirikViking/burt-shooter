const freezePool = (lines) => Object.freeze([...lines]);

export const NOVA_HUMOR_POOLS = Object.freeze({
  start_story: freezePool([
    'The alien formation union has filed a complaint.',
    'Arcade Control is counting quarters.',
    'The swarm rehearsed. You improvised.',
    'Boss music is waiting in the wings.',
    'Tiny ship. Enormous paperwork.',
    'Classic cabinet danger, modern panic.',
    'Cabinet weather: ninety percent lasers.',
    'The swarm brought a formation. You brought bad ideas at high speed.',
    'Arcade Control says this is technically a rescue mission.',
    'Please keep hands, feet, and heroic nonsense inside the ship.',
    'Somewhere, a boss is rehearsing its entrance.',
    'The score counter has been told to dream bigger.'
  ]),
  pause: freezePool([
    'Time stopped. The bullets are pretending not to move.',
    'The swarm has agreed to a suspiciously polite timeout.',
    'Hydrate. The cabinet cannot do it for you.',
    'Tactical pause. Dramatic breathing remains active.'
  ]),
  wave_clear_quip: freezePool([
    'Formation deleted. Paperwork remains.',
    'The swarm would like that wave back.',
    'Clean sweep. Mostly clean. Space is difficult.',
    'Enemy morale has left the sector.'
  ]),
  directive_complete_quip: freezePool([
    'Arcade Control has stamped this aggressively.',
    'Objective complete. The clipboard is emotional.',
    'Fine work. The mission planner owes you a snack.',
    'Directive filed under: surprisingly competent.'
  ]),
  leaderboard_loaded: freezePool([
    'The scoreboard is awake!',
    'Initials become legends!',
    'Cabinet royalty detected!',
    'The swarm remembers!',
    'High-score orbit achieved!'
  ]),
  leaderboard_empty: freezePool([
    'No scores yet. The cabinet is accepting founding legends.',
    'An empty board. Very peaceful. Fix that.',
    'The leaderboard is wearing its blank expression.',
    'First place is currently occupied by absolutely nobody.'
  ]),
  leaderboard_error: freezePool([
    'Leaderboard off radar. Your bragging was saved locally.',
    'The cabinet cannot reach the competition right now. Convenient.',
    'Signal lost. Rivalry remains fully operational.',
    'Steam is taking a break. The cabinet is keeping receipts.'
  ])
});

const localizedPools = Object.freeze({
  de: {
    start_story: [
      'Die Gewerkschaft der Alien-Formationen hat Beschwerde eingelegt.',
      'Arcade Control zählt die Münzen.',
      'Der Schwarm hat geprobt. Du hast improvisiert.',
      'Die Bossmusik wartet hinter der Bühne.',
      'Winziges Schiff. Gigantischer Papierkram.',
      'Klassische Automatengefahr, moderne Panik.',
      'Automatenwetter: neunzig Prozent Laser.',
      'Der Schwarm brachte eine Formation. Du brachtest schlechte Ideen mit Höchstgeschwindigkeit.',
      'Arcade Control behauptet, dies sei technisch gesehen eine Rettungsmission.',
      'Bitte Hände, Füße und heldenhaften Unsinn im Schiff behalten.',
      'Irgendwo probt ein Boss seinen Auftritt.',
      'Der Punktezähler wurde angewiesen, größer zu träumen.'
    ],
    pause: [
      'Die Zeit steht. Die Kugeln tun nur so, als würden sie sich nicht bewegen.',
      'Der Schwarm hat einer verdächtig höflichen Auszeit zugestimmt.',
      'Trink etwas. Der Automat kann das nicht für dich erledigen.',
      'Taktische Pause. Dramatisches Atmen bleibt aktiv.'
    ],
    wave_clear_quip: [
      'Formation gelöscht. Papierkram bleibt.',
      'Der Schwarm hätte diese Welle gern zurück.',
      'Sauber gewischt. Größtenteils. Weltraum ist schwierig.',
      'Die feindliche Moral hat den Sektor verlassen.'
    ],
    directive_complete_quip: [
      'Arcade Control hat das mit Nachdruck abgestempelt.',
      'Ziel erfüllt. Das Klemmbrett wird emotional.',
      'Gute Arbeit. Die Einsatzplanung schuldet dir einen Snack.',
      'Direktive abgelegt unter: überraschend kompetent.'
    ],
    leaderboard_loaded: [
      'Die Bestenliste ist wach!',
      'Initialen werden zu Legenden!',
      'Der Automat erkennt Adel!',
      'Der Schwarm erinnert sich!',
      'Highscore-Orbit erreicht!'
    ],
    leaderboard_empty: [
      'Noch keine Punkte. Der Automat sucht Gründungslegenden.',
      'Eine leere Bestenliste. Sehr friedlich. Ändere das.',
      'Die Bestenliste setzt ihr ausdrucksloses Gesicht auf.',
      'Platz eins gehört derzeit absolut niemandem.'
    ],
    leaderboard_error: [
      'Bestenliste im Funkloch. Deine Angeberei wurde lokal gespeichert.',
      'Der Automat kann die Konkurrenz gerade nicht erreichen. Praktisch.',
      'Signal verloren. Rivalität weiterhin voll funktionsfähig.',
      'Steam macht eine Pause. Der Automat führt Buch.'
    ]
  },
  es: {
    start_story: [
      'El sindicato de formaciones alienígenas ha presentado una queja.',
      'Control Arcade está contando las monedas.',
      'El enjambre ensayó. Tú improvisaste.',
      'La música del jefe espera entre bastidores.',
      'Nave diminuta. Papeleo gigantesco.',
      'Peligro clásico de recreativa, pánico moderno.',
      'Pronóstico de la cabina: noventa por ciento láseres.',
      'El enjambre trajo una formación. Tú trajiste malas ideas a toda velocidad.',
      'Control Arcade asegura que esto es técnicamente una misión de rescate.',
      'Mantén manos, pies y heroicidades absurdas dentro de la nave.',
      'En algún lugar, un jefe está ensayando su entrada.',
      'Al contador de puntos le han ordenado soñar más alto.'
    ],
    pause: [
      'El tiempo se ha detenido. Las balas fingen no moverse.',
      'El enjambre ha aceptado una pausa sospechosamente educada.',
      'Hidrátate. La recreativa no puede hacerlo por ti.',
      'Pausa táctica. La respiración dramática sigue activa.'
    ],
    wave_clear_quip: [
      'Formación borrada. El papeleo continúa.',
      'El enjambre quiere que le devuelvas esa oleada.',
      'Barrido limpio. Casi. El espacio es complicado.',
      'La moral enemiga ha abandonado el sector.'
    ],
    directive_complete_quip: [
      'Control Arcade lo ha sellado con entusiasmo.',
      'Objetivo cumplido. El portapapeles se ha emocionado.',
      'Buen trabajo. Planificación de Misión te debe un tentempié.',
      'Directiva archivada en: competencia sorprendente.'
    ],
    leaderboard_loaded: [
      '¡El marcador ha despertado!',
      '¡Las iniciales se vuelven leyenda!',
      '¡Realeza de recreativa detectada!',
      '¡El enjambre recuerda!',
      '¡Órbita de récord alcanzada!'
    ],
    leaderboard_empty: [
      'Aún no hay puntuaciones. La cabina busca leyendas fundadoras.',
      'Una tabla vacía. Qué paz. Arréglalo.',
      'La clasificación ha puesto cara de no saber nada.',
      'El primer puesto no pertenece ahora mismo a absolutamente nadie.'
    ],
    leaderboard_error: [
      'Clasificación fuera de cobertura. Tu fanfarronería se guardó localmente.',
      'La cabina no localiza a la competencia. Qué conveniente.',
      'Señal perdida. Rivalidad totalmente operativa.',
      'Steam se está tomando un descanso. La cabina lleva la cuenta.'
    ]
  },
  ru: {
    start_story: [
      'Профсоюз инопланетных построений подал жалобу.',
      'Аркадный диспетчер пересчитывает жетоны.',
      'Рой репетировал. Ты импровизировал.',
      'Музыка босса ждёт за кулисами.',
      'Крошечный корабль. Гигантская бумажная работа.',
      'Классическая аркадная опасность, современная паника.',
      'Прогноз у автомата: лазеры с вероятностью девяносто процентов.',
      'Рой принёс строй. Ты — плохие идеи на огромной скорости.',
      'Аркадный диспетчер уверяет, что технически это спасательная операция.',
      'Руки, ноги и героическую чепуху держать внутри корабля.',
      'Где-то босс репетирует эффектный выход.',
      'Счётчику очков приказано мечтать масштабнее.'
    ],
    pause: [
      'Время остановилось. Пули делают вид, что тоже.',
      'Рой согласился на подозрительно вежливый перерыв.',
      'Попей воды. Автомат не сможет сделать это за тебя.',
      'Тактическая пауза. Драматичное дыхание остаётся включённым.'
    ],
    wave_clear_quip: [
      'Построение удалено. Бумажная работа осталась.',
      'Рой просит вернуть ему эту волну.',
      'Чистая зачистка. Почти. Космос — дело сложное.',
      'Мораль противника покинула сектор.'
    ],
    directive_complete_quip: [
      'Аркадный диспетчер поставил печать с особым нажимом.',
      'Цель выполнена. Планшет растроган.',
      'Отличная работа. Штаб должен тебе перекус.',
      'Директива подшита в раздел: удивительная компетентность.'
    ],
    leaderboard_loaded: [
      'Таблица проснулась!',
      'Инициалы становятся легендами!',
      'Обнаружена аркадная знать!',
      'Рой всё помнит!',
      'Орбита рекорда достигнута!'
    ],
    leaderboard_empty: [
      'Очков пока нет. Автомат набирает легенд-основателей.',
      'Пустая таблица. Такая тишина. Исправь это.',
      'Таблица лидеров изображает полное безразличие.',
      'Первое место сейчас не занимает буквально никто.'
    ],
    leaderboard_error: [
      'Таблица вне зоны связи. Твоё хвастовство сохранено локально.',
      'Автомат не может связаться с соперниками. Как удобно.',
      'Сигнал потерян. Соперничество полностью исправно.',
      'Steam взял паузу. Автомат продолжает считать.'
    ]
  },
  'zh-CN': {
    start_story: [
      '外星编队工会提交了投诉。',
      '街机控制部正在数代币。',
      '虫群排练过。你临场发挥。',
      'Boss音乐正在后台候场。',
      '小小飞船。巨量文书。',
      '经典街机危险，现代玩家慌张。',
      '机柜天气预报：九成概率有激光。',
      '虫群带来了阵型。你带来了高速馊主意。',
      '街机控制部说，严格来讲这算救援任务。',
      '请把手脚和英雄式胡闹留在船内。',
      '某个Boss正在排练登场。',
      '计分器接到命令：把梦做大点。'
    ],
    pause: [
      '时间停了。子弹也在假装没动。',
      '虫群同意了一个礼貌得可疑的暂停。',
      '喝口水。机柜没法替你喝。',
      '战术暂停。戏剧性呼吸继续运行。'
    ],
    wave_clear_quip: [
      '阵型已删除。文书还在。',
      '虫群想把这一波要回去。',
      '清场干净。大体上。太空很难打扫。',
      '敌方士气已经离开本星区。'
    ],
    directive_complete_quip: [
      '街机控制部用力盖了章。',
      '目标完成。任务板感动了。',
      '干得漂亮。任务规划部欠你一份零食。',
      '指令归档于：意外地靠谱。'
    ],
    leaderboard_loaded: [
      '计分板醒了！',
      '缩写也能成为传奇！',
      '检测到街机贵族！',
      '虫群记住你了！',
      '已进入高分轨道！'
    ],
    leaderboard_empty: [
      '还没有分数。机柜正在招募开国传奇。',
      '空荡荡的榜单。真安静。快改掉。',
      '排行榜摆出了一脸空白。',
      '第一名目前属于绝对没有人。'
    ],
    leaderboard_error: [
      '排行榜掉线了。你的炫耀已保存到本地。',
      '机柜暂时联系不上对手。真巧。',
      '信号丢失。竞争心仍然满格。',
      'Steam正在休息。机柜还在记账。'
    ]
  },
  'pt-BR': {
    start_story: [
      'O sindicato das formações alienígenas apresentou uma reclamação.',
      'O Controle do Arcade está contando fichas.',
      'O enxame ensaiou. Você improvisou.',
      'A música do chefe aguarda nos bastidores.',
      'Nave minúscula. Papelada gigantesca.',
      'Perigo clássico de fliperama, pânico moderno.',
      'Previsão do fliperama: noventa por cento de lasers.',
      'O enxame trouxe uma formação. Você trouxe más ideias em alta velocidade.',
      'O Controle do Arcade diz que isto é tecnicamente uma missão de resgate.',
      'Mantenha mãos, pés e bobagem heroica dentro da nave.',
      'Em algum lugar, um chefe está ensaiando sua entrada.',
      'O contador de pontos foi instruído a sonhar mais alto.'
    ],
    pause: [
      'O tempo parou. As balas fingem que também.',
      'O enxame aceitou uma pausa suspeitosamente educada.',
      'Beba água. O fliperama não pode fazer isso por você.',
      'Pausa tática. A respiração dramática continua ativa.'
    ],
    wave_clear_quip: [
      'Formação apagada. A papelada permanece.',
      'O enxame quer aquela onda de volta.',
      'Varredura limpa. Quase. O espaço é complicado.',
      'A moral inimiga saiu do setor.'
    ],
    directive_complete_quip: [
      'O Controle do Arcade carimbou isto com entusiasmo.',
      'Objetivo concluído. A prancheta está emocionada.',
      'Belo trabalho. O planejamento da missão lhe deve um lanche.',
      'Diretriz arquivada em: competência surpreendente.'
    ],
    leaderboard_loaded: [
      'O placar acordou!',
      'Iniciais viram lendas!',
      'Realeza do fliperama detectada!',
      'O enxame se lembra!',
      'Órbita de recorde alcançada!'
    ],
    leaderboard_empty: [
      'Ainda sem pontuações. O fliperama aceita lendas fundadoras.',
      'Um placar vazio. Tão tranquilo. Conserte isso.',
      'O placar vestiu sua expressão vazia.',
      'O primeiro lugar pertence atualmente a absolutamente ninguém.'
    ],
    leaderboard_error: [
      'Placar fora do radar. Sua ostentação foi salva localmente.',
      'O fliperama não alcança a concorrência agora. Conveniente.',
      'Sinal perdido. A rivalidade segue totalmente operacional.',
      'A Steam está fazendo uma pausa. O fliperama mantém os registros.'
    ]
  },
  ko: {
    start_story: [
      '외계 편대 노조가 민원을 접수했습니다.',
      '아케이드 관제실이 동전을 세고 있습니다.',
      '군단은 연습했고, 당신은 즉흥으로 갑니다.',
      '보스 음악은 무대 뒤에서 대기 중입니다.',
      '작은 함선. 거대한 서류 작업.',
      '고전 오락실의 위험, 현대식 패닉.',
      '캐비닛 일기예보: 레이저 확률 90%.',
      '군단은 편대를 가져왔고, 당신은 고속의 나쁜 아이디어를 가져왔습니다.',
      '아케이드 관제실 말로는 엄밀히 따져 구조 임무랍니다.',
      '손발과 영웅적인 헛짓은 함선 안에 두세요.',
      '어딘가에서 보스가 등장을 연습하고 있습니다.',
      '점수판에 더 큰 꿈을 꾸라는 명령이 내려졌습니다.'
    ],
    pause: [
      '시간이 멈췄습니다. 탄환도 안 움직이는 척합니다.',
      '군단이 수상할 만큼 예의 바른 휴전에 동의했습니다.',
      '물 좀 드세요. 캐비닛은 대신 마셔줄 수 없습니다.',
      '전술 일시정지. 극적인 호흡은 계속 작동합니다.'
    ],
    wave_clear_quip: [
      '편대 삭제 완료. 서류는 남았습니다.',
      '군단이 방금 그 웨이브를 돌려달랍니다.',
      '깔끔한 소탕. 거의요. 우주는 청소가 어렵습니다.',
      '적의 사기가 섹터를 떠났습니다.'
    ],
    directive_complete_quip: [
      '아케이드 관제실이 힘차게 승인 도장을 찍었습니다.',
      '목표 완료. 클립보드가 감격했습니다.',
      '잘했습니다. 작전실이 간식 하나 빚졌습니다.',
      '지시 사항 분류: 놀라울 만큼 유능함.'
    ],
    leaderboard_loaded: [
      '점수판이 깨어났습니다!',
      '이니셜이 전설이 됩니다!',
      '오락실 왕족 감지!',
      '군단은 기억합니다!',
      '최고 점수 궤도 진입!'
    ],
    leaderboard_empty: [
      '아직 점수가 없습니다. 캐비닛이 창립 전설을 모집합니다.',
      '빈 순위표. 참 평화롭네요. 고쳐주세요.',
      '순위표가 멍한 표정을 짓고 있습니다.',
      '현재 1위는 그야말로 아무도 아닙니다.'
    ],
    leaderboard_error: [
      '순위표가 통신권 밖입니다. 자랑은 로컬에 저장했습니다.',
      '캐비닛이 경쟁자와 연결되지 않습니다. 참 편리하네요.',
      '신호 손실. 경쟁심은 정상 작동 중.',
      'Steam이 쉬는 중입니다. 캐비닛은 계속 기록합니다.'
    ]
  },
  ja: {
    start_story: [
      '異星編隊組合から苦情が届きました。',
      'アーケード管制がコインを数えています。',
      '群れは練習済み。あなたは即興です。',
      'ボス曲は舞台袖で待機中です。',
      '小さな船。巨大な書類仕事。',
      '昔ながらの筐体危機、現代的なパニック。',
      '筐体予報: レーザー確率90パーセント。',
      '群れは編隊を持参。あなたは高速の悪知恵を持参。',
      'アーケード管制によれば、これは一応救助任務です。',
      '手足と英雄的な無茶は船内にお収めください。',
      'どこかのボスが登場を練習中です。',
      'スコア計には、もっと大きく夢を見るよう命令しました。'
    ],
    pause: [
      '時間は停止。弾は動いていないふりをしています。',
      '群れは妙に礼儀正しい休憩に同意しました。',
      '水分補給を。筐体は代わりに飲めません。',
      '戦術的休止。劇的な呼吸は稼働中です。'
    ],
    wave_clear_quip: [
      '編隊を削除。書類は残りました。',
      '群れが今のウェーブを返してほしいそうです。',
      'きれいに一掃。だいたい。宇宙は掃除が難しい。',
      '敵の士気はセクターを離れました。'
    ],
    directive_complete_quip: [
      'アーケード管制が勢いよく承認印を押しました。',
      '目標達成。クリップボードが感動しています。',
      'お見事。作戦部はあなたにおやつを借りています。',
      '指令の分類: 驚くほど有能。'
    ],
    leaderboard_loaded: [
      'スコアボードが目覚めました!',
      'イニシャルが伝説になります!',
      '筐体の王族を検出!',
      '群れは覚えています!',
      'ハイスコア軌道に到達!'
    ],
    leaderboard_empty: [
      'スコアはまだゼロ。筐体は創業伝説を募集中です。',
      '空のランキング。平和ですね。壊してください。',
      'ランキングが真っ白な顔をしています。',
      '現在の1位は、文字どおり誰でもありません。'
    ],
    leaderboard_error: [
      'ランキングは圏外です。自慢はローカル保存しました。',
      '筐体は今、ライバルに接続できません。都合がいいですね。',
      '信号喪失。対抗心は正常稼働中です。',
      'Steamは休憩中。筐体は記録を続けます。'
    ]
  }
});

export function getNovaHumorSourceText(localeCode) {
  const localized = localizedPools[localeCode];
  if (!localized) return {};
  const sourceText = {};
  for (const [category, englishLines] of Object.entries(NOVA_HUMOR_POOLS)) {
    const localizedLines = localized[category] || [];
    englishLines.forEach((line, index) => {
      if (localizedLines[index]) sourceText[line] = localizedLines[index];
    });
  }
  return sourceText;
}

export function getNovaHumorTranslationCoverage(localeCode) {
  const localized = localizedPools[localeCode] || {};
  return Object.fromEntries(Object.entries(NOVA_HUMOR_POOLS).map(([category, lines]) => [
    category,
    { source: lines.length, localized: (localized[category] || []).length }
  ]));
}
