import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import sharp from 'sharp';
import {shadeHullPixels} from '../src/effects/AstraHullMaterial.js';

const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.startsWith('E:'));
mkdirSync(out,{recursive:true});
const source=readFileSync('E:/Codex/builds/nova-swarm/optimization/source-before/src/effects/AstraHullMaterial.js','utf8');
const definition=source.slice(source.indexOf('export function shadeHullPixels'),source.indexOf('export function getAstraHullTexture')).replace('export ','');
const baseline=new Function(`${definition}; return shadeHullPixels;`)();
const fixtures=[];
for(const [width,height]of [[1,1],[1,31],[29,1],[7,11],[512,512]]){
  const input=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<input.length;i++)input[i]=(i*37+(i>>3)*13)%256;
  fixtures.push({name:`${width}x${height}`,input,width,height});
}
const image=await sharp('public/art/solid-fleet-20260908/player/02.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
fixtures.push({name:'actual-second-hull',input:new Uint8ClampedArray(image.data),width:image.info.width,height:image.info.height});
for(const f of fixtures){
  const copy=new Uint8ClampedArray(f.input),expected=baseline(f.input,f.width,f.height);
  assert.deepEqual(shadeHullPixels(f.input,f.width,f.height),expected,`Pixel mismatch ${f.name}`);
  assert.deepEqual(f.input,copy,'Shading mutates source art');
}
const f=fixtures.at(-1),samples={baseline:[],candidate:[]};
// Alternate the order so JIT/thermal/order effects do not always favor one path.
for(let i=0;i<12;i++){
 for(const name of i%2?['candidate','baseline']:['baseline','candidate']){
  const start=performance.now();(name==='baseline'?baseline:shadeHullPixels)(f.input,f.width,f.height);
  if(i>=3)samples[name].push(performance.now()-start);
 }
}
const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return {n:values.length,median:sorted[Math.floor(sorted.length/2)],p95:sorted.at(-1),max:sorted.at(-1)};};
const result={fixtures:fixtures.map(f=>f.name),byteIdentical:true,inputUnchanged:true,baseline:stats(samples.baseline),candidate:stats(samples.candidate),unit:'milliseconds for CPU-only actual 512px hull shading',samples};
writeFileSync(`${out}/report.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
