import assert from 'node:assert/strict';
import {readFile,stat,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
let bytes=0,frames=0;
for(let i=1;i<=30;i++){
 const root=`public/art/astra/menu-hd/${String(i).padStart(2,'0')}`,meta=JSON.parse(await readFile(`${root}/source.json`));
 assert.equal(meta.count,72);assert.equal(meta.size,1024);assert.equal(meta.renderSize,1280);
 for(let f=0;f<72;f++){
  const file=`${root}/${String(f).padStart(2,'0')}.webp`,image=await sharp(file).metadata();
  assert.equal(image.width,1024,file);assert.equal(image.height,1024,file);assert.ok(image.hasAlpha,file);bytes+=(await stat(file)).size;frames++;
 }
}
const result={status:'passed',ships:30,frames,bytes,displayedTextureBytes:1024*1024*4,maxConcurrentDetailTextures:2};
await mkdir('test-results',{recursive:true});await writeFile('test-results/astra-menu-hd-assets.json',JSON.stringify(result,null,2));console.log(result);
