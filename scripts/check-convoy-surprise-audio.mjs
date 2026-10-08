import assert from 'node:assert/strict';import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';
import {CONVOY_SURPRISE_CUES,CONVOY_SURPRISE_SOUND_CATALOG,CONVOY_SURPRISE_SOUND_MIX} from '../src/audio/ConvoySurpriseSounds.js';
const receipt=JSON.parse(readFileSync('docs/audio/convoy-surprises-20261002.json')),rows=[];
for(const id of CONVOY_SURPRISE_CUES){
 const file=`public${CONVOY_SURPRISE_SOUND_CATALOG[`rescue_${id}`][0]}`,b=readFileSync(file);
 assert.equal(b.toString('ascii',0,4),'RIFF');let format,data;
 for(let i=12;i+8<=b.length;){const tag=b.toString('ascii',i,i+4),size=b.readUInt32LE(i+4),start=i+8;if(tag==='fmt ')format={codec:b.readUInt16LE(start),channels:b.readUInt16LE(start+2),rate:b.readUInt32LE(start+4),bits:b.readUInt16LE(start+14)};if(tag==='data')data=b.subarray(start,start+size);i=start+size+(size%2);}
 assert.deepEqual(format,{codec:1,channels:1,rate:44100,bits:16});let peak=0,squares=0;
 for(let i=0;i<data.length;i+=2){const sample=data.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(sample));squares+=sample*sample;}
 const seconds=data.length/88200,peakDb=20*Math.log10(peak),rmsDb=20*Math.log10(Math.sqrt(squares/(data.length/2)));
 assert(seconds>=.9&&seconds<=1.9);assert(peakDb<=-2.9&&rmsDb>-35,id);
 assert.equal(crypto.createHash('sha256').update(b).digest('hex'),receipt.cues.find(c=>c.id===id).wavSha256);
 assert(CONVOY_SURPRISE_SOUND_MIX[`rescue_${id}`].priority===2);rows.push({id,seconds,peakDb,rmsDb});
}
assert.equal(new Set(receipt.cues.map(c=>c.sourceSha256)).size,8);
if(process.env.CHECK_OUTPUT_DIR){assert(process.env.CHECK_OUTPUT_DIR.startsWith('E:'));mkdirSync(process.env.CHECK_OUTPUT_DIR,{recursive:true});writeFileSync(path.join(process.env.CHECK_OUTPUT_DIR,'audio-validation.json'),JSON.stringify({status:'passed',rows,limit:'Static decoding/levels/provenance; listening still needs human review'},null,2));}
console.log('[rescue-audio] PASS eight distinct, finite, mastered, hashed WAVs with bounded mix');
