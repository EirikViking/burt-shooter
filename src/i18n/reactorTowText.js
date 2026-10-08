const TEXT={
  en:['REACTOR TOW','Cut the coupling to shift the discharge, or break the vent to stop it','REACTOR VENTED','DISCHARGE SPENT'],
  de:['REAKTOR IM SCHLEPP','Kupplung trennen, um die Entladung zu verlagern, oder Auslass zerstören, um sie zu stoppen','REAKTOR ENTLASTET','ENTLADUNG VORBEI'],
  es:['REACTOR REMOLCADO','Rompe el acople para desplazar la descarga o destruye la válvula para detenerla','REACTOR PURGADO','DESCARGA TERMINADA'],
  'pt-BR':['REATOR REBOCADO','Rompa o engate para deslocar a descarga ou destrua a válvula para impedi-la','REATOR DESPRESSURIZADO','DESCARGA ENCERRADA'],
  ru:['РЕАКТОР НА БУКСИРЕ','Разбей сцепку, чтобы сместить разряд, или сопло, чтобы остановить его','РЕАКТОР ОБЕЗВРЕЖЕН','РАЗРЯД ЗАВЕРШЁН'],
  'zh-CN':['反应堆拖航','击断连接器可移开放电区域，摧毁喷口可阻止放电','反应堆已泄压','放电结束'],
  ko:['반응로 견인','연결부를 끊어 방출 위치를 옮기거나 배출구를 파괴해 방출을 막으세요','반응로 감압 완료','방출 종료'],
  ja:['原子炉の曳航','連結部を壊して放出位置をずらすか、噴出口を壊して放出を止めよう','原子炉の圧力解放','放出終了']
};
export function reactorTowText(e,kind){return TEXT.en[kind==='hint'?1:e.reactor.harmless?2:e.reactor.spent?3:0];}
export function getReactorTowSourceText(locale){return Object.fromEntries(TEXT.en.map((source,i)=>[source,(TEXT[locale]||TEXT.en)[i]]));}
