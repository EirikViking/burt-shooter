import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const out = process.env.CHECK_OUTPUT_DIR;
assert(out?.startsWith('E:'), 'Use E: for evidence');
mkdirSync(out, {recursive:true});
const browser = await chromium.launch({channel:'chrome', headless:true});
const errors=[];
try {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror', e=>errors.push(e.message));
  await page.goto(`${process.env.CHECK_URL}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
  await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete, null, {timeout:120000});
  const result=await page.evaluate(async()=>{
    const g=window.__game, s=g.scenes.play;
    g.app.ticker.stop();
    if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe policy');
    await s.combatMaterialWarmup;
    const {ParticleManager}=await import('/src/effects/ParticleManager.js');
    const {AstraDetonation}=await import('/src/effects/AstraDetonation.js');
    const {GameAssets}=await import('/src/utils/GameAssets.js');
    const Container=s.container.constructor, Sprite=s.player.shipSprite.constructor, Texture=s.player.shipSprite.texture.constructor;
    const descendants=root=>[root,...root.children.flatMap(child=>child.children?descendants(child):[child])];

    const pm=s.particleManager;
    pm.createExplosion(100,100,0xff6600,1);
    const body=new Sprite(Texture.WHITE);
    pm.hullBreakup.emit({body,x:100,y:100,radius:20,kind:'enemy'});
    const frame=pm.hullBreakup.active[0].sprite.texture;
    const displays=[...pm.pool,...pm.particles].flatMap(p=>[p.sprite,p.bitmap]).filter(Boolean);
    const owned=[...displays,...pm.energyBloomPool,...pm.energyBlooms.map(b=>b.sprite),
      ...pm.detonations.pool.flatMap(descendants),...pm.detonations.active.flatMap(e=>descendants(e.display)),
      ...descendants(pm.premiumImpacts.root),...pm.hullBreakup.bossPieces.map(p=>p.mesh),...pm.hullBreakup.active.map(f=>f.sprite)];
    const shared=s.player.shipSprite.texture;
    const before={score:g.score,lives:g.lives};
    g.switchScene('menu');
    const teardown={owned:owned.length,destroyed:owned.filter(n=>n.destroyed).length,
      arraysEmpty:[pm.particles,pm.pool,pm.energyBlooms,pm.energyBloomPool,pm.detonations.active,pm.detonations.pool,pm.hullBreakup.active,pm.hullBreakup.pool,pm.hullBreakup.bossPieces].every(a=>a.length===0),
      frameDestroyed:frame.destroyed,sharedAlive:!shared.destroyed&&!Texture.WHITE.destroyed,
      gameplayUnchanged:g.score===before.score&&g.lives===before.lives};
    pm.destroy?.();

    const root=new Container(), late=new ParticleManager(root);
    late.prewarm(3);
    const original=GameAssets.ensurePlasmaBloomTextures;
    let release;
    GameAssets.ensurePlasmaBloomTextures=()=>new Promise(resolve=>{release=resolve;});
    const pending=late.prewarmEnergyBlooms(3);
    late.destroy?.();
    release();
    let count;
    try{count=await pending;}finally{GameAssets.ensurePlasmaBloomTextures=original;}
    const lateBloom={count,children:root.children.length,pool:late.energyBloomPool.length};
    late.destroy?.(); root.destroy({children:true});

    const detRoot=new Container(), d=new AstraDetonation(detRoot);
    const preparing=d.prepare(g.app.renderer);
    d.destroy?.();
    await preparing;
    const lateDetonation={children:detRoot.children.length,pool:d.pool.length,emits:d.emit(300,300)};
    d.destroy?.();detRoot.destroy({children:true});body.destroy();
    return {teardown,lateBloom,lateDetonation,policy:g.runPolicy};
  });
  writeFileSync(`${out}/report.json`,JSON.stringify({result,errors},null,2));
  assert.deepEqual(errors,[]);
  assert.equal(result.teardown.destroyed,result.teardown.owned,'Leaving Play retains effect displays');
  assert(result.teardown.arraysEmpty,'Leaving Play retains effect pools');
  assert(result.teardown.frameDestroyed,'Owned hull frame survives teardown');
  assert(result.teardown.sharedAlive,'Teardown destroys shared assets');
  assert(result.teardown.gameplayUnchanged,'Teardown changes score/lives');
  assert.deepEqual(result.lateBloom,{count:0,children:0,pool:0},'Late bloom warmup repopulates retired scene');
  assert.deepEqual(result.lateDetonation,{children:0,pool:0,emits:false},'Late atlas warmup repopulates retired scene');
  console.log('[optimization] PASS exact effect teardown, shared assets, repeated disposal, late warmup');
} finally {await browser.close();}
