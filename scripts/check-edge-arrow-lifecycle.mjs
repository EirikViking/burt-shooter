import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const out = process.env.CHECK_OUTPUT_DIR;
assert.ok(out, 'Set CHECK_OUTPUT_DIR to the task evidence directory');
fs.mkdirSync(out, {recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  const page = await browser.newPage({viewport:{width:1920,height:1080}});
  await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:4377'}/?autostart=1&offlineLeaderboard=1`);
  await page.waitForFunction(()=>window.__game?.scenes.play?.player?.active, null, {timeout:90000});
  const result = await page.evaluate(async()=>{
    const g=window.__game, p=g.scenes.play;
    g.app.ticker.stop(); p.introActive=false; if(p.introOverlay)p.introOverlay.visible=false;
    const Graphics=p.stragglerBeaconLayer.constructor;
    const {presentDirectionalSignal}=await import('/src/effects/MicroSignalVfx.js');
    const {GameAssets}=await import('/src/utils/GameAssets.js');
    await GameAssets.ensureMicroSignalTexture('direction');
    const host=new Graphics();host.label='arrow-lifecycle-owner';p.gameContainer.addChild(host);
    const arrow=presentDirectionalSignal(host,'test',{x:1875,y:350,directionX:1,directionY:0,size:65});
    const mount=arrow.parent;
    const horizontalRotation=arrow.rotation;
    // Graphics.clear() does not clear sprites mounted alongside the Graphics.
    // Real owner removal must clean the sibling, even without a final update.
    host.parent.removeChild(host);host.destroy({children:true});
    g.app.renderer.render({container:g.app.stage});
    const orphanVisible=!mount.destroyed&&!!mount.parent&&mount.visible&&arrow.visible;
    // Reparenting can create a fresh signal without retaining the old mount.
    const reused=new Graphics();p.gameContainer.addChild(reused);
    const old=presentDirectionalSignal(reused,'reuse',{directionX:1,directionY:0});
    p.gameContainer.removeChild(reused);p.gameContainer.addChild(reused);
    const fresh=presentDirectionalSignal(reused,'reuse',{directionX:-1,directionY:0});
    const reparented=old.destroyed&&!fresh.destroyed&&fresh.parent.parent===p.gameContainer;
    reused.destroy({children:true});
    // An existing pickup arrow must hide on every early return, including loss
    // of the player reference, without waiting for another edge-guide update.
    const pickup=p.powerupManager.spawnSpecific(1940,350,'pierce');
    pickup.drawPickupEdgeGuide(p,pickup.pickupGuide,{distance:400,guideRadius:230,timeUrgency:.8});
    pickup.updatePickupGuide({player:null},100);
    const pickupHidden=[...(pickup.pickupGuide.__novaMicroSignalSprites?.values()||[])].every(s=>!s.visible);
    pickup.active=false;p.powerupManager.update(0,p);
    g.app.renderer.render({container:g.app.stage});
    return {orphanVisible,horizontalRotation,reparented,pickupHidden};
  });
  await page.screenshot({path:path.join(out,'arrow-lifecycle.png')});
  fs.writeFileSync(path.join(out,'arrow-lifecycle.json'),JSON.stringify(result,null,2));
  assert.equal(result.orphanVisible,false,'A removed graphic must not leave a visible arrow');
  assert.ok(Math.abs(result.horizontalRotation-Math.PI/2)<1e-8,'A horizontal arrow must remain horizontal');
  assert.equal(result.reparented,true,'Reparenting recreates one valid arrow');
  assert.equal(result.pickupHidden,true,'Pickup early returns hide previous arrows');
  console.log('PASS removed-owner arrow disposal and horizontal direction');
} finally { await browser.close(); }
