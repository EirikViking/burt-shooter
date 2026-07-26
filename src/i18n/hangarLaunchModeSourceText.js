const SOURCE_TEXT = Object.freeze({
  de: Object.freeze({
    'CHOOSE LAUNCH MODE': 'STARTMODUS WÄHLEN',
    'SELECT THE RULESET FOR THIS HULL': 'WÄHLE DAS REGELWERK FÜR DIESES SCHIFF',
    RECOMMENDED: 'EMPFOHLEN',
    'ORIGINAL RULESET': 'URSPRÜNGLICHES REGELWERK',
    'TACTICAL DRAFT AFTER EVERY BOSS': 'TAKTISCHER DRAFT NACH JEDEM BOSS',
    'NO TACTICAL DRAFTS': 'KEINE TAKTISCHEN DRAFTS',
    'RANKED // LEADERBOARD // ACHIEVEMENTS': 'GEWERTET // BESTENLISTE // ERRUNGENSCHAFTEN',
    LAUNCH: 'STARTEN',
    'ARROWS / STICK: SELECT  |  ENTER / A: LAUNCH  |  ESC / B: BACK': 'PFEILE / STICK: WÄHLEN  |  ENTER / A: STARTEN  |  ESC / B: ZURÜCK'
  }),
  es: Object.freeze({
    'CHOOSE LAUNCH MODE': 'ELIGE EL MODO DE SALIDA',
    'SELECT THE RULESET FOR THIS HULL': 'ELIGE LAS REGLAS PARA ESTA NAVE',
    RECOMMENDED: 'RECOMENDADO',
    'ORIGINAL RULESET': 'REGLAS ORIGINALES',
    'TACTICAL DRAFT AFTER EVERY BOSS': 'SELECCIÓN TÁCTICA TRAS CADA JEFE',
    'NO TACTICAL DRAFTS': 'SIN SELECCIONES TÁCTICAS',
    'RANKED // LEADERBOARD // ACHIEVEMENTS': 'CLASIFICATORIO // MARCADOR // LOGROS',
    LAUNCH: 'INICIAR',
    'ARROWS / STICK: SELECT  |  ENTER / A: LAUNCH  |  ESC / B: BACK': 'FLECHAS / STICK: ELEGIR  |  ENTER / A: INICIAR  |  ESC / B: VOLVER'
  }),
  ru: Object.freeze({
    'CHOOSE LAUNCH MODE': 'ВЫБЕРИТЕ РЕЖИМ ЗАПУСКА',
    'SELECT THE RULESET FOR THIS HULL': 'ВЫБЕРИТЕ ПРАВИЛА ДЛЯ ЭТОГО КОРАБЛЯ',
    RECOMMENDED: 'РЕКОМЕНДУЕТСЯ',
    'ORIGINAL RULESET': 'ИСХОДНЫЕ ПРАВИЛА',
    'TACTICAL DRAFT AFTER EVERY BOSS': 'ТАКТИЧЕСКИЙ ВЫБОР ПОСЛЕ КАЖДОГО БОССА',
    'NO TACTICAL DRAFTS': 'БЕЗ ТАКТИЧЕСКОГО ВЫБОРА',
    'RANKED // LEADERBOARD // ACHIEVEMENTS': 'РЕЙТИНГ // ТАБЛИЦА // ДОСТИЖЕНИЯ',
    LAUNCH: 'ЗАПУСК',
    'ARROWS / STICK: SELECT  |  ENTER / A: LAUNCH  |  ESC / B: BACK': 'СТРЕЛКИ / СТИК: ВЫБОР  |  ENTER / A: ЗАПУСК  |  ESC / B: НАЗАД'
  }),
  'zh-CN': Object.freeze({
    'CHOOSE LAUNCH MODE': '选择出击模式',
    'SELECT THE RULESET FOR THIS HULL': '为这艘战舰选择规则',
    RECOMMENDED: '推荐',
    'ORIGINAL RULESET': '经典规则',
    'TACTICAL DRAFT AFTER EVERY BOSS': '击败每个首领后进行战术选秀',
    'NO TACTICAL DRAFTS': '无战术选秀',
    'RANKED // LEADERBOARD // ACHIEVEMENTS': '排位 // 排行榜 // 成就',
    LAUNCH: '出击',
    'ARROWS / STICK: SELECT  |  ENTER / A: LAUNCH  |  ESC / B: BACK': '方向键 / 摇杆：选择  |  ENTER / A：出击  |  ESC / B：返回'
  }),
  'pt-BR': Object.freeze({
    'CHOOSE LAUNCH MODE': 'ESCOLHA O MODO DE LANÇAMENTO',
    'SELECT THE RULESET FOR THIS HULL': 'ESCOLHA AS REGRAS PARA ESTA NAVE',
    RECOMMENDED: 'RECOMENDADO',
    'ORIGINAL RULESET': 'REGRAS ORIGINAIS',
    'TACTICAL DRAFT AFTER EVERY BOSS': 'ESCOLHA TÁTICA APÓS CADA CHEFE',
    'NO TACTICAL DRAFTS': 'SEM ESCOLHAS TÁTICAS',
    'RANKED // LEADERBOARD // ACHIEVEMENTS': 'RANQUEADO // RANKING // CONQUISTAS',
    LAUNCH: 'LANÇAR',
    'ARROWS / STICK: SELECT  |  ENTER / A: LAUNCH  |  ESC / B: BACK': 'SETAS / ANALÓGICO: ESCOLHER  |  ENTER / A: LANÇAR  |  ESC / B: VOLTAR'
  }),
  ko: Object.freeze({
    'CHOOSE LAUNCH MODE': '출격 모드 선택',
    'SELECT THE RULESET FOR THIS HULL': '이 기체로 플레이할 규칙을 선택하세요',
    RECOMMENDED: '추천',
    'ORIGINAL RULESET': '오리지널 규칙',
    'TACTICAL DRAFT AFTER EVERY BOSS': '보스를 처치할 때마다 전술 드래프트',
    'NO TACTICAL DRAFTS': '전술 드래프트 없음',
    'RANKED // LEADERBOARD // ACHIEVEMENTS': '랭크 // 순위표 // 도전 과제',
    LAUNCH: '출격',
    'ARROWS / STICK: SELECT  |  ENTER / A: LAUNCH  |  ESC / B: BACK': '방향키 / 스틱: 선택  |  ENTER / A: 출격  |  ESC / B: 뒤로'
  }),
  ja: Object.freeze({
    'CHOOSE LAUNCH MODE': '出撃モードを選択',
    'SELECT THE RULESET FOR THIS HULL': 'この機体で挑むルールを選択',
    RECOMMENDED: 'おすすめ',
    'ORIGINAL RULESET': 'オリジナルルール',
    'TACTICAL DRAFT AFTER EVERY BOSS': 'ボス撃破ごとにタクティカルドラフト',
    'NO TACTICAL DRAFTS': 'タクティカルドラフトなし',
    'RANKED // LEADERBOARD // ACHIEVEMENTS': 'ランク // リーダーボード // 実績',
    LAUNCH: '出撃',
    'ARROWS / STICK: SELECT  |  ENTER / A: LAUNCH  |  ESC / B: BACK': '方向キー / スティック：選択  |  ENTER / A：出撃  |  ESC / B：戻る'
  })
});

export function getHangarLaunchModeSourceText(locale = 'en') {
  return SOURCE_TEXT[locale] || Object.freeze({});
}
