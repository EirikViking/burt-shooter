import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import {GENERATED_ENEMY_PROFILES} from '../src/config/GeneratedEnemyProfiles.js';
import {BOSS_SUPPORT_SHIPS} from '../src/config/BossSupportShips.js';
import {AssetManifest} from '../src/assets/assetManifest.js';
import {getThreatCodexCatalog} from '../src/config/ThreatCodexCatalog.js';
const source=execFileSync('git',['show','95173e4:src/config/GeneratedEnemyProfiles.js'],{encoding:'utf8'}).replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${pathToFileURL(path.resolve('src/config',p)).href}'`);
const before=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const oldSupportSource=execFileSync('git',['show','95173e4:src/config/BossSupportShips.js'],{encoding:'utf8'}).replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${pathToFileURL(path.resolve('src/config',p)).href}'`);
const oldSupport=await import(`data:text/javascript;base64,${Buffer.from(oldSupportSource).toString('base64')}`);
const supportNames=new Set();
for(let i=0;i<BOSS_SUPPORT_SHIPS.length;i++){
 const {displayName,...now}=BOSS_SUPPORT_SHIPS[i],{displayName:oldName,...old}=oldSupport.BOSS_SUPPORT_SHIPS[i];
 assert.deepEqual(now,old,`Support gameplay profile changed: ${i}`);
 assert.ok(!/\d/.test(displayName));assert.ok(!supportNames.has(displayName));supportNames.add(displayName);
 if(oldName==='Halo Button 2')console.log(`Screenshot regression fixture: ${now.id}, now ${displayName}`);
}
const names=new Set();
for(let i=0;i<GENERATED_ENEMY_PROFILES.length;i++){
 const {displayName,...now}=GENERATED_ENEMY_PROFILES[i],{displayName:oldName,...old}=before.GENERATED_ENEMY_PROFILES[i];
 assert.deepEqual(now,old,`Gameplay profile changed: ${i}`);
 assert.ok(!/\d/.test(displayName),displayName);assert.ok(!names.has(displayName),displayName);names.add(displayName);
}
let decoded=0;
for(let i=0;i<AssetManifest.generated.fleetV5Count;i++){
 const id=String(i+1).padStart(3,'0'),receipt=JSON.parse(readFileSync(`docs/astra-v5-models/registration/${id}.json`));
 const {data,info}=await sharp(`public/art/astra/fleet-v5/${id}.png`).raw().toBuffer({resolveWithObject:true});
 assert.equal(info.channels,4);assert.equal(info.width,receipt.baseline.width);assert.equal(info.height,receipt.baseline.height);decoded+=data.length;
 let l=info.width,t=info.height,r=-1,b=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}
 const box={left:l,top:t,width:r-l+1,height:b-t+1};for(const k of Object.keys(box))assert.ok(Math.abs(box[k]-receipt.baseline.box[k])<=1,`${id} ${k} registration`);
}
const ranks=getThreatCodexCatalog().pilotRanks;
assert.equal(new Set(ranks.map(r=>r.art)).size,40);ranks.forEach((r,i)=>assert.equal(r.art,AssetManifest.sprites.ranks[i]));
console.log(`PASS: ${names.size} unique callsigns; all gameplay profile fields identical; ${AssetManifest.generated.fleetV5Count} registered hulls (${(decoded/1048576).toFixed(2)} MiB decoded); 40 actual rank badges.`);
