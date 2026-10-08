// Result guidance uses the same canonical English keys in every locale.
// Scout is the intentional mode name; explanatory text uses native script.
const SOURCE=Object.freeze([
  'Counter advice','SCOUT RUN','SCOUT RUN COMPLETE','NO CAREER XP',
  'SCOUT RUN: NO CAREER XP OR RANKED PROGRESS','Unranked practice',
  'Scout Best: {score}','This Run: {score}','No leaderboard submission',
  'New Scout Best','ONE MORE SCOUT RUN','Next goal: Run ranked for the boards',
  'NEXT GOAL: RUN RANKED FOR THE BOARDS'
]);
const TEXT={
  en:SOURCE,
  de:['Konterhinweis','SCOUT RUN','SCOUT RUN BEENDET','KEINE KARRIERE-XP',
    'SCOUT RUN: KEINE KARRIERE-XP ODER GEWERTETER FORTSCHRITT','Ungewertetes Training',
    'Scout-Bestwert: {score}','Dieser Run: {score}','Keine Bestenlisten-Einsendung',
    'Neuer Scout-Bestwert','NOCH EIN SCOUT RUN','Nächstes Ziel: Gewertet um Bestenlistenplätze spielen',
    'NÄCHSTES ZIEL: GEWERTET UM BESTENLISTENPLÄTZE SPIELEN'],
  es:['Consejo de respuesta','SCOUT RUN','SCOUT RUN COMPLETADA','SIN XP DE CARRERA',
    'SCOUT RUN: SIN XP DE CARRERA NI PROGRESO CLASIFICADO','Práctica sin clasificación',
    'Mejor Scout: {score}','Esta partida: {score}','Sin envío a la clasificación',
    'Nuevo récord de Scout','OTRA SCOUT RUN','Próximo objetivo: Jugar clasificatorias para entrar en las tablas',
    'PRÓXIMO OBJETIVO: JUGAR CLASIFICATORIAS PARA ENTRAR EN LAS TABLAS'],
  'pt-BR':['Dica de resposta','SCOUT RUN','SCOUT RUN CONCLUÍDA','SEM XP DE CARREIRA',
    'SCOUT RUN: SEM XP DE CARREIRA OU PROGRESSO RANQUEADO','Treino sem classificação',
    'Melhor Scout: {score}','Esta partida: {score}','Sem envio ao placar',
    'Novo recorde de Scout','MAIS UMA SCOUT RUN','Próximo objetivo: Jogar partidas ranqueadas para entrar nos placares',
    'PRÓXIMO OBJETIVO: JOGAR PARTIDAS RANQUEADAS PARA ENTRAR NOS PLACARES'],
  'zh-CN':['应对建议','Scout 试飞','Scout 试飞结束','无生涯经验',
    'Scout 试飞：不获得生涯经验或排名进度','不计排名的练习',
    'Scout 最佳成绩：{score}','本次成绩：{score}','不提交排行榜',
    'Scout 新纪录','再来一次 Scout 试飞','下个目标：参加排名模式，挑战排行榜',
    '下个目标：参加排名模式，挑战排行榜'],
  ru:['Совет по тактике','SCOUT RUN','SCOUT RUN ЗАВЕРШЁН','БЕЗ ОПЫТА КАРЬЕРЫ',
    'SCOUT RUN: БЕЗ ОПЫТА КАРЬЕРЫ И РЕЙТИНГОВОГО ПРОГРЕССА','Тренировка без рейтинга',
    'Рекорд Scout: {score}','Этот вылет: {score}','Без отправки в таблицу рекордов',
    'Новый рекорд Scout','ЕЩЁ ОДИН SCOUT RUN','Следующая цель: Играть в рейтинговом режиме ради места в таблице',
    'СЛЕДУЮЩАЯ ЦЕЛЬ: ИГРАТЬ В РЕЙТИНГОВОМ РЕЖИМЕ РАДИ МЕСТА В ТАБЛИЦЕ'],
  ko:['대응 전술','Scout 비행','Scout 비행 완료','커리어 XP 없음',
    'Scout 비행: 커리어 XP 및 랭크 진행 없음','순위에 반영되지 않는 연습',
    'Scout 최고 기록: {score}','이번 비행: {score}','리더보드에 제출하지 않음',
    'Scout 신기록','Scout 비행 한 번 더','다음 목표: 랭크 모드에서 리더보드에 도전하세요',
    '다음 목표: 랭크 모드에서 리더보드에 도전하세요'],
  ja:['対処のヒント','Scoutフライト','Scoutフライト完了','キャリアXPなし',
    'Scoutフライト：キャリアXP・ランキング進行なし','ランキング対象外の練習',
    'Scout最高記録：{score}','今回のフライト：{score}','ランキングには送信しません',
    'Scout新記録','もう一度Scoutフライト','次の目標：ランキング対象モードでスコアボードに挑戦',
    '次の目標：ランキング対象モードでスコアボードに挑戦']
};
const CATALOG=Object.freeze(Object.fromEntries(Object.entries(TEXT).map(([locale,rows])=>{
  if(rows.length!==SOURCE.length)throw Error(`Result guidance translation count mismatch: ${locale}`);
  return[locale,Object.freeze(Object.fromEntries(SOURCE.map((source,i)=>[source,rows[i]])))];
})));
export function getGameOverQualitySourceText(locale){return CATALOG[locale]||CATALOG.en;}
