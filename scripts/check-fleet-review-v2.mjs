import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5199/docs/fleet-art-v2/review.html');
 await page.waitForSelector('nav button');
 const ids=await page.locator('nav button').evaluateAll(bs=>bs.map(b=>b.dataset.id));
 assert.equal(ids.length,30);
 for(const id of ids){
  await page.locator(`nav button[data-id="${id}"]`).click();
  for(const mode of ['menu','hangar','combat','clay']){
   await page.locator(`button[data-mode="${mode}"]`).click();
   await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0),null,{timeout:30000});
  }
 }
 await page.locator('nav button[data-id="27"]').click();await page.locator('button[data-mode="menu"]').click();
 await page.screenshot({path:'docs/fleet-art-v2/review-page.png'});
 const duration=await page.locator('video').evaluate(async v=>{if(v.readyState<1)await new Promise((resolve,reject)=>{v.onloadedmetadata=resolve;v.onerror=reject});return v.duration;});
 assert.ok(duration>180);assert.deepEqual(errors,[]);
 await fs.writeFile('docs/fleet-art-v2/review-check.json',JSON.stringify({ships:ids.length,modesPerShip:4,allImagesLoaded:true,videoDuration:duration,errors},null,2));
 console.log('REVIEW_PASS',ids.length,duration);
}finally{await browser.close();}
