import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
// Run the installed skill's actual client with the already installed Chrome.
// Its default bundled Chromium is absent on this host. No skill file is edited.
const client='C:/Users/cromk/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js';
const require=createRequire(client),{chromium}=require('playwright');
const launch=chromium.launch.bind(chromium);
chromium.launch=options=>launch({...options,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await import(pathToFileURL(client).href);
