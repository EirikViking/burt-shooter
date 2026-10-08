export const ORBIT_BREAKER_TEXT=[
 'ORBIT BREAKER','ORBIT','a heavy orbiting hammer that damages enemies and breaks nearby shots',
 'a close-range wrecking tool','you can sweep past a formation without touching its hull',
 'Steer the hammer through targets. Its orbit is not a full shield; armour and locked parts still apply.',
 'ORBIT BREAKER! Make room!'
];
const rows={
 en:ORBIT_BREAKER_TEXT,
 de:['ORBITBRECHER','ORBIT','einen schweren kreisenden Hammer, der Gegner beschädigt und nahe Geschosse zerschlägt','ein Zerstörungswerkzeug für den Nahkampf','du an einer Formation vorbeiziehen kannst, ohne ihre Schiffe zu berühren','Lenke den Hammer durch Ziele. Seine Umlaufbahn ist kein vollständiger Schild; Panzerung und gesperrte Teile gelten weiterhin.','ORBITBRECHER! Platz da!'],
 es:['ROMPEÓRBITAS','ÓRBITA','un martillo pesado que orbita, daña enemigos y destruye disparos cercanos','una herramienta de demolición a corta distancia','puedes pasar junto a una formación sin tocar sus naves','Dirige el martillo hacia los objetivos. Su órbita no es un escudo completo; el blindaje y las piezas bloqueadas siguen protegiendo.','¡ROMPEÓRBITAS! ¡Abran paso!'],
 ru:['ОРБИТАЛЬНЫЙ МОЛОТ','ОРБИТА','тяжёлый вращающийся молот, который повреждает врагов и разбивает близкие снаряды','инструмент разрушения для ближнего боя','можно пройти рядом со строем, не касаясь кораблей','Проводите молот через цели. Его орбита не даёт полной защиты; броня и закрытые детали сохраняют свои свойства.','ОРБИТАЛЬНЫЙ МОЛОТ! Расступитесь!'],
 'zh-CN':['轨道重锤','重锤','环绕飞船的重锤，伤害敌人并击碎附近的弹丸','近距离破坏工具','能从敌方阵形旁掠过而不碰撞船体','操纵重锤扫过目标。它的轨道并非完整护盾；装甲和锁定部件仍然有效。','轨道重锤！让开！'],
 'pt-BR':['MARTELO ORBITAL','ÓRBITA','um martelo pesado em órbita que danifica inimigos e destrói disparos próximos','uma ferramenta de demolição de curto alcance','você pode passar junto a uma formação sem tocar nas naves','Conduza o martelo pelos alvos. A órbita não é um escudo completo; blindagem e peças bloqueadas continuam valendo.','MARTELO ORBITAL! Abram espaço!'],
 ko:['궤도 파쇄기','궤도','함선 주위를 도는 무거운 망치로 적을 공격하고 가까운 탄환을 부숩니다','근거리 파괴 도구','적 함선에 부딪히지 않고 편대 옆을 지나갈 수 있을 때','망치가 표적을 지나가도록 조종하세요. 궤도는 완전한 방패가 아니며 장갑과 잠긴 부품의 규칙은 유지됩니다.','궤도 파쇄기! 길을 비켜라!'],
 ja:['オービットブレイカー','軌道','機体の周囲を回る重いハンマーで敵を攻撃し、近くの弾を砕く','近距離の破壊工具','敵編隊の船体に触れずに横を通れるとき','ハンマーが標的を通るように操縦しよう。軌道は完全な盾ではなく、装甲とロックされた部品のルールは維持される。','オービットブレイカー！道を開けろ！']
};
const durations={en:'12 second',de:'12 Sekunden',es:'12 segundos',ru:'12 секунд','zh-CN':'12秒','pt-BR':'12 segundos',ko:'12초',ja:'12秒'};
export function getOrbitBreakerSourceText(locale){return {...Object.fromEntries(ORBIT_BREAKER_TEXT.map((text,i)=>[text,(rows[locale]||rows.en)[i]])),'12 second':durations[locale]||durations.en};}
