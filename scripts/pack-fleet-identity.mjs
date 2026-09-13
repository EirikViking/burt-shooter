import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const root='public/art/fleet-identity-20260908';
for(const dir of ['player','showroom','turntable','menu-hd','drones'])await mkdir(`${root}/${dir}`,{recursive:true});
const wait=process.argv.includes('--watch');
const option=(name,fallback)=>process.argv.find(v=>v.startsWith(`--${name}=`))?.split('=').slice(1).join('=')??fallback;
const start=Number(option('start',0)),count=Number(option('count',30)),log=option('log','test-results/identity-pass/fleet-render.log');
for(let i=0;i<15;i++){
 const id=String(i+1).padStart(2,'0');
 await sharp(`docs/fleet-identity-20260908/drones/${id}.png`).trim({threshold:8}).resize(256,256,{fit:'contain',background:'#00000000'}).png().toFile(`${root}/drones/${id}.png`);
}
if(process.argv.includes('--drones-only'))process.exit(0);
for(let i=start;i<start+count;i++){
 const id=String(i+1).padStart(2,'0');
 if(wait)while(!(await readFile(log,'utf8')).replaceAll('\r','').includes(`FLEET_IDENTITY_COMPLETE ${i+1}\n`))await new Promise(r=>setTimeout(r,3000));
 const input=`docs/fleet-identity-20260908/renders/${id}`,meta=JSON.parse(await readFile(`${input}/views.json`,'utf8'));
 const files=Array.from({length:meta.count},(_,f)=>`${input}/${String(f).padStart(2,'0')}.png`);
 let l=meta.size,t=meta.size,r=0,b=0;
 for(const file of files){const{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>12){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}}
 const side=Math.min(meta.size,Math.ceil(Math.max(r-l+1,b-t+1)+meta.size*.045));
 const crop={left:Math.max(0,Math.min(meta.size-side,Math.floor((l+r-side)/2))),top:Math.max(0,Math.min(meta.size-side,Math.floor((t+b-side)/2))),width:side,height:side};
 const size=384,columns=8,pieces=[];await mkdir(`${root}/menu-hd/${id}`,{recursive:true});
 for(let f=0;f<meta.count;f++){
  const source=sharp(files[f]).extract(crop);
  pieces.push({input:await source.clone().resize(size,size).png().toBuffer(),left:f%columns*size,top:Math.floor(f/columns)*size});
  await source.clone().resize(1024,1024).webp({quality:93,alphaQuality:100}).toFile(`${root}/menu-hd/${id}/${String(f).padStart(2,'0')}.webp`);
 }
 await sharp({create:{width:columns*size,height:Math.ceil(meta.count/columns)*size,channels:4,background:'#00000000'}}).composite(pieces).webp({quality:92,alphaQuality:100}).toFile(`${root}/turntable/${id}.webp`);
 const views=meta.views.map(v=>({...v,emitters:v.emitters.map(e=>({...e,x:(e.x*meta.size-crop.left)/side,y:(e.y*meta.size-crop.top)/side}))}));
 await writeFile(`${root}/turntable/${id}.json`,JSON.stringify({...meta,size,columns,views,sourceCrop:crop}));
 await sharp(files[0]).extract(crop).resize(1024,1024).webp({quality:94,alphaQuality:100}).toFile(`${root}/showroom/${id}.webp`);
 await writeFile(`${root}/showroom/${id}.json`,JSON.stringify({size:1024,emitters:views[0].emitters,source:i===14?'render-fleet-identity.py':'render-fleet-relief.py'}));
 await sharp(`${input}/player.png`).trim({threshold:8}).resize(512,512,{fit:'contain',background:'#00000000'}).png().toFile(`${root}/player/${id}.png`);
 console.log('PACKED_FLEET_IDENTITY',id);
}
