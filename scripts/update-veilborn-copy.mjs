import fs from 'node:fs';
import {MYSTERIES} from '../src/config/Mysteries.js';
import {MYSTERY_COMBAT} from '../src/config/MysteryCombatProfiles.js';
const copy=JSON.parse(fs.readFileSync(new URL('./data/veilborn-codex-copy.json',import.meta.url),'utf8'));
const motions=['strafe','weave','swoop','orbit','bomber','convoy','scissor','hunt','phase','pounce','dive'];
const weapons=['needle','fan','barrage','flame','braid','split','homing','ricochet','petals','orbit','bomb','comet','mines','rain','broadside','crossfire','portal','sonic','lance','rail','prism','charge','drone','echo'];
for(const [locale,c]of Object.entries(copy)){
 const rows=MYSTERIES.map(({id})=>{
  const p=MYSTERY_COMBAT[id],w=[...new Set([...p.weapons,...(['pounce','dive'].includes(p.motion)?['charge']:[])])];
  const tip=w.includes('charge')?0:w.some(k=>['rail','lance','prism'].includes(k))?1:w.includes('homing')?2:w.some(k=>['bomb','mines','comet'].includes(k))?3:w.includes('drone')?4:5;
  const punctuation=['zh-CN','ja'].includes(locale)?'。':'.';
  return [c.motion[motions.indexOf(p.motion)]+' '+c.arm+w.map(k=>c.weapons[weapons.indexOf(k)]).join(locale==='ja'?'、':locale==='zh-CN'?'、':', ')+punctuation+(p.breakup==='none'?'':' '+c.seam),
   c.tips[tip]+(p.breakup==='none'?'':' '+(['vault_crawler','courier_zero','rail_cathedral'].includes(id)?c.core:c.parts))];
 });
 fs.writeFileSync(new URL(`../src/i18n/mysteries/${locale}.json`,import.meta.url),JSON.stringify(rows,null,2)+'\n');
}
// Keep the existing runtime translation mechanism and legacy internal IDs.
const file=new URL('../src/i18n/mysteryText.js',import.meta.url);
let source=fs.readFileSync(file,'utf8');
const start=source.indexOf('const ui = '),end=source.indexOf(';',start);
const ui=JSON.parse(source.slice(start+11,end));
for(const [locale,c]of Object.entries(copy)){
 [0,1,3,4,6].forEach((index,i)=>ui[locale][index]=c.ui[i]);
 ui[locale][15]=c.ui[5];ui[locale][16]=c.intro;
}
source=source.slice(0,start)+'const ui = '+JSON.stringify(ui,null,2)+source.slice(end);
if(!source.includes('export const VEILBORN_INTRO'))source=source.replace('const families =','export const VEILBORN_INTRO = ui.en[16];\nconst families =');
fs.writeFileSync(file,source);
console.log('Updated 56 Veilborn descriptions and counterplay entries in 8 languages.');
