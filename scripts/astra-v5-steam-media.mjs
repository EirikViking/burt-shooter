import {mkdirSync,readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const out=path.resolve('test-results/astra-v5-steam-media');mkdirSync(out,{recursive:true});
const work=path.join(out,'edit-sources');mkdirSync(work,{recursive:true});mkdirSync(path.join(out,'screenshots'),{recursive:true});
const raw={tactical:path.resolve('test-results/astra-media-v5-final-tactical/gameplay.webm'),overrun:path.resolve('test-results/astra-media-v5-final-overrun/gameplay.webm')};
for(const mode of Object.keys(raw)){const r=JSON.parse(readFileSync(path.join(path.dirname(raw[mode]),'capture.json')));assert.equal(r.status,'captured');assert.equal(r.invulnerabilityCheats,false);assert.equal(r.syntheticDamage,false);copyFileSync(path.join(path.dirname(raw[mode]),'capture.json'),path.join(work,`${mode}-capture.json`));}
const ff=(args)=>execFileSync('ffmpeg',['-y','-v','warning','-threads','2',...args],{windowsHide:true,timeout:240000,stdio:['ignore','pipe','pipe']});
const encode=['-c:v','libx264','-preset','fast','-crf','18','-b:v','10M','-maxrate','16M','-bufsize','24M','-threads','4','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart'];
const cuts=[
 {id:'01-pressure',mode:'overrun',start:67,duration:12},
 {id:'02-formation',mode:'tactical',start:8,duration:6},
 {id:'03-warning',mode:'overrun',start:23,duration:7},
 {id:'04-boss-and-choice',mode:'tactical',start:44,duration:17},
 {id:'05-counterattack',mode:'overrun',start:43,duration:10}
];
for(const cut of cuts){cut.file=path.join(work,`${cut.id}.mp4`);if(process.argv.includes('--reuse-cuts')&&existsSync(cut.file))continue;ff(['-ss',String(cut.start),'-i',raw[cut.mode],'-t',String(cut.duration),'-vf','fps=30,setsar=1','-af',`afade=t=in:d=0.025,afade=t=out:st=${cut.duration-.04}:d=0.04`,...encode,cut.file]);console.log(cut.id);}
const end=path.join(work,'06-title.mp4');
ff(['-f','lavfi','-i','color=c=0x07131f:s=1920x1080:r=30:d=2.5','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t','2.5','-vf',"drawbox=x=350:y=445:w=1220:h=2:color=0x76dfe9:t=fill,drawbox=x=350:y=635:w=1220:h=2:color=0x76dfe9:t=fill,drawtext=fontfile=public/fonts/orbitron-900.ttf:text='NOVA SWARM':fontcolor=0xd4faff:fontsize=110:x=(w-tw)/2:y=(h-th)/2,fade=t=out:st=2:d=0.5",...encode,end]);
const concat=(files,target)=>{const list=path.join(work,`${target}.txt`);writeFileSync(list,files.map(f=>`file '${f.replaceAll('\\','/')}'`).join('\n'));ff(['-f','concat','-safe','0','-i',list,'-vf','fps=30,setsar=1','-af','aresample=async=1:first_pts=0',...encode,path.join(out,target)]);};
concat([...cuts.map(x=>x.file),end],'Nova-Swarm-V5-Gameplay-Trailer-DRAFT.mp4');
concat([cuts[0].file,cuts[2].file,end],'Nova-Swarm-V5-Combat-Teaser-DRAFT.mp4');
const screenshots=[['01-pressure','overrun',73.5],['02-boss','tactical',48],['03-warning','overrun',27],['04-formation','tactical',15],['05-counterattack','overrun',46],['06-elite','tactical',102],['07-phase','overrun',69],['08-draft','tactical',58]];
for(const [name,mode,t]of screenshots)ff(['-ss',String(t),'-i',raw[mode],'-frames:v','1',path.join(out,'screenshots',`${name}.png`)]);
writeFileSync(path.join(out,'edit-decision-list.json'),JSON.stringify({resolution:[1920,1080],fps:30,speed:1,raw,cuts,titleCardSeconds:2.5,screenshots,pilot:'Automated keyboard decisions every 180 ms; real movement/fire/phase inputs; not human gameplay',normalRules:true,syntheticKills:false,invulnerability:false,sourceCommit:'8ebcd6e4e547ac00e1e6d586608ea3287838c6d1',note:'The final 2.5 seconds are an editorial title card. All other video and every screenshot are captured game pixels. No store upload until user approval.'},null,2));
console.log(out);
