import assert from 'node:assert/strict';
import { presentationFrame, effectEnvelope, PREMIUM_LIMITS } from '../src/game/PremiumPresentation.js';
for (const reduced of [false,true]) for (const flash of [0,.25,1]) {
  const frame=presentationFrame({age:3,stage:'reactor',charge:.9,recoil:.1,reduced,flash});
  assert(Number.isFinite(frame.hullOffset));assert(frame.reactorReveal===1);
  assert(frame.flashAlpha<=flash);if(reduced)assert.equal(frame.recoilOffset,0);
}
assert.equal(effectEnvelope(2,1).alpha,0);
assert.equal(effectEnvelope(-1,1).alpha,0);
assert(PREMIUM_LIMITS.impacts<=24&&PREMIUM_LIMITS.debris<=16);
assert.deepEqual(presentationFrame({age:1,stage:'battery',charge:0,recoil:0,reduced:true,flash:0}),
  presentationFrame({age:1,stage:'battery',charge:0,recoil:0,reduced:true,flash:0}));
console.log('[premium-presentation] PASS finite bounded visual envelopes and accessibility');
