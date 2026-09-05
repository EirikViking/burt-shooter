import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(),out=path.resolve('test-results/astra-v4-delivery');mkdirSync(out,{recursive:true});
const load=p=>JSON.parse(readFileSync(p,'utf8')),num=n=>Number(n).toFixed(2),link=p=>path.resolve(p).replaceAll('\\','/');
const build=load('test-results/astra-build-location.json');
const transferPath=path.join(build.output,'profile-transfer.json');
const transfer=existsSync(transferPath)?load(transferPath):null;
const reports={
 before:load('test-results/astra-hitches-controlled-before/report.json'),after:load('test-results/astra-hitches-final-after/report.json'),
 desktop:load('test-results/astra-desktop-candidate-v8/report.json'),previousDesktop:load('test-results/astra-desktop-candidate-v5/report.json'),
 opening:load('test-results/astra-desktop-candidate-v8-opening/report.json'),menus:load('test-results/astra-packaged-menus-v8-final/report.json'),
 pacing:load('test-results/astra-opening-playthrough-v8-final/report.json'),perf:load('test-results/astra-native-v8-perf-smoke/report.json'),
 controls:load('test-results/astra-native-v8-control-smoke/report.json'),smoke:load('test-results/astra-native-v8-smoke/report.json')
};
for(const r of Object.values(reports))assert.equal(r.status,'passed');
for(const r of [reports.desktop,reports.opening,reports.menus,reports.pacing])assert.equal(r.executable,build.executable);
assert.equal(reports.after.exe,build.executable);assert.equal(reports.before.contract.seed,reports.after.contract.seed);assert.equal(reports.before.contract.rulesHash,reports.after.contract.rulesHash);
assert.equal(reports.before.profileCpu,false);assert.equal(reports.after.profileCpu,false);
const sha=execFileSync('git',['rev-parse',reports.perf.gitSha],{encoding:'utf8'}).trim();
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
for(const [name,data] of Object.entries(reports))writeFileSync(path.join(out,`${name}-report.json`),JSON.stringify(data,null,2));
writeFileSync(path.join(out,'files-changed-this-pass.txt'),execFileSync('git',['diff','--name-only','88007cb',head],{encoding:'utf8'}));
writeFileSync(path.join(out,'files-changed-total.txt'),execFileSync('git',['diff','--name-only','a0b88d0',head],{encoding:'utf8'}));
const scenes=[['01-menu','Main menu'],['04-combat','Combat'],['06-dense','Dense combat'],['07-boss','Boss'],['08-destruction','Boss destruction'],['09-rewards','Rewards'],['10-death','Game over']];
for(const [id] of scenes)for(const [label,version] of [['before','v5'],['after','v8']])copyFileSync(`test-results/astra-desktop-candidate-${version}/${id}.png`,path.join(out,`${label}-${id}.png`));
for(const id of reports.menus.captures)copyFileSync(`test-results/astra-packaged-menus-v8-final/${id}.png`,path.join(out,`menu-${id}.png`));
for(const [source,name] of [[reports.opening.recording.video,'gameplay-normal-speed.mp4'],[reports.desktop.recording.video,'dense-normal-speed.mp4'],[reports.desktop.bossRecording.video,'boss-destruction-normal-speed.mp4'],[reports.menus.animation.video,'menu-normal-speed.mp4']])copyFileSync(source,path.join(out,name));
copyFileSync('test-results/astra-opening-playthrough-v8-final/first-choice.png',path.join(out,'first-choice.png'));
const launch=path.join(build.output,'launch.mjs'),vbs=path.join(build.output,'Play Nova Swarm.vbs');
writeFileSync(vbs,`Set shell = CreateObject("WScript.Shell")\nSet files = CreateObject("Scripting.FileSystemObject")\nfolder = files.GetParentFolderName(WScript.ScriptFullName)\nshell.Run "node " & Chr(34) & folder & "\\launch.mjs" & Chr(34), 0, False\n`);
writeFileSync(launch,`import {spawn} from 'node:child_process';
import {openSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),profile=path.join(root,'isolated-play-profile');mkdirSync(profile,{recursive:true});
const log=openSync(path.join(root,'play.log'),'a');
const child=spawn(path.join(root,'win-unpacked','Nova Swarm.exe'),['--nova-fresh-profile','--windowed'],{cwd:root,env:{...process.env,NOVA_SWARM_USER_DATA_DIR:profile,NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},stdio:['ignore',log,log],detached:true,windowsHide:false});
writeFileSync(path.join(root,'play-process.json'),JSON.stringify({pid:child.pid,profile,startedAt:new Date().toISOString()}));child.unref();
`);
const rows=reports.before.scenarios.map(b=>({name:b.name,b,a:reports.after.scenarios.find(a=>a.name===b.name)}));
const table=['| 1080p scenario | p99 before → after | Frames >33.4ms before → after | Maximum before → after |','|---|---:|---:|---:|',...rows.map(({name,b,a})=>`| ${name} | ${num(b.p99)} → ${num(a.p99)} ms | ${b.over33} → ${a.over33} | ${num(b.max)} → ${num(a.max)} ms |`)].join('\n');
const memoryRows=reports.desktop.performance.filter(a=>Number.isFinite(a.retainedHeapMiB)).map(a=>({a,b:reports.previousDesktop.performance.find(b=>b.name===a.name)}));
const memTable=['| 720p scenario | Retained JS heap before → after |','|---|---:|',...memoryRows.map(({a,b})=>`| ${a.name} | ${num(b.retainedHeapMiB)} → ${num(a.retainedHeapMiB)} MiB |`)].join('\n');
const maxMem=(r,type,peak=false)=>Math.max(...r.performance.flatMap(p=>(p.processMemory||[]).filter(m=>m.type===type).map(m=>m.memory[peak?'peakWorkingSetSize':'workingSetSize']/1024)));
const md=`# Nova Swarm — fourth visual and engagement pass

Use the desktop shortcut **Nova Swarm - Visual Upgrade**, or double-click [Play Nova Swarm.vbs](<${link(vbs)}>). This launcher uses a build-local test profile, disables Steam services and forces offline leaderboard access. It retains real log handles to prevent the earlier EPIPE dialogs. WASD/arrows move, Space fires, Shift phases and P pauses. Drag showroom ships to rotate them.

${transfer?.status==='passed'?`Your previous experimental progress was copied into this build; ${transfer.verifiedFiles} files were hash-verified. The previous profile remains intact. A backup of the old desktop shortcut and the transfer receipt are stored beside the new launcher.`:''}

Manual launch from PowerShell:

\`\`\`powershell
node "${launch}"
\`\`\`

Executable: [Nova Swarm.exe](<${link(build.executable)}>). Use the launcher for the isolated profile. All earlier packages and release outputs remain intact.

## This pass

- Normal Sector 1 has three waves and no extra boss spacing wave. The normal first intro is shorter. Later sectors retain their existing wave rules. Daily Signal retains its established schedule and offer selection.
- Sparrow, Pixel Needle and Quasar Fan are available immediately, with two-lane, precision and broad three-lane firing previews. Existing saves retain unlocked ships, exact XP and history. Quasar has a new original Blender crescent hull, recessed machinery, three cannons and 72 registered rotation views.
- The first Tactical draft offers piercing fire, an extra shot or a permanent support drone. The native keyboard pilot reached the boss in ${num(reports.pacing.firstBossMs/1000)} seconds and its first choice in ${num(reports.pacing.firstDraftMs/1000)} seconds. It selected ${reports.pacing.selected.join(', ')} successfully. This was automated aiming with QA invulnerability, not beginner timing or a human engagement verdict.
- Boss deaths split the actual full-size hull into eight irregular textured pieces. A short reactor ignition, directional plasma jets, thin pressure waves and cooling debris replace the repeated large fireball. The victory banner sits below the wreck. Effects are bounded and consume no gameplay RNG; original particle allocation and random draws remain exact.
- Measured hot paths now reuse number formatters and text styles, avoid invisible particle geometry, skip redundant visual-tree traversal and select threat actions without sorting entire catalogs. Combat textures upload before level entry using the actual difficulty roster; the earlier preload used displayed sector numbers and missed some opening ships.
- Resizing an open hangar now fits its entire live layout, including the launch chooser, without losing the selected hull or rotation. Actual 800×600 and 1920×1080 captures and pointer launches were checked.

## Performance

${table}

Both Windows packages used 1920×1080, the same Daily seed (${reports.after.contract.seed}) and rules hash, the same keyboard pattern, 66-second opening and dense windows, and a 15-second staged boss-death window. Runs were sequential with build, Blender and browser tests stopped. CPU sampling and native window occlusion throttling were disabled for both packages. A previous warm-cache repeat with one-second background-throttled frames was excluded. Scheduling and outcomes can diverge; this is scenario and seed matching, not a frame-locked replay. Remaining long frames are reported honestly; this does not establish that every possible stutter is gone.

The separate native 60-second check passed at ${num(reports.perf.avgFps)} average / ${num(reports.perf.minFps)} minimum sampled FPS.

The final comparison's 116.5ms opening frame occurred during the level-entry hold, before any enemies or hostile bullets were present. The other opening threshold crossing was 33.4ms at floating-point precision. This still leaves an entry pause to investigate; it is not evidence of hitch-free loading on every machine.

${memTable}

Highest sampled renderer working set: ${num(maxMem(reports.previousDesktop,'Tab'))} → ${num(maxMem(reports.desktop,'Tab'))} MiB. GPU-process working set: ${num(maxMem(reports.previousDesktop,'GPU'))} → ${num(maxMem(reports.desktop,'GPU'))} MiB. These are process working sets, not dedicated VRAM. Exact process samples and load observations are in the linked JSON reports. Menu artwork load in the 1080p comparison: ${num(reports.before.menuArtMs/1000)} → ${num(reports.after.menuArtMs/1000)} seconds; one run each, affected by cache state.

## Validation and evidence

Passed: production build and its prerequisites; release-line; all eight language catalogs and 80 localized UI captures; full offline browser smoke; controller-only flow; all ten boss animations; boss telegraphs, hazard arming and healthbar; debug-unranked and dead-enemy cleanup; deterministic content director, Daily contracts/records and mode identity; isolated Steam bridge; projectile lifecycle and defense rules; save integrity; 64 exact Daily draft comparisons; 416 exact threat-selection comparisons; live first Tactical choice; explosion RNG/allocator parity, eight-piece transform accuracy, caps, retirement and reduced motion. Native control-smoke, smoke and performance checks passed, along with 12 encounter/control captures, pause/resume, death, restart, rewards and relaunch. Packaged main/hangar rotation and three starter layouts are verified.

Two browser timing tests initially timed out while other test and packaging jobs were running; unchanged isolated reruns passed. The new opening harness initially dereferenced the correctly removed reward overlay; its null check was corrected and the full playthrough rerun. The bundled web-game client used installed Chrome and compositor capture because its default browser binary was absent and Pixi clears its drawing buffer; gameplay assertions were not weakened.

Real package recordings: [normal opening](gameplay-normal-speed.mp4), [dense combat](dense-normal-speed.mp4), [boss destruction](boss-destruction-normal-speed.mp4), [rotating menu](menu-normal-speed.mp4). Normal wall-clock speed, silent capture. Opening uses normal vulnerability; dense and boss scenes use QA invulnerability, with the boss kill staged through its damage API. Screenshots and sampled recording frames were visually inspected. No continuous human playtest is claimed.

## Provenance, rights and limits

- Original branch: codex/forum-129-improvements-20260822
- Original baseline: a0b88d064c31dbc879948babd7751bf52fe7be77
- Fourth-pass baseline: 88007cba20a86ce8529f7cc56f7b7d8c7813c1dc; preceding packaged gameplay 9c0ac057f388618045810fd1976da85e0a21e6f1
- Experimental branch: codex/astra-visual-overhaul
- Packaged gameplay commit: ${sha}
- Final checkpoint / report-generation HEAD: ${head}
- Changed files: [this pass](files-changed-this-pass.txt), [whole experiment](files-changed-total.txt)
- Steamworks, Cloud, real saves, achievements and live leaderboards were untouched. No deploy, upload, push or publishing occurred.
- Rollback command, not executed: \`git switch codex/forum-129-improvements-20260822\`. Preserve any future uncommitted work first. Old builds are still independently playable.

No new imported art, fonts, paid services or runtime engine in this pass. Blender artwork and procedural materials are original. Editable sources and regeneration instructions: [art notes](<${link('docs/astra-art-notes.md')}>), [prior asset rights and receipts](<${link('docs/astra-v3-models/README.md')}>). Existing font licenses remain bundled. All new player-facing labels are translated in eight languages; intentional names and control labels remain unchanged.

Limits: this RTX 2060 Windows machine only, no full 240-sector endurance or fluent human translation audit. Existing large-bundle and dependency deprecation advisories remain. The flagship showroom still needs an 8192-capable texture limit; detailed rotating showroom models carry a memory cost. Small gameplay player art retains the prior modeled fleet. Sales impact and engagement require real player feedback and release data.

[Previous full visual comparison with the original game](../astra-v3-delivery/comparison.html)
`;
writeFileSync(path.join(out,'README.md'),md);
const gallery=reports.menus.captures.filter(id=>id.includes('starter')||id.includes('codex')).map(id=>`<figure><img loading="lazy" src="menu-${id}.png" alt="${id}"><figcaption>${id.replaceAll('-',' ')}</figcaption></figure>`).join('');
writeFileSync(path.join(out,'comparison.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nova Swarm / Reactor &amp; first flight</title><style>*{box-sizing:border-box}body{margin:0;background:#091018;color:#e7f4fa;font:16px system-ui}main{max-width:1440px;margin:auto;padding:32px}h1{font-size:38px}p{line-height:1.6;color:#afc5d2}a{color:#81e2ef}nav{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0}button{padding:12px;background:#172f40;border:1px solid #52798a;color:#e7f4fa;cursor:pointer}button.active{background:#256074}#stage{position:relative;aspect-ratio:16/9}#stage img{position:absolute;width:100%;height:100%}#after{clip-path:inset(0 0 0 50%)}label{display:block;margin:15px 0}input,video{width:100%}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px}figure{margin:0}figure img{width:100%}figcaption{color:#afc5d2;margin:8px 0}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:12px;border-bottom:1px solid #294554}</style><main><p>ACTUAL PACKAGED GAME · LOCAL EXPERIMENT</p><h1>Reactor rupture. Three first-flight choices.</h1><p>Compare the preceding visual build on the left with this new pass on the right. Same resolution and encounter types; not an identical replay. <a href="README.md">Build, launch instructions, tests and limitations</a>.</p><nav>${scenes.map(([id,name])=>`<button data-id="${id}">${name}</button>`).join('')}</nav><div id="stage"><img id="before" alt="Previous build"><img id="after" alt="New build"></div><label>Before / after divider <input id="slider" type="range" min="0" max="100" value="50"></label><h2>Boss destruction in motion</h2><video controls preload="metadata" src="boss-destruction-normal-speed.mp4"></video><p>Staged boss death in the actual Windows package, normal wall-clock speed, silent. <a href="gameplay-normal-speed.mp4">Normal opening</a> · <a href="dense-normal-speed.mp4">Dense combat</a> · <a href="menu-normal-speed.mp4">Rotating main menu</a>.</p><h2>Measured frame pacing</h2><table><tr><th>1080p scenario</th><th>Frames over 33.4ms</th><th>Maximum frame</th></tr>${rows.map(({name,b,a})=>`<tr><td>${name}</td><td>${b.over33} → ${a.over33}</td><td>${num(b.max)} → ${num(a.max)}ms</td></tr>`).join('')}</table><p>Same Daily seed and rules, sequential runs, no CPU sampling. The report includes all conditions and remaining long frames.</p><h2>Starter ships and codex</h2><div class="gallery">${gallery}</div><h2>The first Tactical choice</h2><img style="width:100%" src="first-choice.png" alt="Three permanent weapon choices after the first boss"></main><script>const b=document.querySelector('#before'),a=document.querySelector('#after');function select(id){b.src='before-'+id+'.png';a.src='after-'+id+'.png';document.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.dataset.id===id))}document.querySelectorAll('button').forEach(x=>x.onclick=()=>select(x.dataset.id));document.querySelector('#slider').oninput=e=>a.style.clipPath='inset(0 0 0 '+e.target.value+'%)';select('08-destruction');</script></html>`);
console.log(JSON.stringify({out,launch,build,sha}));
