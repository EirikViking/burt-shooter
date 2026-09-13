import sharp from 'sharp';import {readFile,mkdir,writeFile} from 'node:fs/promises';
const sources=JSON.parse(await readFile('docs/astra-v3-models/threat-sources.json','utf8'));
const family=process.argv[2]||'elites',start=Number(process.argv[3]||0),count=Number(process.argv[4]||sources[family].length);
async function bounds(src){const {data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=info.width,t=info.height,r=0,b=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}return {width:info.width,height:info.height,box:{left:l,top:t,width:r-l+1,height:b-t+1}};}
await mkdir(`public/art/astra/${family}`,{recursive:true});await mkdir(`public/art/astra/dossier/${family}`,{recursive:true});await mkdir('docs/astra-v3-models/registration',{recursive:true});
for(const p of sources[family].slice(start,start+count)){
 const id=String(p.index+1).padStart(family==='boss'?2:3,'0'),src=`docs/astra-v3-models/renders/${family}/${id}.png`;
 const baseline=await bounds(`public${p.original}`),render=await bounds(src);
 let pixels=await sharp(src).extract(render.box).resize(baseline.box.width,baseline.box.height,{fit:'fill'}).png().toBuffer();
 for(let j=0;j<3;j++){const b=await bounds(pixels);if(b.box.left<2&&b.box.top<2&&Math.abs(b.box.width-baseline.box.width)<2&&Math.abs(b.box.height-baseline.box.height)<2)break;pixels=await sharp(pixels).extract(b.box).resize(baseline.box.width,baseline.box.height,{fit:'fill'}).png().toBuffer();}
 const result=await sharp({create:{width:baseline.width,height:baseline.height,channels:4,background:'#00000000'}}).composite([{input:pixels,left:baseline.box.left,top:baseline.box.top}]).png().toBuffer();
 await writeFile(`public/art/astra/${family}/${id}.png`,result);
 await sharp(src).extract(render.box).resize(560,560,{fit:'contain',background:'#00000000'}).webp({quality:94,alphaQuality:100}).toFile(`public/art/astra/dossier/${family}/${id}.webp`);
 await writeFile(`docs/astra-v3-models/registration/${family}-${id}.json`,JSON.stringify({id:p.id,original:p.original,baseline,candidate:await bounds(result)}));
 console.log('Packed threat',family,id);
}
