import fs from 'node:fs';
import assert from 'node:assert/strict';
const root='E:/Codex/builds/nova-swarm/mystery-v2',buildID=process.argv[2];assert.match(buildID||'',/^\d+$/);
const read=file=>JSON.parse(fs.readFileSync(file));
const branches=file=>{const text=fs.readFileSync(file,'utf8').split('"branches"')[1];return Object.fromEntries(['public','sector-continue-test','test-build'].map(name=>[name,text.match(new RegExp(`"${name}"\\s*\\{\\s*"buildid"\\s*"(\\d+)"`))[1]]));};
const before=branches(root+'/steam-before.log'),after=branches(root+'/steam-after.log');
assert.equal(after['sector-continue-test'],buildID);assert.equal(before.public,after.public);assert.equal(before['test-build'],after['test-build']);
const packaged=read(root+'/package.json'),native=read(root+'/native-input/input-results.json'),perf=read(root+'/native-fixtures/results.json'),voices=read(root+'/native-fixtures/voice-observation.json'),runtime=read(root+'/qa/all-runtime.json');
assert.equal(packaged.runtimeCommit,'25d4825');assert.equal(runtime.rows.length,56);assert.deepEqual(runtime.errors,[]);
assert.ok(native.samples.some(s=>s.id&&s.attacks>0&&s.ordinary>0));assert.deepEqual(native.errors,[]);
assert.equal(perf.rows.length,3);assert.deepEqual(perf.errors,[]);assert.ok(voices.length===3&&voices.every(v=>v.played&&v.ended&&!v.others.length));
const cleanup={status:'blocked_by_automatic_approval_review',reason:'The temporary-file deletion command was rejected with only "blocked by policy". No deletion was performed.',
 paths:['package/source','build-dist','audio/masters','live','steam-output'].map(p=>root+'/'+p),
 otherTemporaryPath:'E:/Codex/tmp/mystery-v2',freeBytesAfter:256327155712,
 retained:'Current verified package, editable original audio and receipts, source, QA evidence. Prior shared baseline is not owned by this cleanup.'};
const receipt={buildID,appID:4765070,depotID:4765071,targetBranch:'sector-continue-test',sourceBranch:'codex/mystery-combat-v2-20260912',baseline:'3ab0b19',runtimeCommit:packaged.runtimeCommit,
 branchesBefore:before,branchesAfter:after,package:packaged,launchOption:'--nova-mystery-test=all',
 changes:{enemies:56,movementProfiles:11,weaponTypes:24,destructibleDesigns:32,newSfx:399,newFemaleAnnouncements:56,mysteryMusicDucking:false,mysteriesInCodex:false},
 tests:['All 56 real-runtime movement, attack, component, exposed-core, kill-once, retreat and resource fixtures','56 tour transitions and ordinary/snake/boss coexistence fixtures','160000 seeded policy samples','112 audio files and voice scheduling/mute/cancel/no-ducking contract','Normal keyboard source and packaged combat, with normal damage and lives','Three packaged RTX 2060 1080p mixed-wave performance fixtures, real media playback and pre-arrival sequencing','Eight-language i18n UI, production build, release-line, Steam Electron bridge','15288 retained archive file hashes including 64 player-ship assets; 119 integrated file hashes','Steam private/public branch verification'],
 performance:{gpu:perf.environment.gpu,method:perf.mode,rows:perf.rows},
 evidence:{normalRuntime:root+'/native-input/last.png',packagedFixtures:root+'/native-fixtures',all56RuntimeFixtures:root+'/qa',audioOriginals:root+'/audio/originals'},
 audioCredits:{providerReportedRequestTotal:7375,authorizedCeiling:150000,generatedOriginals:455},
 limits:['Runtime fixtures deliberately use QA invulnerability/stepped time; the separate normal-input test does not. No full 56-fight human balance pass or retention measurement is claimed.','This session cannot listen to audio. Generation, codec/cue checks, actual playback and mix sequencing are verified; auditory quality approval is not claimed.','The planetary backdrop, including its large dark concentric bands, is retained artwork. Mystery warning lanes were replaced.','Performance consists of three ten-second warm samples, not a worst-case whole-game benchmark.'],
 untranslatedText:'No new untranslated UI text. New speech remains English, consistent with existing audio; no subtitle claim.',
 steamworks:'Private test branch updated; public and test-build unchanged. Store/settings untouched. No Git push.',
 rollback:'git revert 25d4825; previous private Steam build 25270813',cleanup};
fs.writeFileSync('docs/mysteries/combat-v2-delivery.json',JSON.stringify(receipt,null,2));fs.writeFileSync('docs/mysteries/delivery.json',JSON.stringify(receipt,null,2));
fs.writeFileSync(root+'/cleanup.json',JSON.stringify(cleanup,null,2));
console.log('Verified private Steam delivery',buildID,after);
