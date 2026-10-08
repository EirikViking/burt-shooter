const TEXT={
  en:['CORE EXPOSED','CORE SEALED','ORBITAL RUPTURE'],
  de:['KERN FREIGELEGT','KERN VERSIEGELT','ORBITALER BRUCH'],
  es:['NÚCLEO EXPUESTO','NÚCLEO SELLADO','RUPTURA ORBITAL'],
  'pt-BR':['NÚCLEO EXPOSTO','NÚCLEO SELADO','RUPTURA ORBITAL'],
  ru:['ЯДРО ОТКРЫТО','ЯДРО ЗАКРЫТО','ОРБИТАЛЬНЫЙ РАЗЛОМ'],
  'zh-CN':['核心暴露','核心封闭','轨道结构破裂'],
  ko:['코어 노출','코어 봉쇄','궤도 구조물 파열'],
  ja:['コア露出','コア閉鎖','軌道構造崩壊']
};
export const planetfallText=(model,rupture=false)=>TEXT.en[rupture?2:model.irisOpen?0:1];
export const getPlanetfallSourceText=locale=>Object.fromEntries(TEXT.en.map((source,i)=>[source,(TEXT[locale]||TEXT.en)[i]]));

const CODEX={
  en:['Orbital siege','An orbital foundry still turning after its world went dark. Four anchors feed the sealed reactor; when one fails, its whole arc tears loose. The iris opens on an obsolete shift schedule, exposing a furnace that no worker will ever return to tend.','Break anchors to silence their guns, or strike the exposed core for a faster kill. Destroying all four anchors keeps the iris open.'],
  de:['Orbitale Belagerung','Eine orbitale Gießerei dreht sich weiter, obwohl ihre Welt längst erloschen ist. Vier Anker versorgen den versiegelten Reaktor. Fällt einer aus, reißt sein gesamter Ringabschnitt ab. Die Blende öffnet sich nach einem veralteten Schichtplan und gibt einen Ofen frei, zu dem kein Arbeiter je zurückkehren wird.','Zerstöre Anker, um ihre Geschütze auszuschalten, oder triff den freigelegten Kern für einen schnelleren Sieg. Sind alle vier Anker zerstört, bleibt die Blende offen.'],
  es:['Asedio orbital','Una fundición orbital sigue girando después de que su mundo se apagara. Cuatro anclajes alimentan el reactor sellado; cuando uno falla, todo su tramo del anillo se desprende. El iris se abre siguiendo un antiguo horario de turnos y descubre un horno que ningún trabajador volverá a atender.','Destruye los anclajes para silenciar sus cañones o ataca el núcleo expuesto para vencer antes. Al destruir los cuatro anclajes, el iris permanece abierto.'],
  'pt-BR':['Cerco orbital','Uma fundição orbital continua girando mesmo depois que seu mundo se apagou. Quatro âncoras alimentam o reator selado; quando uma falha, todo o seu trecho do anel se desprende. A íris se abre conforme uma antiga escala de turnos, revelando uma fornalha da qual nenhum operário voltará a cuidar.','Destrua as âncoras para silenciar seus canhões ou ataque o núcleo exposto para vencer mais rápido. Destruir as quatro âncoras mantém a íris aberta.'],
  ru:['Орбитальная осада','Орбитальный литейный комплекс продолжает вращаться, хотя его мир давно погас. Четыре опоры питают закрытый реактор. Когда одна из них выходит из строя, соответствующая секция кольца отрывается. Диафрагма открывается по старому расписанию смен, обнажая печь, к которой уже не вернётся ни один рабочий.','Уничтожайте опоры, чтобы отключать их орудия, или бейте по открытому ядру для быстрой победы. После уничтожения всех четырёх опор диафрагма остаётся открытой.'],
  'zh-CN':['轨道围攻','这座轨道铸造厂仍在运转，尽管它所属的世界早已黯淡。四座锚点为封闭的反应堆供能；一座失效，整段环体便会撕裂脱落。光圈仍按过时的轮班表开启，露出再也等不到工人归来的熔炉。生产线的指示灯依次亮起，仿佛下一班人员随时都会走进空荡荡的车间。','摧毁锚点可关闭对应炮火，也可攻击暴露的核心以更快取胜。四座锚点全部摧毁后，光圈将保持开启。'],
  ko:['궤도 공성전','고향 행성이 빛을 잃은 뒤에도 궤도 주조 시설은 계속 회전한다. 네 고정 장치가 봉쇄된 원자로에 동력을 공급한다. 하나가 파괴되면 연결된 고리 구역 전체가 떨어져 나간다. 조리개는 낡은 교대 근무표에 따라 열리며, 다시는 작업자가 돌아오지 않을 용광로를 드러낸다.','고정 장치를 파괴해 포격을 멈추거나 노출된 코어를 공격해 더 빨리 승리하세요. 네 장치를 모두 파괴하면 조리개가 열린 상태로 유지됩니다.'],
  ja:['軌道包囲戦','故郷の星が光を失った後も、この軌道鋳造所は回り続けている。四つのアンカーが閉鎖された炉心に動力を送る。一つが壊れると、対応するリング区画が丸ごと引き裂かれる。開口部は古い交代表どおりに開き、二度と作業員が戻ることのない溶鉱炉をさらす。','アンカーを破壊して砲撃を止めるか、露出したコアを狙って速攻を決めよう。四つすべてを破壊すると、開口部は開いたままになる。']
};
export function getPlanetfallCodexText(locale='en'){
  const [role,description,tip]=CODEX[locale]||CODEX.en;
  return {name:'Planetfall',role,description,tip};
}
