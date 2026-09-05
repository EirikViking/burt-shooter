import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {createDefaultHangarProgress,normalizeHangarProgress} from '../src/progression/HangarProgressState.js';
import {STARTER_SHIP_IDS} from '../src/config/ShipUnlockConfig.js';
import {buildTacticalDraftOffers} from '../src/config/TacticalDraft.js';
const out='test-results/astra-engagement-integrity';mkdirSync(out,{recursive:true});
assert.deepEqual(createDefaultHangarProgress().unlockedShipIds,STARTER_SHIP_IDS);
const oldSave={unlockTuningVersion:3,pilotXpExact:'87654321',unlockedShipIds:['nova_ship_02','nova_ship_24','nova_ship_26'],shipUnlockHistory:{nova_ship_26:{reasonKey:'shipUnlock.reason.requirements',source:'run_complete',unlockedAt:'2026-08-01T00:00:00.000Z'}},bestSector:4,totalRuns:9};
const migrated=normalizeHangarProgress(oldSave);
assert.equal(migrated.pilotXpExact,oldSave.pilotXpExact);assert.equal(migrated.totalRuns,9);
for(const id of [...STARTER_SHIP_IDS,...oldSave.unlockedShipIds])assert.ok(migrated.unlockedShipIds.includes(id),`Preserve ${id}`);
assert.equal(migrated.shipUnlockHistory.nova_ship_26.unlockedAt,oldSave.shipUnlockHistory.nova_ship_26.unlockedAt);
assert.deepEqual(normalizeHangarProgress(migrated).unlockedShipIds,migrated.unlockedShipIds);
for(let i=0;i<64;i++)assert.deepEqual(buildTacticalDraftOffers({openingLoadoutChoice:true,seed:`opening-${i}`}).map(x=>x.id),['pierce','double_shot','drones']);
const oldDraft=execFileSync('git',['show','88007cb:src/config/TacticalDraft.js'],{encoding:'utf8'}).replaceAll("'./","'/src/config/");
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().endsWith('/astra-old-draft.js')?r.fulfill({contentType:'text/javascript',body:oldDraft}):/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.request().url())||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
await page.goto('http://127.0.0.1:4399/?offlineLeaderboard=1');await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
const result=await page.evaluate(async()=>{
 const {EnemyManager}=await import('/src/managers/EnemyManager.js'),{buildTacticalDraftOffers:newOffers}=await import('/src/config/TacticalDraft.js'),{buildTacticalDraftOffers:oldOffers}=await import('/astra-old-draft.js');
 const waveCounts=[];for(const mode of ['ranked','ranked_tactical','daily_signal','scout']){const m={game:{runMode:mode},level:1,isBossLevel:true,currentWaveIndex:2,bossSpawnedThisLevel:false,bossDefeatedThisLevel:false};waveCounts.push({mode,first:EnemyManager.prototype.getNormalWaveCount.call(m,8,1),later:EnemyManager.prototype.getNormalWaveCount.call(m,9,2),spacing:EnemyManager.prototype.shouldAddBossSpacingWave.call(m)});}
 let parity=0;for(let i=0;i<64;i++){const options={seed:`daily-parity-${i}`,sectorCleared:1+i%12,lives:i%3+1,selectedIds:i%2?['rapid_fire','shield']:[],baseShotCount:i%4+1};if(JSON.stringify(newOffers(options))!==JSON.stringify(oldOffers(options)))throw Error(`Daily offer regression ${i}`);parity++;}
 return {waveCounts,parity};
});for(const row of result.waveCounts){assert.equal(row.first,row.mode==='daily_signal'?5:3);assert.ok(row.later>=5);assert.equal(row.spacing,row.mode==='daily_signal');}assert.equal(result.parity,64);
await page.evaluate(()=>window.__game.startGame(window.__game.selectedShipSpriteKey));await page.waitForFunction(()=>window.__game.scenes.play?.player?.active,null,{timeout:120000});
result.live=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.markUnrankedRun('astra_draft_check');p.openTacticalDraft(1);return {mode:g.runMode,ineffective:p.getIneffectiveTacticalDraftOfferIds(),selected:p.player.runAugmentIds,offers:p.tacticalDraft?.offers?.map(x=>x.id)};});
writeFileSync(`${out}/report.json`,JSON.stringify({passed:false,...result,starters:STARTER_SHIP_IDS,savePreserved:true,errors},null,2));
assert.deepEqual(result.live.offers,['pierce','double_shot','drones']);assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/opening-draft.png`});writeFileSync(`${out}/report.json`,JSON.stringify({passed:true,...result,starters:STARTER_SHIP_IDS,savePreserved:true,errors},null,2));console.log('PASS: 3 starters, preserved save/history/XP, live opening choice, normal source-sector pacing, later-sector rules and exact Daily draft parity');
}finally{await browser.close();}
