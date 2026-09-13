import fs from 'node:fs';
import assert from 'node:assert/strict';
const buildID=process.argv[2];assert.match(buildID||'',/^\d+$/);
const packageInfo=JSON.parse(fs.readFileSync('test-results/mysteries/package.json','utf8'));
const root=packageInfo.root;
const branches=file=>{
 const text=fs.readFileSync(file,'utf8').split('"branches"')[1];
 return Object.fromEntries(['public','sector-continue-test','test-build'].map(name=>[name,text.match(new RegExp(`"${name}"\\s*\\{\\s*"buildid"\\s*"(\\d+)"`))[1]]));
};
const before=branches('test-results/mystery-tour/steam-before.log'),after=branches(root+'/steam-after.log');
assert.equal(after['sector-continue-test'],buildID);assert.equal(before.public,after.public);assert.equal(before['test-build'],after['test-build']);
const native=JSON.parse(fs.readFileSync(root+'/qa/input-results.json','utf8'));
assert.ok(native.samples.some(s=>s.id&&s.ordinary>0&&s.attacks>0));assert.deepEqual(native.errors,[]);
const isolation=JSON.parse(fs.readFileSync(root+'/qa/isolation.json','utf8'));
assert.equal(isolation.runtime.appIsPackaged,true);assert.equal(isolation.runtime.steamIntegrationIsolated,true);
const receipt={buildID,appID:4765070,depotID:4765071,targetBranch:'sector-continue-test',
 sourceBranch:'codex/mystery-mixed-tour-20260912',baseline:'9a8011b',runtimeCommit:packageInfo.runtimeCommit,
 branchesBefore:before,branchesAfter:after,package:packageInfo,launchOption:'--nova-mystery-test=all',
 tests:['160000 seeded appearance samples and valid/invalid launch arguments','56 queue transitions: defeated/escaped outcomes and cancellation',
 'Real actor coexistence fixtures with ordinary, snake and boss companions; no arrival bullet wipes',
 'Normal keyboard input in source and packaged game; mixed fight and real incoming damage',
 'Packaged temporary profile, unranked policy and disabled account writes','i18n','Steam Electron bridge','build:current','release-line','retained archive file hashes','Steam branch verification'],
 screenshot:root+'/qa/last.png',untranslatedText:'None added',
 limitations:['The complete 56-fight tour was verified with director fixtures, not a claimed full human playthrough.',
 'The packaged input test reached Glass Widow plus a Space Snake; ordinary coexistence was also visually inspected in the source run.',
 'The first desktop harness run stopped at a pause/entry hold. Normal Escape input resumed the next test; automatic pause behavior was not disabled.'],
 rollback:'git revert f98d80b; prior private Steam build 25270043',steamworks:'Private test branch updated only; no store/settings change or Git push'};
fs.writeFileSync('docs/mysteries/delivery.json',JSON.stringify(receipt,null,2));
fs.writeFileSync('docs/mysteries/tour-delivery.md',`# Mixed Mystery tour\n\nSteam build **${buildID}**, private branch **sector-continue-test**. Launch with \`--nova-mystery-test=all\`.\n\nAll 56 identities run in roster order at sector 60, after an authored lead-in. They join normal waves and their snake rolls. Defeat or normal retreat advances only after the companion wave also finishes. Normal controls, damage, lives, weapons and cooldowns apply. Losing all lives ends the run.\n\nNormal campaign rolls now admit Mysteries alongside ordinary waves, snakes and bosses. One Mystery is active at a time. Existing bullets and enemies are preserved at arrival; a surviving Mystery prevents premature boss cleanup.\n\nBranch: codex/mystery-mixed-tour-20260912. Baseline: 9a8011b. Runtime: ${packageInfo.runtimeCommit}. Changed launch parsing, preset configuration, Mystery eligibility/director and EnemyManager lifecycle, plus tests and packaging/docs. No new untranslated UI text.\n\nPassed: seeded policy, all 56 queue transitions, coexistence/cancellation fixtures, real keyboard input in source and packaged game, account isolation, i18n, bridge, production build, release gate and archive hashes. The packaged capture shows Glass Widow and a Space Snake together. This is not a claim of a complete 56-fight human playthrough.\n\nPublic remained ${after.public}; test-build remained ${after['test-build']}. Steamworks store/settings untouched; private deployment performed. Rollback: \`git revert f98d80b\`; previous private build ${before['sector-continue-test']}.\n\n[Detailed receipt](delivery.json). Runtime evidence: ${root}/qa/.\n`);
console.log('Verified delivery',buildID,after);
