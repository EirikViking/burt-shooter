const IDS=['twin-jailers','crossed-chains','prisoner-exchange','last-shuttle','convoy-split','shielded-evacuation','stolen-callsign','rescue-tow'];
const TEXT={
 en:[
  ['TWIN JAILERS','Choose a rescue; your fighter targets the other gun'],
  ['CROSSED CHAINS','Cut a tether to stop its pod, or shoot the moving lock'],
  ['PRISONER EXCHANGE','Stop the relay; gun first gives more rescue time'],
  ['LAST SHUTTLE','Stop the engine to fix the gun position, or break the gun'],
  ['CONVOY SPLIT','Rescue the left half, or silence the right gun first'],
  ['SHIELDED EVACUATION','Break projectors to expose locks; shed plates block all shots'],
  ['STOLEN CALLSIGN','The red emitter is hostile; break it to expose the locks'],
  ['RESCUE TOW','Cut the tow to free a fighter, or silence the tug first']
 ],
 de:[
  ['ZWEI KERKERMEISTER','Wähle eine Rettung; dein Jäger greift die andere Kanone an'],
  ['GEKREUZTE KETTEN','Trenne ein Seil, um die Kapsel zu stoppen, oder triff das bewegte Schloss'],
  ['GEFANGENENTAUSCH','Stoppe das Relais; die Kanone zuerst gibt mehr Rettungszeit'],
  ['LETZTES SHUTTLE','Stoppe den Antrieb, um die Kanone festzusetzen, oder zerstöre sie'],
  ['GETEILTER KONVOI','Rette die linke Hälfte oder zerstöre zuerst die rechte Kanone'],
  ['GESCHÜTZTE EVAKUIERUNG','Zerstöre die Projektoren; abgelöste Platten blockieren alle Schüsse'],
  ['GESTOHLENES RUFZEICHEN','Der rote Emitter ist feindlich; zerstöre ihn für freie Schlösser'],
  ['RETTUNG IM SCHLEPP','Trenne das Schleppseil zur Rettung oder zerstöre zuerst die Kanone']
 ],
 es:[
  ['DOS CARCELEROS','Elige un rescate; tu caza ataca el otro cañón'],
  ['CADENAS CRUZADAS','Corta un cable para detener la cápsula o dispara al cierre móvil'],
  ['INTERCAMBIO DE PRISIONEROS','Detén el relé; destruir primero el cañón da más tiempo'],
  ['ÚLTIMA LANZADERA','Detén el motor para fijar el cañón o destruye el cañón'],
  ['CONVOY DIVIDIDO','Rescata la mitad izquierda o silencia primero el cañón derecho'],
  ['EVACUACIÓN PROTEGIDA','Rompe los proyectores; las placas sueltas bloquean todos los disparos'],
  ['INDICATIVO ROBADO','El emisor rojo es hostil; destrúyelo para exponer los cierres'],
  ['RESCATE A REMOLQUE','Corta el remolque para liberar un caza o silencia primero al remolcador']
 ],
 'pt-BR':[
  ['DOIS CARCEREIROS','Escolha um resgate; seu caça ataca o outro canhão'],
  ['CORRENTES CRUZADAS','Corte um cabo para parar a cápsula ou atire na trava móvel'],
  ['TROCA DE PRISIONEIROS','Pare o relé; destruir o canhão primeiro dá mais tempo'],
  ['ÚLTIMO TRANSPORTE','Pare o motor para fixar o canhão ou destrua o canhão'],
  ['CONVOIO DIVIDIDO','Resgate a metade esquerda ou silencie primeiro o canhão direito'],
  ['EVACUAÇÃO PROTEGIDA','Destrua os projetores; placas soltas bloqueiam todos os disparos'],
  ['INDICATIVO ROUBADO','O emissor vermelho é hostil; destrua-o para expor as travas'],
  ['RESGATE REBOCADO','Corte o cabo para libertar um caça ou silencie primeiro o rebocador']
 ],
 ru:[
  ['ДВА ТЮРЕМЩИКА','Выберите пленника; спасённый истребитель атакует другую пушку'],
  ['ПЕРЕКРЕЩЕННЫЕ ЦЕПИ','Перебейте трос, чтобы остановить капсулу, или стреляйте в движущийся замок'],
  ['ОБМЕН ПЛЕННЫМИ','Остановите реле; сначала уничтожьте пушку, чтобы выиграть время'],
  ['ПОСЛЕДНИЙ ШАТТЛ','Отключите двигатель, чтобы зафиксировать пушку, или уничтожьте её'],
  ['РАЗДЕЛЁННЫЙ КОНВОЙ','Спасите левую половину или сначала уничтожьте правую пушку'],
  ['ЗАЩИЩЁННАЯ ЭВАКУАЦИЯ','Разбейте проекторы; сброшенные пластины блокируют все выстрелы'],
  ['УКРАДЕННЫЙ ПОЗЫВНОЙ','Красный излучатель вражеский; уничтожьте его, чтобы открыть замки'],
  ['СПАСЕНИЕ НА БУКСИРЕ','Перебейте трос для спасения или сначала обезвредьте буксир']
 ],
 'zh-CN':[
  ['双重狱卒','选择先救谁；获救战机会攻击另一门炮'],
  ['交叉锁链','打断牵索让舱体停下，或直接射击移动的锁'],
  ['交换俘虏','破坏中继器；先摧毁炮台可争取更多救援时间'],
  ['最后的穿梭机','破坏引擎固定炮台位置，或直接摧毁炮台'],
  ['分裂运输队','营救左半部，或先摧毁右侧炮台'],
  ['护盾撤离','摧毁投射器露出锁；脱落护板会挡住双方子弹'],
  ['盗用呼号','红色发射器属于敌方；摧毁它才能露出锁'],
  ['拖曳救援','打断拖索解救战机，或先摧毁拖船的炮台']
 ],
 ko:[
  ['두 간수','먼저 구할 전투기를 고르세요. 구출된 전투기는 다른 포를 공격합니다'],
  ['교차 사슬','케이블을 끊어 포드를 멈추거나 움직이는 잠금장치를 쏘세요'],
  ['포로 교환','중계기를 멈추세요. 포를 먼저 파괴하면 구출 시간이 늘어납니다'],
  ['마지막 셔틀','엔진을 파괴해 포 위치를 고정하거나 포를 직접 파괴하세요'],
  ['분리 수송대','왼쪽을 구출하거나 오른쪽 포를 먼저 파괴하세요'],
  ['보호받는 탈출','투사기를 파괴해 잠금을 노출하세요. 떨어진 판은 모든 탄을 막습니다'],
  ['도난 호출명','붉은 방출기는 적입니다. 파괴하면 잠금장치가 노출됩니다'],
  ['견인 구출','견인줄을 끊어 전투기를 구하거나 예인선의 포를 먼저 파괴하세요']
 ],
 ja:[
  ['双子の看守','先に救う機体を選ぼう。救出機がもう一方の砲を攻撃する'],
  ['交差する鎖','ケーブルを切ってポッドを止めるか、動くロックを撃とう'],
  ['捕虜の交換','中継器を止めよう。砲を先に壊すと救出時間が延びる'],
  ['最後のシャトル','エンジンを壊して砲の位置を固定するか、砲を直接壊そう'],
  ['分離する輸送隊','左半分を救出するか、右の砲を先に壊そう'],
  ['シールド付き脱出','投射器を壊してロックを露出。外れた板は双方の弾を防ぐ'],
  ['盗まれたコールサイン','赤い発射器は敵だ。壊すとロックが露出する'],
  ['曳航救出','曳航ケーブルを切って救出するか、曳船の砲を先に壊そう']
 ]
};
export function convoySurpriseText(id,kind){const i=IDS.indexOf(id);return i<0?'':TEXT.en[i][kind==='title'?0:1];}
export function getConvoySurpriseSourceText(locale){return Object.fromEntries(TEXT.en.flatMap((row,i)=>row.map((source,j)=>[source,(TEXT[locale]||TEXT.en)[i][j]])));}
