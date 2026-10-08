import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {COSMIC_FAUNA} from '../src/config/CosmicFaunaCatalog.js';
import {AssetManifest} from '../src/assets/assetManifest.js';
const expected=Number(process.env.FAUNA_EXPECTED_COUNT||42),rows=[];
assert.equal(COSMIC_FAUNA.length,expected,'Full set requires 42; an explicit smaller FAUNA_EXPECTED_COUNT is a local milestone check only');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const entry of COSMIC_FAUNA){
 const image=readFileSync('public'+entry.art),b=readFileSync('public'+entry.sound);
 assert.equal(image.toString('hex',0,8),'89504e470d0a1a0a');
 assert.equal(image[25],6,'RGBA production PNG required');
 const width=image.readUInt32BE(16),height=image.readUInt32BE(20);assert(width<=2048&&height<=2048);
 assert.equal(b.toString('ascii',0,4),'RIFF');let format,data;
 for(let i=12;i+8<=b.length;){const tag=b.toString('ascii',i,i+4),size=b.readUInt32LE(i+4),start=i+8;
  if(tag==='fmt ')format={codec:b.readUInt16LE(start),channels:b.readUInt16LE(start+2),rate:b.readUInt32LE(start+4),bits:b.readUInt16LE(start+14)};
  if(tag==='data')data=b.subarray(start,start+size);i=start+size+(size%2);
 }
 assert.deepEqual(format,{codec:1,channels:1,rate:44100,bits:16});assert(data?.length);
 let peak=0,squares=0;for(let i=0;i<data.length;i+=2){const sample=data.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(sample));squares+=sample*sample;}
 const seconds=data.length/2/44100,peakDb=20*Math.log10(peak),rmsDb=20*Math.log10(Math.sqrt(squares/(data.length/2)));
 assert(seconds>=3&&seconds<=6);assert(peakDb<=-4.7&&rmsDb>-45,entry.id+' audio clipping/silence');
 assert(JSON.stringify(AssetManifest).includes(entry.art)&&JSON.stringify(AssetManifest.audio).includes(entry.sound));
 rows.push({id:entry.id,width,height,artSha256:hash(image),audioSha256:hash(b),seconds,peakDb,rmsDb});
}
for(const key of ['id','artSha256','audioSha256'])assert.equal(new Set(rows.map(r=>r[key])).size,expected,key+' must be distinct');
const out=process.env.CHECK_OUTPUT_DIR;if(out){assert(out.replaceAll('\\','/').startsWith('E:/'));mkdirSync(out,{recursive:true});writeFileSync(path.join(out,'asset-validation.json'),JSON.stringify({expected,fullSet:expected===42,rows},null,2));}
console.log(JSON.stringify({passed:true,expected,fullSet:expected===42,rows}));
