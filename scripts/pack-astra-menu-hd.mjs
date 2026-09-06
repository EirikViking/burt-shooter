// Original Blender renders, registered to the existing turntable camera/crop.
// Individual views avoid a 288 MiB full-resolution atlas per menu ship.
import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const start=Number(process.argv[2]||0),count=Number(process.argv[3]||30);
for(let i=start;i<start+count;i++){
 const id=String(i+1).padStart(2,'0'),source=`docs/astra-v3-models/renders/menu-hd/${id}`,out=`public/art/astra/menu-hd/${id}`;
 const hd=JSON.parse(await readFile(`${source}/views.json`)),atlas=JSON.parse(await readFile(`public/art/astra/turntable/${id}.json`));
 const original=JSON.parse(await readFile(`docs/astra-v3-models/renders/turntable/${id}/views.json`));
 if(hd.count!==atlas.count)throw Error(`Frame count mismatch: ${id}`);
 const ratio=hd.size/original.size,c=atlas.sourceCrop;
 const crop={left:Math.round(c.left*ratio),top:Math.round(c.top*ratio),width:Math.round(c.width*ratio),height:Math.round(c.height*ratio)};
 await mkdir(out,{recursive:true});
 for(let f=0;f<hd.count;f++)await sharp(`${source}/${String(f).padStart(2,'0')}.png`).extract(crop).resize(1024,1024).webp({quality:94,alphaQuality:100,effort:4}).toFile(`${out}/${String(f).padStart(2,'0')}.webp`);
 await writeFile(`${out}/source.json`,JSON.stringify({source:'Original Blender geometry: render-astra-turntable.py with ASTRA_MENU_HD=1',size:1024,count:hd.count,renderSize:hd.size,crop}));
 console.log('packed menu HD',id);
}
