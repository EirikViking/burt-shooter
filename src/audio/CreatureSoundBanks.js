import {BOSS_ROSTER} from '../config/BossRoster.js';
import {SPACE_SNAKES} from '../config/SpaceSnakes.js';

// Authored cue regions in one seek-free decoded bank per creature. Combat data stays in its existing catalog.
export const CREATURE_CUES = Object.freeze(Object.fromEntries((()=>{
 let offset=0;return [['arrival',3.5,1.32],['hunt',2.5,.96],['hunt_alt',2.5,.92],['attack',.85,.54],['break',.65,.56],['phase',2.8,1.20],['rage',3.2,1.30],['death',4,1.42]].map(([event,duration,volume])=>{const row=[event,Object.freeze({offset,duration,volume})];offset+=duration+.12;return row;});
})()));
export const CREATURE_SOUND_BANKS = Object.freeze(Object.fromEntries([...BOSS_ROSTER,...SPACE_SNAKES].map(p=>[p.id,`/audio/sfx/creatures-v2/${p.id}.mp3`])));
