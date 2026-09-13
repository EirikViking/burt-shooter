const keys=['SERPENT CONTACT — COMBINED ASSAULT','SECOND BOSS SIGNAL — CROSSFIRE'];
const values={
  en:keys,
  de:['SCHLANGENKONTAKT — GEMEINSAMER ANGRIFF','ZWEITES BOSSSIGNAL — KREUZFEUER'],
  es:['CONTACTO SERPIENTE — ASALTO CONJUNTO','SEGUNDA SEÑAL DE JEFE — FUEGO CRUZADO'],
  ru:['КОНТАКТ СО ЗМЕЕМ — СОВМЕСТНЫЙ ШТУРМ','ВТОРОЙ БОСС — ПЕРЕКРЁСТНЫЙ ОГОНЬ'],
  'zh-CN':['发现巨蛇 — 联合进攻','第二个首领信号 — 交叉火力'],
  'pt-BR':['CONTATO SERPENTE — ATAQUE CONJUNTO','SEGUNDO SINAL DE CHEFE — FOGO CRUZADO'],
  ko:['우주 뱀 포착 — 합동 공격','두 번째 보스 신호 — 교차 사격'],
  ja:['宇宙ヘビ接近 — 連携攻撃','第2ボスの信号 — 十字砲火']
};
export function getDiscoveryText(language){return Object.fromEntries(keys.map((key,i)=>[key,(values[language]||keys)[i]]));}
