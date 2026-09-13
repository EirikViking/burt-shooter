import { CODEX_LORE_VERSION } from './codexLore.js';
import { TRACTOR_DETAILS, TRACTOR_INTERRUPT_TIP } from './tractorFleetDetails.js';
// Ship names are intentional proper names. Descriptions and counterplay are localized.
export const TRACTOR_CODEX_TEXT = {
 en:[
 ['A precision capture interceptor built around a deep magnetic accelerator. Its narrow cyan tether applies a strong, steady pull toward the ship.','Leave the marked corridor sideways. A hit on the ship interrupts the beam.'],
 ['A broad field-sculpting vessel whose curved induction wings roll a mint-colored current across the battlefield. Its pull corridor sweeps from side to side.','Move across the sweep early; do not follow the beam along its length.'],
 ['An industrial gravity tug with a reinforced hammerhead bow. Its orange field delivers three powerful pulls separated by release windows.','Cross while the field is dark, then clear its path before the next pulse.'],
 ['Two slender hulls weave separate violet capture ribbons. Both channels pull toward the vessel while leaving an open corridor between them.','Use the central gap, or escape outside either ribbon.'],
 ['Curved induction booms twist a green capture corridor into a moving corkscrew. The field pulls forward while adding a sideways curl.','Read the curved boundary. A straight retreat can carry you back into the next bend.'],
 ['A massive gravity platform suspends a deep focusing well inside armored buttresses. Its broad blue field gathers ships toward a focal band halfway down the beam.','Escape sideways from the lens. Above the focal band, the vertical force reverses.'],
 ['A crescent vessel spreads golden magnetic sails across its bow. Its field parts ships away from the center while drawing them gently forward.','Expect an outward shove. Leave room between your ship and the edge of the playfield.'],
 ['An armored docking tug locks a cyan gravity anchor to a fixed point in space. The field stays behind as the tug moves and holds ships around a middle band.','Follow the anchored field, not the moving hull. Cross its side boundary to escape.'],
 ['A heavy field-lift barge feeds pink gravity bands along a deep equipment bay. Traveling bands alternate strong pulls with gaps that release their grip.','Move through the dark gaps between bands before the next lift reaches you.'],
 ['An industrial capture tug houses two enormous capstans. Its copper-red tether begins gently, then tightens and grows stronger throughout the pull.','Break away early. Waiting makes the narrowing tether much harder to escape.'],
 ['Three separated prism rails divide the battlefield into blue capture lanes. The vessel powers them in order: left, center, then right.','Cross a dim lane while another is active. Watch which rail lights up next.'],
 ['An asymmetric inertial vessel carries a heavy counterweight on an articulated boom. Its violet field swings sideways and alternates between pulling and pushing.','Move away from the swinging corridor; expect the vertical force to reverse.'],
 ['Two armored capture jaws project pale-gold ribbons that gradually converge. Their closing geometry compresses the safe space between them.','Leave the central gap before the ribbons meet, or interrupt the ship with a hit.'],
 ['A hollow containment vessel projects two blue pressure walls around an empty core. The walls pull toward the hull; the space between them remains open.','Stay in the hollow center or outside both walls. Do not cross a bright edge casually.'],
 ['A crimson magnetic catapult winds a capture tether through its forked bow. It first draws ships inward, then reverses into a forceful outward release.','Keep clearance behind and beside you. The final release pushes down and outward.']
 ],
 de:[
 ['Ein präziser Abfangjäger mit tief eingelassenem Magnetbeschleuniger. Sein schmaler cyanfarbener Strahl zieht gleichmäßig und kräftig zum Schiff.','Verlasse den markierten Korridor seitlich. Ein Treffer am Schiff unterbricht den Strahl.'],
 ['Die gebogenen Induktionsflügel dieses breiten Schiffs lenken einen mintgrünen Strom über das Schlachtfeld. Der Zugkorridor schwenkt von Seite zu Seite.','Kreuze die Schwenkbahn frühzeitig. Folge dem Strahl nicht in Längsrichtung.'],
 ['Ein industrieller Schwerkraftschlepper mit verstärktem Hammerbug. Sein oranges Feld zieht dreimal kräftig und lässt dazwischen los.','Kreuze das dunkle Feld und verlasse seine Bahn vor dem nächsten Impuls.'],
 ['Zwei schlanke Rümpfe weben getrennte violette Fangbänder. Beide ziehen zum Schiff und lassen dazwischen einen freien Korridor.','Nutze die mittlere Lücke oder weiche außen an einem Band vorbei aus.'],
 ['Gebogene Induktionsarme winden einen grünen Fangkorridor zur bewegten Spirale. Das Feld zieht nach vorn und dreht zugleich seitlich ab.','Achte auf den gekrümmten Rand. Ein gerader Rückzug kann in die nächste Biegung führen.'],
 ['Eine massive Schwerkraftplattform trägt eine tiefe Fokuslinse zwischen Panzerstützen. Ihr breites blaues Feld sammelt Schiffe in einem Band auf halber Strahllänge.','Entkomme seitlich. Oberhalb des Fokusbands kehrt sich die vertikale Kraft um.'],
 ['Ein sichelförmiges Schiff entfaltet goldene Magnetsegel am Bug. Sein Feld drückt Schiffe von der Mitte weg und zieht sie leicht nach vorn.','Rechne mit einem Schub nach außen. Halte Abstand zum Spielfeldrand.'],
 ['Ein gepanzerter Dockschlepper verankert ein cyanfarbenes Feld an einem festen Raumpunkt. Es bleibt zurück, während das Schiff weiterzieht, und hält Ziele in einem mittleren Band.','Beobachte das verankerte Feld statt des bewegten Rumpfs. Entkomme über seinen Seitenrand.'],
 ['Ein schwerer Lastschlepper führt rosa Schwerkraftbänder durch einen tiefen Technikschacht. Wandernde Zugbänder wechseln mit Lücken ohne Haltekraft.','Nutze die dunklen Lücken, bevor das nächste Zugband dich erreicht.'],
 ['Zwei gewaltige Winden treiben diesen industriellen Fangschlepper an. Sein kupferroter Strahl beginnt sanft, wird aber stetig schmaler und stärker.','Entkomme früh. Je länger du wartest, desto schwerer lässt sich der Zug überwinden.'],
 ['Drei getrennte Prismenschienen teilen das Feld in blaue Fangbahnen. Das Schiff aktiviert sie nacheinander: links, Mitte, rechts.','Kreuze eine dunkle Bahn, während eine andere aktiv ist. Beobachte die nächste leuchtende Schiene.'],
 ['Ein asymmetrisches Trägheitsschiff trägt ein schweres Gegengewicht an einem Ausleger. Sein violettes Feld schwingt seitlich und wechselt zwischen Zug und Schub.','Verlasse den schwingenden Korridor. Die vertikale Kraft kann sich umkehren.'],
 ['Zwei gepanzerte Fangbacken projizieren blassgoldene Bänder, die allmählich zusammenlaufen. Dabei schrumpft der sichere Raum zwischen ihnen.','Verlasse die Mitte rechtzeitig oder unterbrich den Strahl durch einen Treffer am Schiff.'],
 ['Ein hohles Eindämmungsschiff erzeugt zwei blaue Druckwände um einen leeren Kern. Die Wände ziehen zum Rumpf, die Mitte bleibt frei.','Bleibe im hohlen Zentrum oder außerhalb beider Wände. Kreuze leuchtende Ränder nur mit Bedacht.'],
 ['Ein rotes Magnetkatapult spannt einen Fangstrahl zwischen seinen Bugzinken. Erst zieht es Ziele heran, dann stößt es sie kräftig nach außen.','Halte hinter dir und seitlich Platz frei. Die letzte Phase drückt nach unten und außen.']
 ],
 es:[
 ['Un interceptor de captura construido alrededor de un acelerador magnético profundo. Su estrecho haz cian atrae con fuerza constante hacia la nave.','Sal del corredor marcado por un lado. Un impacto en la nave interrumpe el haz.'],
 ['Las alas de inducción curvas de esta nave ancha desplazan una corriente verde menta por el combate. El corredor de atracción barre de lado a lado.','Cruza el barrido pronto; no sigas el haz en su misma dirección.'],
 ['Un remolcador gravitatorio industrial con proa de martillo reforzada. Su campo naranja aplica tres tirones fuertes separados por pausas.','Cruza cuando el campo esté oscuro y sal antes del siguiente pulso.'],
 ['Dos cascos finos tejen cintas violetas separadas. Ambos canales atraen hacia la nave y dejan un corredor abierto entre ellos.','Usa el hueco central o escapa por fuera de cualquiera de las cintas.'],
 ['Sus brazos de inducción retuercen un corredor verde en una espiral móvil. El campo atrae hacia delante y añade un giro lateral.','Vigila el límite curvo. Retroceder en línea recta puede meterte en la siguiente curva.'],
 ['Una plataforma gravitatoria masiva sostiene una lente profunda entre contrafuertes blindados. Su ancho campo azul concentra naves en una franja a media longitud.','Escapa de lado. Por encima de la franja focal, la fuerza vertical se invierte.'],
 ['Una nave creciente despliega velas magnéticas doradas en la proa. Su campo aparta las naves del centro mientras las atrae suavemente hacia delante.','Espera un empujón hacia fuera. Deja espacio hasta el borde del campo de juego.'],
 ['Un remolcador blindado fija un ancla gravitatoria cian en el espacio. El campo permanece allí mientras la nave se mueve y retiene objetivos en una franja media.','Observa el campo fijo, no el casco móvil. Escapa por su límite lateral.'],
 ['Una barcaza pesada impulsa bandas gravitatorias rosas por una bahía profunda. Las bandas móviles alternan tirones fuertes y huecos que sueltan la presa.','Cruza los huecos oscuros antes de que llegue la siguiente banda.'],
 ['Dos enormes cabrestantes impulsan este remolcador de captura. Su haz cobrizo empieza suave, pero se estrecha y gana fuerza durante el tirón.','Escapa pronto. Esperar hace mucho más difícil salir del haz.'],
 ['Tres raíles prismáticos separados dividen el combate en carriles azules. La nave los activa en orden: izquierda, centro y derecha.','Cruza un carril tenue mientras otro está activo. Vigila qué raíl se enciende después.'],
 ['Una nave inercial asimétrica lleva un contrapeso pesado en un brazo articulado. Su campo violeta oscila lateralmente y alterna atracción y repulsión.','Sal del corredor oscilante; la fuerza vertical puede invertirse.'],
 ['Dos mandíbulas blindadas proyectan cintas doradas que convergen poco a poco. El espacio seguro entre ellas se va cerrando.','Sal del hueco central antes de que se junten o interrumpe la nave con un impacto.'],
 ['Una nave de contención hueca proyecta dos paredes azules alrededor de un núcleo vacío. Las paredes atraen hacia el casco; el centro queda abierto.','Permanece en el centro hueco o fuera de ambas paredes. Cuidado al cruzar un borde brillante.'],
 ['Una catapulta magnética carmesí tensa un haz entre sus puntas delanteras. Primero atrae las naves y después las lanza con fuerza hacia fuera.','Deja espacio detrás y a los lados. La descarga final empuja hacia abajo y hacia fuera.']
 ],
 'pt-BR':[
 ['Um interceptador de captura construído em torno de um acelerador magnético profundo. Seu feixe ciano estreito puxa com força constante em direção à nave.','Saia do corredor marcado pela lateral. Acertar a nave interrompe o feixe.'],
 ['As asas curvas desta nave larga conduzem uma corrente verde-menta pelo combate. O corredor de atração varre de um lado para o outro.','Cruze a varredura cedo; não acompanhe o feixe ao longo do seu comprimento.'],
 ['Um rebocador gravitacional industrial com proa reforçada em forma de martelo. Seu campo laranja aplica três puxões fortes separados por intervalos.','Atravesse quando o campo estiver escuro e saia antes do próximo pulso.'],
 ['Dois cascos finos tecem fitas violetas separadas. Ambos os canais puxam em direção à nave e deixam um corredor livre entre eles.','Use a abertura central ou escape por fora de uma das fitas.'],
 ['Braços de indução curvos torcem um corredor verde em uma espiral móvel. O campo puxa para a frente e acrescenta um desvio lateral.','Observe a borda curva. Recuar em linha reta pode levar você à próxima curva.'],
 ['Uma plataforma gravitacional maciça sustenta uma lente profunda entre suportes blindados. Seu campo azul largo concentra naves em uma faixa no meio do feixe.','Escape pela lateral. Acima da faixa focal, a força vertical se inverte.'],
 ['Uma nave crescente abre velas magnéticas douradas na proa. Seu campo afasta as naves do centro enquanto as puxa suavemente para a frente.','Espere um empurrão para fora. Mantenha distância da borda da área de jogo.'],
 ['Um rebocador blindado fixa uma âncora gravitacional ciano no espaço. O campo fica parado enquanto a nave se move e prende alvos em uma faixa central.','Observe o campo ancorado, não o casco em movimento. Escape pela borda lateral.'],
 ['Uma barcaça pesada conduz faixas gravitacionais rosas por um compartimento profundo. Faixas móveis alternam puxões fortes com lacunas que soltam a presa.','Atravesse as lacunas escuras antes que a próxima faixa alcance você.'],
 ['Dois enormes guinchos equipam este rebocador de captura. Seu feixe vermelho-cobre começa suave, mas fica mais estreito e mais forte durante a atração.','Escape cedo. Esperar torna muito mais difícil sair do feixe.'],
 ['Três trilhos prismáticos separam o combate em corredores azuis. A nave os ativa em ordem: esquerda, centro e direita.','Cruze um corredor apagado enquanto outro estiver ativo. Observe qual trilho acende em seguida.'],
 ['Uma nave inercial assimétrica carrega um contrapeso pesado em um braço articulado. Seu campo violeta oscila lateralmente e alterna atração e repulsão.','Saia do corredor oscilante; a força vertical pode se inverter.'],
 ['Duas garras blindadas projetam fitas douradas que convergem aos poucos. O espaço seguro entre elas fica cada vez menor.','Saia da abertura central antes que as fitas se encontrem ou acerte a nave para interrompê-las.'],
 ['Uma nave de contenção oca projeta duas paredes azuis em torno de um núcleo vazio. As paredes puxam para o casco; o centro fica livre.','Fique no centro vazio ou fora das duas paredes. Cuidado ao cruzar uma borda brilhante.'],
 ['Uma catapulta magnética carmesim tensiona um feixe entre as pontas da proa. Primeiro atrai as naves, depois as lança com força para fora.','Deixe espaço atrás e dos lados. A liberação final empurra para baixo e para fora.']
 ],
 ru:[
 ['Точный перехватчик с глубоким магнитным ускорителем. Узкий голубой луч непрерывно и сильно тянет цель к кораблю.','Выходите из отмеченного коридора вбок. Попадание по кораблю прерывает луч.'],
 ['Изогнутые индукционные крылья широкого корабля направляют мятно-зелёный поток через поле боя. Коридор притяжения перемещается из стороны в сторону.','Пересекайте траекторию заранее, а не двигайтесь вдоль луча.'],
 ['Промышленный гравитационный буксир с усиленным молотообразным носом. Оранжевое поле даёт три сильных рывка с паузами между ними.','Пересекайте поле, пока оно тёмное, и покиньте его до следующего импульса.'],
 ['Два узких корпуса создают отдельные фиолетовые ленты захвата. Оба канала тянут к кораблю, оставляя между собой свободный коридор.','Используйте центральный промежуток или выходите за внешнюю границу любой ленты.'],
 ['Изогнутые индукционные стрелы закручивают зелёный коридор в подвижную спираль. Поле тянет вперёд и одновременно уводит в сторону.','Следите за кривой границей. Прямое отступление может завести в следующий изгиб.'],
 ['Массивная гравитационная платформа держит глубокую линзу между броневыми опорами. Широкое синее поле собирает корабли в фокусной полосе посередине луча.','Уходите вбок. Выше фокусной полосы вертикальная сила меняет направление.'],
 ['Серповидный корабль раскрывает золотые магнитные паруса. Поле разводит цели от центра, одновременно слегка подтягивая их вперёд.','Ожидайте толчка наружу. Оставляйте запас места до края игрового поля.'],
 ['Бронированный буксир закрепляет голубой гравитационный якорь в пространстве. Поле остаётся на месте при движении корабля и удерживает цели в средней полосе.','Следите за неподвижным полем, а не за корпусом. Выходите через боковую границу.'],
 ['Тяжёлая баржа проводит розовые гравитационные полосы через глубокий отсек. Движущиеся полосы сильной тяги чередуются с промежутками без захвата.','Пересекайте тёмные промежутки до подхода следующей полосы.'],
 ['Две огромные лебёдки приводят в действие этот буксир. Медно-красный луч сначала тянет слабо, затем сужается и становится всё сильнее.','Вырывайтесь сразу. Чем дольше ждать, тем труднее выйти из луча.'],
 ['Три раздельных призменных рельса образуют синие коридоры захвата. Корабль включает их по очереди: левый, центральный, правый.','Пересекайте тусклый коридор, пока работает другой. Следите за следующим рельсом.'],
 ['Асимметричный инерционный корабль несёт тяжёлый противовес на подвижной стреле. Фиолетовое поле качается в стороны, чередуя притяжение и отталкивание.','Уходите из качающегося коридора: вертикальная сила меняет направление.'],
 ['Две бронированные клешни создают бледно-золотые ленты, которые постепенно сходятся. Безопасный промежуток между ними сжимается.','Покиньте середину до смыкания лент или прервите луч попаданием по кораблю.'],
 ['Полый корабль сдерживания создаёт две синие стены вокруг пустого центра. Стены тянут к корпусу, а середина остаётся свободной.','Оставайтесь в пустом центре или снаружи обеих стен. Осторожно пересекайте яркую границу.'],
 ['Багровая магнитная катапульта натягивает луч между носовыми вилками. Сначала она притягивает корабли, затем резко отбрасывает их наружу.','Оставляйте место позади и по бокам. Финальный выброс толкает вниз и наружу.']
 ],
 'zh-CN':[
 ['这艘精密捕获截击舰围绕深槽磁加速器建造。狭窄的青色牵引束持续施加强大拉力，将目标拖向舰体。','从标记通道侧面脱离。击中舰体即可中断光束。'],
 ['宽大的弧形感应翼在战场上卷起薄荷绿能流。它的牵引通道会左右扫动。','提早横穿扫动路线，不要沿着光束后退。'],
 ['这艘工业重力拖船拥有加固锤形舰艏。橙色力场分三次猛烈牵引，每次之间都会松开目标。','趁力场变暗时穿过，并在下一次脉冲前离开。'],
 ['两条修长舰体织出彼此分离的紫色捕获带。两侧都将目标拉向舰体，中间留有开放通道。','利用中央空隙，或从任一光带外侧脱离。'],
 ['弧形感应臂将绿色捕获通道扭成移动螺旋。力场向前牵引的同时还会施加侧向旋力。','看清弯曲边界。直线后退可能再次落入下一道弯曲中。'],
 ['厚重装甲支柱托起深邃的重力透镜。宽阔蓝色力场将舰船聚拢到光束中段的焦点带。','从透镜侧面脱离。焦点带上方的垂直力会反向。'],
 ['这艘新月形舰船在舰艏展开金色磁帆。力场将目标从中央向外推开，同时轻微向前牵引。','准备承受向外的推力，并与战场边缘保持距离。'],
 ['装甲对接拖船将青色重力锚固定在空间中。舰体移动时力场仍留在原位，将目标  保持在中段区域。','观察固定力场，而不是移动舰体。从力场侧面脱离。'],
 ['重型升降驳船通过深层设备舱输送粉色重力带。移动力带交替带来强力牵引与松开目标的间隙。','在下一道力带到来前穿过暗色间隙。'],
 ['这艘工业捕获拖船装有两座巨型绞盘。铜红色牵引束起初柔和，随后逐渐收窄并增强。','尽早脱离。等待越久，越难挣脱收紧的牵引束。'],
 ['三条独立棱镜轨道将战场分成蓝色捕获通道。它们依次启动：左侧、中央、右侧。','趁另一条通道启动时穿过暗道，并留意下一条亮起的轨道。'],
 ['这艘不对称惯性舰用关节臂承载沉重配重。紫色力场左右摆动，并交替施加拉力与推力。','远离摆动通道，注意垂直力会突然反向。'],
 ['两只装甲捕获钳投射出逐渐汇合的淡金色光带。两带之间的安全空间会不断缩小。','在光带合拢前离开中央空隙，或击中舰体中断光束。'],
 ['中空约束舰在空心区域两侧投射蓝色压力墙。墙面将目标拉向舰体，中央区域则保持开放。','留在空心区域内或两墙外侧，谨慎穿越明亮边界。'],
 ['猩红磁力弹射舰在叉形舰艏之间张紧牵引束。它先向内拉拢目标，再反向猛力向外弹开。','为后方和两侧留出空间。最后的释放阶段会向下、向外推开目标。']
 ],
 ja:[
 ['深い磁気加速器を中心に設計された精密捕獲迎撃艦。細いシアンの牽引束が、強い一定の力で目標を艦へ引き寄せる。','表示された通路から横へ抜けよう。艦への命中でビームを中断できる。'],
 ['幅広い曲面誘導翼が、ミント色の流れを戦場へ送り出す。牽引通路は左右へ掃くように動く。','早めに横切ろう。ビームに沿って逃げ続けないこと。'],
 ['強化されたハンマー型艦首を持つ工業用重力曳航艦。オレンジ色の場が、間隔を空けて三度強く引く。','場が暗い間に横切り、次のパルスまでに軌道を離れよう。'],
 ['二本の細い船体が、別々の紫色捕獲帯を織る。両側は艦へ引くが、その間には通路が残る。','中央の隙間を使うか、どちらかの帯の外側へ抜けよう。'],
 ['曲がった誘導アームが緑の捕獲通路を動く螺旋へねじる。前方への牽引に横向きの旋回力が加わる。','曲線の境界を見よう。直線的な後退では次の曲がりに入ることがある。'],
 ['巨大な重力艦は装甲支柱の内側に深い集束レンズを持つ。幅広い青の場が、ビーム中ほどの焦点帯へ艦を集める。','横へ抜けよう。焦点帯より上では上下方向の力が逆転する。'],
 ['三日月型の艦が金色の磁気帆を広げる。目標を緩く前へ引きながら、中央から外へ押し分ける。','外向きの押し出しに備え、画面端までの余裕を残そう。'],
 ['装甲曳航艦がシアンの重力錨を空間に固定する。艦が移動しても場は残り、中央付近の帯に目標を 保持する。','動く艦ではなく固定された場を見よう。側面の境界から脱出できる。'],
 ['重い揚送艦が深い機器区画から桃色の重力帯を送る。移動する帯は強い牽引と解放の隙間を交互に作る。','次の帯が届く前に暗い隙間を通ろう。'],
 ['二つの巨大巻き胴を備えた工業用捕獲艦。赤銅色の牽引束は弱く始まり、徐々に細く強くなる。','早めに離脱しよう。待つほど狭い束から逃れにくくなる。'],
 ['三本の独立したプリズムレールが青い捕獲路を作る。左、中央、右の順に作動する。','別の路が作動中に暗い路を横切ろう。次に光るレールを見よう。'],
 ['非対称の慣性艦は可動アームに重い釣り合い錘を持つ。紫の場が左右に揺れ、牽引と押し出しを切り替える。','揺れる通路から離れよう。上下方向の力の逆転に注意。'],
 ['二つの装甲捕獲顎が、徐々に合流する淡金色の帯を投射する。帯の間の安全な空間は狭まっていく。','帯が重なる前に中央を離れるか、艦に命中させて中断しよう。'],
 ['中空の封じ込め艦が、空いた中心の両側に青い圧力壁を作る。壁は艦へ引くが、中央は開いている。','中空の中央か両壁の外にいよう。明るい境界を不用意に横切らないこと。'],
 ['深紅の磁気射出艦が二股の艦首に牽引束を張る。最初に引き寄せ、最後に強く外へ放つ。','後ろと横に余裕を残そう。最後の放出は下と外へ押し出す。']
 ],
 ko:[
 ['깊은 자기 가속기를 중심으로 설계된 정밀 포획 요격함. 좁은 청록색 빔이 일정하고 강한 힘으로 목표를 함선 쪽으로 당긴다.','표시된 통로에서 옆으로 빠져나가자. 함선을 맞히면 빔이 중단된다.'],
 ['넓고 휘어진 유도 날개가 전장에 민트색 흐름을 보낸다. 견인 통로가 좌우로 쓸고 지나간다.','일찍 가로질러 이동하자. 빔의 길이 방향으로 따라가지 말 것.'],
 ['강화된 망치형 함수가 특징인 산업용 중력 예인선. 주황색 장이 간격을 두고 세 번 강하게 당긴다.','장이 어두울 때 건너고 다음 맥동 전에 경로를 벗어나자.'],
 ['가느다란 두 선체가 별개의 보라색 포획 띠를 만든다. 양쪽은 함선으로 당기지만 가운데 통로는 비어 있다.','중앙 틈을 이용하거나 어느 한 띠의 바깥쪽으로 탈출하자.'],
 ['휘어진 유도 팔이 초록색 포획 통로를 움직이는 나선으로 비튼다. 앞으로 당기는 힘에 옆으로 휘감는 힘이 더해진다.','곡선 경계를 살피자. 직선으로 후퇴하면 다음 굽이에 다시 들어갈 수 있다.'],
 ['거대한 중력 플랫폼의 장갑 지지대가 깊은 집속 렌즈를 받친다. 넓은 파란 장이 빔 중간의 초점 띠로 함선을 모은다.','옆으로 탈출하자. 초점 띠 위에서는 수직 힘이 반대로 작용한다.'],
 ['초승달형 함선이 함수에서 황금 자기 돛을 펼친다. 목표를 약하게 앞으로 당기면서 중앙에서 바깥으로 밀어낸다.','바깥으로 밀리는 힘에 대비하고 화면 가장자리까지 여유를 남기자.'],
 ['장갑 접안 예인선이 청록색 중력 닻을 공간에 고정한다. 함선이 움직여도 장은 제자리에 남아 중간 띠에 목표를 붙잡는다.','움직이는 선체보다 고정된 장을 보자. 옆 경계를 넘어 탈출할 수 있다.'],
 ['무거운 운반선이 깊은 장비실에서 분홍색 중력 띠를 보낸다. 움직이는 강한 견인 띠 사이에는 잡아당기지 않는 틈이 있다.','다음 띠가 도착하기 전에 어두운 틈을 통과하자.'],
 ['두 개의 거대한 윈치를 갖춘 산업용 포획선. 구릿빛 붉은 견인 빔은 약하게 시작하지만 점점 좁아지고 강해진다.','일찍 빠져나가자. 기다릴수록 좁아진 빔을 벗어나기 어려워진다.'],
 ['독립된 세 프리즘 레일이 파란 포획 통로를 만든다. 왼쪽, 중앙, 오른쪽 순서로 작동한다.','다른 통로가 켜져 있을 때 어두운 통로를 건너자. 다음에 켜질 레일을 살피자.'],
 ['비대칭 관성 함선이 관절 팔에 무거운 균형추를 단다. 보라색 장이 좌우로 흔들리며 당기기와 밀어내기를 번갈아 한다.','흔들리는 통로에서 벗어나자. 수직 힘의 방향이 바뀔 수 있다.'],
 ['두 장갑 포획 턱이 점차 합쳐지는 연금색 띠를 투사한다. 두 띠 사이의 안전 공간은 계속 좁아진다.','띠가 만나기 전에 중앙 틈을 떠나거나 함선을 맞혀 중단시키자.'],
 ['속이 빈 억제 함선이 빈 중심 양쪽에 파란 압력 벽을 만든다. 벽은 선체로 당기지만 가운데는 열려 있다.','빈 중앙이나 두 벽 바깥에 머물자. 밝은 경계를 함부로 넘지 말 것.'],
 ['진홍색 자기 사출선이 갈라진 함수 사이에 견인 빔을 건다. 먼저 안으로 당긴 뒤 강하게 바깥으로 튕겨낸다.','뒤와 옆에 여유를 남기자. 마지막 방출은 아래와 바깥으로 밀어낸다.']
 ]
};
const ROLES={en:'Tractor ship',de:'Traktorschiff',es:'Nave tractora','pt-BR':'Nave tratora',ru:'Корабль захвата','zh-CN':'牵引舰',ja:'牽引艦',ko:'견인 함선'};
export function getTractorCodexText(profile,locale='en'){
 const [description,tip]=(TRACTOR_CODEX_TEXT[locale]||TRACTOR_CODEX_TEXT.en)[profile.index];
 return {name:profile.name,description:`${description}\n\n${(TRACTOR_DETAILS[locale]||TRACTOR_DETAILS.en)[profile.index]}`,
  tip:`${tip} ${TRACTOR_INTERRUPT_TIP[locale]||TRACTOR_INTERRUPT_TIP.en}`,
  role:ROLES[locale]||ROLES.en,loreVersion:CODEX_LORE_VERSION};
}
export function getTractorFleetSourceText(locale='en'){
 const source=TRACTOR_CODEX_TEXT.en.flat(),target=(TRACTOR_CODEX_TEXT[locale]||TRACTOR_CODEX_TEXT.en).flat();
 return Object.fromEntries([...source.map((text,i)=>[text,target[i]]),
  ...TRACTOR_DETAILS.en.map((text,i)=>[text,(TRACTOR_DETAILS[locale]||TRACTOR_DETAILS.en)[i]]),
  [TRACTOR_INTERRUPT_TIP.en,TRACTOR_INTERRUPT_TIP[locale]||TRACTOR_INTERRUPT_TIP.en],
  [ROLES.en,ROLES[locale]||ROLES.en]]);
}
