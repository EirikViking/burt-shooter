import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import { chromium } from 'playwright';
import { MYSTERIES } from '../src/config/Mysteries.js';
import { mkdirSync,writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const out='test-results/mysteries/counterplay';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>/^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(r.request().url())?r.continue():r.abort());
await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=> 'mystery:glass_widow'};});
try{
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5213'}/?skipIntro=1&offlineLeaderboard=1`,{waitUntil:'domcontentloaded',timeout:120000});
 await launchEncounterTestFromHangar(page);
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.mysteryDirector?.active,null,{timeout:120000});
 await page.evaluate(()=>{const g=window.__game;g.app.ticker.stop();g.scenes.play.isDebugInvincibleActive=()=>true;});
 for(const profile of MYSTERIES){
  const row=await page.evaluate(async profile=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager;m.clearEnemies();p.clearEnemyBullets();
   const {createMysteryEncounter}=await import('/src/entities/mysteries/createMysteryEncounter.js');
   const root=await createMysteryEncounter(m,profile.id);root.audio=null;
   for(let i=0;i<210;i++){root.update(1);p.bulletManager.update(1);}
   const before=g.score,breaks=[];
   for(const part of root.parts.filter(part=>part.maxHealth>0&&part.active)){
    const result=p.applyCombatDamage(part,1e6,'bomb');if(result)throw Error(`${profile.id} component awarded kill`);
    breaks.push(part.name);
   }
   root.update(1);
   if(root.zones.some(zone=>zone.owner?.active===false))throw Error('Destroyed component retained attack');
   if(g.score!==before)throw Error('Component gave score');
   const semantic={};
   if(profile.id==='cinder_manta')semantic.wings=root.wings.every(p=>!p.active);
   if(profile.id==='foldship')semantic.vulnerable=root.damageMultiplier()>1;
   if(profile.id==='bloom_queen')semantic.branches=root.buds.every(p=>!p.active);
   if(profile.id==='rail_cathedral')semantic.carriages=root.carriages.every(p=>!p.active);
   if(profile.id==='constellation_beast')semantic.limbs=root.limbs.every(p=>!p.active);
   if(profile.id==='eventide_engine')semantic.steering=root.damageMultiplier()>1;
   if(profile.id==='dying_star')semantic.coolers=root.coolers.every(p=>!p.active)&&root.heat<.005;
   if(profile.id==='worldmolt')semantic.cover=root.cover.length===2&&root.damageMultiplier()>1;
   if(profile.id==='witness')semantic.chambers=root.chambers.every(p=>!p.active);
   if(profile.id==='gilded_pilgrim')semantic.reward=root.additionalBonus()===1000;
   if(profile.id==='fortune_leech')semantic.reward=root.additionalBonus()===1000;
   for(const [key,value] of Object.entries(semantic))if(!value)throw Error(`${profile.id} counterplay ${key} failed`);
   const expected=2500+Math.min(7500,Math.max(0,m.level-11)*100)+Math.max(0,Math.min(2500,Math.floor(Number(root.additionalBonus?.())||0)));
   const killed=p.applyCombatDamage(root,1e6,'bomb'),again=p.applyCombatDamage(root,1e6,'bomb');
   const row={id:profile.id,breaks,semantic,killed,again,expected,bonus:g.score-before};root.destroy();root.destroy();return row;
  },profile);
  assert.ok(row.killed&&!row.again);assert.equal(row.bonus,row.expected);rows.push(row);assert.deepEqual(errors,[]);
 }
 writeFileSync(`${out}/results.json`,JSON.stringify({rows,errors},null,2));console.log('PASS',rows.length,'component breaks and kill-once bonuses; linked-attack and reward counterplay');
}finally{await browser.close();}
