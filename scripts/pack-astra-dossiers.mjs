import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
for(const family of ['enemy','boss']){
 await mkdir(`public/art/astra/dossier/${family}`,{recursive:true});
 for(let i=1;i<=50;i++){
  const id=String(i).padStart(2,'0'),newSource=`docs/astra-v3-models/renders/${family}/${id}.png`;
  const source=family==='boss'&&existsSync(newSource)?newSource:`docs/astra-v2-models/renders/${family}/${id}.png`;
  await sharp(source).trim({threshold:8}).resize(640,640,{fit:'contain',background:'#00000000'}).webp({quality:94,alphaQuality:100}).toFile(`public/art/astra/dossier/${family}/${id}.webp`);
 }
 console.log('Packed high-resolution codex family',family,50);
}
