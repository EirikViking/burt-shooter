import assert from 'node:assert/strict';
import {FaunaPassageAudio} from '../src/audio/FaunaPassageAudio.js';

const param=()=>({value:0,setTargetAtTime(value){this.value=value;}});
function fixture({pending=false}={}) {
 let resolve;
 const audio={paused:true,volume:1,plays:0,pauses:0,play(){this.plays++;this.paused=false;return pending?new Promise(r=>{resolve=r;}):Promise.resolve();},pause(){this.paused=true;this.pauses++;}};
 const nodes=[];
 const node=()=>{const n={connections:0,disconnected:false,connect(){this.connections++;},disconnect(){this.disconnected=true;}};nodes.push(n);return n;};
 const context={currentTime:0,destination:{},createMediaElementSource:()=>node(),createStereoPanner:()=>Object.assign(node(),{pan:param()})};
 const sound=new FaunaPassageAudio(audio,context);
 return{audio,sound,nodes,resolve:()=>resolve?.()};
}
const random=Math.random;Math.random=()=>{throw Error('Sound must not consume gameplay RNG');};
try {
 const f=fixture();
 f.sound.update({progress:0,direction:1,volume:.8,allowed:true});assert.equal(f.audio.plays,0);
 f.sound.update({progress:.04,direction:1,volume:.8,allowed:true});assert.equal(f.audio.plays,1,'approach starts before the old 17% threshold');
 assert(f.sound.pan>0,'right-to-left crossing must approach from right');
 f.sound.update({progress:.7,direction:1,volume:.4,allowed:true});assert(f.sound.pan<0);assert.equal(f.audio.volume,.4);
 for(let i=0;i<100;i++)f.sound.update({progress:.7,direction:1,volume:.4,allowed:true});assert.equal(f.audio.plays,1,'exactly one performance per passage');
 f.sound.stop();assert(f.audio.paused);f.sound.update({progress:.8,direction:1,volume:.8,allowed:true});assert.equal(f.audio.plays,1,'pause/warning cannot replay the cue');
 f.sound.destroy();f.sound.destroy();assert(f.nodes.every(n=>n.disconnected),'all owned audio routing released');
 const muted=fixture();muted.sound.update({progress:.2,direction:-1,volume:0,allowed:true});muted.sound.update({progress:.3,direction:-1,volume:1,allowed:true});assert.equal(muted.audio.plays,0,'muting cannot queue a later surprise');muted.sound.destroy();
 const warning=fixture();warning.sound.update({progress:.02,direction:-1,volume:1,allowed:false});warning.sound.update({progress:.2,direction:-1,volume:1,allowed:true});assert.equal(warning.audio.plays,0);warning.sound.destroy();
 const late=fixture({pending:true});late.sound.update({progress:.1,direction:1,volume:.5,allowed:true});late.sound.destroy();late.audio.paused=false;late.resolve();await Promise.resolve();assert(late.audio.paused,'late play completion cannot resurrect a retired passage');
 const mono=new FaunaPassageAudio(fixture().audio,null);mono.update({progress:.1,direction:-1,volume:.7,allowed:true});assert.equal(mono.audio.plays,1,'safe mono fallback');mono.destroy();
 console.log('[fauna-majesty] PASS early approach, spatial direction, one cue, mute/priority/pause retirement, late completion, routing cleanup, no RNG');
} finally {Math.random=random;}
