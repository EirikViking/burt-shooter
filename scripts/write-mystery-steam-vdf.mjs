import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('test-results/mysteries/package.json','utf8'));
const vdf=`"AppBuild"
{
 "AppID" "4765070"
 "Desc" "Nova Swarm ${p.runtimeCommit}: sequential Mystery tour and mixed ordinary, serpent and boss encounters"
 "BuildOutput" "${p.root}/steam-output"
 "ContentRoot" "${p.payload}"
 "SetLive" "sector-continue-test"
 "Depots"
 {
  "4765071" { "FileMapping" { "LocalPath" "*" "DepotPath" "." "recursive" "1" } }
 }
}`;
fs.writeFileSync(`${p.root}/app_build.vdf`,vdf); console.log(`${p.root}/app_build.vdf`);
