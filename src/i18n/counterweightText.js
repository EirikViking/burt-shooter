const TEXT={
  en:['COUNTERWEIGHT','Break a gun to tilt its partner; break the pivot to stop both','MOUNT DISABLED','BATTERY SPENT'],
  de:['GEGENGEWICHT','Zerstöre ein Geschütz, um das andere zu kippen; zerstöre das Gelenk, um beide zu stoppen','LAFETTE DEAKTIVIERT','BATTERIE LEER'],
  es:['CONTRAPESO','Destruye un cañón para inclinar el otro; rompe el eje para detener ambos','MONTAJE DESACTIVADO','BATERÍA AGOTADA'],
  'pt-BR':['CONTRAPESO','Destrua um canhão para inclinar o outro; destrua o eixo para parar os dois','SUPORTE DESATIVADO','BATERIA ESGOTADA'],
  ru:['ПРОТИВОВЕС','Сломай одно орудие, чтобы наклонить другое; разбей шарнир, чтобы остановить оба','УСТАНОВКА ОТКЛЮЧЕНА','ЗАЛПЫ ИСЧЕРПАНЫ'],
  'zh-CN':['配重炮台','摧毁一门炮可使另一门倾斜；摧毁转轴可关闭两门炮','炮架已停用','炮台弹药耗尽'],
  ko:['균형 포대','한 포를 파괴하면 반대쪽 포가 기울어집니다. 축을 파괴하면 두 포가 멈춥니다','포가 비활성화됨','포대 탄약 소진'],
  ja:['カウンターウェイト','片方の砲を壊すともう片方が傾く。支点を壊すと両方が止まる','砲架停止','砲台弾切れ']
};
export function counterweightText(e,kind){return TEXT.en[kind==='hint'?1:e.counterweight.phase==='disabled'?2:['spent','expired'].includes(e.counterweight.phase)?3:0];}
export function getCounterweightSourceText(locale){return Object.fromEntries(TEXT.en.map((source,i)=>[source,(TEXT[locale]||TEXT.en)[i]]));}
