import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage();const messages=[];page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')messages.push(m.text());});
await page.addInitScript(()=>{window.__shaderLogs=[];for(const Type of [WebGLRenderingContext,WebGL2RenderingContext]){const old=Type.prototype.getProgramInfoLog;Type.prototype.getProgramInfoLog=function(p){const log=old.call(this,p);if(log)window.__shaderLogs.push({log,shaders:this.getAttachedShaders(p).map(s=>({type:this.getShaderParameter(s,this.SHADER_TYPE),source:this.getShaderSource(s)}))});return log;};}});
await page.goto('http://127.0.0.1:5199/?skipIntro=1&offlineLeaderboard=1');await page.waitForTimeout(18000);
await fs.writeFile('docs/fleet-art-v2/shader-diagnosis.json',JSON.stringify({messages,programs:await page.evaluate(()=>window.__shaderLogs)},null,2));await browser.close();console.log(messages);
