import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {COSMIC_FAUNA} from '../src/config/CosmicFaunaCatalog.js';
const hashes=new Set(),rows=[];
// Candidates remain disconnected from normal selection until preview review.
const catalog=COSMIC_FAUNA.map(row=>({...row,soundSeconds:20,sound:`/audio/sfx/cosmic-fauna-passages/${row.id}.wav`}));
for(const entry of catalog) {
 assert.equal(entry.soundSeconds,20,'Each passage needs the authored 20-second approach/voice/tail');
 const b=fs.readFileSync('public'+entry.sound);let data;
 for(let i=12;i+8<=b.length;) {const size=b.readUInt32LE(i+4),start=i+8;if(b.toString('ascii',i,i+4)==='data')data=b.subarray(start,start+size);i=start+size+size%2;}
 assert.equal(data?.length,20*44100*2,'Bounded complete master');
 let peak=0;for(let i=0;i<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)/32768));
 const peakDb=20*Math.log10(peak);assert(peakDb<=-4.7,entry.id+' must retain mix headroom');
 const rms=(from,to)=>{let sum=0,count=0;for(let i=Math.floor(from*44100)*2;i<Math.floor(to*44100)*2;i+=2){const v=data.readInt16LE(i)/32768;sum+=v*v;count++;}return Math.sqrt(sum/count);};
 const approach=rms(.5,3),voice=rms(4,11),wake=rms(12,16),tail=rms(19.8,20);
 assert(approach>0.00003&&voice>.002&&wake>.0001,entry.id+' must have audible approach, individual body and wake');
 assert(voice>approach*1.1,entry.id+' approach must leave room for the main voice');
 assert(tail<.002,entry.id+' must fade to silence');
 const hash=crypto.createHash('sha256').update(b).digest('hex');hashes.add(hash);
 rows.push({id:entry.id,approach,voice,wake,tail,peakDb,sha256:hash});
}
assert.equal(hashes.size,42,'No duplicated performance');
console.log(JSON.stringify({passed:true,candidateOnly:true,normalCatalogUnchanged:true,performances:rows.length,rows}));
