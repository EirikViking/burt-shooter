const SOURCE = Object.freeze([
  'ACTIVE BUILD',
  'NO AUGMENTS YET',
  '{category} {count}',
  'FUSIONS {count}',
  'STACK {current}/{max}',
  'NEW',
  'LIVE IMPACT',
  'CONTEXTUAL EFFECT',
  'DAMAGE',
  'FIRE DELAY',
  'SHOTS',
  'PIERCING',
  'CHAIN REACH',
  'MOVEMENT',
  'DODGE COOLDOWN',
  'PICKUP RANGE',
  'SUPPORT DRONES',
  'OFF',
  'ON',
  'BUILD SYNERGY'
]);

const TRANSLATIONS = Object.freeze({
  de: Object.freeze([
    'AKTIVER BUILD', 'NOCH KEINE AUGMENTE', '{category} {count}', 'FUSIONEN {count}',
    'STAPEL {current}/{max}', 'NEU', 'DIREKTE WIRKUNG', 'KONTEXTABHÄNGIG',
    'SCHADEN', 'FEUERVERZÖGERUNG', 'SCHÜSSE', 'DURCHDRINGUNG', 'KETTENREICHWEITE',
    'BEWEGUNG', 'PHASE-ABKLINGZEIT', 'SAMMELREICHWEITE', 'BEGLEITDROHNEN', 'AUS', 'AN', 'BUILD-SYNERGIE'
  ]),
  es: Object.freeze([
    'CONFIGURACIÓN ACTIVA', 'AÚN SIN AUMENTOS', '{category} {count}', 'FUSIONES {count}',
    'CARGAS {current}/{max}', 'NUEVO', 'IMPACTO DIRECTO', 'EFECTO CONTEXTUAL',
    'DAÑO', 'RETARDO DE DISPARO', 'DISPAROS', 'PERFORACIÓN', 'ALCANCE DE CADENA',
    'MOVIMIENTO', 'RECARGA DE FASE', 'ALCANCE DE RECOGIDA', 'DRONES DE APOYO', 'NO', 'SÍ', 'SINERGIA DE BUILD'
  ]),
  ru: Object.freeze([
    'ТЕКУЩАЯ СБОРКА', 'УЛУЧШЕНИЙ ПОКА НЕТ', '{category} {count}', 'СЛИЯНИЯ {count}',
    'СТЕК {current}/{max}', 'НОВОЕ', 'ПРЯМОЙ ЭФФЕКТ', 'ЗАВИСИТ ОТ УСЛОВИЙ',
    'УРОН', 'ЗАДЕРЖКА ОГНЯ', 'ВЫСТРЕЛЫ', 'ПРОБИТИЕ', 'ДАЛЬНОСТЬ ЦЕПИ',
    'ДВИЖЕНИЕ', 'ПЕРЕЗАРЯДКА ФАЗЫ', 'РАДИУС ПОДБОРА', 'ДРОНЫ ПОДДЕРЖКИ', 'ВЫКЛ.', 'ВКЛ.', 'СИНЕРГИЯ СБОРКИ'
  ]),
  'zh-CN': Object.freeze([
    '当前构筑', '尚无强化', '{category} {count}', '融合 {count}',
    '层数 {current}/{max}', '新强化', '即时变化', '情境效果',
    '伤害', '射击间隔', '弹丸数', '穿透', '连锁范围',
    '移动', '相位冷却', '拾取范围', '支援无人机', '关闭', '开启', '构筑协同'
  ]),
  'pt-BR': Object.freeze([
    'BUILD ATIVA', 'AINDA SEM APRIMORAMENTOS', '{category} {count}', 'FUSÕES {count}',
    'ACÚMULOS {current}/{max}', 'NOVO', 'IMPACTO DIRETO', 'EFEITO CONTEXTUAL',
    'DANO', 'INTERVALO DE TIRO', 'TIROS', 'PERFURAÇÃO', 'ALCANCE DA CADEIA',
    'MOVIMENTO', 'RECARGA DA FASE', 'ALCANCE DE COLETA', 'DRONES DE SUPORTE', 'DESL.', 'LIG.', 'SINERGIA DA BUILD'
  ]),
  ko: Object.freeze([
    '현재 빌드', '아직 증강 없음', '{category} {count}', '융합 {count}',
    '중첩 {current}/{max}', '신규', '즉시 변화', '상황 효과',
    '피해', '발사 간격', '탄환 수', '관통', '연쇄 범위',
    '이동', '위상 재사용 대기시간', '획득 범위', '지원 드론', '꺼짐', '켜짐', '빌드 시너지'
  ]),
  ja: Object.freeze([
    '現在のビルド', '強化はまだありません', '{category} {count}', '融合 {count}',
    'スタック {current}/{max}', '新規', '即時変化', '状況依存効果',
    'ダメージ', '射撃間隔', '弾数', '貫通', '連鎖範囲',
    '移動', 'フェーズ再使用時間', '回収範囲', '支援ドローン', 'オフ', 'オン', 'ビルドシナジー'
  ])
});

export function getTacticalDraftClaritySourceText(locale) {
  const localized = TRANSLATIONS[locale];
  if (!localized || localized.length !== SOURCE.length) return {};
  return Object.fromEntries(SOURCE.map((source, index) => [source, localized[index]]));
}
