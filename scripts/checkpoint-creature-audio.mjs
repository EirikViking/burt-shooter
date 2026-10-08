// Preserve the prepared integration while provider authorization is pending.
// Only this task's six runtime edits are parked; no user changes are reset or discarded.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const files=['src/effects/SpaceSnakeDeath.js','src/entities/Boss.js','src/entities/Enemy.js','src/entities/SpaceSnake.js','src/managers/EnemyManager.js','src/scenes/PlayScene.js'];
const root='docs/creature-audio';
const patch=execFileSync('git',['diff','--binary','--',...files],{maxBuffer:8e6});
if(!patch.length)throw Error('No integration changes to checkpoint');
fs.writeFileSync(`${root}/integration.patch`,patch);
for(const file of files){
 const current=fs.readFileSync(file);fs.mkdirSync(`${root}/pending/${file.slice(0,file.lastIndexOf('/'))}`,{recursive:true});
 fs.writeFileSync(`${root}/pending/${file}`,current);
 const base=execFileSync('git',['show',`db53532:${file}`],{maxBuffer:4e6,timeout:30000});
 const temp=`${file}.creature-checkpoint.tmp`;fs.writeFileSync(temp,base);fs.renameSync(temp,file);
}
console.log('Prepared runtime changes preserved in integration.patch and pending sources; existing game audio remains active.');
