// Read-only verification of authenticated SteamCMD app-info receipts.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const [beforeFile,afterFile,buildID]=process.argv.slice(2);
if(!beforeFile||!afterFile||!/^\d+$/.test(buildID||''))throw Error('Expected before-log after-log uploaded-build-id');
function parse(text){
 const start=text.indexOf('"4765070"');assert.ok(start>=0,'App info is present');
 const tokens=text.slice(start).match(/"(?:[^"\\]|\\.)*"|[{}]/g);let i=0;
 const string=t=>t.slice(1,-1).replace(/\\"/g,'"');
 function obj(){const o={};while(i<tokens.length&&tokens[i]!=='}'){const k=string(tokens[i++]);if(tokens[i]==='{'){i++;o[k]=obj();}else o[k]=string(tokens[i++]);}assert.equal(tokens[i++],'}');return o;}
 assert.equal(string(tokens[i++]),'4765070');assert.equal(tokens[i++],'{');return obj();
}
const before=parse(await fs.readFile(beforeFile,'utf8')),after=parse(await fs.readFile(afterFile,'utf8'));
const branches=o=>Object.fromEntries(Object.entries(o.depots.branches).map(([name,v])=>[name,v.buildid]));
assert.equal(after.depots.branches['sector-continue-test'].buildid,buildID,'test branch must contain uploaded build');
assert.equal(after.depots.branches.public.buildid,before.depots.branches.public.buildid,'public must remain unchanged');
for(const[name,b]of Object.entries(before.depots.branches))if(name!=='sector-continue-test')assert.equal(after.depots.branches[name]?.buildid,b.buildid,`${name} must remain unchanged`);
assert.ok(before.ufs&&after.ufs,'Complete Steam Cloud UFS blocks must be present');assert.deepEqual(after.ufs,before.ufs,'Cloud settings must remain unchanged');
const receipt={verifiedAt:new Date().toISOString(),appID:'4765070',depotID:'4765071',targetBranch:'sector-continue-test',buildID,branchesBefore:branches(before),branchesAfter:branches(after),manifest:after.depots['4765071'].manifests['sector-continue-test'].gid,cloudSettingsUnchanged:true,cloudConfigurationSHA256:crypto.createHash('sha256').update(JSON.stringify(after.ufs)).digest('hex'),verification:'Authenticated SteamCMD app_info_update 1 and app_info_print 4765070'};
await fs.writeFile('docs/fleet-art-v2/steam-delivery.json',JSON.stringify(receipt,null,2)+'\n');console.log(receipt);
