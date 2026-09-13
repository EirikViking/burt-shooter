import sharp from 'sharp';
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
const root='public/art/astra';
const renders='docs/astra-models/renders';
const registration=[];
async function bounds(p) {
  const {data,info}=await sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=0,bottom=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8) {
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
  }
  return {width:info.width,height:info.height,box:{left,top,width:right-left+1,height:bottom-top+1}};
}
for(const family of ['player','enemy']) {
  mkdirSync(`${root}/${family}`,{recursive:true});
  for(const file of readdirSync(`${renders}/${family}`).filter(f=>f.endsWith('.png'))) {
    const original=family==='player' ? `public/art/generated/nova-swarm/ships/nova-player-ship-${file}` : `public/art/generated/nova-swarm/enemies/enhanced/nova-enemy-enhanced-${file}`;
    const baseline=await bounds(original),render=await bounds(`${renders}/${family}/${file}`);
    const fitted=await sharp(`${renders}/${family}/${file}`).extract(render.box).resize(baseline.box.width,baseline.box.height,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
    const result=await sharp({create:{width:baseline.width,height:baseline.height,channels:4,background:'#00000000'}}).composite([{input:fitted,left:baseline.box.left,top:baseline.box.top}]).png().toBuffer();
    writeFileSync(`${root}/${family}/${file}`,result);
    registration.push({family,file,baseline,candidate:await bounds(result)});
  }
}
writeFileSync('docs/astra-models/registration.json',JSON.stringify(registration,null,2));
for(const [index,name] of [['01','base'],['02','storm'],['03','boss'],['01','menu']]) {
  const src=`${renders}/scenery/${index}.png`;
  if(existsSync(src)) await sharp(src).resize(1920,1080).webp({quality:92}).toFile(`${root}/${name}.webp`);
}
if(existsSync(`${renders}/hero/01.png`)) await sharp(`${renders}/hero/01.png`).webp({quality:94}).toFile(`${root}/menu-ship.webp`);
// Draft cards reuse this field as a cropped material, so keep scenery out of it.
const draft=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="field" x2="1" y2="1"><stop stop-color="#183140"/><stop offset=".42" stop-color="#091723"/><stop offset="1" stop-color="#040a13"/></linearGradient><radialGradient id="light"><stop stop-color="#2d6577" stop-opacity=".25"/><stop offset="1" stop-color="#081521" stop-opacity="0"/></radialGradient></defs><path fill="url(#field)" d="M0 0H1920V1080H0z"/><ellipse cx="320" cy="70" rx="960" ry="720" fill="url(#light)"/><path d="M0 900 1450 0M180 1080 1920 20M530 1080 1920 250" stroke="#6f95a1" opacity=".045" stroke-width="2"/></svg>`;
mkdirSync(`${root}/source`,{recursive:true});writeFileSync(`${root}/source/draft-field.svg`,draft);
await sharp(Buffer.from(draft)).webp({quality:94}).toFile(`${root}/draft-field.webp`);
const capsule=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="192" viewBox="0 0 640 192"><defs><linearGradient id="m" x2="0" y2="1"><stop stop-color="#283e4b"/><stop offset=".15" stop-color="#101f2d"/><stop offset="1" stop-color="#08111d"/></linearGradient></defs><path d="M 8 30 30 8 610 8 632 30 632 162 610 184 30 184 8 162Z" fill="url(#m)" fill-opacity=".95" stroke="#64808b" stroke-width="2"/><path d="M 30 8 610 8" stroke="#b9e6ef" stroke-width="3"/><path d="M 139 25 139 165" stroke="#60838d" stroke-opacity=".5" stroke-width="2"/><path d="M 52 49 104 49 115 67 115 114 78 145 41 114 41 67Z" fill="#172f3e" stroke="#809da5" stroke-width="2"/><path d="M 78 59 104 112 78 98 52 112Z" fill="#c8f6ff"/><path d="M 158 164 594 164" stroke="#445c68" stroke-width="2"/><path d="M 158 164 206 164" stroke="#b9e6ef" stroke-width="3"/></svg>`;
mkdirSync(`${root}/source`,{recursive:true});writeFileSync(`${root}/source/hud-capsule.svg`,capsule);
await sharp(Buffer.from(capsule)).png().toFile(`${root}/hud-capsule.png`);
for(const [name,w,h,accent] of [['mission-plaque',1000,290,'#d6be7c'],['combat-plaque',1400,342,'#8ddbe5']]) {
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="M 26 22 H ${w-26} L ${w-8} 40 V ${h-40} L ${w-26} ${h-22} H 26 L 8 ${h-40} V 40 Z" fill="#0a1723" fill-opacity=".94" stroke="#5c7380" stroke-width="3"/><path d="M 28 23 H ${w-28}" stroke="${accent}" stroke-width="4"/><path d="M 12 52 V ${h-52}" stroke="${accent}" stroke-width="5"/><path d="M 38 ${h-32} H ${w-38}" stroke="#405462" stroke-width="2"/></svg>`;
  writeFileSync(`${root}/source/${name}.svg`,svg);
  await sharp(Buffer.from(svg)).png().toFile(`${root}/${name}.png`);
}
console.log('Packed Astra sprites, orbital plates and command capsule.');
