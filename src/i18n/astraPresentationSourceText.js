const labels = {
  "en": "DRAG TO ROTATE",
  "de": "ZUM DREHEN ZIEHEN",
  "es": "ARRASTRA PARA GIRAR",
  "ru": "ПЕРЕТАЩИТЕ ДЛЯ ВРАЩЕНИЯ",
  "zh-CN": "拖动旋转",
  "pt-BR": "ARRASTE PARA GIRAR",
  "ko": "드래그하여 회전",
  "ja": "ドラッグして回転"
};
const firing = { en: 'FIRING PATTERN', de: 'FEUERMUSTER', es: 'PATRÓN DE DISPARO', ru: 'СХЕМА СТРЕЛЬБЫ', 'zh-CN': '射击模式', 'pt-BR': 'PADRÃO DE DISPARO', ko: '사격 패턴', ja: '射撃パターン' };
const starter = {
 en: 'Three starter ships. Compare their firepower, then launch.',
 de: 'Drei Startschiffe. Vergleiche ihre Feuerkraft und starte.',
 es: 'Tres naves iniciales. Compara su potencia de fuego y despega.',
 ru: 'Три стартовых корабля. Сравните их огневую мощь и взлетайте.',
 'zh-CN': '三艘初始战机。比较火力，然后出击。',
 'pt-BR': 'Três naves iniciais. Compare o poder de fogo e decole.',
 ko: '시작 기체는 세 대입니다. 화력을 비교하고 출격하세요.',
 ja: '最初に選べる機体は3機。火力を比べて出撃しよう。'
};
const welcome = {
 en: 'Three starter ships await in the Hangar. Beat bosses and build your run.',
 de: 'Drei Startschiffe warten im Hangar. Besiege Bosse und entwickle deinen Build.',
 es: 'Te esperan tres naves iniciales en el hangar. Derrota jefes y mejora tu nave en cada partida.',
 ru: 'В ангаре ждут три стартовых корабля. Побеждайте боссов и усиливайте свой корабль.',
 'zh-CN': '机库中有三艘初始战机供你选择。击败首领，打造本局配置。',
 'pt-BR': 'Três naves iniciais esperam no hangar. Derrote chefes e aprimore sua nave a cada partida.',
 ko: '격납고에서 시작 기체 세 대를 골라 보세요. 보스를 격파하고 기체를 강화하세요.',
 ja: '格納庫で最初の3機から選ぼう。ボスを倒して自分だけの機体構成を作ろう。'
};
const hazardAdvice = {
 en: 'Move out of the marked area before it fires.',
 de: 'Verlasse den markierten Bereich, bevor der Angriff ausgelöst wird.',
 es: 'Sal de la zona marcada antes de que se active el ataque.',
 ru: 'Покиньте отмеченную область до срабатывания атаки.',
 'zh-CN': '在攻击发动前离开标记区域。',
 'pt-BR': 'Saia da área marcada antes que o ataque seja disparado.',
 ko: '공격이 발동하기 전에 표시된 구역을 벗어나세요.',
 ja: '攻撃が発動する前に、マークされた範囲から離れよう。'
};
export const getAstraPresentationSourceText = locale => ({ 'DRAG TO ROTATE': labels[locale] || labels.en, 'FIRING PATTERN': firing[locale] || firing.en, 'Three starter ships. Compare their firepower, then launch.': starter[locale] || starter.en, 'Three starter ships await in the Hangar. Beat bosses and build your run.': welcome[locale] || welcome.en, 'Move out of the marked area before it fires.': hazardAdvice[locale] || hazardAdvice.en });
