const SOURCE = Object.freeze([
  'FAN',
  'BURST',
  'SPLIT',
  'SNIPER',
  'SPIRAL',
  'FAKEOUT',
  'SUMMON',
  'WALL',
  'CHORD',
  'CLOCK',
  'AIMED'
]);

const TRANSLATIONS = Object.freeze({
  de: Object.freeze(['FÄCHER', 'SALVE', 'TEILUNG', 'SCHARFSCHUSS', 'SPIRALE', 'FINTE', 'VERSTÄRKUNG', 'SPERRWAND', 'AKKORD', 'UHRWERK', 'GEZIELT']),
  es: Object.freeze(['ABANICO', 'RÁFAGA', 'DIVISIÓN', 'FRANCOTIRADOR', 'ESPIRAL', 'AMAGO', 'INVOCACIÓN', 'MURO', 'ACORDE', 'RELOJ', 'APUNTADO']),
  ru: Object.freeze(['ВЕЕР', 'ЗАЛП', 'РАЗДВОЕНИЕ', 'СНАЙПЕР', 'СПИРАЛЬ', 'ОБМАНКА', 'ПРИЗЫВ', 'СТЕНА', 'АККОРД', 'ЧАСЫ', 'ПРИЦЕЛЬНЫЙ']),
  'zh-CN': Object.freeze(['扇形', '爆发', '分裂', '狙击', '螺旋', '佯攻', '召唤', '弹墙', '和弦', '时钟', '瞄准']),
  'pt-BR': Object.freeze(['LEQUE', 'RAJADA', 'DIVISÃO', 'FRANCO-ATIRADOR', 'ESPIRAL', 'FINTA', 'INVOCAÇÃO', 'PAREDE', 'ACORDE', 'RELÓGIO', 'MIRADO']),
  ko: Object.freeze(['부채꼴', '연사', '분열', '저격', '나선', '교란', '소환', '장벽', '화음', '시계', '조준']),
  ja: Object.freeze(['扇状射撃', '連射', '分裂', '狙撃', '螺旋', '陽動', '召喚', '弾幕壁', '和音', '時計', '照準'])
});

export function getTyrianFeedbackSourceText(locale = 'en') {
  const localized = TRANSLATIONS[locale];
  if (!localized) return Object.freeze({});
  if (localized.length !== SOURCE.length) {
    throw new Error(`Tyrian feedback translation count mismatch for ${locale}: ${localized.length}/${SOURCE.length}`);
  }
  return Object.freeze(Object.fromEntries(SOURCE.map((source, index) => [source, localized[index]])));
}
