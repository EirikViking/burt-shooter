// Names shown in saved starting-loadout collections, in the same order as SUPPORTED_LANGUAGES.
// Keep these functional labels distinct from optional Codex lore titles.
const locales = ['en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja'];
const names = {
  damage_up: ['DAMAGE UP', 'SCHADENSPLUS', 'AUMENTO DE DAÑO', 'УСИЛЕНИЕ УРОНА', '伤害提升', 'AUMENTO DE DANO', '피해 증가', 'ダメージアップ'],
  rapid_fire: ['RAPID FIRE', 'SCHNELLFEUER', 'FUEGO RÁPIDO', 'СКОРОСТРЕЛЬНОСТЬ', '快速射击', 'TIRO RÁPIDO', '속사', 'ラピッドファイア'],
  rail_surge: ['RAIL SURGE', 'RAIL-ÜBERLADUNG', 'SOBRECARGA DE RIEL', 'РЕЛЬСОВЫЙ ИМПУЛЬС', '磁轨过载', 'SOBRECARGA DE TRILHO', '레일 과부하', 'レールサージ'],
  double_shot: ['DOUBLE SHOT', 'DOPPELSCHUSS', 'DISPARO DOBLE', 'ДВОЙНОЙ ВЫСТРЕЛ', '双重射击', 'TIRO DUPLO', '이중 사격', 'ダブルショット'],
  pierce: ['PIERCE', 'DURCHSCHLAG', 'PERFORACIÓN', 'ПРОБИТИЕ', '穿透', 'PERFURAÇÃO', '관통', '貫通'],
  shield: ['SHIELD', 'SCHILD', 'ESCUDO', 'ЩИТ', '护盾', 'ESCUDO', '보호막', 'シールド'],
  ghost: ['GHOST', 'GEIST', 'FANTASMA', 'ПРИЗРАК', '幽灵', 'FANTASMA', '고스트', 'ゴースト'],
  impact_foam: ['IMPACT FOAM', 'AUFPRALLSCHAUM', 'ESPUMA DE IMPACTO', 'ЗАЩИТНАЯ ПЕНА', '缓冲泡沫', 'ESPUMA DE IMPACTO', '충격 완충 폼', '衝撃吸収フォーム'],
  speed_up: ['SPEED UP', 'TEMPOSCHUB', 'AUMENTO DE VELOCIDAD', 'УСКОРЕНИЕ', '速度提升', 'AUMENTO DE VELOCIDADE', '속도 증가', 'スピードアップ'],
  blink_drive: ['BLINK DRIVE', 'BLINK-ANTRIEB', 'IMPULSO BLINK', 'БЛИНК-ПРИВОД', '闪现驱动', 'PROPULSOR BLINK', '점멸 드라이브', 'ブリンクドライブ'],
  focus_lens: ['FOCUS LENS', 'FOKUSLINSE', 'LENTE DE ENFOQUE', 'ФОКУСИРУЮЩАЯ ЛИНЗА', '聚焦透镜', 'LENTE DE FOCO', '집중 렌즈', 'フォーカスレンズ'],
  vector_boost: ['VECTOR BOOST', 'VEKTORSCHUB', 'IMPULSO VECTORIAL', 'ВЕКТОРНЫЙ РАЗГОН', '矢量加速', 'IMPULSO VETORIAL', '벡터 부스트', 'ベクトルブースト'],
  magnet: ['MAGNET', 'MAGNET', 'IMÁN', 'МАГНИТ', '磁铁', 'ÍMÃ', '자석', 'マグネット'],
  drones: ['DRONES', 'DROHNEN', 'DRONES', 'ДРОНЫ', '无人机', 'DRONES', '드론', 'ドローン'],
  bomb: ['BOMB', 'BOMBE', 'BOMBA', 'БОМБА', '炸弹', 'BOMBA', '폭탄', 'ボム']
};
export function getOnslaughtCollectionAugmentName(id, locale = 'en') {
  const index = locales.indexOf(locale);
  return names[id]?.[index < 0 ? 0 : index] || id;
}
