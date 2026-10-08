import fs from 'node:fs';
import sharp from 'sharp';
import {SNAKE_BROOD_FAMILIES} from '../src/config/SnakeBroods.js';
const source=process.env.BROOD_ART_SOURCE||'docs/snake-broods/juvenile-atlas-source.png';
const out='public/art/snake-broods';fs.mkdirSync(out,{recursive:true});
const {width,height}=await sharp(source).metadata(),names=[...SNAKE_BROOD_FAMILIES.map(f=>f.id),'egg','plasma'];
for(let i=0;i<16;i++){
 const x=Math.round(i%4*width/4),y=Math.round(Math.floor(i/4)*height/4);
 const w=Math.round((i%4+1)*width/4)-x,h=Math.round((Math.floor(i/4)+1)*height/4)-y;
 await sharp(source).extract({left:x,top:y,width:w,height:h}).resize(256,256,{fit:'contain',background:'#00000000'}).extend({top:12,bottom:12,left:12,right:12,background:'#00000000'}).webp({quality:94,alphaQuality:100}).toFile(`${out}/${names[i]}.webp`);
}
console.log('Prepared 14 authored juvenile sprites, hatch membrane and plasma texture');
