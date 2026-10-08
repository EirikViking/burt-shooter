import sharp from 'sharp';
import path from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root=process.argv[2];
if(!root || !/^E:[\\/]/i.test(root))throw new Error('Pass the owned E asset input directory');
const output='public/art/first-light';mkdirSync(output,{recursive:true});
const rows=[];
for(const [kind,names,folder,suffix] of [
  ['convoy',['talon','pearl','ark'],'ui-review/convoy-assets','-original'],
  ['rival',['lancer','forge','vortex','wasp','oracle'],'audio/rival-art','']
])for(const id of names){
  const input=path.join(root,folder,`${id}${suffix}.png`);
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=0,bottom=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>2){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  const dest=path.join(output,`${kind}-${id}.webp`);
  await sharp(input).extract({left,top,width:right-left+1,height:bottom-top+1})
    .resize({width:1024,height:1024,fit:'inside'}).extend({top:16,bottom:16,left:16,right:16,background:'#00000000'})
    .webp({quality:92,alphaQuality:100}).toFile(dest);
  rows.push({id,input,output:dest,sha256:createHash('sha256').update(readFileSync(dest)).digest('hex'),normalization:'alpha bounds, fit inside 1024, 16px transparent margin; no painted edits'});
}
const atlas=await sharp(path.join(root,'flame-review/boss-fire-atlas.png')).resize(1776,888).png().toBuffer();
const cells=[];
for(let i=0;i<8;i++){
  const cell=await sharp(atlas).extract({left:(i%4)*444,top:Math.floor(i/4)*444,width:444,height:444}).png().toBuffer();
  const {data,info}=await sharp(cell).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=444,top=444,right=0,bottom=0;
  for(let y=0;y<444;y++)for(let x=0;x<444;x++)if(data[(y*444+x)*4+3]>2){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  const input=await sharp(cell).extract({left,top,width:right-left+1,height:bottom-top+1})
    .resize(384,192,{fit:'contain',background:'#00000000'}).png().toBuffer();
  cells.push({input,left:(i%4)*384,top:Math.floor(i/4)*192});
}
await sharp({create:{width:1536,height:384,channels:4,background:'#00000000'}}).composite(cells)
  .webp({quality:94,alphaQuality:100}).toFile(path.join(output,'boss-fire-atlas.webp'));
await sharp(path.join(root,'audio/explosion-atlas-original.png')).resize(1776,888)
  .webp({quality:92,alphaQuality:100}).toFile(path.join(output,'impact-atlas.webp'));
writeFileSync('docs/art/first-light-polish-assets.json',JSON.stringify({tool:'built-in imagegen',assets:rows,convoy:JSON.parse(readFileSync(path.join(root,'ui-review/convoy-assets/prompts.json'))),rival:JSON.parse(readFileSync(path.join(root,'audio/rival-art/provenance.json')))},null,2));
console.log('Normalized eight hulls and the 4x2 fire atlas.');
