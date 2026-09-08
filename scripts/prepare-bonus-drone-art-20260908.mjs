import fs from 'node:fs/promises';
import sharp from 'sharp';
import crypto from 'node:crypto';
const root='public/art/bonus-drones-20260908';
const doc=JSON.parse(await fs.readFile('docs/bonus-drones-20260908/imagegen-provenance.json','utf8'));
for(const dir of ['codex','gameplay'])await fs.mkdir(`${root}/${dir}`,{recursive:true});
for(const asset of doc.assets){
 const id=String(asset.id).padStart(2,'0');const data=await fs.readFile(asset.path);const meta=await sharp(data).metadata();
 const stats=await sharp(data).stats();if(!meta.hasAlpha||stats.channels[3].min!==0)throw Error(`Missing transparency ${id}`);
 await sharp(data).resize(1024,1024,{fit:'contain',background:'#00000000'}).webp({lossless:true}).toFile(`${root}/codex/${id}.webp`);
 await sharp(data).resize(256,256,{fit:'contain',background:'#00000000'}).png().toFile(`${root}/gameplay/${id}.png`);
 asset.sourceSha256=crypto.createHash('sha256').update(data).digest('hex');asset.width=meta.width;asset.height=meta.height;
 console.log(`${id} ${asset.name}: ${meta.width}x${meta.height}, alpha verified`);
}
await fs.writeFile('docs/bonus-drones-20260908/imagegen-provenance.json',JSON.stringify(doc,null,2)+'\n');
