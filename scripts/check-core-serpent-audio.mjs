import {readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='public/audio/sfx/core-serpent',rows=[];
for(const name of readdirSync(root).filter(n=>n.endsWith('.mp3'))){
 const path=`${root}/${name}`;
 const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=sample_rate,channels','-of','json',path],{encoding:'utf8',windowsHide:true});assert.equal(probe.status,0);
 const info=JSON.parse(probe.stdout),duration=Number(info.format.duration);
 const decode=spawnSync('ffmpeg',['-hide_banner','-i',path,'-af','volumedetect','-f','null','-'],{encoding:'utf8',windowsHide:true});assert.equal(decode.status,0);
 const peak=Number(/max_volume:\s*(-?[\d.]+)/.exec(decode.stderr)?.[1]);
 const mean=Number(/mean_volume:\s*(-?[\d.]+)/.exec(decode.stderr)?.[1]);
 assert.ok(duration>1&&duration<4,`${name} duration`);assert.ok(Number.isFinite(peak)&&peak<=0&&mean>-40,`${name} usable audio`);
 rows.push({name,duration,peakDb:peak,meanDb:mean,...info.streams[0]});
}
mkdirSync('test-results/core-serpent-audio',{recursive:true});writeFileSync('test-results/core-serpent-audio/report.json',JSON.stringify({note:'Decode, duration and level checks; not a human audition.',rows},null,2));
console.log(`PASS ${rows.length} ElevenLabs files decode with valid levels and duration`);
