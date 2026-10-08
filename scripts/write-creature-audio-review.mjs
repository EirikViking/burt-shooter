import fs from 'node:fs';
import {CREATURE_DESIGNS} from './creature-audio-design.mjs';
import {CREATURE_CUES} from '../src/audio/CreatureSoundBanks.js';
const root='docs/creature-audio';
const report=JSON.parse(fs.readFileSync('test-results/creature-audio-representative/result.json'));
const rows=report.encounters.map(e=>({id:e.id,name:CREATURE_DESIGNS.find(p=>p.id===e.id)?.name||e.id,time:e.audioTime||0}));
fs.copyFileSync('test-results/creature-audio-representative/combat-mix.webm',`${root}/combat-mix.webm`);
fs.copyFileSync('test-results/creature-audio-before/combat-mix.webm',`${root}/before-combat-mix.webm`);
fs.writeFileSync(`${root}/review.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nova Swarm — creature audio</title>
<style>body{margin:40px auto;padding:0 24px;max-width:960px;background:#0a1118;color:#dce7eb;font:17px/1.6 system-ui}h1{font-size:32px;margin-bottom:0}p{color:#a9bac5}section{border-top:1px solid #28404e;margin-top:28px;padding-top:20px}button,select,a{font:inherit}button,select{background:#162b36;color:#e5f7ff;border:1px solid #456372;border-radius:6px;padding:9px;margin:4px}button{cursor:pointer}a{color:#63dccc}audio{width:100%}small{color:#94a7b2}#chapters{display:flex;flex-wrap:wrap;gap:3px}#status{min-height:28px}</style>
<h1>Nova Swarm · creature audio</h1><p>50 bosses and 14 Space Snakes. <a href="/" target="_blank">Open Nova Swarm</a></p>
<section><h2>Actual combat mix</h2><p>Recorded from running Nova Swarm with music, weapons, creature calls and deaths. Encounters are staged in an isolated test profile.</p><audio id="mix" controls src="combat-mix.webm"></audio><div id="chapters"></div><details><summary>Previous combat mix</summary><audio controls src="before-combat-mix.webm"></audio></details></section>
<section><h2>Hear any creature</h2><p>Isolated cues from the same sound banks used by the game.</p><select id="creature" aria-label="Creature"></select><select id="cue" aria-label="Cue"></select><button id="play">Play cue</button><button id="stop">Stop</button><div id="status" aria-live="polite"></div></section>
<script type="module">const designs=${JSON.stringify(CREATURE_DESIGNS.map(({id,name,kind})=>({id,name,kind})))},cues=${JSON.stringify(CREATURE_CUES)},chapters=${JSON.stringify(rows)};
const byId=id=>document.getElementById(id),mix=byId('mix');for(const row of chapters){const b=document.createElement('button');b.textContent=row.name;b.onclick=()=>{token++;try{source?.stop()}catch{}mix.currentTime=row.time;mix.play()};byId('chapters').append(b)}
for(const p of designs){const o=document.createElement('option');o.value=p.id;o.textContent=(p.kind==='snake'?'Snake · ':'Boss · ')+p.name;byId('creature').append(o)}
for(const name of Object.keys(cues)){const o=document.createElement('option');o.value=name;o.textContent=name.replace('_',' ');byId('cue').append(o)}
let ctx,source,token=0,cached;byId('stop').onclick=()=>{token++;try{source?.stop()}catch{}mix.pause();byId('status').textContent='Stopped'};
byId('play').onclick=async()=>{const t=++token;try{source?.stop()}catch{}mix.pause();ctx??=new AudioContext();await ctx.resume();const id=byId('creature').value;byId('status').textContent='Loading…';try{if(cached?.id!==id){const r=await fetch('/audio/sfx/creatures-v2/'+id+'.mp3');if(!r.ok)throw Error('Audio unavailable');cached={id,buffer:await ctx.decodeAudioData(await r.arrayBuffer())}}if(t!==token)return;const c=cues[byId('cue').value];source=ctx.createBufferSource();source.buffer=cached.buffer;const gain=ctx.createGain();gain.gain.value=.8;source.connect(gain);gain.connect(ctx.destination);source.start(0,c.offset,c.duration);const playing=source;source.onended=()=>{playing.disconnect();gain.disconnect()};byId('status').textContent=designs.find(p=>p.id===id).name+' · '+byId('cue').value;}catch(e){byId('status').textContent=e.message}};
</script></html>`);
console.log('Ready: http://127.0.0.1:5201/docs/creature-audio/review.html');
