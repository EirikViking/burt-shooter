import { FIRST_LIGHT_EXPANSION_TEXT } from './firstLightExpansionText.js';
import { getEncounterEvolutionSourceText } from './encounterEvolutionText.js';
import { getEncounterExpansionSourceText } from './encounterExpansionText.js';
import {getConvoySurpriseSourceText} from './convoySurpriseText.js';
import {getReactorTowSourceText} from './reactorTowText.js';
import {getCounterweightSourceText} from './counterweightText.js';
import {getPlanetfallSourceText} from './planetfallText.js';
// English source strings and complete encounter translations.
const TEXT = {
  "en": {
    "encounters": "ENCOUNTERS",
    "convoyTitle": "CONVOY BREAKOUT",
    "convoyHint": "Shoot the locks to free the fighters",
    "escort": "ESCORT WING · {seconds}s",
    "rivalTitle": "RIVAL STRIKE",
    "rivalHint": "Break both weapons to expose the core",
    "core": "CORE EXPOSED",
    "victory": "RIVAL DOWN · BONUS DRONE RELEASED",
    "rescue": "FIGHTER FREED",
    "helpTitle": "Rescue flights and rival raiders",
    "helpConvoy": "Shoot the two glowing locks on prison transports. Freed fighters join your wing for up to ten seconds and fire when you fire. Missing a rescue never blocks the sector.",
    "helpRival": "Destroy both side weapons on a rival raider to expose its core. Each broken weapon stops its attack. Destroy the core to release a bonus drone. Shoot it for score; its value rises in later sectors. These encounters return in suitable sectors.",
    "helpContext": "Introduced in Arcade sectors 1 and 2. These encounters return in suitable later sectors of Arcade, Onslaught, Sector Start and Scout when ordinary waves permit. Daily Signal keeps its existing rules."
  },
  "de": {
    "encounters": "BEGEGNUNGEN",
    "convoyTitle": "KONVOI-AUSBRUCH",
    "convoyHint": "Zerschieße die Verriegelungen und befreie die Jäger",
    "escort": "BEGLEITSTAFFEL · {seconds}s",
    "rivalTitle": "RIVALENANGRIFF",
    "rivalHint": "Zerstöre beide Waffen, um den Kern freizulegen",
    "core": "KERN FREIGELEGT",
    "victory": "RIVALE BESIEGT · BONUSDROHNE FREIGEGEBEN",
    "rescue": "JÄGER BEFREIT",
    "helpTitle": "Rettungsflüge und rivalisierende Angreifer",
    "helpConvoy": "Zerschieße die beiden leuchtenden Verriegelungen der Gefangenentransporter. Befreite Jäger begleiten dich bis zu zehn Sekunden lang und feuern, wenn du feuerst. Eine verpasste Rettung blockiert den Sektor nie.",
    "helpRival": "Zerstöre beide Seitenwaffen eines rivalisierenden Angreifers, um seinen Kern freizulegen. Jede zerstörte Waffe stellt ihr Feuer ein. Zerstöre den Kern, damit eine Bonusdrohne erscheint. Schieße sie für Punkte ab; in späteren Sektoren ist sie mehr wert. Diese Begegnungen kehren in passenden Sektoren wieder.",
    "helpContext": "Die Einführung erfolgt in den Arcade-Sektoren 1 und 2. In Arcade, Onslaught, Sector Start und Scout kehren diese Begegnungen in passenden späteren Sektoren wieder, wenn normale Wellen es zulassen. Für Daily Signal gelten weiterhin die bisherigen Regeln."
  },
  "es": {
    "encounters": "ENCUENTROS",
    "convoyTitle": "FUGA DEL CONVOY",
    "convoyHint": "Dispara a los cierres para liberar a los cazas",
    "escort": "ALA DE ESCOLTA · {seconds}s",
    "rivalTitle": "ATAQUE RIVAL",
    "rivalHint": "Destruye ambas armas para exponer el núcleo",
    "core": "NÚCLEO EXPUESTO",
    "victory": "RIVAL DERRIBADO · DRON DE BONIFICACIÓN LIBERADO",
    "rescue": "CAZA LIBERADO",
    "helpTitle": "Vuelos de rescate e incursores rivales",
    "helpConvoy": "Dispara a los dos cierres luminosos de los transportes de prisioneros. Los cazas liberados se unen a tu escuadrilla durante un máximo de diez segundos y disparan cuando tú disparas. Perder un rescate nunca bloquea el sector.",
    "helpRival": "Destruye las dos armas laterales de un incursor rival para exponer su núcleo. Cada arma destruida deja de atacar. Destruye el núcleo para liberar un dron de bonificación. Dispárale para ganar puntos; su valor aumenta en sectores posteriores. Estos encuentros vuelven a aparecer en sectores adecuados.",
    "helpContext": "Se presentan en los sectores 1 y 2 de Arcade. Estos encuentros regresan en sectores posteriores adecuados de Arcade, Onslaught, Sector Start y Scout cuando las oleadas normales lo permiten. Daily Signal conserva sus reglas actuales."
  },
  "ru": {
    "encounters": "ВСТРЕЧИ",
    "convoyTitle": "ПОБЕГ ИЗ КОНВОЯ",
    "convoyHint": "Расстреляйте замки, чтобы освободить истребители",
    "escort": "ЗВЕНО ЭСКОРТА · {seconds} с",
    "rivalTitle": "УДАР СОПЕРНИКА",
    "rivalHint": "Уничтожьте оба орудия, чтобы открыть ядро",
    "core": "ЯДРО ОТКРЫТО",
    "victory": "СОПЕРНИК СБИТ · БОНУСНЫЙ ДРОН ВЫПУЩЕН",
    "rescue": "ИСТРЕБИТЕЛЬ ОСВОБОЖДЁН",
    "helpTitle": "Спасательные вылеты и рейдеры-соперники",
    "helpConvoy": "Стреляйте в два светящихся замка на тюремных транспортах. Освобождённые истребители присоединяются к вашему звену не более чем на десять секунд и стреляют вместе с вами. Пропущенное спасение никогда не мешает завершить сектор.",
    "helpRival": "Уничтожьте оба боковых орудия рейдера-соперника, чтобы открыть его ядро. Каждое уничтоженное орудие прекращает огонь. Уничтожьте ядро, чтобы выпустить бонусный дрон. Сбейте его ради очков: в поздних секторах он ценнее. Такие встречи повторяются в подходящих секторах.",
    "helpContext": "Первое знакомство происходит в секторах 1 и 2 режима Arcade. Такие встречи повторяются в подходящих последующих секторах Arcade, Onslaught, Sector Start и Scout, когда это позволяют обычные волны. Правила Daily Signal остаются прежними."
  },
  "zh-CN": {
    "encounters": "遭遇",
    "convoyTitle": "突破押运",
    "convoyHint": "射击锁扣，解救战机",
    "escort": "护航编队 · {seconds}秒",
    "rivalTitle": "劲敌来袭",
    "rivalHint": "摧毁两侧武器，使核心暴露",
    "core": "核心已暴露",
    "victory": "劲敌击落 · 奖励无人机已出现",
    "rescue": "战机获救",
    "helpTitle": "救援战机与劲敌袭击者",
    "helpConvoy": "射击囚犯运输舰上的两个发光锁扣。获救战机会加入你的编队，最多持续十秒，并在你开火时一同射击。错过救援不会阻碍星区通关。",
    "helpRival": "摧毁劲敌袭击者两侧的武器，使其核心暴露。每摧毁一件武器，就能停止该武器的攻击。摧毁核心后会出现奖励无人机。击落它即可得分，后期星区的奖励更高。这类遭遇会在合适的星区再次出现。",
    "helpContext": "首次出现在Arcade的第1和第2星区。此后，这类遭遇会在Arcade、Onslaught、Sector Start和Scout的合适星区中，于普通波次条件允许时再次出现。Daily Signal保留现有规则。"
  },
  "pt-BR": {
    "encounters": "ENCONTROS",
    "convoyTitle": "FUGA DO COMBOIO",
    "convoyHint": "Atire nas travas para libertar os caças",
    "escort": "ALA DE ESCOLTA · {seconds}s",
    "rivalTitle": "ATAQUE RIVAL",
    "rivalHint": "Destrua as duas armas para expor o núcleo",
    "core": "NÚCLEO EXPOSTO",
    "victory": "RIVAL ABATIDO · DRONE DE BÔNUS LIBERADO",
    "rescue": "CAÇA LIBERTADO",
    "helpTitle": "Voos de resgate e invasores rivais",
    "helpConvoy": "Atire nas duas travas brilhantes dos transportes de prisioneiros. Os caças libertados se juntam à sua formação por até dez segundos e disparam quando você dispara. Perder um resgate nunca impede a conclusão do setor.",
    "helpRival": "Destrua as duas armas laterais de um invasor rival para expor seu núcleo. Cada arma destruída para de atacar. Destrua o núcleo para liberar um drone de bônus. Atire nele para ganhar pontos; o valor aumenta nos setores posteriores. Esses encontros voltam a aparecer em setores adequados.",
    "helpContext": "Apresentados nos setores 1 e 2 do Arcade. Esses encontros retornam em setores posteriores adequados de Arcade, Onslaught, Sector Start e Scout quando as ondas normais permitem. Daily Signal mantém suas regras atuais."
  },
  "ko": {
    "encounters": "조우",
    "convoyTitle": "수송대 탈출",
    "convoyHint": "잠금장치를 쏴서 전투기를 구출하세요",
    "escort": "호위 편대 · {seconds}초",
    "rivalTitle": "라이벌 습격",
    "rivalHint": "양쪽 무기를 파괴해 코어를 노출시키세요",
    "core": "코어 노출",
    "victory": "라이벌 격추 · 보너스 드론 출현",
    "rescue": "전투기 구출",
    "helpTitle": "전투기 구출과 라이벌 습격기",
    "helpConvoy": "포로 수송선의 빛나는 잠금장치 두 개를 쏘세요. 구출한 전투기는 최대 10초 동안 편대에 합류해 플레이어가 발사할 때 함께 사격합니다. 구출을 놓쳐도 구역 진행이 막히지 않습니다.",
    "helpRival": "라이벌 습격기의 양쪽 무기를 파괴하면 코어가 노출됩니다. 무기를 하나씩 파괴할 때마다 해당 무기의 공격이 멈춥니다. 코어를 파괴하면 보너스 드론이 나옵니다. 드론을 쏴 점수를 얻으세요. 후반 섹터일수록 가치가 높습니다. 이런 조우는 적합한 구역에서 다시 등장합니다.",
    "helpContext": "Arcade의 1구역과 2구역에서 처음 등장합니다. 이후에는 Arcade, Onslaught, Sector Start, Scout의 적합한 구역에서 일반 웨이브 상황이 허용할 때 다시 등장합니다. Daily Signal은 기존 규칙을 유지합니다."
  },
  "ja": {
    "encounters": "遭遇",
    "convoyTitle": "輸送隊からの脱出",
    "convoyHint": "ロックを撃って戦闘機を救出",
    "escort": "護衛編隊 · {seconds}秒",
    "rivalTitle": "ライバル襲来",
    "rivalHint": "両側の武装を破壊してコアを露出させよう",
    "core": "コア露出",
    "victory": "ライバル撃墜 · ボーナスドローン出現",
    "rescue": "戦闘機を救出",
    "helpTitle": "戦闘機の救出とライバル襲撃機",
    "helpConvoy": "囚人輸送船にある2つの光るロックを撃ちましょう。救出した戦闘機は最大10秒間編隊に加わり、プレイヤーの射撃に合わせて攻撃します。救出を逃してもセクターの進行は妨げられません。",
    "helpRival": "ライバル襲撃機の両側の武装を破壊すると、コアが露出します。武装を1つ破壊するたびに、その武装による攻撃が止まります。コアを破壊するとボーナスドローンが出現します。撃つと得点になり、後のセクターほど高得点です。この遭遇は適したセクターで再び発生します。",
    "helpContext": "Arcadeのセクター1と2で初登場します。その後はArcade、Onslaught、Sector Start、Scoutの適したセクターで、通常ウェーブの状況が許すときに再び出現します。Daily Signalは従来のルールを維持します。"
  }
};
for (const [key, translations] of Object.entries(FIRST_LIGHT_EXPANSION_TEXT)) {
  for (const [locale, value] of Object.entries(translations)) TEXT[locale][key] = value;
}
export const FIRST_LIGHT_ENGLISH = Object.freeze(TEXT.en);
export function getFirstLightText(locale, key) { return (TEXT[locale] || TEXT.en)[key]; }
export function getFirstLightSourceText(locale) {
  const translated = TEXT[locale] || TEXT.en;
  return {...Object.fromEntries(Object.keys(TEXT.en).map(key => [TEXT.en[key], translated[key]])),...getEncounterEvolutionSourceText(locale),...getEncounterExpansionSourceText(locale),...getConvoySurpriseSourceText(locale),...getReactorTowSourceText(locale),...getCounterweightSourceText(locale),...getPlanetfallSourceText(locale)};
}
