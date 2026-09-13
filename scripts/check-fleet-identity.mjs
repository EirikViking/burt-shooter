import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {BONUS_DRONES} from '../src/config/BonusDroneCatalog.js';
import {getBonusDroneText,getBonusDroneSourceText} from '../src/i18n/bonusDroneText.js';
import {AssetManifest} from '../src/assets/assetManifest.js';
const added=BONUS_DRONES.filter(d=>!d.legacy);
assert.equal(added.length,15);assert.equal(new Set(added.map(d=>d.id)).size,15);assert.equal(new Set(added.map(d=>d.score)).size,15);
const hashes=new Set();
for(const drone of BONUS_DRONES){
 assert.equal(AssetManifest.generated.bonusDrones[drone.textureIndex],drone.art);
 const bytes=fs.readFileSync('public'+drone.art);hashes.add(createHash('sha256').update(bytes).digest('hex'));
 for(const locale of ['en','de','es','pt-BR','ru','zh-CN','ja','ko']){
  const copy=getBonusDroneText(drone,locale);assert.ok(copy.name&&copy.description&&copy.tip.includes(String(drone.score)));
  if(locale!=='en'){assert.notEqual(copy.tip,getBonusDroneText(drone,'en').tip);assert.notEqual(copy.description,getBonusDroneText(drone,'en').description);}
  assert.ok(getBonusDroneSourceText(locale)['Bonus Drones']);
 }
}
assert.equal(hashes.size,BONUS_DRONES.length);
for(let i=0;i<30;i++){
 const id=String(i+1).padStart(2,'0'),root='public/art/fleet-identity-20260908';
 assert.ok(fs.existsSync('public'+AssetManifest.generated.playerPresentation[i]));
 const data=JSON.parse(fs.readFileSync(`${root}/turntable/${id}.json`));
 assert.equal(data.count,48);assert.equal(data.views.length,data.count);assert.equal(data.columns,8);
 assert.ok(fs.statSync(`${root}/turntable/${id}.webp`).size>10000);assert.ok(fs.existsSync(`${root}/showroom/${id}.webp`));
 for(let f=0;f<data.count;f++){
  assert.ok(fs.existsSync(`${root}/menu-hd/${id}/${String(f).padStart(2,'0')}.webp`));
  assert.ok(data.views[f].emitters.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&e.x>=0&&e.x<=1&&e.y>=0&&e.y<=1));
 }
}
const receipt=JSON.parse(fs.readFileSync('docs/fleet-identity-20260908/hangar-audio-receipt.json'));
assert.equal(receipt.length,4);
for(const stem of receipt){assert.equal(stem.request.model_id,'eleven_text_to_sound_v2');assert.ok(stem.request.loop);assert.equal(createHash('sha256').update(fs.readFileSync(stem.file)).digest('hex'),stem.sha256);}
console.log('PASS 15 additional drone identities/rewards, 8 locales, 30 complete matching fleet sets and 4 verified ElevenLabs stems');
