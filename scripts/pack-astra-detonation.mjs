// Original Blender combustion frames; fixed registration keeps expansion smooth.
import sharp from 'sharp';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='public/art/astra/detonation';mkdirSync(out,{recursive:true});
const size=448,frames=24,columns=6;
const generation=process.argv[2]||'v2';
const layers=[];for(let i=0;i<frames;i++)layers.push({input:`docs/astra-${generation}-models/renders/detonation/${String(i+1).padStart(2,'0')}.png`,left:(i%columns)*size,top:Math.floor(i/columns)*size});
await sharp({create:{width:size*columns,height:size*4,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).webp({quality:91,alphaQuality:100,effort:6}).toFile(`${out}/combustion.webp`);
writeFileSync(`${out}/combustion.json`,JSON.stringify({size,count:frames,columns,source:`Original Blender volumetric combustion; render-astra-detonation${generation==='v3'?'-v3':''}.py`}));
console.log('Packed 24 registered combustion frames into one 2688x1792 WebP atlas.');
