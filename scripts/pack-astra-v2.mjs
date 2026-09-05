import sharp from 'sharp';
import {existsSync,readdirSync,readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
const base='docs/astra-v2-models/renders',dest='public/art/astra';
const hullsOnly=process.argv.includes('--hulls-only');
async function bounds(src){const{data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=info.width,t=info.height,r=0,b=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}return{width:info.width,height:info.height,box:{left:l,top:t,width:r-l+1,height:b-t+1}};}
const records=JSON.parse(readFileSync('docs/astra-models/registration.json','utf8'));
const bosses=[];
async function atomicWrite(file,data){
  if(existsSync(file)&&readFileSync(file).equals(data))return;
  const temp=`${file}.tmp`;writeFileSync(temp,data);
  for(let attempt=0;attempt<12;attempt++){
    try{renameSync(temp,file);return;}catch(error){
      if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt===11)throw error;
      await new Promise(resolve=>setTimeout(resolve,80*(attempt+1)));
    }
  }
}
for(const family of ['player','enemy','boss']){
  if(!existsSync(`${base}/${family}`))continue;mkdirSync(`${dest}/${family}`,{recursive:true});
  for(const file of readdirSync(`${base}/${family}`).filter(f=>/^\d\d\.png$/.test(f))){
    const prefix=family==='player'?'ships/nova-player-ship-':family==='enemy'?'enemies/enhanced/nova-enemy-enhanced-':'bosses/nova-boss-';
    const specials=['phase-seraph-20260801','eirik-viking-20260801-v2','aegis-comet-20260801','railbreaker-20260801','drone-sovereign-20260801'];
    const number=Number(file.slice(0,2));
    const original=family==='player' && number>25 ? `public/art/generated/nova-swarm/ships/nova-player-ship-${specials[number-26]}.png` : `public/art/generated/nova-swarm/${prefix}${file}`;
    const src=`${base}/${family}/${file}`;
    const baseline=await bounds(original),render=await bounds(src);
    let pixels=await sharp(src).extract(render.box).resize(baseline.box.width,baseline.box.height,{fit:'fill',kernel:'lanczos3'}).sharpen({sigma:.5,m1:.4,m2:1}).png().toBuffer();
    // Extremely slender rails can lose a two-pixel antialias fringe when
    // resampled. Refit the surviving silhouette instead of painting pixels.
    for(let pass=0;pass<3;pass++){
      const b=await bounds(pixels);
      if(b.box.left<=1&&b.box.top<=1&&Math.abs(b.box.width-baseline.box.width)<=1&&Math.abs(b.box.height-baseline.box.height)<=1)break;
      pixels=await sharp(pixels).extract(b.box).resize(baseline.box.width,baseline.box.height,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
    }
    const result=await sharp({create:{width:baseline.width,height:baseline.height,channels:4,background:'#00000000'}}).composite([{input:pixels,left:baseline.box.left,top:baseline.box.top}]).png().toBuffer();
    await atomicWrite(`${dest}/${family}/${file}`,result);const row={family,file,baseline,candidate:await bounds(result)};
    if(family==='boss')bosses.push(row);else if(family==='player'&&number>25){mkdirSync('docs/astra-v2-models/registration',{recursive:true});writeFileSync(`docs/astra-v2-models/registration/player-${file}.json`,JSON.stringify(row,null,2));}else{const i=records.findIndex(r=>r.family===family&&r.file===file);if(i<0)records.push(row);else records[i]=row;}
  }
}
writeFileSync('docs/astra-models/registration.json',JSON.stringify(records,null,2));
if(bosses.length)writeFileSync('docs/astra-v2-models/boss-registration.json',JSON.stringify(bosses,null,2));
if(existsSync(`${base}/hero/01.png`))await atomicWrite(`${dest}/menu-ship.webp`,await sharp(`${base}/hero/01.png`).webp({quality:96}).toBuffer());
if(existsSync(`${base}/hero/01.json`))await atomicWrite(`${dest}/menu-ship.json`,readFileSync(`${base}/hero/01.json`));
if(!hullsOnly&&existsSync(`${base}/showroom`))for(const f of readdirSync(`${base}/showroom`).filter(f=>/^\d\d\.png$/.test(f))){
  const src=`${base}/showroom/${f}`,b=await bounds(src),size=768,fit=Math.min(704/b.box.width,704/b.box.height);
  const width=Math.round(b.box.width*fit),height=Math.round(b.box.height*fit),left=Math.floor((size-width)/2),top=Math.floor((size-height)/2);
  const pixels=await sharp(src).extract(b.box).resize(width,height).png().toBuffer();
  mkdirSync(`${dest}/showroom`,{recursive:true});
  await atomicWrite(`${dest}/showroom/${f.replace('.png','.webp')}`,await sharp({create:{width:size,height:size,channels:4,background:'#00000000'}}).composite([{input:pixels,left,top}]).webp({quality:96}).toBuffer());
  const raw=JSON.parse(readFileSync(src.replace('.png','.json')));
  const emitters=raw.emitters.map(p=>({x:(left+(p.x*b.width-b.box.left)*width/b.box.width)/size,y:(top+(p.y*b.height-b.box.top)*height/b.box.height)/size}));
  await atomicWrite(`${dest}/showroom/${f.replace('.png','.json')}`,Buffer.from(JSON.stringify({emitters})));
}
if(!hullsOnly&&existsSync(`${base}/world`))for(const f of readdirSync(`${base}/world`).filter(f=>/^\d\d\.png$/.test(f))){mkdirSync(`${dest}/world`,{recursive:true});await atomicWrite(`${dest}/world/${f.replace('.png','.webp')}`,await sharp(`${base}/world/${f}`).webp({quality:94}).toBuffer());}
if(existsSync(`${base}/component`))for(const f of readdirSync(`${base}/component`).filter(f=>/^\d\d\.png$/.test(f))){mkdirSync(`${dest}/component`,{recursive:true});const source=`${base}/component/${f}`,b=await bounds(source);await atomicWrite(`${dest}/component/${f}`,await sharp(source).extract(b.box).png().toBuffer());}
if(!hullsOnly)for(const [name,world] of [['storm','02'],['boss','10']])if(existsSync(`${dest}/world/${world}.webp`))await atomicWrite(`${dest}/${name}.webp`,readFileSync(`${dest}/world/${world}.webp`));
if(!hullsOnly&&existsSync(`${base}/interface`))for(const [name,id]of [['menu','01'],['hangar','01'],['archive','02'],['base','03']])if(existsSync(`${base}/interface/${id}.png`))await atomicWrite(`${dest}/${name}.webp`,await sharp(`${base}/interface/${id}.png`).webp({quality:94}).toBuffer());
console.log('Packed current V2 sources with original canvas and collision registration.');
