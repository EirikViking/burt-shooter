import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
// Run the installed skill's actual client with the already installed Chrome.
// Its default bundled Chromium is absent on this host. No skill file is edited.
const client='C:/Users/cromk/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js';
const require=createRequire(client),{chromium}=require('playwright');
const launch=chromium.launch.bind(chromium);
chromium.launch=async options=>{
  const browser=await launch({...options,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const newPage=browser.newPage.bind(browser);
  browser.newPage=async options=>{
    const page=await newPage(options);
    await page.addInitScript(()=>{
      const original=HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL=function(...args){
        const app=window.__game?.app;
        if(app?.canvas===this)app.renderer.render(app.stage);
        return original.apply(this,args);
      };
    });
    return page;
  };
  return browser;
};
await import(pathToFileURL(client).href);
