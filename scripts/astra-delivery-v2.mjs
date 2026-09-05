import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(),out=path.resolve('test-results/astra-v2-delivery');mkdirSync(out,{recursive:true});
const load=p=>JSON.parse(readFileSync(p,'utf8'));
const before=load('test-results/astra-desktop-baseline-v2/report.json');
const after=load('test-results/astra-desktop-candidate-v3/report.json');
const opening=load('test-results/astra-desktop-candidate-v3-opening/report.json');
const nativePerf=load('test-results/astra-native-v3-perf-smoke/report.json');
const nativeControls=load('test-results/astra-native-v3-control-smoke/report.json');
const nativeSmoke=load('test-results/astra-native-v3-smoke/report.json');
const menus=load('test-results/astra-packaged-menus/report.json');
for(const r of [before,after,opening,nativePerf,nativeControls,nativeSmoke,menus])assert.equal(r.status,'passed');
assert.equal(before.dailyContract.seed,after.dailyContract.seed);assert.equal(before.dailyContract.rulesHash,after.dailyContract.rulesHash);
const build=load('test-results/astra-build-location.json');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
const scenes=[['01-menu','Main menu'],['04-combat','Combat'],['05-daily','Daily challenge'],['06-dense','Dense combat'],['07-boss','Boss'],['09-rewards','Rewards'],['10-death','Game over']];
for(const [id]of scenes)for(const label of ['baseline','candidate'])copyFileSync(`test-results/astra-desktop-${label}-${label==='baseline'?'v2':'v3'}/${id}.png`,path.join(out,`${label}-${id}.png`));
for(const id of menus.captures)copyFileSync(`test-results/astra-packaged-menus/${id}.png`,path.join(out,`menu-${id}.png`));
copyFileSync(opening.recording.video,path.join(out,'gameplay-normal-speed.mp4'));
copyFileSync(after.recording.video,path.join(out,'dense-gameplay-normal-speed.mp4'));
copyFileSync(menus.animation.video,path.join(out,'menu-normal-speed.mp4'));
copyFileSync(after.bossRecording.video,path.join(out,'boss-destruction-normal-speed.mp4'));
for(const [name,data]of Object.entries({baseline:before,candidate:after,opening,menus,'native-perf':nativePerf,'native-controls':nativeControls,'native-smoke':nativeSmoke}))writeFileSync(path.join(out,`${name}-report.json`),JSON.stringify(data,null,2));
writeFileSync(path.join(out,'files-changed.txt'),execFileSync('git',['diff','--name-only','a0b88d064c31dbc879948babd7751bf52fe7be77',head],{encoding:'utf8'}));
const num=n=>Number(n).toFixed(2);
const rows=['daily-seeded','sector-90-dense','boss'].map(name=>({name,before:before.performance.find(r=>r.name===name),after:after.performance.find(r=>r.name===name)}));
const maxWorkingSet=(report,type)=>Math.max(...report.performance.flatMap(p=>(p.processMemory||[]).filter(m=>m.type===type).map(m=>m.memory.workingSetSize/1024)));
const launch=path.join(build.output,'launch.mjs');
const clickLauncher=path.join(build.output,'Play Nova Swarm.vbs');
writeFileSync(clickLauncher,`Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)
shell.Run "node " & Chr(34) & folder & "\\launch.mjs" & Chr(34), 0, False
`);
writeFileSync(launch,`import {spawn} from 'node:child_process';
import {openSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const profile=path.join(root,'isolated-play-profile');mkdirSync(profile,{recursive:true});
const log=openSync(path.join(root,'play.log'),'a');
const child=spawn(path.join(root,'win-unpacked','Nova Swarm.exe'),['--nova-fresh-profile','--windowed'],{cwd:root,env:{...process.env,NOVA_SWARM_USER_DATA_DIR:profile,NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},stdio:['ignore',log,log],windowsHide:false,detached:true});
writeFileSync(path.join(root,'play-process.json'),JSON.stringify({pid:child.pid,profile,startedAt:new Date().toISOString()}));child.unref();
`);
const table=['| Scenario | Before p95 / p99 ms | After p95 / p99 ms | Before / after retained JS heap MiB |','|---|---:|---:|---:|',...rows.map(r=>`| ${r.name} | ${num(r.before.p95Ms)} / ${num(r.before.p99Ms)} | ${num(r.after.p95Ms)} / ${num(r.after.p99Ms)} | ${num(r.before.retainedHeapMiB)} / ${num(r.after.retainedHeapMiB)} |`)].join('\n');
const md=`# Nova Swarm — Astra, second visual pass

Playable Windows x64 experiment with a rebuilt presentation in the actual PixiJS game.

- 30 detailed modeled player hulls, including all five special unlocks; 30 angled hangar previews and a 1536-pixel flagship with moving reflections, hovering, banking and restrained engine arcs.
- 50 boss presentations, ten structural archetypes with five tiers, and modeled moving machinery. Original attacks, profile identities and collision references remain intact.
- 50 rebuilt enemy hulls and 48 detailed planetary scenes, changing every five sectors through Sector 240, then cycling. Existing later Mayhem enemy art remains.
- Three modeled station interiors; shared metal console materials across menus, codex, hangar, settings, help, pause and overlays. Larger codex dossiers, clearer HUD framing, exhaust and bounded destruction fragments.
- Original Blender combustion animation replaces the old boss/ordinary death blooms and streaks. Boss armor tears away around a reactor fireball, brief pressure front and cooling smoke. Victory particles are quiet sparks; positive energy rewards keep their distinct colors. The renderer has an 18-effect bound and consumes no gameplay RNG.

## Play

Run this exact command in PowerShell from any folder:

\`\`\`powershell
node "${launch}"
\`\`\`

Or double-click [Play Nova Swarm.vbs](<${clickLauncher.replaceAll('\\','/')}>), which uses the same isolated launcher without a console window.

Executable: [Nova Swarm.exe](<${build.executable.replaceAll('\\','/')}>)

Use the launcher to retain the isolated test profile and disabled Steam services. It writes only inside this build folder and keeps logging connected, preventing the previous broken-pipe dialogs. WASD/arrows move, Space fires, P pauses; all other controls remain unchanged.

## Provenance

- Original branch: codex/forum-129-improvements-20260822
- Exact starting commit: a0b88d064c31dbc879948babd7751bf52fe7be77
- Experimental branch: ${branch}
- Final repository commit: ${head}
- Packaged gameplay commit: ${after.checks[0].state.gitSha}; later commits contain validation/launch documentation and test tooling only.
- Package folder: ${build.output}
- [Changed-file inventory](files-changed.txt). Original dist and all earlier packages/releases preserved. No pull, merge, rebase, push, publish, Steam upload, live achievements/leaderboards or Steamworks settings changes.
- Return to the original source with \`git switch codex/forum-129-improvements-20260822\` after preserving any new work. The experimental build remains available. This command has not been run.

## Captured evidence

[Interactive before/after comparison and menu gallery](comparison.html) · [Normal-speed gameplay](gameplay-normal-speed.mp4) · [Dense combat](dense-gameplay-normal-speed.mp4) · [Boss destruction](boss-destruction-normal-speed.mp4) · [Animated main menu](menu-normal-speed.mp4)

All images and videos in this delivery are from the running game; candidate evidence comes from the packaged executable. No Blender render is presented as gameplay. The opening recording uses scripted keyboard input and normal vulnerability/lives in isolated practice. Dense recording uses QA invulnerability. Both are silent and preserve wall-clock speed. Boss death/rewards are staged for coverage. Video frames were sampled for readability and continuity; this is not a human playtest or a claim of full real-time video review.

## Performance

${table}

Same Electron ${after.runtime.electron}, 1280×720 content viewport and graphics settings, measured sequentially without other test windows or render jobs. Daily key ${after.dailyContract.dailyKey}; matching seed \`${after.dailyContract.seed}\` and rules \`${after.dailyContract.rulesHash}\`. These are matching scenarios, not identical input replays. Samples are 20 seconds each for Daily and Sector 90, 12 seconds for boss combat. Heap collection occurs outside frame measurement. Counts, process memory and complete samples are retained in [baseline-report.json](baseline-report.json) and [candidate-report.json](candidate-report.json).

Menu-to-controllable: ${before.performance.find(p=>p.name==='menu-to-controllable')?.loadMs} ms before / ${after.performance.find(p=>p.name==='menu-to-controllable')?.loadMs} ms after. Sector 90 readiness: ${before.performance.find(p=>p.name==='dense-load')?.loadMs} / ${after.performance.find(p=>p.name==='dense-load')?.loadMs} ms. Single-run observations, not statistical load guarantees.

Separate packaged 60-second native check: ${num(nativePerf.avgFps)} FPS average, ${num(nativePerf.minFps)} minimum; passed. Native smoke and control-smoke also passed. Planet transition checks confirm previous textures are released; the first world remains shared. Showroom textures are cached across the 30-ship roster.

Highest sampled renderer process working set: ${num(maxWorkingSet(before,'Tab'))} MiB before / ${num(maxWorkingSet(after,'Tab'))} MiB after. GPU-process working set: ${num(maxWorkingSet(before,'GPU'))} / ${num(maxWorkingSet(after,'GPU'))} MiB. These are Windows process working sets, not dedicated VRAM measurements or a total physical-memory sum. Artwork increases texture storage; the recorded process samples include more than JavaScript heap alone.

## Fixes and validation

The final destruction regression matches the committed pre-explosion particle allocator, particle motion/lifetime properties and the exact random-number stream. Bounds, boss deduplication, reduced motion and retirement pass. Existing death-feedback readability and boss-death voice runtime checks pass unchanged. A pre-explosion native candidate attempt failed when a staged navigation lost focus before its first wave; the harness now applies the existing QA focus suppression before waiting, without changing game pause behavior. A custom-protocol service-worker warning was also corrected. The failed intermediate report is retained, and final results below use the subsequent package.

Fixed: disconnected stdout/stderr EPIPE dialogs; early debug/practice ranking policy and syncing-state defects; translated menu tile cache; lazy rank-halo sizing/cache warnings; missing point-defense sound alias; boss component container warnings; obsolete boss animation fixture timing; result-screen uppercase-before-translation, end-state/sector/status pattern gaps and romanized offline messages across seven translated locales. Existing assertions were preserved, and the language check now catches the visible leaks missed previously.

Passed: release-line and localization/marketing prerequisites; build:current with full existing preflight; i18n and eight-language UI; 52 codex layout captures and 11 lore scenarios; controller-only flow and unlock reveal; all ten boss animations and production telegraphs; ranked policy parity/debug-unranked, run-mode identity, Daily contract/records, deterministic content director, persistence and Steam bridge isolation; projectile lifecycle/defense/readability; 130 decoded hull registration checks plus the unchanged original 75-hull alpha/RNG/debris check; showroom animation/reduced-motion/RNG and bounded world unload tests; production browser smoke and native packaged smoke/control/performance.

Development-server smoke logged normal development messages and failed the production-quietness assertion; its production rerun passed with zero logs, warnings, page errors and failed responses. Development boss-warning attempts timed out; the production test passed unchanged. The original baseline had the debug result-state, boss fixture, point-defense sound and locale-cache defects documented in the progress log; these have been addressed.

Limits: measured on this RTX 2060 Windows PC, not a hardware matrix or long endurance run. No human playtest, full 240-sector playthrough or fluent human review of every translation is claimed. The seven localized result-screen phrases were repaired; pre-existing translations elsewhere retain their prior quality. Intentional ship/boss/rank names and control labels remain English. No new player-facing English strings were added. Existing later Mayhem art remains outside the 50-enemy rebuild.

Tools/rights: [art notes and regeneration instructions](<${path.join(root,'docs/astra-art-notes.md').replaceAll('\\','/')}>) and editable models under docs/astra-v2-models. Original procedural Blender artwork only; free Blender 4.5.4, Sharp, FFmpeg, PixiJS/Electron/Vite and Playwright. Existing font licenses retained. No paid APIs, assets, purchases or imported third-party art.
`;
writeFileSync(path.join(out,'README.md'),md);writeFileSync(path.join(out,'performance.json'),JSON.stringify(rows,null,2));
const gallery=menus.captures.filter(id=>id!=='01-menu').map(id=>`<figure><img loading="lazy" src="menu-${id}.png" alt="${id}"><figcaption>${id.replace(/^\d+-/,'').replaceAll('-',' ')}</figcaption></figure>`).join('');
writeFileSync(path.join(out,'comparison.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nova Swarm / Astra</title><style>*{box-sizing:border-box}body{margin:0;background:#080f18;color:#e6eff3;font:16px system-ui}main{max-width:1440px;margin:auto;padding:32px 24px}h1{font-size:36px;margin:8px 0}p{color:#a4bcc9;line-height:1.6}small{color:#a6e3e8;letter-spacing:.13em}nav{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0 16px}button{font:inherit;padding:10px 18px;color:#bed0d9;background:#142333;border:1px solid #30495a;border-radius:4px;cursor:pointer}button.active{color:#091823;background:#a6e3e8}#stage{position:relative;aspect-ratio:16/9;overflow:hidden;border:1px solid #344852}#stage img{position:absolute;inset:0;width:100%;height:100%}#after{clip-path:inset(0 0 0 50%)}#line{position:absolute;top:0;bottom:0;left:50%;width:2px;background:white}.label{position:absolute;top:12px;padding:6px 10px;background:#08131ee8;font-size:12px}.left{left:12px}.right{right:12px}input{width:100%;margin:20px 0;accent-color:#a6e3e8}video{width:100%;background:#000}a{color:#a6e3e8}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(460px,1fr));gap:20px}figure{margin:0}figure img{width:100%;border:1px solid #344852}figcaption{padding:8px 0;text-transform:capitalize;color:#a4bcc9}@media(max-width:600px){.gallery{display:block}}</style><main><small>ACTUAL PACKAGED GAME · LOCAL EXPERIMENT</small><h1>Nova Swarm / Astra</h1><p>Detailed ships, industrial station interiors and changing planetary worlds. Drag the divider to compare the original build with the new experiment. Matching resolution and scenarios; not an identical replay.</p><nav>${scenes.map(([id,name])=>`<button data-id="${id}">${name}</button>`).join('')}</nav><div id="stage"><img id="before" alt="Original game"><img id="after" alt="Improved game"><div id="line"></div><span class="label left">BEFORE · a0b88d0</span><span class="label right">AFTER · ${after.checks[0].state.gitSha}</span></div><input aria-label="Comparison divider" id="slider" type="range" min="0" max="100" value="50"><p>Normal-speed gameplay · packaged executable · scripted controls · normal vulnerability · silent capture</p><video controls preload="metadata" src="gameplay-normal-speed.mp4"></video><p><a href="dense-gameplay-normal-speed.mp4">Dense-combat recording (QA invulnerability)</a> · <a href="README.md">Launch instructions, tests, measurements and limitations</a></p><h2>Inside the game</h2><div class="gallery">${gallery}</div></main><script>const before=document.querySelector('#before'),after=document.querySelector('#after'),line=document.querySelector('#line'),slider=document.querySelector('#slider');function select(id){before.src='baseline-'+id+'.png';after.src='candidate-'+id+'.png';document.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.id===id))}document.querySelectorAll('button').forEach(b=>b.onclick=()=>select(b.dataset.id));slider.oninput=()=>{after.style.clipPath='inset(0 0 0 '+slider.value+'%)';line.style.left=slider.value+'%'};select('01-menu');</script></html>`);
console.log(JSON.stringify({out,launch,head,branch,build:build.output}));
