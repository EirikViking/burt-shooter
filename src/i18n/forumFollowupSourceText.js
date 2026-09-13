const SOURCE = Object.freeze({
  eliteArrival: 'ELITE ARRIVAL',
  arrivalGuard: 'ARRIVAL GUARD ACTIVE',
  extinctionContact: 'EXTINCTION CONTACT {number}/{total}',
  threePhases: 'THREE PHASES // WATCH THE FRAME',
  scoreRouteEyebrow: 'SECTOR {sector} SCORE ROUTE',
  nowOrNever: 'NOW OR NEVER',
  scoreRouteSubtitle: 'Take COMBO ANCHOR now or close this score route for the run.',
  oneTimeScoreRoute: 'ONE-TIME SCORE ROUTE',
  oneChance: 'ONE CHANCE // WILL NOT RETURN',
  takeScoreRoute: 'TAKE SCORE ROUTE',
  cannotHold: 'CANNOT HOLD',
  cannotBan: 'CANNOT BAN',
  holdRestriction: 'This one-time score route cannot be held. Choose it now or leave it behind.',
  banRestriction: 'This one-time score route cannot be banned. Choose it now or leave it behind.',
  scoreRouteClosed: 'SCORE ROUTE CLOSED FOR THIS RUN'
});

const TRANSLATIONS = Object.freeze({
  de: Object.freeze({
    eliteArrival: 'ELITE-ANFLUG',
    arrivalGuard: 'ANFLUGSCHUTZ AKTIV',
    extinctionContact: 'AUSLÖSCHUNGSKONTAKT {number}/{total}',
    threePhases: 'DREI PHASEN // RAHMEN BEOBACHTEN',
    scoreRouteEyebrow: 'SEKTOR {sector} PUNKTEROUTE',
    nowOrNever: 'JETZT ODER NIE',
    scoreRouteSubtitle: 'Nimm COMBO ANCHOR jetzt, sonst ist diese Punkteroute für den Lauf geschlossen.',
    oneTimeScoreRoute: 'EINMALIGE PUNKTEROUTE',
    oneChance: 'EINE CHANCE // KEHRT NICHT ZURÜCK',
    takeScoreRoute: 'PUNKTEROUTE NEHMEN',
    cannotHold: 'NICHT HALTBAR',
    cannotBan: 'NICHT SPERRBAR',
    holdRestriction: 'Diese einmalige Punkteroute kann nicht gehalten werden. Wähle sie jetzt oder lass sie zurück.',
    banRestriction: 'Diese einmalige Punkteroute kann nicht gesperrt werden. Wähle sie jetzt oder lass sie zurück.',
    scoreRouteClosed: 'PUNKTEROUTE FÜR DIESEN LAUF GESCHLOSSEN'
  }),
  es: Object.freeze({
    eliteArrival: 'LLEGADA ÉLITE',
    arrivalGuard: 'ESCUDO DE ENTRADA ACTIVO',
    extinctionContact: 'CONTACTO DE EXTINCIÓN {number}/{total}',
    threePhases: 'TRES FASES // VIGILA EL MARCO',
    scoreRouteEyebrow: 'RUTA DE PUNTOS DEL SECTOR {sector}',
    nowOrNever: 'AHORA O NUNCA',
    scoreRouteSubtitle: 'Elige COMBO ANCHOR ahora o cierra esta ruta de puntos para la partida.',
    oneTimeScoreRoute: 'RUTA DE PUNTOS ÚNICA',
    oneChance: 'UNA OPORTUNIDAD // NO VOLVERÁ',
    takeScoreRoute: 'ELEGIR RUTA DE PUNTOS',
    cannotHold: 'NO SE PUEDE RESERVAR',
    cannotBan: 'NO SE PUEDE VETAR',
    holdRestriction: 'Esta ruta de puntos única no se puede reservar. Elígela ahora o déjala atrás.',
    banRestriction: 'Esta ruta de puntos única no se puede vetar. Elígela ahora o déjala atrás.',
    scoreRouteClosed: 'RUTA DE PUNTOS CERRADA PARA ESTA PARTIDA'
  }),
  ru: Object.freeze({
    eliteArrival: 'ПРИБЫТИЕ ЭЛИТЫ',
    arrivalGuard: 'ЗАЩИТА НА ВХОДЕ АКТИВНА',
    extinctionContact: 'КОНТАКТ КЛАССА ИСТРЕБЛЕНИЯ {number}/{total}',
    threePhases: 'ТРИ ФАЗЫ // СЛЕДИТЕ ЗА РАМКОЙ',
    scoreRouteEyebrow: 'МАРШРУТ ОЧКОВ СЕКТОРА {sector}',
    nowOrNever: 'СЕЙЧАС ИЛИ НИКОГДА',
    scoreRouteSubtitle: 'Возьмите COMBO ANCHOR сейчас, иначе маршрут очков закроется до конца забега.',
    oneTimeScoreRoute: 'ОДНОРАЗОВЫЙ МАРШРУТ ОЧКОВ',
    oneChance: 'ОДИН ШАНС // НЕ ВЕРНЁТСЯ',
    takeScoreRoute: 'ВЗЯТЬ МАРШРУТ',
    cannotHold: 'НЕЛЬЗЯ СОХРАНИТЬ',
    cannotBan: 'НЕЛЬЗЯ ЗАПРЕТИТЬ',
    holdRestriction: 'Этот одноразовый маршрут очков нельзя сохранить. Выберите его сейчас или оставьте позади.',
    banRestriction: 'Этот одноразовый маршрут очков нельзя запретить. Выберите его сейчас или оставьте позади.',
    scoreRouteClosed: 'МАРШРУТ ОЧКОВ ЗАКРЫТ ДО КОНЦА ЗАБЕГА'
  }),
  'zh-CN': Object.freeze({
    eliteArrival: '精英抵达',
    arrivalGuard: '入场护盾已启动',
    extinctionContact: '灭绝级接触 {number}/{total}',
    threePhases: '三阶段 // 留意标记框',
    scoreRouteEyebrow: '第 {sector} 区得分路线',
    nowOrNever: '机不可失',
    scoreRouteSubtitle: '立即选择 COMBO ANCHOR，否则本局将关闭这条得分路线。',
    oneTimeScoreRoute: '一次性得分路线',
    oneChance: '仅此一次 // 不会再现',
    takeScoreRoute: '选择得分路线',
    cannotHold: '无法保留',
    cannotBan: '无法禁用',
    holdRestriction: '这条一次性得分路线无法保留。请立即选择，否则就此错过。',
    banRestriction: '这条一次性得分路线无法禁用。请立即选择，否则就此错过。',
    scoreRouteClosed: '本局得分路线已关闭'
  }),
  'pt-BR': Object.freeze({
    eliteArrival: 'CHEGADA DE ELITE',
    arrivalGuard: 'GUARDA DE ENTRADA ATIVA',
    extinctionContact: 'CONTATO DE EXTINÇÃO {number}/{total}',
    threePhases: 'TRÊS FASES // OBSERVE A MOLDURA',
    scoreRouteEyebrow: 'ROTA DE PONTOS DO SETOR {sector}',
    nowOrNever: 'AGORA OU NUNCA',
    scoreRouteSubtitle: 'Escolha COMBO ANCHOR agora ou feche esta rota de pontos nesta partida.',
    oneTimeScoreRoute: 'ROTA DE PONTOS ÚNICA',
    oneChance: 'UMA CHANCE // NÃO VOLTA',
    takeScoreRoute: 'ESCOLHER ROTA DE PONTOS',
    cannotHold: 'NÃO PODE RESERVAR',
    cannotBan: 'NÃO PODE BANIR',
    holdRestriction: 'Esta rota de pontos única não pode ser reservada. Escolha agora ou deixe para trás.',
    banRestriction: 'Esta rota de pontos única não pode ser banida. Escolha agora ou deixe para trás.',
    scoreRouteClosed: 'ROTA DE PONTOS FECHADA NESTA PARTIDA'
  }),
  ko: Object.freeze({
    eliteArrival: '엘리트 진입',
    arrivalGuard: '진입 보호막 활성',
    extinctionContact: '멸종급 접촉 {number}/{total}',
    threePhases: '3단계 // 표식 프레임 확인',
    scoreRouteEyebrow: '섹터 {sector} 점수 루트',
    nowOrNever: '지금 아니면 기회 없음',
    scoreRouteSubtitle: '지금 COMBO ANCHOR를 선택하지 않으면 이번 런의 점수 루트가 닫힙니다.',
    oneTimeScoreRoute: '일회성 점수 루트',
    oneChance: '단 한 번 // 다시 나오지 않음',
    takeScoreRoute: '점수 루트 선택',
    cannotHold: '보관 불가',
    cannotBan: '밴 불가',
    holdRestriction: '이 일회성 점수 루트는 보관할 수 없습니다. 지금 선택하거나 포기해야 합니다.',
    banRestriction: '이 일회성 점수 루트는 밴할 수 없습니다. 지금 선택하거나 포기해야 합니다.',
    scoreRouteClosed: '이번 런의 점수 루트가 닫혔습니다'
  }),
  ja: Object.freeze({
    eliteArrival: 'エリート接近',
    arrivalGuard: '進入ガード作動中',
    extinctionContact: '絶滅級コンタクト {number}/{total}',
    threePhases: '3フェーズ // フレームを注視',
    scoreRouteEyebrow: 'セクター{sector} スコアルート',
    nowOrNever: '今しかない',
    scoreRouteSubtitle: '今COMBO ANCHORを選ばなければ、このランのスコアルートは閉じます。',
    oneTimeScoreRoute: '一度限りのスコアルート',
    oneChance: '一度限り // 再登場なし',
    takeScoreRoute: 'スコアルートを選択',
    cannotHold: '保留不可',
    cannotBan: 'BAN不可',
    holdRestriction: 'この一度限りのスコアルートは保留できません。今選ぶか、ここで手放してください。',
    banRestriction: 'この一度限りのスコアルートはBANできません。今選ぶか、ここで手放してください。',
    scoreRouteClosed: 'このランのスコアルートは閉じました'
  })
});

export function getForumFollowupSourceText(locale = 'en') {
  const localized = TRANSLATIONS[locale];
  if (!localized) return Object.freeze({});
  const sourceKeys = Object.keys(SOURCE);
  const missing = sourceKeys.filter((key) => typeof localized[key] !== 'string' || !localized[key].trim());
  if (missing.length) {
    throw new Error(`Forum follow-up translations missing for ${locale}: ${missing.join(', ')}`);
  }
  return Object.freeze(Object.fromEntries(sourceKeys.map((key) => [SOURCE[key], localized[key]])));
}
