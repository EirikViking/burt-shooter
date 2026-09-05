import sharp from 'sharp';
import {mkdir,readFile,copyFile,writeFile} from 'node:fs/promises';
const start=Number(process.argv[2]||0),count=Number(process.argv[3]||30);
await mkdir('public/art/astra/turntable',{recursive:true});
for(let i=start;i<start+count;i++){
 const id=String(i+1).padStart(2,'0'),root=`docs/astra-v3-models/renders/turntable/${id}`;
 const data=JSON.parse(await readFile(`${root}/views.json`,'utf8'));
 const columns=8,rows=Math.ceil(data.count/columns),size=i===0?768:384;
 let l=data.size,t=data.size,r=0,b=0;
 const files=Array.from({length:data.count},(_,f)=>`${root}/${String(f).padStart(2,'0')}.png`);
 for(const path of files){
  const {data:p,info}=await sharp(path).raw().toBuffer({resolveWithObject:true});
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(p[(y*info.width+x)*4+3]>12){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}
 }
 const side=Math.min(data.size,Math.ceil(Math.max(r-l+1,b-t+1)+data.size*.05));
 const crop={left:Math.max(0,Math.min(data.size-side,Math.floor((l+r-side)/2))),top:Math.max(0,Math.min(data.size-side,Math.floor((t+b-side)/2))),width:side,height:side};
 const pieces=[];
 for(let f=0;f<data.count;f++)pieces.push({input:await sharp(files[f]).extract(crop).resize(size,size).png().toBuffer(),left:f%columns*size,top:Math.floor(f/columns)*size});
 await sharp({create:{width:columns*size,height:rows*size,channels:4,background:'#00000000'}}).composite(pieces).webp({quality:91,alphaQuality:100,effort:5}).toFile(`public/art/astra/turntable/${id}.webp`);
 const views=data.views.map(v=>({...v,emitters:v.emitters.map(e=>({...e,x:(e.x*data.size-crop.left)/side,y:(e.y*data.size-crop.top)/side}))}));
 await writeFile(`public/art/astra/turntable/${id}.json`,JSON.stringify({...data,size,columns,views,sourceCrop:crop}));
 // The redesigned Quasar uses the same registered view for its static fallback.
 if(i===6){
  await sharp(files[0]).extract(crop).resize(768,768).webp({quality:94,alphaQuality:100}).toFile(`public/art/astra/showroom/${id}.webp`);
  await writeFile(`public/art/astra/showroom/${id}.json`,JSON.stringify({size:768,emitters:views[0].emitters,source:'Original Blender Quasar model; render-astra-turntable.py and pack-astra-turntables.mjs'}));
 }
 console.log('packed turntable',id);
}
