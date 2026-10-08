import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PREMIUM_SOUND_MIX} from '../src/audio/PremiumSounds.js';
const mix=PREMIUM_SOUND_MIX;
assert(mix.premium_battery_charge.priority>mix.premium_orbit_hit.priority,'hostile lead-in must outrank repeat player impacts');
assert(mix.premium_weaver_arm.priority>mix.premium_wing_depart.priority,'arming lead-in must outrank departure decoration');
assert(mix.premium_battery_charge.priorityHoldMs>=400);
assert(mix.premium_orbit_hit.minIntervalMs>=150,'hammer contacts must not layer six impact sounds per tick');
for(const cue of Object.values(mix)){assert(cue.volume>0&&cue.volume<=1);assert(cue.priority<=9);assert(cue.priorityDuckFactor<1);}
const receipt=JSON.parse(readFileSync('docs/audio/playthrough-polish-20260930.json','utf8'));
assert.equal(receipt.files.length,20);for(const cue of receipt.files){assert(cue.gainDb<=8.001&&cue.gainDb>0);assert(cue.peakDb<=-6.79);assert(cue.sha256!==cue.initialSHA256);}
console.log('[playthrough-polish] PASS warning hierarchy, bounded repeat sound, unchanged-volume-bus gains and finite mastered asset headroom');
