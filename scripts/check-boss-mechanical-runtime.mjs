import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR,baseline=process.env.BOSS_RIG_BASELINE;
assert(out?.replaceAll('\\','/').startsWith('E:/'));assert(baseline);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const compiled=await fetch(`${process.env.CHECK_URL}/src/effects/ColossusRig.js`).then(r=>r.text());
const pixiPath=compiled.match(/from ["']([^"']*pixi__js\.js[^"']*)["']/)?.[1];assert(pixiPath);
await page.route('**/src/effects/ColossusRigBaseline.js',r=>r.fulfill({contentType:'text/javascript',body:readFileSync(baseline,'utf8').replace("from 'pixi.js'",`from '${pixiPath}'`)}));
try{
  await page.goto(`${process.env.CHECK_URL}/?offlineLeaderboard=1`);
  await page.waitForFunction(()=>document.body.dataset.menuReady==='1',null,{timeout:120000});
  const result=await page.evaluate(async()=>{
    const g=window.__game;g.app.ticker.stop();
    const {ColossusRig:Before}=await import('/src/effects/ColossusRigBaseline.js');
    const {ColossusRig:After,loadColossus}=await import('/src/effects/ColossusRig.js');
    const {COLOSSUS_FAMILIES}=await import('/src/config/BossReinvention.js');
    const {setReducedMotionEnabled}=await import('/src/config/AccessibilitySettings.js');
    const families=Object.keys(COLOSSUS_FAMILIES),before=[],after=[];
    for(const family of families){const tex=await loadColossus(family);before.push(new Before(tex,88,family,53));after.push(new After(tex,88,family,53));}
    const pose=rig=>[rig.x,rig.y,rig.rotation,rig.spine.x,rig.spine.y,rig.spine.rotation,...rig.halves.flatMap(h=>[h.x,h.y,h.rotation])];
    const rows=[],random=Math.random;let draws=0;
    Math.random=()=>{draws++;return .5;};
    try{
      for(let i=0;i<families.length;i++){
        let changed=0,maxDelta=0,joinedRotor=true;const b=before[i],a=after[i];
        for(const time of [.2,.8,1.3,2.5,3.7,5]){
          const state={time,phase:2,charge:0,recoil:0};b.update(state);a.update(state);
          const p=pose(b),q=pose(a);for(let j=0;j<p.length;j++)maxDelta=Math.max(maxDelta,Math.abs(p[j]-q[j]));
          if(JSON.stringify(p)!==JSON.stringify(q))changed++;
          if(a.design.layout==='rotor')joinedRotor&&=JSON.stringify(b.halves.map(h=>[h.x,h.y,h.rotation]))===JSON.stringify(a.halves.map(h=>[h.x,h.y,h.rotation]));
          const repeated=pose(a);a.update(state);if(JSON.stringify(repeated)!==JSON.stringify(pose(a)))throw Error('same-time instability');
        }
        let chargedEqual=true,reducedEqual=true;
        for(const charge of [.55,.8,1]){const state={time:2.4,phase:3,charge,recoil:.2};b.update(state);a.update(state);chargedEqual&&=JSON.stringify(pose(b))===JSON.stringify(pose(a));}
        setReducedMotionEnabled(true);
        for(const time of [0,2,99]){const state={time,phase:2,charge:.2,recoil:.1};b.update(state);a.update(state);reducedEqual&&=JSON.stringify(pose(b))===JSON.stringify(pose(a));}
        setReducedMotionEnabled(false);
        rows.push({family:families[i],changed,maxDelta,chargedEqual,reducedEqual,joinedRotor,childrenEqual:b.children.length===a.children.length});
      }
    }finally{Math.random=random;setReducedMotionEnabled(false);}
    for(const c of g.app.stage.children)c.visible=false;
    const layer=new g.app.stage.constructor();g.app.stage.addChild(layer);
    const show=(which,time=2.5)=>{
      layer.removeChildren();const rigs=which==='baseline'?before:after;
      rigs.forEach((r,i)=>{r.update({time,phase:2});r.x=128+(i%5)*256;r.y+=200+Math.floor(i/5)*390;layer.addChild(r);});g.app.render();
    };
    window.__bossMechanicalReview={g,before,after,layer,show};
    return{rows,draws};
  });
  for(const which of ['baseline','candidate']){
    await page.evaluate(which=>window.__bossMechanicalReview.show(which),which);
    await page.screenshot({path:`${out}/${which}.png`});
  }
  result.performance=await page.evaluate(()=>{
    const {g,before,after,layer}=window.__bossMechanicalReview;
    const sample=rigs=>{
      layer.removeChildren();rigs.forEach((r,i)=>{r.x=128+i%5*256;layer.addChild(r);});
      const samples=[];
      for(let f=0;f<240;f++){
        const start=performance.now();rigs.forEach((r,i)=>{r.update({time:f/60,phase:2});r.y+=200+Math.floor(i/5)*390;});g.app.render();
        if(f>=60)samples.push(performance.now()-start);
      }
      samples.sort((a,b)=>a-b);return{p50:samples[90],p95:samples[171],p99:samples[178],max:samples.at(-1)};
    };
    return{baseline:sample(before),candidate:sample(after),candidateSecond:sample(after),baselineSecond:sample(before)};
  });
  if(process.env.BOSS_RECORD==='1'){
    const recording=await page.evaluate(async()=>{
      const {g,show}=window.__bossMechanicalReview,stream=g.app.canvas.captureStream(30),chunks=[];
      const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:5000000});
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const done=new Promise(resolve=>recorder.onstop=resolve);recorder.start();
      await new Promise(resolve=>{const start=performance.now();const frame=now=>{show('candidate',(now-start)/1000);if(now-start<8000)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});
      recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
      const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let text='';
      for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
      return btoa(text);
    });
    writeFileSync(`${out}/boss-mechanical-motion.webm`,Buffer.from(recording,'base64'));
    result.recording={file:'boss-mechanical-motion.webm',seconds:8,audio:false,controlledTenRigGallery:true};
  }
  result.cleanup=await page.evaluate(()=>{
    const {before,after,layer}=window.__bossMechanicalReview;
    const textures=after.map(r=>r.sourceTexture);[...before,...after].forEach(r=>r.destroy({children:true}));layer.destroy({children:true});
    return{destroyed:[...before,...after].every(r=>r.destroyed),sharedAlive:textures.every(t=>!t.destroyed&&!t.source.destroyed)};
  });
  result.errors=errors;writeFileSync(`${out}/report.json`,JSON.stringify(result,null,2));
  assert.equal(errors.length,0);assert.equal(result.draws,0);assert(result.cleanup.destroyed&&result.cleanup.sharedAlive);
  for(const r of result.rows){assert.equal(r.changed,6,`${r.family} must show new mechanical articulation`);assert(r.maxDelta<=8);assert(r.chargedEqual,`${r.family} charged pose parity`);assert(r.reducedEqual,`${r.family} reduced motion parity`);assert(r.joinedRotor,`${r.family} idle hull wedges must stay connected`);assert(r.childrenEqual);}
  console.log(JSON.stringify({ok:true,rows:result.rows,performance:result.performance,cleanup:result.cleanup}));
}finally{await browser.close();}
