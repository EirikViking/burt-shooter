import assert from 'node:assert/strict';
globalThis.Audio=class{addEventListener(){}removeEventListener(){}pause(){}play(){return Promise.resolve();}};
const {CosmicFauna}=await import('../src/effects/CosmicFauna.js');
const {Container}=await import('pixi.js');
const gate=()=>{let resolve;return{promise:new Promise(r=>resolve=r),resolve:v=>resolve(v)};};
const scene={game:{gameId:'test',lives:3,app:{renderer:{prepare:{upload:async()=>{}}}}},isGameplayClockAdvancing:()=>true};
function entry(){return{definition:{id:'owned'},audio:{pause(){},removeAttribute(){},load(){}},rig:new Container(),texture:{destroyed:false,destroy(){this.destroyed=true;}},bitmap:{closed:false,close(){this.closed=true;}},released:false};}
{
 const loading=gate(),f=new CosmicFauna(scene,{load:()=>loading.promise}),e=entry();
 f.destroy();loading.resolve(e);await f.pending;
 assert(e.released&&e.rig.destroyed&&e.texture.destroyed&&e.bitmap.closed,'late decoded asset must be released');
 assert.equal(f.next,null,'late load may not attach to retired scene');
}
{
 const preparing=gate(),e=entry();scene.game.app.renderer.prepare.upload=()=>preparing.promise;
 const f=new CosmicFauna(scene,{load:async()=>e});await f.pending;f.prepareNext();f.destroy();
 assert.equal(e.texture.destroyed,false,'in-flight renderer still owns the upload source');
 preparing.resolve();await f.preparation;
 assert(e.released&&e.rig.destroyed&&e.texture.destroyed&&e.bitmap.closed,'retired upload must release after completion');
}
console.log('[cosmic-fauna] PASS late decode, retired upload, owned resource release');
