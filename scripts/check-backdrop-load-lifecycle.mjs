import assert from 'node:assert/strict';

globalThis.Audio = class {
  addEventListener() {} removeEventListener() {} pause() {}
  play() { return Promise.resolve(); }
};
const [{PlayScene}, PIXI, {PlanetVignettes}, {AudioManager}] = await Promise.all([
  import('../src/scenes/PlayScene.js'), import('pixi.js'),
  import('../src/effects/PlanetVignettes.js'), import('../src/audio/AudioManager.js')
]);
const original = {load:PIXI.Assets.load, unload:PIXI.Assets.unload,
  prewarm:PlanetVignettes.prewarm, setLevel:PlanetVignettes.prototype.setLevel,
  stop:AudioManager.stopSfxGroup};
const deferred = () => {
  let resolve; const promise = new Promise(r => { resolve=r; });
  return {promise,resolve};
};
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
const checks=[];
function fixture(queue=Promise.resolve()) {
  const scene=Object.create(PlayScene.prototype), parent=new PIXI.Container(), root=new PIXI.Container();
  parent.addChild(root);
  Object.assign(scene, {game:{level:1,app:{renderer:{}}}, starfieldContainer:root,
    gameplayBackdropLoadGeneration:0,sectorWorldLoadQueue:queue,
    prepareTextureForRender:async()=>{},setGameplayBackdropMode(){},updateGameplayBackdrop(){}});
  return {scene,parent,root,dispose(){parent.destroy({children:true});}};
}
try {
  AudioManager.stopSfxGroup=()=>{}; PIXI.Assets.unload=async()=>{};
  PlanetVignettes.prototype.setLevel=function(){};
  PlanetVignettes.prewarm=async()=>{};
  let loads=0; PIXI.Assets.load=async()=>{loads++;return PIXI.Texture.WHITE;};
  {
    const gate=deferred(), f=fixture(gate.promise);
    const pending=f.scene.initGameplayBackdrop(1280,720);
    f.scene.resetGameplayBackdropState(); gate.resolve(); await pending;
    const result={name:'reset while queued',loads,children:f.root.children.length,
      backdrop:!!f.scene.gameplayBackdrop,world:f.scene.sectorWorldSource};checks.push(result);
    f.dispose();
  }
  loads=0;
  {
    const f=fixture();await f.scene.initGameplayBackdrop(1280,720);
    const normalLoads=loads,normalChildren=f.root.children.length;
    assert(normalLoads>0&&normalChildren>0,'Fixture must exercise real backdrop construction');f.dispose();
    loads=0;const gate=deferred(), g=fixture(gate.promise);
    const stale=g.scene.initGameplayBackdrop(1280,720), current=g.scene.initGameplayBackdrop(1280,720);
    gate.resolve();await Promise.all([stale,current]);
    checks.push({name:'overlapping requests',loads,normalLoads,children:g.root.children.length,normalChildren});g.dispose();
  }
  {
    const gate=deferred(),f=fixture();let uploads=0,warms=0;
    PIXI.Assets.load=async()=>gate.promise;
    f.scene.prepareTextureForRender=async()=>{uploads++;};
    PlanetVignettes.prewarm=async()=>{warms++;};
    const pending=f.scene.initGameplayBackdrop(1280,720);await flush();
    f.scene.resetGameplayBackdropState();gate.resolve(PIXI.Texture.WHITE);await pending;
    checks.push({name:'reset while loading',uploads,warms,children:f.root.children.length});f.dispose();
  }
  {
    const gate=deferred(),f=fixture();let warms=0;
    PIXI.Assets.load=async()=>PIXI.Texture.WHITE;
    f.scene.prepareTextureForRender=async()=>gate.promise;
    PlanetVignettes.prewarm=async()=>{warms++;};
    const pending=f.scene.initGameplayBackdrop(1280,720);await flush();
    f.scene.resetGameplayBackdropState();gate.resolve();await pending;
    checks.push({name:'reset while uploading',warms,children:f.root.children.length});f.dispose();
  }
  console.log(JSON.stringify({checks},null,2));
  assert.deepEqual(checks[0],{name:'reset while queued',loads:0,children:0,backdrop:false,world:null},'Retired queued request repopulates scene');
  assert.equal(checks[1].loads,checks[1].normalLoads,'Superseded queued request starts redundant asset work');
  assert.equal(checks[1].children,checks[1].normalChildren,'Superseded request leaves duplicate displays');
  assert.deepEqual(checks[2],{name:'reset while loading',uploads:0,warms:0,children:0},'Retired load starts GPU warmup');
  assert.deepEqual(checks[3],{name:'reset while uploading',warms:0,children:0},'Retired upload starts planet warmup');
  assert(!PIXI.Texture.WHITE.destroyed,'Lifecycle destroys shared texture');
  console.log('[backdrop] PASS queued/reset/overlap/load/upload cancellation and shared texture');
} finally {
  PIXI.Assets.load=original.load;PIXI.Assets.unload=original.unload;
  PlanetVignettes.prewarm=original.prewarm;PlanetVignettes.prototype.setLevel=original.setLevel;
  AudioManager.stopSfxGroup=original.stop;
}
