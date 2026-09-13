// Normalize the original generated animation sheet without changing its art.
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const source='docs/astra-v3-models/source/reactor-burst.png';
const meta=await sharp(source).metadata();
if(!meta.hasAlpha)throw Error('The combustion sheet must contain genuine alpha');
const size=384,columns=4,frames=16,layers=[];
for(let i=0;i<frames;i++){
 const x=i%4,y=Math.floor(i/4),left=Math.round(x*meta.width/4),top=Math.round(y*meta.height/4);
 const width=Math.round((x+1)*meta.width/4)-left,height=Math.round((y+1)*meta.height/4)-top;
 const input=await sharp(source).extract({left,top,width,height}).resize(340,340,{fit:'fill'}).png().toBuffer();
 layers.push({input,left:x*size+22,top:y*size+22});
}
await sharp({create:{width:size*4,height:size*4,channels:4,background:'#00000000'}}).composite(layers).webp({quality:94,alphaQuality:100,effort:6}).toFile('public/art/astra/detonation/combustion.webp');
await writeFile('public/art/astra/detonation/combustion.json',JSON.stringify({size,count:frames,columns,source:'Original built-in generated reactor-burst sheet; pack-astra-reactor-burst.mjs'}));
console.log('Packed registered sixteen-phase reactor burst, 1536 square');
