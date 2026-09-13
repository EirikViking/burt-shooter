// Source copy and authored translations. Numeric payout rules match BonusCoreRewards.
const COPY = {
 en: [
  ['Treasure','A sealed Cabinet vault, still carrying the wages of a vanished salvage fleet. Its lock recognizes a living pilot.','Collect for 600 points.'],
  ['Pursuit','Courier engines keep this fleeing capsule ahead of scavengers. Its delivery bounty drains while it travels.','Catch quickly: 1,000 points at arrival, falling to 200 after 12 seconds.'],
  ['Daredevil','An outlaw recorder pays for close encounters with the Swarm. Its bright optics are always watching.','250 points, plus 250 for each nearby enemy, up to 1,000.'],
  ['Survivor','A black box carries the names of pilots who came home. It rewards another journey without a lost life.','250 points, plus 100 per wave cleared since losing a life, up to 1,050.'],
  ['Hunter','The bounty office lost contact with this sector. Its autonomous ledger still honors confirmed kills.','200 points, plus 25 per enemy destroyed in this wave, up to 950.'],
  ['Collector','Salvage guilds reward reliable hands. Every core recovered without missing one raises this payout.','200 points, plus 100 per consecutive core already collected, up to 1,000. Missing a core resets the chain.'],
  ['Constellation','Three fragments preserve the coordinates of a star erased from every chart. Bring its scattered light together.','Collect fragments I, II and III during one run. Each pays 200; the final different fragment pays 1,800.'],
  ['Jackpot','A derelict arcade vault still runs its prize wheel. Its value pulses through a repeating six-beat sequence.','Time your pickup: the displayed prize cycles from 200 to a peak of 1,400 points.'],
  ['Archive','A sealed memory capsule contains testimony the Cabinet tried to bury. Recover it before silence wins.','400 points and an undiscovered Cabinet Log. When all logs are known, it still pays 400 points.'],
  ['Relic','Gold from the first rescue fleet survives in these ceremonial cores. Three pieces restore its honor markings.','400 points. Collect three across runs to unlock gold hull detailing, applied automatically. Further relics still pay points.']
 ],
 de: [
  ['Schatz','Ein versiegelter Cabinet-Tresor enthält den Sold einer verschwundenen Bergungsflotte. Sein Schloss erkennt lebende Piloten.','Einsammeln bringt 600 Punkte.'],
  ['Verfolgung','Kuriertriebwerke halten diese fliehende Kapsel vor Plünderern. Ihr Lieferlohn sinkt unterwegs.','Schnell zugreifen: anfangs 1.000 Punkte, nach 12 Sekunden noch 200.'],
  ['Draufgänger','Ein illegaler Rekorder bezahlt für Nahbegegnungen mit dem Schwarm. Seine hellen Linsen beobachten alles.','250 Punkte plus 250 je Gegner in der Nähe, höchstens 1.000.'],
  ['Überlebender','Ein Flugschreiber bewahrt die Namen heimgekehrter Piloten. Er belohnt weitere Reisen ohne verlorenes Leben.','250 Punkte plus 100 je abgeschlossener Welle seit dem letzten Lebensverlust, höchstens 1.050.'],
  ['Jäger','Das Kopfgeldbüro verlor den Kontakt zu diesem Sektor. Sein automatisches Register bezahlt weiterhin bestätigte Abschüsse.','200 Punkte plus 25 je zerstörtem Gegner dieser Welle, höchstens 950.'],
  ['Sammler','Bergungsgilden belohnen verlässliche Hände. Jeder lückenlos geborgene Kern erhöht diese Auszahlung.','200 Punkte plus 100 je zuvor in Folge gesammeltem Kern, höchstens 1.000. Ein verpasster Kern setzt die Serie zurück.'],
  ['Sternbild','Drei Fragmente bewahren die Koordinaten eines aus allen Karten gelöschten Sterns. Vereine sein verstreutes Licht.','Sammle Fragmente I, II und III in einem Lauf. Jedes bringt 200; das letzte unterschiedliche Fragment bringt 1.800 Punkte.'],
  ['Jackpot','Ein verlassener Spielhallentresor dreht noch sein Preisrad. Sein Wert pulsiert in sechs wiederkehrenden Takten.','Passe den Moment ab: Der angezeigte Preis wechselt zwischen 200 und maximal 1.400 Punkten.'],
  ['Archiv','Eine versiegelte Gedächtniskapsel birgt Aussagen, die Cabinet verbergen wollte. Berge sie vor dem Schweigen.','400 Punkte und ein unbekanntes Cabinet-Protokoll. Sind alle bekannt, bleiben 400 Punkte.'],
  ['Relikt','Gold der ersten Rettungsflotte überdauerte in zeremoniellen Kernen. Drei Stücke stellen ihre Ehrenmarkierungen wieder her.','400 Punkte. Drei Relikte über mehrere Läufe schalten automatisch goldene Rumpfdetails frei. Weitere bringen weiterhin Punkte.']
 ],
 es: [
  ['Tesoro','Una cámara sellada de Cabinet conserva el sueldo de una flota de rescate desaparecida. Su cierre reconoce a un piloto vivo.','Recógelo para ganar 600 puntos.'],
  ['Persecución','Los motores de mensajería mantienen esta cápsula lejos de los saqueadores. Su recompensa disminuye durante el viaje.','Atrápala pronto: 1.000 puntos al llegar, que bajan a 200 tras 12 segundos.'],
  ['Temerario','Una grabadora clandestina paga por encuentros cercanos con el Enjambre. Sus brillantes lentes siempre vigilan.','250 puntos, más 250 por cada enemigo cercano, hasta 1.000.'],
  ['Superviviente','Una caja negra conserva nombres de pilotos que regresaron. Premia otro viaje sin perder una vida.','250 puntos, más 100 por oleada superada desde la última vida perdida, hasta 1.050.'],
  ['Cazador','La oficina de recompensas perdió contacto con este sector. Su registro automático aún paga las bajas confirmadas.','200 puntos, más 25 por enemigo destruido en esta oleada, hasta 950.'],
  ['Coleccionista','Los gremios de rescate premian la constancia. Cada núcleo recuperado sin dejar escapar otro aumenta el pago.','200 puntos, más 100 por núcleo ya recogido consecutivamente, hasta 1.000. Perder uno reinicia la cadena.'],
  ['Constelación','Tres fragmentos guardan las coordenadas de una estrella borrada de todos los mapas. Reúne su luz dispersa.','Recoge los fragmentos I, II y III en una partida. Cada uno da 200; el último diferente da 1.800 puntos.'],
  ['Bote','Una cámara recreativa abandonada sigue girando su ruleta. Su valor pulsa en una secuencia de seis pasos.','Elige el momento: el premio visible oscila entre 200 y un máximo de 1.400 puntos.'],
  ['Archivo','Una cápsula de memoria sellada contiene testimonios que Cabinet intentó enterrar. Recupérala antes de que venza el silencio.','400 puntos y un registro de Cabinet sin descubrir. Si ya conoces todos, sigue dando 400 puntos.'],
  ['Reliquia','El oro de la primera flota de rescate perdura en estos núcleos ceremoniales. Tres piezas restauran sus marcas de honor.','400 puntos. Recoge tres entre partidas para activar automáticamente detalles dorados del casco. Las siguientes siguen dando puntos.']
 ],
 ru: [
  ['Сокровище','Запечатанное хранилище Cabinet хранит жалованье пропавшего спасательного флота. Замок узнаёт живого пилота.','Подберите ядро и получите 600 очков.'],
  ['Погоня','Курьерские двигатели уносят капсулу от мародёров. Награда за доставку тает в пути.','Ловите быстрее: 1 000 очков при появлении, затем снижение до 200 за 12 секунд.'],
  ['Сорвиголова','Нелегальный регистратор платит за близкие встречи с Роем. Его яркие линзы следят за всем.','250 очков и ещё 250 за каждого врага рядом, максимум 1 000.'],
  ['Выживший','Чёрный ящик хранит имена вернувшихся пилотов. Он вознаграждает новый путь без потери жизни.','250 очков и ещё 100 за каждую пройденную волну после последней потери жизни, максимум 1 050.'],
  ['Охотник','Бюро наград потеряло связь с сектором. Автоматический реестр всё ещё оплачивает подтверждённые победы.','200 очков и ещё 25 за каждого уничтоженного врага текущей волны, максимум 950.'],
  ['Собиратель','Гильдии спасателей ценят надёжность. Каждое ядро, собранное без пропусков, повышает выплату.','200 очков и ещё 100 за каждое ранее собранное подряд ядро, максимум 1 000. Пропущенное ядро обнуляет цепочку.'],
  ['Созвездие','Три фрагмента хранят координаты звезды, стёртой со всех карт. Соберите её рассеянный свет.','Соберите фрагменты I, II и III за один заход. Каждый даёт 200; последний отличающийся — 1 800 очков.'],
  ['Джекпот','Заброшенное игровое хранилище всё ещё вращает колесо призов. Его цена пульсирует в цикле из шести шагов.','Выберите момент: показанная награда меняется от 200 до максимальных 1 400 очков.'],
  ['Архив','Запечатанная капсула памяти хранит показания, которые Cabinet пытался скрыть. Спасите их от забвения.','400 очков и неизвестная запись Cabinet. Если все записи открыты, ядро всё равно даёт 400 очков.'],
  ['Реликвия','Золото первого спасательного флота сохранилось в церемониальных ядрах. Три части восстанавливают почётные знаки.','400 очков. Три ядра за разные заходы автоматически открывают золотую отделку корпуса. Последующие также дают очки.']
 ],
 'zh-CN': [
  ['宝藏','密封的 Cabinet 金库保存着失踪打捞舰队的薪饷。它的锁能识别活着的飞行员。','拾取获得600分。'],
  ['追逐','快递引擎让逃逸舱远离掠夺者。运输赏金随航行时间不断减少。','尽快追上：出现时值1,000分，12秒后降至200分。'],
  ['无畏','非法记录仪为近距离接触虫群付费。明亮的镜头始终注视战场。','基础250分，每个附近敌人再加250分，最高1,000分。'],
  ['幸存者','黑匣子记录着平安归来的飞行员姓名。它奖励未损失生命的连续航程。','基础250分，自上次失去生命后每完成一波再加100分，最高1,050分。'],
  ['猎手','赏金部门与本星区失去了联系。自动账簿仍会支付已确认的击杀。','基础200分，本波每消灭一个敌人再加25分，最高950分。'],
  ['收藏家','打捞公会欣赏可靠的伙伴。连续回收核心且不遗漏，就能提高报酬。','基础200分，每个此前连续收集的核心再加100分，最高1,000分。漏掉核心会重置连收。'],
  ['星座','三个碎片保存着一颗被所有星图抹去的恒星坐标。重新聚拢它散落的光。','单次航程收集碎片I、II和III。每片200分；最后一片不同的碎片获得1,800分。'],
  ['大奖','废弃街机金库的奖盘仍在转动。价值按六拍循环闪动。','把握拾取时机：显示的奖金在200至最高1,400分之间循环。'],
  ['档案','密封记忆舱装着 Cabinet 试图掩埋的证词。赶在寂静吞没它之前回收。','400分和一篇未发现的 Cabinet 日志。全部日志已解锁后仍可获得400分。'],
  ['遗物','第一救援舰队的黄金保存在礼仪核心中。三件就能重现其荣誉标记。','400分。跨航程累计三件，自动解锁金色舰体装饰。之后拾取仍会得分。']
 ],
 'pt-BR': [
  ['Tesouro','Um cofre selado do Cabinet guarda o salário de uma frota de resgate desaparecida. A fechadura reconhece um piloto vivo.','Colete para ganhar 600 pontos.'],
  ['Perseguição','Motores de correio mantêm esta cápsula longe dos saqueadores. A recompensa pela entrega diminui durante a viagem.','Pegue rápido: 1.000 pontos na chegada, caindo para 200 após 12 segundos.'],
  ['Audácia','Um gravador clandestino paga por encontros próximos com o Enxame. Suas lentes brilhantes observam tudo.','250 pontos, mais 250 por inimigo próximo, até 1.000.'],
  ['Sobrevivente','Uma caixa-preta guarda nomes de pilotos que voltaram. Ela recompensa outra jornada sem perder uma vida.','250 pontos, mais 100 por onda concluída desde a última vida perdida, até 1.050.'],
  ['Caçador','O escritório de recompensas perdeu contato com este setor. Seu registro automático ainda paga abates confirmados.','200 pontos, mais 25 por inimigo destruído nesta onda, até 950.'],
  ['Colecionador','Guildas de resgate valorizam mãos confiáveis. Cada núcleo recuperado sem deixar outro escapar aumenta o pagamento.','200 pontos, mais 100 por núcleo já coletado consecutivamente, até 1.000. Perder um reinicia a sequência.'],
  ['Constelação','Três fragmentos guardam as coordenadas de uma estrela apagada de todos os mapas. Reúna sua luz espalhada.','Colete fragmentos I, II e III na mesma partida. Cada um vale 200; o último diferente vale 1.800 pontos.'],
  ['Prêmio máximo','Um cofre de fliperama abandonado ainda gira sua roleta. Seu valor pulsa em uma sequência de seis passos.','Escolha o momento: o prêmio exibido varia de 200 até o pico de 1.400 pontos.'],
  ['Arquivo','Uma cápsula de memória selada guarda depoimentos que o Cabinet tentou enterrar. Resgate-a antes que o silêncio vença.','400 pontos e um registro do Cabinet ainda desconhecido. Se todos forem conhecidos, continua valendo 400 pontos.'],
  ['Relíquia','O ouro da primeira frota de resgate sobrevive nestes núcleos cerimoniais. Três peças restauram suas marcas de honra.','400 pontos. Colete três entre partidas para ativar automaticamente detalhes dourados no casco. As seguintes ainda dão pontos.']
 ],
 ko: [
  ['보물','봉인된 Cabinet 금고에는 실종된 구조 함대의 급료가 남아 있습니다. 잠금장치는 살아 있는 조종사를 알아봅니다.','획득하면 600점을 받습니다.'],
  ['추격','급송 엔진이 도망치는 캡슐을 약탈자에게서 지킵니다. 운송 보상은 이동 중에 줄어듭니다.','빨리 잡으세요. 등장 시 1,000점이며 12초 후 200점까지 감소합니다.'],
  ['무모한 용기','불법 기록기는 군단과의 근접 조우에 보상을 지급합니다. 밝은 렌즈가 항상 지켜봅니다.','기본 250점에 근처 적 하나당 250점 추가, 최대 1,000점입니다.'],
  ['생존자','블랙박스에는 귀환한 조종사들의 이름이 남아 있습니다. 목숨을 잃지 않은 여정을 보상합니다.','기본 250점에 마지막 목숨 손실 이후 완료한 웨이브당 100점 추가, 최대 1,050점입니다.'],
  ['사냥꾼','현상금 사무소는 이 구역과 연락이 끊겼습니다. 자동 장부는 아직 확인된 격추에 보상을 지급합니다.','기본 200점에 이번 웨이브에서 파괴한 적 하나당 25점 추가, 최대 950점입니다.'],
  ['수집가','구조 길드는 믿음직한 손길을 높이 삽니다. 코어를 놓치지 않고 회수할 때마다 보상이 늘어납니다.','기본 200점에 앞서 연속 획득한 코어당 100점 추가, 최대 1,000점입니다. 놓치면 연속 획득이 초기화됩니다.'],
  ['별자리','세 조각에는 모든 지도에서 지워진 별의 좌표가 남아 있습니다. 흩어진 빛을 모으세요.','한 출격에서 조각 I, II, III을 모으세요. 각각 200점이며 마지막 다른 조각은 1,800점입니다.'],
  ['대박','버려진 오락실 금고의 상품 바퀴는 아직 돌아갑니다. 가치는 여섯 박자로 반복됩니다.','획득 시점을 맞추세요. 표시된 보상이 200점부터 최고 1,400점까지 순환합니다.'],
  ['기록 보관소','봉인된 기억 캡슐에는 Cabinet이 묻으려 한 증언이 담겨 있습니다. 침묵에 잠기기 전에 회수하세요.','400점과 미발견 Cabinet 기록을 얻습니다. 모든 기록을 알아도 400점을 받습니다.'],
  ['유물','최초 구조 함대의 황금이 의식용 코어에 남아 있습니다. 세 조각으로 명예 표식을 복원할 수 있습니다.','400점을 받습니다. 여러 출격에 걸쳐 세 개를 모으면 황금 선체 장식이 자동으로 적용됩니다. 이후에도 점수를 받습니다.']
 ],
 ja: [
  ['財宝','封印された Cabinet の金庫には、消息を絶った救助艦隊の給料が残っている。錠前は生きた操縦士を認識する。','回収すると600点獲得。'],
  ['追跡','速達エンジンが逃走カプセルを略奪者から守る。配達報酬は移動中に減り続ける。','素早く捕まえよう。出現時は1,000点、12秒後には200点まで減少。'],
  ['命知らず','非合法の記録装置は群れとの接近遭遇に報酬を払う。明るいレンズは常に見張っている。','基本250点。近くの敵1体につき250点追加、最大1,000点。'],
  ['生還者','ブラックボックスには帰還した操縦士の名前が残る。命を失わない新たな旅に報酬を与える。','基本250点。最後に残機を失ってから突破したウェーブごとに100点追加、最大1,050点。'],
  ['狩人','懸賞金事務所はこの宙域との通信を失った。自動台帳は今も確認済みの撃破に報酬を払う。','基本200点。このウェーブで倒した敵1体につき25点追加、最大950点。'],
  ['収集家','救助組合は確かな腕を評価する。コアを逃さず回収するたびに報酬が増える。','基本200点。それまで連続回収したコア1個につき100点追加、最大1,000点。逃すと連続回収がリセット。'],
  ['星座','三つの欠片は、あらゆる星図から消された星の座標を守っている。散らばった光を集めよう。','1回の出撃で欠片I・II・IIIを回収。各200点、最後の異なる欠片は1,800点。'],
  ['大当たり','放棄された遊戯場の金庫は、今も賞金盤を回している。価値は六拍子で循環する。','回収の瞬間を狙おう。表示された賞金は200点から最高1,400点まで循環する。'],
  ['記録庫','封印された記憶カプセルには、Cabinet が葬ろうとした証言が残る。沈黙に飲まれる前に回収しよう。','400点と未発見の Cabinet 記録を獲得。全記録を発見済みでも400点獲得。'],
  ['遺物','最初の救助艦隊の黄金が儀礼用コアに残っている。三つ集めると名誉の紋様を復元できる。','400点獲得。出撃をまたいで三つ集めると金色の船体装飾が自動適用される。その後も得点を獲得。']
 ]
};
const UI = {
 en: ['Bonus Cores','{name} · +{score}','{name} · {fragment} · +{score}','Gold hull detailing unlocked','Relics: {count}/3','Archive recovered: {name}'],
 de: ['Bonuskerne','{name} · +{score}','{name} · {fragment} · +{score}','Goldene Rumpfdetails freigeschaltet','Relikte: {count}/3','Archiv geborgen: {name}'],
 es: ['Núcleos de bonificación','{name} · +{score}','{name} · {fragment} · +{score}','Detalles dorados del casco desbloqueados','Reliquias: {count}/3','Archivo recuperado: {name}'],
 ru: ['Бонусные ядра','{name} · +{score}','{name} · {fragment} · +{score}','Открыта золотая отделка корпуса','Реликвии: {count}/3','Архив получен: {name}'],
 'zh-CN': ['奖励核心','{name} · +{score}','{name} · {fragment} · +{score}','已解锁金色舰体装饰','遗物：{count}/3','已回收档案：{name}'],
 'pt-BR': ['Núcleos de bônus','{name} · +{score}','{name} · {fragment} · +{score}','Detalhes dourados do casco desbloqueados','Relíquias: {count}/3','Arquivo recuperado: {name}'],
 ko: ['보너스 코어','{name} · +{score}','{name} · {fragment} · +{score}','황금 선체 장식 해제','유물: {count}/3','기록 회수: {name}'],
 ja: ['ボーナスコア','{name} · +{score}','{name} · {fragment} · +{score}','金色の船体装飾を解放','遺物：{count}/3','記録回収：{name}']
};
const SCORE_NOTE = {
 en: 'Point values are base rewards; the run score rules apply. The pickup displays the current payout.',
 de: 'Punktwerte sind Grundbelohnungen; die Punkteregeln des Laufs gelten. Der Kern zeigt die aktuelle Auszahlung.',
 es: 'Los puntos son recompensas base; se aplican las reglas de la partida. El núcleo muestra el pago actual.',
 ru: 'Указаны базовые очки; действуют правила счёта текущего захода. На ядре показана текущая выплата.',
 'zh-CN': '所列为基础分数，实际按本次航程的计分规则结算。拾取物显示当前奖励。',
 'pt-BR': 'Os pontos são recompensas base; valem as regras de pontuação da partida. O núcleo mostra o pagamento atual.',
 ko: '점수는 기본 보상이며 출격 점수 규칙이 적용됩니다. 코어에 현재 보상이 표시됩니다.',
 ja: '点数は基本報酬で、出撃の得点ルールが適用されます。コアには現在の報酬が表示されます。'
};
export function getBonusCoreText(index, locale = 'en') {
 const [name, description, tip] = (COPY[locale] || COPY.en)[index];
 return { name, description, tip: tip + '\n' + (SCORE_NOTE[locale] || SCORE_NOTE.en) };
}
export function getBonusCoreSourceText(locale) {
 return {
  ...Object.fromEntries(UI.en.map((key,i)=>[key,(UI[locale] || UI.en)[i]])),
  'BONUS CORES': (UI[locale] || UI.en)[0].toUpperCase(),
  Rare: ({en:'Rare',de:'Selten',es:'Raro',ru:'Редкий','zh-CN':'稀有','pt-BR':'Raro',ko:'희귀',ja:'レア'})[locale] || 'Rare'
 };
}
