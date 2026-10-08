import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:/Codex/'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4983'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=molt`);
  await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.view,null,{timeout:120000});
  const result=await page.evaluate(async()=>{
    const g=window.__game,s=g.scenes.play;g.app.ticker.stop();
    if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe test');
    const {IonDriveVisual,updateRescueDrives,updateCapitalDrives}=await import('/src/effects/IonDriveVisual.js');
    const parent=s.firstLightDirector.view.wing,drive=new IonDriveVisual(parent);
    const settings={x:100,y:100,angle:Math.PI/2,beam:16,length:70,reduced:true,flash:0};
    drive.update({...settings,throttle:0,age:0});
    const low={nozzle:[drive.nozzle.width,drive.nozzle.height],flame:drive.flame.width,alpha:drive.flame.alpha};
    drive.update({...settings,throttle:1,age:0});
    const high={nozzle:[drive.nozzle.width,drive.nozzle.height],flame:drive.flame.width};
    for(let i=0;i<300;i++)drive.update({...settings,throttle:1,age:i/60});
    const stable=high.flame===drive.flame.width;
    const source=drive.nozzle.texture.source,owned=[...drive.textures];drive.destroy();drive.destroy();
    const disposed=owned.every(t=>t.destroyed)&&!source.destroyed;
    const drives=Array.from({length:4},()=>new IonDriveVisual(parent));
    const ships=[-1,1].map(side=>({x:400+side*60,y:750,width:70,height:72,rotation:Math.PI,alpha:1,visible:true}));
    const escorts=[-1,1].map(side=>({side,age:2,joinAge:2})),before=JSON.stringify({ships,escorts});
    const axes=[];
    for(const angle of [-.6,0,.6]){
      ships[0].rotation=Math.PI+angle;ships[1].rotation=Math.PI-angle;
      updateRescueDrives(drives,ships,escorts,{reduced:true,flash:0});
      for(let i=0;i<4;i++){
        const ship=ships[Math.floor(i/2)],d=drives[i],a=d.root.rotation;
        axes.push({angleError:Math.abs(a-(ship.rotation-Math.PI/2)),aft:(d.root.x-ship.x)*Math.cos(a)+(d.root.y-ship.y)*Math.sin(a)});
      }
    }
    ships.forEach(s=>s.rotation=Math.PI);
    const unchanged=before===JSON.stringify({ships,escorts});
    const count=parent.children.length;
    for(let i=0;i<300;i++)updateRescueDrives(drives,ships,escorts,{reduced:true,flash:0});
    const bounded=parent.children.length===count;
    updateRescueDrives(drives,ships,[],{});const hidden=drives.every(d=>!d.root.visible);
    drives.forEach(d=>d.destroy());
    const capital=Array.from({length:6},()=>new IonDriveVisual(parent));
    const panels=[-1,1].map(side=>({x:960,y:280,width:940,height:785,rotation:side*.02,visible:true,alpha:1}));
    updateCapitalDrives(capital,panels,{age:2,reduced:true,flash:0});
    const positions=capital.map(d=>({x:d.root.x,y:d.root.y,angle:d.root.rotation,alpha:d.root.alpha,flame:d.flame.width}));
    panels[0].x-=90;panels[1].x+=90;updateCapitalDrives(capital,panels,{age:9,reduced:true,flash:0,charge:1});
    const capitalTracks=capital.every((d,i)=>Math.abs(d.root.x-positions[i].x-(i<3?-90:90))<1e-6&&d.root.y===positions[i].y);
    const capitalStable=capital.every((d,i)=>d.flame.width===positions[i].flame);
    const warningDucks=capital.every((d,i)=>d.root.alpha<positions[i].alpha);
    const outward=capital.every((d,i)=>i<3?Math.cos(d.root.rotation)<0:Math.cos(d.root.rotation)>0);
    capital.forEach(d=>d.destroy());
    return {low,high,stable,disposed,axes,unchanged,bounded,hidden,capitalTracks,capitalStable,warningDucks,outward};
  });
  writeFileSync(path.join(out,'report.json'),JSON.stringify({result,errors},null,2));
  assert.deepEqual(result.low.nozzle,result.high.nozzle,'Throttling must not stretch the rigid nozzle');
  assert(result.high.flame>result.low.flame&&result.low.alpha>0);
  for(const k of ['stable','disposed','unchanged','bounded','hidden','capitalTracks','capitalStable','warningDucks','outward'])assert(result[k],k);
  for(const a of result.axes)assert(a.angleError<1e-9&&a.aft>0,'Drive must remain in its rotating aft socket');
  assert.deepEqual(errors,[]);console.log('[ion-drive-geometry] PASS rigid metal, aft banks, Reduced Motion, low Flash Intensity, ownership and disposal');
}finally{await browser.close();}
