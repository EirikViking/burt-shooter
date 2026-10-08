import assert from 'node:assert/strict';import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';import path from 'node:path';
import{VISUAL_LIFE_SOUND_CATALOG,VISUAL_LIFE_SOUND_MIX,visualDestructionSource}from'../src/audio/VisualLifeSounds.js';
const rows=[];
for(const file of readdirSync('public/audio/sfx/visual-life').filter(f=>f.endsWith('.wav'))){
 const b=readFileSync(`public/audio/sfx/visual-life/${file}`);assert.equal(b.toString('ascii',0,4),'RIFF');let format,data;
 for(let i=12;i+8<=b.length;){const tag=b.toString('ascii',i,i+4),size=b.readUInt32LE(i+4),start=i+8;if(tag==='fmt ')format={codec:b.readUInt16LE(start),channels:b.readUInt16LE(start+2),rate:b.readUInt32LE(start+4),bits:b.readUInt16LE(start+14)};if(tag==='data')data=b.subarray(start,start+size);i=start+size+(size%2);}
 assert.deepEqual(format,{codec:1,channels:1,rate:44100,bits:16});let peak=0,squares=0;
 for(let i=0;i<data.length;i+=2){const s=data.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(s));squares+=s*s;}
 const seconds=data.length/2/44100,rmsDb=20*Math.log10(Math.sqrt(squares/(data.length/2))),peakDb=20*Math.log10(peak);
 assert(seconds>=.7&&seconds<=2.5,file);assert(peakDb<=-6&&rmsDb>-55,`${file}: clipping/silent`);rows.push({file,seconds,peakDb,rmsDb});
}
assert.equal(rows.length,21);assert.equal(Object.keys(VISUAL_LIFE_SOUND_CATALOG).length,21);
assert.equal(new Set(Array.from({length:12},(_,i)=>visualDestructionSource('enemy_explode',i))).size,12);
assert.equal(visualDestructionSource('boss_warning',0),null);
assert.equal(new Set(Array.from({length:3},(_,i)=>visualDestructionSource('boss_death_cascade',i))).size,3);
for(const id of Object.keys(VISUAL_LIFE_SOUND_MIX).filter(id=>id.includes('planet'))){const m=VISUAL_LIFE_SOUND_MIX[id];assert(m.volume<=.2&&m.priority===1&&m.minIntervalMs>=28000);}
const out=process.env.CHECK_OUTPUT_DIR;if(out){assert(out.startsWith('E:'));mkdirSync(out,{recursive:true});writeFileSync(path.join(out,'audio-validation.json'),JSON.stringify({status:'passed',rows},null,2));}
console.log('PASS: 21 finite mastered WAVs, no clipping/silence; 12 destruction/3 boss routings and subdued planetary mix');
