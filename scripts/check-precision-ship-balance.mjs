import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {ShipData} from '../src/config/ShipData.js';
import {buildSelectableShipVariants} from '../src/config/VisualVariantCatalog.js';
import {calculateSustainedShipDps} from '../src/config/ShipThreatResponse.js';
const oldSource=execFileSync('git',['show','3dcfd4a:src/config/ShipData.js'],{encoding:'utf8'});
const {ShipData:oldData}=await import('data:text/javascript;base64,'+Buffer.from(oldSource).toString('base64'));
const before=buildSelectableShipVariants(oldData),after=buildSelectableShipVariants(ShipData);
const changed=new Set(['nova_ship_03','nova_ship_08','nova_ship_20','nova_ship_21']);
const starter=calculateSustainedShipDps(after.find(s=>s.id==='nova_ship_01'));
const rows=[];
for(const ship of after){
 const old=before.find(s=>s.id===ship.id);assert.ok(old);
 if(!changed.has(ship.id)){assert.deepEqual(ship,old,`${ship.id} outside the four underperforming precision hulls`);continue;}
 const dps=calculateSustainedShipDps(ship),prior=calculateSustainedShipDps(old);
 assert.ok(prior<starter*.5&&dps>=starter*.62&&dps<=starter*.75,'Useful single-target output, still below broad starter total damage');
 assert.equal(ship.weapon.bullets,1);assert.deepEqual(ship.weapon,old.weapon);assert.deepEqual(ship.hitbox,old.hitbox);
 for(const key of ['speed','fireRate','bulletSpeed'])assert.equal(ship.stats[key],old.stats[key]);
 assert.deepEqual(ship.trait,old.trait);assert.deepEqual(ship.unlock,old.unlock);
 rows.push({ship:ship.name,beforeDps:+prior.toFixed(2),afterDps:+dps.toFixed(2)});
}
assert.equal(rows.length,4);console.log('PASS precision viability; 26 other hulls, hitboxes, movement, reload, traits and unlocks preserved',rows);
