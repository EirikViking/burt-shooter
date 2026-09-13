import {writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
// Original deterministic composition: D major ascent, metallic harmonics and
// stereo echoes. Baked offline; no runtime synthesis or external audio assets.
const rate=48000,seconds=4.8,n=Math.ceil(rate*seconds),left=new Float64Array(n),right=new Float64Array(n);
const notes=[[0,50,.95,.13],[.12,62,.7,.15],[.28,69,.75,.14],[.46,74,1.1,.15],[.68,78,1.5,.13],[.9,81,2.5,.12],[1.15,86,2.6,.1],[1.15,62,2.8,.075],[1.15,69,2.8,.065],[1.15,78,2.8,.075]];
for(const [start,midi,duration,amp] of notes){
 const hz=440*2**((midi-69)/12),begin=Math.floor(start*rate),length=Math.floor(duration*rate);
 for(let i=0;i<length&&begin+i<n;i++){
  const t=i/rate,fade=Math.min(1,t/.025)*Math.pow(Math.max(0,1-t/duration),1.45),p=2*Math.PI*hz*t;
  const tone=(Math.sin(p)+.27*Math.sin(p*2)*Math.exp(-t*2)+.14*Math.sin(p*3)+.07*Math.sin(p*5)*Math.exp(-t*4))*fade*amp;
  left[begin+i]+=tone;right[begin+i]+=tone*.96;
 }
}
for(const [delay,gain] of [[.173,.22],[.293,.16],[.437,.11]]){
 const d=Math.floor(delay*rate);for(let i=n-1;i>=d;i--){const x=left[i-d];left[i]+=right[i-d]*gain;right[i]+=x*gain;}
}
let peak=0;for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
const pcm=Buffer.alloc(n*4),gain=.68/peak;for(let i=0;i<n;i++){pcm.writeInt16LE(Math.round(left[i]*gain*32767),i*4);pcm.writeInt16LE(Math.round(right[i]*gain*32767),i*4+2);}
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
mkdirSync('docs/astra-v6-models',{recursive:true});const source='docs/astra-v6-models/coronation-original.wav';writeFileSync(source,Buffer.concat([header,pcm]));
execFileSync('ffmpeg',['-y','-i',source,'-af','loudnorm=I=-20:TP=-2:LRA=7','-ar','48000','-c:a','libmp3lame','-b:a','192k','public/audio/sfx/nova-swarm/astra_overrun_coronation_v6.mp3'],{stdio:'ignore',windowsHide:true});
console.log('Original 4.8-second stereo coronation stinger rendered.');
