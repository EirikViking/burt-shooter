import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/check-release-line.mjs'],{stdio:'inherit'});
const root='E:/Codex/builds/nova-swarm/mystery-v2';
const p=JSON.parse(fs.readFileSync(root+'/package.json'));
const branches=file=>{
 const text=fs.readFileSync(file,'utf8').split('"branches"')[1];
 return Object.fromEntries(['public','sector-continue-test','test-build'].map(name=>[name,text.match(new RegExp(`"${name}"\\s*\\{\\s*"buildid"\\s*"(\\d+)"`))[1]]));
};
assert.deepEqual(branches(root+'/steam-before.log'),branches(root+'/steam-preflight.log'),'Another release changed the branch during validation');
assert.equal(p.runtimeCommit,'25d4825');
const native=JSON.parse(fs.readFileSync(root+'/native-input/input-results.json'));
assert.ok(native.samples.some(s=>s.id&&s.ordinary>0&&s.attacks>0));assert.deepEqual(native.errors,[]);
const perf=JSON.parse(fs.readFileSync(root+'/native-fixtures/results.json'));assert.equal(perf.rows.length,3);assert.deepEqual(perf.errors,[]);
fs.writeFileSync(root+'/app_build.vdf',`"AppBuild"
{
 "AppID" "4765070"
 "Desc" "Nova Swarm ${p.runtimeCommit}: 56 mobile Mystery enemies, varied combat, component breakup, bespoke SFX and female announcements"
 "BuildOutput" "${root}/steam-output"
 "ContentRoot" "${p.payload}"
 "SetLive" "sector-continue-test"
 "Depots"
 {
  "4765071" { "FileMapping" { "LocalPath" "*" "DepotPath" "." "recursive" "1" } }
 }
}`);
console.log(root+'/app_build.vdf');
