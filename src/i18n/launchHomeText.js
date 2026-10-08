const keys = ['OTHER MODES', 'CHANGE SHIP', 'SELECTED SHIP', 'Survive the swarm. Defeat bosses. Choose powerful upgrades.', 'Core campaign · bosses, upgrades, records', 'Elite Sector 51 · custom builds, records & feats', 'Practice flights, daily challenges & variants'];
const values = {
  en: keys,
  de: ['ANDERE MODI', 'SCHIFF WECHSELN', 'GEWÄHLTES SCHIFF', 'Überlebe den Schwarm. Besiege Bosse. Wähle mächtige Upgrades.', 'Hauptkampagne · Bosse, Upgrades, Rekorde', 'Elite ab Sektor 51 · Builds, Rekorde, Erfolge', 'Übungsflüge, Tagesaufgaben & Varianten'],
  es: ['OTROS MODOS', 'CAMBIAR NAVE', 'NAVE SELECCIONADA', 'Sobrevive al enjambre. Derrota a los jefes. Elige mejoras poderosas.', 'Campaña principal · jefes, mejoras, récords', 'Élite desde sector 51 · builds, récords y logros', 'Práctica, retos diarios y variantes'],
  ru: ['ДРУГИЕ РЕЖИМЫ', 'СМЕНИТЬ КОРАБЛЬ', 'ВЫБРАННЫЙ КОРАБЛЬ', 'Выживи среди роя. Победи боссов. Выбирай мощные улучшения.', 'Основная кампания · боссы, улучшения, рекорды', 'Элита с сектора 51 · сборки, рекорды, достижения', 'Тренировки, ежедневные задания и варианты'],
  'zh-CN': ['其他模式', '更换飞船', '已选飞船', '在虫群中生存。击败首领。选择强力升级。', '主线战役 · 首领、升级、纪录', '精英第 51 星区 · 自选配装、纪录与成就', '练习飞行、每日挑战与变体'],
  'pt-BR': ['OUTROS MODOS', 'TROCAR NAVE', 'NAVE SELECIONADA', 'Sobreviva ao enxame. Derrote chefes. Escolha melhorias poderosas.', 'Campanha principal · chefes, melhorias, recordes', 'Elite no setor 51 · builds, recordes e conquistas', 'Treinos, desafios diários e variantes'],
  ko: ['다른 모드', '기체 변경', '선택한 기체', '군단 속에서 살아남으세요. 보스를 쓰러뜨리고 강력한 업그레이드를 선택하세요.', '메인 캠페인 · 보스, 강화, 기록', '엘리트 섹터 51 · 빌드, 기록, 업적', '연습 비행, 일일 도전과 변형 모드'],
  ja: ['その他のモード', '機体を変更', '選択中の機体', '群れを生き延び、ボスを倒し、強力なアップグレードを選ぼう。', 'メイン攻略 · ボス、強化、記録', '精鋭セクター51 · ビルド、記録、実績', '練習飛行、デイリー挑戦、別ルール']
};
const newCopy = {
  en: ['Fight from Sector 1 · build, survive, climb', 'Sector 51 · custom builds, elite records', 'Pure runs, daily trials & special missions', 'Start at Sector 1. Forge a run worth remembering.', 'Build your edge at Sector 51. Chase the elite.', 'Take a new route. Face a new challenge.', 'NEW'],
  de: ['Ab Sektor 1 · bauen, überleben, aufsteigen', 'Sektor 51 · eigene Builds, Elite-Rekorde', 'Pure-Läufe, Tagesprüfungen & Spezialmissionen', 'Starte in Sektor 1. Schmiede einen unvergesslichen Lauf.', 'Finde deinen Vorteil in Sektor 51. Jage Elite-Rekorde.', 'Wähle einen neuen Weg. Stell dich einer neuen Prüfung.', 'NEU'],
  es: ['Desde el sector 1 · crea, sobrevive, asciende', 'Sector 51 · builds propios, récords de élite', 'Partidas Pure, retos diarios y misiones especiales', 'Empieza en el sector 1. Forja una partida memorable.', 'Afina tu build en el sector 51. Persigue a la élite.', 'Elige otra ruta. Afronta un nuevo desafío.', 'NUEVO'],
  ru: ['С сектора 1 · собирай, выживай, побеждай', 'Сектор 51 · свои сборки, элитные рекорды', 'Pure-забеги, испытания дня и особые миссии', 'Начни с сектора 1. Создай забег, который запомнят.', 'Найди своё преимущество в секторе 51. Брось вызов элите.', 'Выбери новый маршрут. Прими новый вызов.', 'НОВОЕ'],
  'zh-CN': ['从第 1 星区出发 · 构筑、求生、攀升', '第 51 星区 · 自选配装、精英纪录', 'Pure 飞行、每日试炼与特别任务', '从第 1 星区起航，打出值得铭记的一局。', '在第 51 星区打造优势，挑战精英纪录。', '换条航线，迎接全新挑战。', '全新'],
  'pt-BR': ['Do setor 1 · monte, sobreviva, avance', 'Setor 51 · builds próprios, recordes de elite', 'Partidas Pure, desafios diários e missões especiais', 'Comece no setor 1. Crie uma partida inesquecível.', 'Monte sua vantagem no setor 51. Desafie a elite.', 'Escolha outra rota. Encare um novo desafio.', 'NOVO'],
  ko: ['섹터 1부터 · 빌드하고 살아남아 올라가세요', '섹터 51 · 맞춤 빌드와 엘리트 기록', 'Pure 플레이, 일일 도전과 특별 임무', '섹터 1에서 시작해 기억에 남을 기록을 세우세요.', '섹터 51에서 빌드를 완성하고 엘리트에 도전하세요.', '새 경로를 택하고 새로운 도전에 맞서세요.', '신규'],
  ja: ['セクター1から · 構築、突破、上昇', 'セクター51 · 自由なビルドと精鋭記録', 'Pure、デイリー試練、特別任務', 'セクター1から始め、記憶に残る戦いを刻もう。', 'セクター51で強みを磨き、精鋭記録に挑もう。', '新たな航路を選び、新たな試練に挑もう。', '新登場']
};
keys.push(...newCopy.en);
for (const [locale, translations] of Object.entries(newCopy)) {
  if (locale !== 'en') values[locale].push(...translations);
}
export function getLaunchHomeSourceText(locale) { return Object.fromEntries(keys.map((key,i)=>[key,(values[locale]||values.en)[i]])); }
