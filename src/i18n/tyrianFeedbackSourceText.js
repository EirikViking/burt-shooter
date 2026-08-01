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

const EXTRA_SOURCE = Object.freeze([
  'Focused shots deal +18% damage with hull-tuned spread',
  'Holding Focus routes every loose photon through the expensive glass. Focus stays armed through Ghost and Phase, while spread tightens according to the hull weapon profile without changing projectile count or fire rate. Broad batteries receive stronger correction than already-precise cannons.',
  'Bomb impacts call charged verdicts, plus one reduced emergency beam per sector.',
  'BOMB + ORBITAL STRIKE. Bomb detonations spend orbital charges at the blast marker. With no charges left, one visibly tracked emergency verdict remains each sector: a smaller, reduced-damage beam that can only fire once.',
  'SPENT'
]);

const EXTRA_TRANSLATIONS = Object.freeze({
  de: Object.freeze([
    'Fokussierte Schüsse verursachen +18 % Schaden mit rumpfabhängiger Streuung',
    'Beim Fokussieren wird jedes freie Photon durch das teure Glas gejagt. Der Fokus bleibt während Ghost und Phase aktiv, während sich die Streuung ohne Änderung von Projektilzahl oder Feuerrate an das Waffenprofil des Rumpfs anpasst. Breite Batterien werden stärker korrigiert als bereits präzise Kanonen.',
    'Bombeneinschläge rufen geladene Urteile sowie einen abgeschwächten Notfallstrahl pro Sektor.',
    'BOMBE + ORBITALSCHLAG. Bombendetonationen verbrauchen Orbitalladungen an der Explosionsmarke. Sind keine Ladungen mehr übrig, bleibt pro Sektor ein sichtbar verfolgtes Notfallurteil: ein kleinerer Strahl mit reduziertem Schaden, der nur einmal feuern kann.',
    'VERBRAUCHT'
  ]),
  es: Object.freeze([
    'Los disparos enfocados infligen +18 % de daño con dispersión adaptada al casco',
    'Al mantener Enfoque, cada fotón suelto atraviesa el cristal caro. Enfoque permanece activo durante Fantasma y Fase, mientras la dispersión se ajusta al perfil de armas del casco sin cambiar la cantidad de proyectiles ni la cadencia. Las baterías amplias reciben una corrección mayor que los cañones ya precisos.',
    'Los impactos de bomba invocan veredictos cargados y un rayo de emergencia reducido por sector.',
    'BOMBA + ATAQUE ORBITAL. Las detonaciones gastan cargas orbitales en la marca de explosión. Sin cargas queda un veredicto de emergencia visible por sector: un rayo más pequeño y de daño reducido que solo puede dispararse una vez.',
    'GASTADO'
  ]),
  ru: Object.freeze([
    'Выстрелы в Фокусе наносят +18% урона с разбросом, настроенным под корпус',
    'Удержание Фокуса прогоняет каждый бесхозный фотон через дорогое стекло. Фокус остаётся активным во время Призрака и Фазы, а разброс подстраивается под оружие корпуса без изменения числа снарядов и темпа стрельбы. Широкие батареи получают более сильную коррекцию, чем точные пушки.',
    'Взрывы бомб вызывают заряженные удары и один ослабленный аварийный луч за сектор.',
    'БОМБА + ОРБИТАЛЬНЫЙ УДАР. Взрывы бомб расходуют орбитальные заряды в точке взрыва. Когда зарядов нет, в каждом секторе остаётся один видимый аварийный удар: меньший луч со сниженным уроном, который срабатывает только один раз.',
    'ИЗРАСХОДОВАНО'
  ]),
  'zh-CN': Object.freeze([
    '聚焦射击伤害+18%，散射随舰体武器调整',
    '按住聚焦会把每个闲散光子都赶进昂贵的镜片。幽灵和相位期间聚焦仍保持生效，散射会依舰体武器配置收紧，但不会改变弹丸数量或射速。宽散射炮组获得的修正强于本就精准的火炮。',
    '炸弹命中可召唤充能裁决，并且每个扇区有一次削弱的应急光束。',
    '炸弹 + 轨道打击。炸弹引爆时会在爆点消耗轨道充能。充能耗尽后，每个扇区仍有一次清晰显示的应急裁决：范围更小、伤害更低且只能触发一次的光束。',
    '已消耗'
  ]),
  'pt-BR': Object.freeze([
    'Tiros em Foco causam +18% de dano com dispersão ajustada ao casco',
    'Manter o Foco conduz cada fóton solto pelo vidro caro. O Foco continua ativo durante Fantasma e Fase, enquanto a dispersão se ajusta ao perfil de armas do casco sem alterar a quantidade de projéteis nem a cadência. Baterias amplas recebem correção maior que canhões já precisos.',
    'Impactos de bomba chamam vereditos carregados e um feixe de emergência reduzido por setor.',
    'BOMBA + ATAQUE ORBITAL. Detonações gastam cargas orbitais no ponto da explosão. Sem cargas, resta um veredito de emergência visível por setor: um feixe menor, com dano reduzido, que só pode disparar uma vez.',
    'GASTO'
  ]),
  ko: Object.freeze([
    '집중 사격 피해 +18%, 기체 무기에 맞춰 탄 퍼짐 조정',
    '집중을 누르면 놀고 있던 광자가 전부 비싼 렌즈를 통과한다. 유령과 위상 중에도 집중은 유지되며, 투사체 수나 발사 속도는 바꾸지 않고 기체 무기 구성에 맞춰 탄 퍼짐을 줄인다. 넓게 퍼지는 포대일수록 정밀한 포보다 더 큰 보정을 받는다.',
    '폭탄 명중 시 충전된 심판을 호출하고, 섹터마다 약화된 비상 광선 1회를 제공한다.',
    '폭탄 + 궤도 타격. 폭탄이 폭발하면 그 지점에서 궤도 충전을 소모한다. 충전이 없을 때는 섹터마다 표시되는 비상 심판 1회가 남는다. 이 광선은 더 작고 피해가 낮으며 단 한 번만 발사된다.',
    '소모됨'
  ]),
  ja: Object.freeze([
    'フォーカス射撃のダメージ+18%、機体武装に合わせて拡散を補正',
    'フォーカスを押し続けると、遊んでいる光子がすべて高級レンズを通る。ゴースト中やフェーズ中もフォーカスは維持され、弾数や連射速度を変えずに機体の武装構成へ合わせて拡散を絞る。広角砲ほど、元から高精度な砲より強い補正を受ける。',
    '爆弾の命中で充填済みの裁定を呼び、さらに各セクターで弱体化した緊急ビームを1回使える。',
    '爆弾 + 軌道攻撃。爆弾の爆発地点で軌道チャージを消費する。チャージがない場合、各セクターに表示付きの緊急裁定が1回残る。範囲と威力を抑えたビームで、発動は一度きり。',
    '使用済み'
  ])
});

export function getTyrianFeedbackSourceText(locale = 'en') {
  const localized = TRANSLATIONS[locale];
  if (!localized) return Object.freeze({});
  if (localized.length !== SOURCE.length) {
    throw new Error(`Tyrian feedback translation count mismatch for ${locale}: ${localized.length}/${SOURCE.length}`);
  }
  const extraLocalized = EXTRA_TRANSLATIONS[locale];
  if (!extraLocalized || extraLocalized.length !== EXTRA_SOURCE.length) {
    throw new Error(`Tyrian feedback extra translation count mismatch for ${locale}: ${extraLocalized?.length || 0}/${EXTRA_SOURCE.length}`);
  }
  return Object.freeze(Object.fromEntries([
    ...SOURCE.map((source, index) => [source, localized[index]]),
    ...EXTRA_SOURCE.map((source, index) => [source, extraLocalized[index]])
  ]));
}
