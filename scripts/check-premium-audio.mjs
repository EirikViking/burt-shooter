import assert from 'node:assert/strict';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const directory='public/audio/sfx/encounter-premium',rows=[];
for(const file of readdirSync(directory).filter(f=>f.endsWith('.wav'))){
 const b=readFileSync(path.join(directory,file));assert.equal(b.toString('ascii',0,4),'RIFF');let format,data;
 for(let offset=12;offset+8<=b.length;){const id=b.toString('ascii',offset,offset+4),size=b.readUInt32LE(offset+4),start=offset+8;
  if(id==='fmt ')format={codec:b.readUInt16LE(start),channels:b.readUInt16LE(start+2),rate:b.readUInt32LE(start+4),bits:b.readUInt16LE(start+14)};
  if(id==='data')data=b.subarray(start,start+size);offset=start+size+(size%2);}
 assert.deepEqual(format,{codec:1,channels:1,rate:44100,bits:16});assert(data?.length);
 let peak=0,squares=0;for(let i=0;i<data.length;i+=2){const sample=data.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(sample));squares+=sample*sample;}
 const seconds=data.length/2/44100,peakDb=20*Math.log10(peak),rmsDb=20*Math.log10(Math.sqrt(squares/(data.length/2)));
 assert(seconds>=.45&&seconds<=3,file);assert(peakDb<=-6&&rmsDb>-55,`${file}: clipping/silence`);
 rows.push({file,seconds,peakDb,rmsDb,sha256:createHash('sha256').update(b).digest('hex')});
}
assert.equal(rows.length,20);const output=process.env.CHECK_OUTPUT_DIR;if(output){assert(output.startsWith('E:'));writeFileSync(path.join(output,'audio-validation.json'),JSON.stringify({status:'passed',rows},null,2));}
console.log(`[premium-audio] PASS ${rows.length} mono 44.1kHz mastered WAVs, finite duration, no clipping/silence`);
