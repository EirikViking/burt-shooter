import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.goto((process.env.CHECK_URL||'http://127.0.0.1:5215')+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__game?.scenes.play,null,{timeout:120000});
 const checks=await page.evaluate(async()=>{
  const {MysteryEncounterDirector}=await import('/src/managers/MysteryEncounterDirector.js');
  const Container=window.__game.app.stage.constructor;
  const {mysteryAssetDiagnostics}=await import('/src/entities/mysteries/MysteryAssets.js');
  const {AudioManager}=await import('/src/audio/AudioManager.js');AudioManager.voiceEnabled=false;
  const checks=[];
  for(const kind of ['grunt','space_snake','boss']){
   const g=Object.create(window.__game),p=Object.create(g.scenes.play);let wipes=0;
   p.clearEnemyBullets=()=>wipes++;p.recordThreatDiscovery=()=>{};p.announceMystery=()=>{};
   g.scenes={play:p};g.mysteriesSeen=['glass_widow'];g.mysteriesRecent=[];
   const companion={kind,active:true},m={game:g,level:31,enemies:[companion],container:new Container(),spawning:true,currentWaveIndex:0};
   const d=new MysteryEncounterDirector(m);d.plan={selected:true,sector:31,id:'glass_widow',delaySeconds:0};
   const intercepted=d.tryStart({type:kind==='boss'?'BOSS':'grunt',mysteryId:'glass_widow'});
   for(let i=0;i<200&&!d.pending?.ready&&!d.pending?.error;i++)await new Promise(r=>setTimeout(r,50));
   if(!d.pending?.ready)throw Error(d.pending?.error?.message||'Fixture atlas load timed out');
   d.update(0);const root=d.active;
   if(!root)throw Error('No mixed actor');
   checks.push({kind,intercepted,wipes,spawning:m.spawning,companionAlive:m.enemies.includes(companion)&&companion.active,root:root.type});
   d.cancel();m.container.destroy({children:true});
  }
  return {checks,refs:mysteryAssetDiagnostics().reduce((n,r)=>n+r.refs,0)};
 });
 for(const c of checks.checks){assert.equal(c.intercepted,false);assert.equal(c.wipes,0);assert.equal(c.spawning,true);assert.equal(c.companionAlive,true);assert.equal(c.root,'glass_widow');}
 assert.equal(checks.refs,0);fs.mkdirSync((process.env.CHECK_OUTPUT_DIR||'test-results/mystery-tour'),{recursive:true});fs.writeFileSync((process.env.CHECK_OUTPUT_DIR||'test-results/mystery-tour')+'/coexistence.json',JSON.stringify(checks,null,2));
 console.log('PASS real actor coexistence fixtures: ordinary, snake, boss; no bullet wipes; spawning and cleanup preserved');
}finally{await browser.close();}
