export const SONIA_BOSS_LORE = Object.freeze({
  en: Object.freeze({
    signalClass: 'Black-lattice command intelligence',
    description: `Sonia maps bad outcomes for the Swarm. She corrupts navigation beacons, moves through false lanes, and seals exits with violet crossfire attacks. Her three-line signature tell is a trap: the center beam is bait, then the outer lanes collapse.`,
    tip: 'Destroy the beacon drones, cross behind the first violet sweep, and punish Sonia before she redraws the lanes.'
  }),
  de: Object.freeze({
    signalClass: 'Kommandointelligenz des Schwarzgitters',
    description: `Sonia ist die Kartografin schlechter Ausgänge des Schwarms. Sie verfälscht Navigationsbaken, bewegt sich durch deren falsche Korridore und versiegelt die Ausgänge mit violettem Kreuzfeuer. Ihr dreifaches Signalmuster ist eine Falle: Der mittlere Strahl ist der Köder, dann brechen die äußeren Korridore zusammen.`,
    tip: 'Zerstöre die Bakendrohnen, kreuze hinter der ersten violetten Salve und greife Sonia an, bevor sie die Korridore neu zeichnet.'
  }),
  es: Object.freeze({
    signalClass: 'Inteligencia de mando de la red negra',
    description: `Sonia es la cartógrafa de los malos desenlaces del Enjambre. Corrompe las balizas de navegación, recorre sus carriles falsos y sella las salidas con fuego cruzado violeta. Su señal de tres líneas es una trampa: el rayo central es el cebo y después colapsan los carriles exteriores.`,
    tip: 'Destruye los drones baliza, cruza detrás del primer barrido violeta y castiga a Sonia antes de que redibuje los carriles.'
  }),
  ru: Object.freeze({
    signalClass: 'Командный интеллект чёрной решётки',
    description: `Соня — картограф плохих исходов Роя. Она искажает навигационные маяки, движется по их ложным коридорам и перекрывает выходы фиолетовым перекрёстным огнём. Сигнал из трёх линий — ловушка: центральный луч служит приманкой, затем крайние коридоры схлопываются.`,
    tip: 'Уничтожь дроны-маяки, пройди за первой фиолетовой волной и атакуй Соню, пока она не начертила коридоры заново.'
  }),
  'zh-CN': Object.freeze({
    signalClass: '黑晶格指挥智能',
    description: `索尼娅是虫群绘制败局的制图师。她会污染导航信标，沿信标投射的虚假航道移动，再用紫色交叉火力封锁出口。她的三线特征信号是陷阱：中央光束是诱饵，随后外侧航道会迅速合拢。信标无人机会持续修正伪造地图，让安全航道在你接近时变成火力走廊。`,
    tip: '摧毁信标无人机，从第一轮紫色横扫后方穿过，并在索尼娅重绘航道前反击。'
  }),
  'pt-BR': Object.freeze({
    signalClass: 'Inteligência de comando da malha negra',
    description: `Sonia é a cartógrafa dos piores desfechos do Enxame. Ela corrompe os sinalizadores de navegação, percorre suas rotas falsas e sela as saídas com fogo cruzado violeta. O sinal de três linhas é uma armadilha: o feixe central é a isca, e depois as rotas externas colapsam.`,
    tip: 'Destrua os drones sinalizadores, atravesse por trás da primeira varredura violeta e ataque Sonia antes que ela redesenhe as rotas.'
  }),
  ko: Object.freeze({
    signalClass: '흑색 격자 지휘 지능체',
    description: `소니아는 군집이 만들어 낼 최악의 결말을 그리는 지도 제작자다. 항법 비콘을 오염시키고, 그 비콘이 만든 가짜 항로를 따라 움직이며, 보라색 교차 사격으로 출구를 봉쇄한다. 세 줄의 신호는 함정이다. 중앙 광선은 미끼이고, 곧이어 바깥 항로가 닫힌다.`,
    tip: '비콘 드론을 파괴하고 첫 보라색 휩쓸기 뒤로 건너간 다음, 소니아가 항로를 다시 그리기 전에 공격하라.'
  }),
  ja: Object.freeze({
    signalClass: 'ブラック・ラティス指揮知性体',
    description: `ソニアは、スウォームが生み出す最悪の結末を描く地図製作者だ。航法ビーコンを汚染し、そこから投射される偽の航路を移動しながら、紫の十字砲火で出口を封鎖する。3本線のシグネチャーは罠だ。中央ビームは囮で、その直後に外側の航路が閉じる。`,
    tip: 'ビーコンドローンを破壊し、最初の紫の掃射の背後へ抜け、ソニアが航路を描き直す前に攻撃せよ。'
  })
});

export function getSoniaBossLore(locale = 'en') {
  return SONIA_BOSS_LORE[locale] || SONIA_BOSS_LORE.en;
}
