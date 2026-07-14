const ELITE_EXPANSION_SOURCE = Object.freeze([
  'Prism barrage',
  'Meteor bloom artillery',
  'Vector dash hunter',
  'Orbiting blade array',
  'Stasis lattice',
  'Siphon tether',
  'Resonance commander',
  'Warp ambusher',
  'Ion shear',
  'Siege beacon artillery'
]);

const TRANSLATIONS = Object.freeze({
  de: Object.freeze([
    'Prismensalve',
    'Meteorblüten-Artillerie',
    'Vektorstoß-Jäger',
    'Umlaufende Klingenformation',
    'Stasisgitter',
    'Siphon-Fessel',
    'Resonanzkommandant',
    'Warp-Hinterhalt',
    'Ionenschere',
    'Belagerungsmarkierungs-Artillerie'
  ]),
  es: Object.freeze([
    'Ráfaga prismática',
    'Artillería de flor meteórica',
    'Cazador de embestida vectorial',
    'Matriz de cuchillas orbitales',
    'Red de estasis',
    'Vínculo sifón',
    'Comandante de resonancia',
    'Emboscador de salto',
    'Cizalla iónica',
    'Artillería de baliza de asedio'
  ]),
  ru: Object.freeze([
    'Призменный залп',
    'Артиллерия метеорного цветения',
    'Охотник векторного рывка',
    'Массив орбитальных клинков',
    'Стазисная решётка',
    'Сифонная связь',
    'Резонансный командир',
    'Варп-засадник',
    'Ионный срез',
    'Артиллерия осадного маяка'
  ]),
  'zh-CN': Object.freeze([
    '棱镜齐射',
    '流星绽放炮击',
    '矢量突进猎手',
    '轨道刃阵列',
    '停滞晶格',
    '虹吸束缚',
    '共振指挥官',
    '跃迁伏击者',
    '离子剪切',
    '攻城信标炮击'
  ]),
  'pt-BR': Object.freeze([
    'Rajada prismática',
    'Artilharia de flores meteóricas',
    'Caçador de avanço vetorial',
    'Matriz de lâminas orbitais',
    'Malha de estase',
    'Laço de sifão',
    'Comandante de ressonância',
    'Emboscador de dobra',
    'Cisalha iônica',
    'Artilharia de baliza de cerco'
  ]),
  ko: Object.freeze([
    '프리즘 일제사격',
    '유성 개화 포격',
    '벡터 돌진 사냥꾼',
    '궤도 칼날 배열',
    '정지장 격자',
    '흡수 속박',
    '공명 지휘관',
    '워프 매복자',
    '이온 절단',
    '공성 신호기 포격'
  ]),
  ja: Object.freeze([
    'プリズム斉射',
    'メテオブルーム砲撃',
    'ベクトル突進ハンター',
    '軌道ブレードアレイ',
    'ステイシス格子',
    'サイフォン拘束',
    'レゾナンス指揮官',
    'ワープ奇襲機',
    'イオン剪断',
    '攻城ビーコン砲撃'
  ])
});

export function getEliteExpansionSourceText(locale = 'en') {
  const localized = TRANSLATIONS[locale];
  if (!localized) return {};
  return Object.freeze(Object.fromEntries(
    ELITE_EXPANSION_SOURCE.map((source, index) => [source, localized[index]])
  ));
}
