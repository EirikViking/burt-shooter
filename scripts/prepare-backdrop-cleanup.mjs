import {readFileSync,writeFileSync} from 'node:fs';
const input=readFileSync('src/scenes/PlayScene.js','utf8');let text=input;
function edit(old,replacement){if(text.split(old).length!==2)throw Error('Expected one source match: '+old.slice(0,80));text=text.replace(old,replacement);}
if(text.includes("import { PlanetVignettes } from '../effects/PlanetVignettes.js';\r\n"))edit("import { PlanetVignettes } from '../effects/PlanetVignettes.js';\r\n",'');
edit('    await this.sectorWorldLoadQueue;\n',`    // Capture ownership before the first await: reset/retry and newer requests
    // invalidate queued work before it can load or attach to the reused scene.
    const generation = ++this.gameplayBackdropLoadGeneration;
    const targetContainer = this.starfieldContainer;
    const current = () => generation === this.gameplayBackdropLoadGeneration
      && targetContainer === this.starfieldContainer && Boolean(targetContainer?.parent);
    await this.sectorWorldLoadQueue;
    if (!current()) return;
`);
edit('    const generation = ++this.gameplayBackdropLoadGeneration;\r\n    const targetContainer = this.starfieldContainer;\r\n','');
edit("      await Promise.all([\r\n        texture ? this.prepareTextureForRender(texture, 'generated_gameplay_backdrop') : null,","      if (!current()) return;\r\n      await Promise.all([\r\n        texture ? this.prepareTextureForRender(texture, 'generated_gameplay_backdrop') : null,");
edit('      if(this.gameplayBackdropUsesSectorWorlds)await PlanetVignettes.prewarm(this.game.app.renderer);\r\n','');
edit('      if (\r\n        generation !== this.gameplayBackdropLoadGeneration\r\n        || targetContainer !== this.starfieldContainer\r\n        || !targetContainer?.parent\r\n      ) return;\r\n','      if (!current()) return;\r\n');
edit('      if(this.gameplayBackdropUsesSectorWorlds){\r\n        this.planetVignettes=new PlanetVignettes();\r\n        this.planetVignettes.setLevel(this.game?.level||1);\r\n        targetContainer.addChildAt(this.planetVignettes,targetContainer.getChildIndex(shade)+1);\r\n      }\r\n','');
edit('      this.planetVignettes?.setLevel(worlds.indexOf(source)*5+1);\r\n','');
const updateStart=text.indexOf('    this.planetVignettes?.update(delta,');const updateEnd=text.indexOf('    const transition = this.gameplayBackdropTransition;',updateStart);
if(updateStart<0||updateEnd<updateStart)throw Error('Missing exact prop update bounds');
text=text.slice(0,updateStart)+text.slice(updateEnd);
const commentStart=text.indexOf('// Decorative world lifecycle contract:');
if(commentStart<0||!text.slice(commentStart).includes('// No planet actor is a target, reward source, hazard or wave-completion member.'))throw Error('Missing obsolete footer');
text=text.slice(0,commentStart)+'// Backdrop request ownership is captured before asynchronous work.\n// Reset, preference changes and retries invalidate older requests.\n';
writeFileSync('E:/Codex/tmp/nova-surprises/PlayScene.js',text);
console.log('Prepared exact scoped edit; current source not written by this helper');
