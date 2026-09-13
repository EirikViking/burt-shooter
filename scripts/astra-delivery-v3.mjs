import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(),out=path.resolve('test-results/astra-v3-delivery');mkdirSync(out,{recursive:true});
const load=p=>JSON.parse(readFileSync(p,'utf8'));
const before=load('test-results/astra-desktop-baseline-v4/report.json');
const after=load('test-results/astra-desktop-candidate-v5/report.json');
const opening=load('test-results/astra-desktop-candidate-v5-opening/report.json');
const nativePerf=load('test-results/astra-native-v5-perf-smoke/report.json');
const nativeControls=load('test-results/astra-native-v5-control-smoke/report.json');
const nativeSmoke=load('test-results/astra-native-v5-smoke/report.json');
const menus=load('test-results/astra-packaged-menus-v5-final/report.json');
for(const r of [before,after,opening,nativePerf,nativeControls,nativeSmoke,menus])assert.equal(r.status,'passed');
assert.equal(before.dailyContract.seed,after.dailyContract.seed);assert.equal(before.dailyContract.rulesHash,after.dailyContract.rulesHash);
const build=load('test-results/astra-build-location.json');
assert.equal(after.executable,build.executable,'Evidence must match the delivered package');
assert.equal(menus.executable,build.executable);
const warningNames=['fan','wall','split','lance','ring','hazard-beam','hazard-wall','hazard-ring','elite-sniper'];
for(const id of warningNames)copyFileSync(`test-results/astra-warning-centered-final/${id}.png`,path.join(out,`warning-${id}.png`));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const gameplayHead=execFileSync('git',['rev-parse',after.checks[0].state.gitSha],{encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
const scenes=[['01-menu','Main menu'],['04-combat','Combat'],['05-daily','Daily challenge'],['06-dense','Dense combat'],['07-boss','Boss'],['09-rewards','Rewards'],['10-death','Game over']];
for(const [id]of scenes)for(const label of ['baseline','candidate'])copyFileSync(`test-results/astra-desktop-${label}-${label==='baseline'?'v4':'v5'}/${id}.png`,path.join(out,`${label}-${id}.png`));
for(const id of menus.captures)copyFileSync(`test-results/astra-packaged-menus-v5-final/${id}.png`,path.join(out,`menu-${id}.png`));
copyFileSync(opening.recording.video,path.join(out,'gameplay-normal-speed.mp4'));
copyFileSync(after.recording.video,path.join(out,'dense-gameplay-normal-speed.mp4'));
copyFileSync(menus.animation.video,path.join(out,'menu-normal-speed.mp4'));
copyFileSync(after.bossRecording.video,path.join(out,'boss-destruction-normal-speed.mp4'));
for(const [name,data]of Object.entries({baseline:before,candidate:after,opening,menus,'native-perf':nativePerf,'native-controls':nativeControls,'native-smoke':nativeSmoke}))writeFileSync(path.join(out,`${name}-report.json`),JSON.stringify(data,null,2));
writeFileSync(path.join(out,'files-changed.txt'),execFileSync('git',['diff','--name-only','a0b88d064c31dbc879948babd7751bf52fe7be77',head],{encoding:'utf8'}));
const num=n=>Number(n).toFixed(2);
const rows=['daily-seeded','sector-90-dense','boss'].map(name=>({name,before:before.performance.find(r=>r.name===name),after:after.performance.find(r=>r.name===name)}));
const maxWorkingSet=(report,type)=>Math.max(...report.performance.flatMap(p=>(p.processMemory||[]).filter(m=>m.type===type).map(m=>m.memory.workingSetSize/1024)));
const maxPeakWorkingSet=(report,type)=>Math.max(...report.performance.flatMap(p=>(p.processMemory||[]).filter(m=>m.type===type).map(m=>m.memory.peakWorkingSetSize/1024)));
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
const md=`# Nova Swarm - Astra, third visual pass

The improved Windows game is ready in its own experimental package. Use the isolated launcher:

\`\`\`powershell
node "${launch}"
\`\`\`

Or double-click [Play Nova Swarm.vbs](<${clickLauncher.replaceAll('\\','/')}>). Executable: [Nova Swarm.exe](<${build.executable.replaceAll('\\','/')}>). The launcher keeps real log handles connected, preventing the previous broken-pipe dialogs. Its profile stays under this build folder; Steam services are disabled. WASD/arrows move, Space fires and P pauses. Drag the ship to rotate it in the main menu or hangar.

## What changed

- Thirty detailed Blender ship turntables, 72 real views each, with painted metal, enamel, machinery, reflections and engine light. The flagship uses 768-pixel views rendered at 1024; others use 384-pixel views. Selected ships rotate with real mouse dragging, including locked hangar previews behind their existing lock overlay. Only the selected atlas remains resident, and all turntable atlases unload on entering combat.
- New boss art across all 50 profiles, using ten imposing archetype paintings; 50 elite, 111 support and 177 late-enemy slots receive new role-based art. Separate high-resolution codex portraits replace enlarged legacy thumbnails, including Patch Rig 2. Portrait clipping, narrow long-boss biographies and the Ascendant rotation-hint overlap are fixed.
- Hostile bullets have distinct dimensional cores, crisp collision cues and restrained trails. Bosses and elites gain animated weapon assemblies, charge light and recoil. Warning lanes use projected energy fields, directional marks and fixed boundaries; ring safe wedges remain visibly open. Gameplay hitboxes, warning clocks, attack paths and safe-lane data are unchanged.
- A 16-frame reactor burst replaces the previous combustion animation. Boss bursts coalesce into one fire-and-smoke event with armor breakup. Ordinary and player death share the new material, with reduced-motion/flash handling and an 18-effect cap. The old particle allocator and its exact random sequence are preserved.
- Earlier repair work also fixes broken-pipe dialogs, debug/practice result ranking state, stale translated menu tiles, missing halo/SFX resources and result-screen translation gaps.
- Three richer station interiors, machined console surfaces across the major menus, new HUD frames and improved announcement plates, including beam interruptions. The preceding pass's 48 worlds still change every five sectors through Sector 240, then cycle.

## Provenance and rollback

- Original branch: codex/forum-129-improvements-20260822
- Exact baseline: a0b88d064c31dbc879948babd7751bf52fe7be77
- Experimental branch: ${branch}
- Final repository commit: ${head}
- Packaged gameplay commit: ${gameplayHead}. Subsequent commits contain test/launch tooling and documentation only.
- Build folder: ${build.output}
- [Files changed](files-changed.txt). Original dist, releases and all previous test packages are preserved. No pull, merge, rebase, push, publication, Steam upload or Steamworks changes. Real saves, Cloud, achievements and live leaderboards were not used.
- Rollback source command, after preserving any future work: \`git switch codex/forum-129-improvements-20260822\`. This has not been run; the repository remains on the experimental branch.

## Actual game evidence

[Before/after comparisons and menu gallery](comparison.html), [normal opening gameplay](gameplay-normal-speed.mp4), [dense combat](dense-gameplay-normal-speed.mp4), [boss attacks and destruction](boss-destruction-normal-speed.mp4), [rotating main menu](menu-normal-speed.mp4).

Candidate screenshots and these videos come from the packaged executable. The opening uses scripted keyboard input with normal lives and vulnerability; dense combat and staged boss coverage use QA invulnerability. All footage is silent and preserves wall-clock speed. Screenshots and sampled video frames were inspected. No offline render is presented as gameplay, and no human playtest or uninterrupted real-time video review is claimed. Additional nine-type warning review captures are under test-results/astra-warning-centered-final; those are the actual source game in an isolated browser fixture.

## Performance and loading

${table}

Same Electron ${after.runtime.electron}, 1280x720 content viewport and settings. Baseline and candidate were measured sequentially with other test/render jobs stopped. Daily key ${after.dailyContract.dailyKey}, matching seed \`${after.dailyContract.seed}\` and rules \`${after.dailyContract.rulesHash}\`. Scenarios match; these are not identical input replays. The baseline runs the preserved original production dist through the same installed Electron version; the candidate is packaged. Samples: Daily 20 seconds, Sector 90 20 seconds, boss 12 seconds. Heap collection occurs outside frame measurement.

Startup to ready menu artwork: ${before.menuArtReadyMs} / ${after.menuArtReadyMs} ms before/after. Menu launch to controllable gameplay: ${before.performance.find(p=>p.name==='menu-to-controllable')?.loadMs} / ${after.performance.find(p=>p.name==='menu-to-controllable')?.loadMs} ms. Staged Sector 90 readiness: ${before.performance.find(p=>p.name==='dense-load')?.loadMs} / ${after.performance.find(p=>p.name==='dense-load')?.loadMs} ms. These are single-run observations.

Highest sampled renderer process working set: ${num(maxWorkingSet(before,'Tab'))} / ${num(maxWorkingSet(after,'Tab'))} MiB. GPU-process working set: ${num(maxWorkingSet(before,'GPU'))} / ${num(maxWorkingSet(after,'GPU'))} MiB. These are Windows process working sets, not dedicated VRAM measurements. The large showroom atlas is released before gameplay. Whole-process high-water marks, including earlier menu/loading work: renderer ${num(maxPeakWorkingSet(before,'Tab'))} / ${num(maxPeakWorkingSet(after,'Tab'))} MiB; GPU process ${num(maxPeakWorkingSet(before,'GPU'))} / ${num(maxPeakWorkingSet(after,'GPU'))} MiB. The richer showrooms increase peak memory; retained combat memory is much closer to baseline. Loading measurements vary with the filesystem cache and are not proof of a startup speedup: the preceding same-art package took 23.62 seconds to ready menu artwork in its native run.

Separate 60-second native performance check: ${num(nativePerf.avgFps)} FPS average, ${num(nativePerf.minFps)} minimum; passed. Native control-smoke and smoke passed. Complete samples and entity counts are in [baseline-report.json](baseline-report.json) and [candidate-report.json](candidate-report.json).

## Validation and remaining limits

Passed: build:current and full prerequisites; release-line; i18n and eight-language UI; all 52 codex layout captures; controller-only flow; ten boss animation profiles; telegraph, hazard arming, warning lifecycle, fairness and healthbar checks; ranked/debug-unranked, Daily contract/records, run-mode identity, deterministic content director and isolated Steam bridge; projectile lifecycle, defenses and visual/readability checks; enemy death feedback; 388 current threat alpha registrations, original 130-hull registration and 75-hull integrity checks; 439 decoded codex sources; 30 complete turntables; real mouse rotation, rapid navigation, bounded atlas residency, zero combat atlases, reduced motion, world unloading and exact explosion RNG/allocator parity. Production smoke and the final native package checks pass.

The first projectile stress run overlapped other test/build work and reported one frame over 50 ms. Its idle rerun passed unchanged: p95 32.2 ms, p99 39.6 ms, maximum 41 ms in the artificial software-rendered projectile field. This is separate from the native gameplay measurements above. The long-boss codex test found a narrow text area; the layout was corrected and all 52 checks rerun without weakening assertions. Original baseline defects and earlier intermediate failures remain documented in docs/astra-visual-progress.md.

Known advisories: the existing large JavaScript bundle warning and Node/Electron dependency deprecation notices remain in build/launch logs. They did not produce game errors or EPIPE dialogs. No new untranslated UI text remains: the rotation hint is provided in all eight locales; intentional proper names/control labels remain unchanged.

Limitations: tested on this RTX 2060 Windows machine, not a hardware matrix or long endurance run. No full 240-sector playthrough or fluent human review of every translation is claimed. Art families are deliberately reused across catalog variants; there are ten new boss paintings, not fifty bespoke paintings. Small gameplay player sprites retain the previous pass's modeled artwork; the detailed new surface projection is in the rotating showrooms. The largest atlas needs an 8192-capable texture limit. No 3D runtime was added.

Tools, rights, original prompts and regeneration: [third-pass production notes](<${path.join(root,'docs/astra-v3-models/README.md').replaceAll('\\','/')}>) and [earlier art notes](<${path.join(root,'docs/astra-art-notes.md').replaceAll('\\','/')}>). Original Blender and built-in image_gen art; no paid API, purchased assets, external stock art or imported fonts. Original generated inputs and editable Blender scenes are retained.
`;
writeFileSync(path.join(out,'README.md'),md);writeFileSync(path.join(out,'performance.json'),JSON.stringify(rows,null,2));
const warningGallery=warningNames.map(id=>`<figure><img loading="lazy" src="warning-${id}.png" alt="${id}"><figcaption>${id.replaceAll('-',' ')}</figcaption></figure>`).join('');
const gallery=menus.captures.filter(id=>id!=='01-menu').map(id=>`<figure><img loading="lazy" src="menu-${id}.png" alt="${id}"><figcaption>${id.replace(/^\d+-/,'').replaceAll('-',' ')}</figcaption></figure>`).join('');
writeFileSync(path.join(out,'comparison.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nova Swarm / Astra</title><style>*{box-sizing:border-box}body{margin:0;background:#080f18;color:#e6eff3;font:16px system-ui}main{max-width:1440px;margin:auto;padding:32px 24px}h1{font-size:36px;margin:8px 0}p{color:#a4bcc9;line-height:1.6}small{color:#a6e3e8;letter-spacing:.13em}nav{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0 16px}button{font:inherit;padding:10px 18px;color:#bed0d9;background:#142333;border:1px solid #30495a;border-radius:4px;cursor:pointer}button.active{color:#091823;background:#a6e3e8}#stage{position:relative;aspect-ratio:16/9;overflow:hidden;border:1px solid #344852}#stage img{position:absolute;inset:0;width:100%;height:100%}#after{clip-path:inset(0 0 0 50%)}#line{position:absolute;top:0;bottom:0;left:50%;width:2px;background:white}.label{position:absolute;top:12px;padding:6px 10px;background:#08131ee8;font-size:12px}.left{left:12px}.right{right:12px}input{width:100%;margin:20px 0;accent-color:#a6e3e8}video{width:100%;background:#000}a{color:#a6e3e8}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(460px,1fr));gap:20px}figure{margin:0}figure img{width:100%;border:1px solid #344852}figcaption{padding:8px 0;text-transform:capitalize;color:#a4bcc9}@media(max-width:600px){.gallery{display:block}}</style><main><small>ACTUAL PACKAGED GAME · LOCAL EXPERIMENT</small><h1>Nova Swarm / Astra</h1><p>Rotating detailed ships, rebuilt boss and codex art, luminous warning fields and new reactor destruction. Drag the divider to compare the original build with the new experiment. Matching resolution and scenarios; not an identical replay.</p><nav>${scenes.map(([id,name])=>`<button data-id="${id}">${name}</button>`).join('')}</nav><div id="stage"><img id="before" alt="Original game"><img id="after" alt="Improved game"><div id="line"></div><span class="label left">BEFORE · a0b88d0</span><span class="label right">AFTER · ${after.checks[0].state.gitSha}</span></div><input aria-label="Comparison divider" id="slider" type="range" min="0" max="100" value="50"><p>Normal-speed gameplay · packaged executable · scripted controls · normal vulnerability · silent capture</p><video controls preload="metadata" src="gameplay-normal-speed.mp4"></video><p><a href="dense-gameplay-normal-speed.mp4">Dense-combat recording (QA invulnerability)</a> · <a href="README.md">Launch instructions, tests, measurements and limitations</a></p><h2>Inside the game</h2><div class="gallery">${gallery}</div><h2>Warning fields</h2><p>Actual source game, isolated staged fixtures. Attack geometry and safe wedges are tested separately; these screenshots are not natural-play timing evidence.</p><div class="gallery">${warningGallery}</div></main><script>const before=document.querySelector('#before'),after=document.querySelector('#after'),line=document.querySelector('#line'),slider=document.querySelector('#slider');function select(id){before.src='baseline-'+id+'.png';after.src='candidate-'+id+'.png';document.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.id===id))}document.querySelectorAll('button').forEach(b=>b.onclick=()=>select(b.dataset.id));slider.oninput=()=>{after.style.clipPath='inset(0 0 0 '+slider.value+'%)';line.style.left=slider.value+'%'};select('01-menu');</script></html>`);
console.log(JSON.stringify({out,launch,head,branch,build:build.output}));
