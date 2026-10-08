import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],rows=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL}/?autostart=1&offlineLeaderboard=1&encounterEvolution=reactor-tow`);await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.model.encounter?.surprise,null,{timeout:90000});await page.evaluate(()=>window.__game.app.ticker.stop());
 for(const locale of ['en','de','es','pt-BR','ru','zh-CN','ko','ja'])for(const [width,height]of [[1280,720],[800,600],[720,1280]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  const result=await page.evaluate(async locale=>{
   const {reactorTowText:convoySurpriseText,getReactorTowSourceText:getConvoySurpriseSourceText}=await import('/src/i18n/reactorTowText.js'),CONVOY_SURPRISES=[{id:'reactor-tow'}],{FirstLightModel}=await import('/src/game/ArcadeFirstLight.js'),{makeConvoySurprise}=await import('/src/game/ConvoySurprises.js');await window.__novaI18n.setLanguagePreference(locale);
   const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,translations=getConvoySurpriseSourceText(locale),checks=[];
   for(const row of CONVOY_SURPRISES){d.cancel('layout');d.model=new FirstLightModel('layout');d.model.encounter={kind:'convoy',sector:3,age:3,suspended:false,...makeConvoySurprise(row.id,1)};d.update(1);g.app.render();
    const labels=[d.view.title,d.view.hint].map((label,i)=>{const b=label.getBounds();return{text:label.text,expected:translations[convoySurpriseText(d.model.encounter,i?'hint':'title')],x:b.x,y:b.y,w:b.width,h:b.height};});
    checks.push({id:row.id,labels,screen:{w:g.app.renderer.width,h:g.app.renderer.height}});
   }
   return checks;
  },locale);
  rows.push({locale,width,height,checks:result});
  for(const c of result)for(const label of c.labels){assert.equal(label.text,label.expected);assert(label.x>=-2&&label.y>=0&&label.x+label.w<=c.screen.w+2&&label.y+label.h<=c.screen.h+2,JSON.stringify({locale,width,height,c}));assert(!/[□�]/.test(label.text));}
  if(width===1280||locale==='de')await page.screenshot({path:path.join(out,`${locale}-${width}x${height}.png`)});
 }
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({rows,errors},null,2));console.log('[reactor-localization] PASS 24 reactor/language/layout fixtures');
}finally{await browser.close();}

