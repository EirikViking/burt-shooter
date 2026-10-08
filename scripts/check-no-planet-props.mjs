import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const play=readFileSync(new URL('../src/scenes/PlayScene.js',import.meta.url),'utf8');
assert(!/import\s*\{\s*PlanetVignettes/.test(play),'Play still imports the rejected decorative prop layer');
assert(!/new PlanetVignettes|PlanetVignettes\.prewarm|planetVignettes\?\.update|takeArrivalCue\(\)/.test(play),'Rejected planet props still construct, update, prewarm or trigger cues');
assert(play.includes('resolveGameplayBackdropSources('),'Planet art was removed with the props');
console.log('PASS: rejected decorative props and cues removed; existing planet backgrounds preserved');
