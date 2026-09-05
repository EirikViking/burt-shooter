import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {AssetManifest} from '../src/assets/assetManifest.js';
const rows=[...JSON.parse(readFileSync('docs/astra-models/registration.json')),...JSON.parse(readFileSync('docs/astra-v2-models/boss-registration.json'))];
for(let i=26;i<=30;i++)rows.push(JSON.parse(readFileSync(`docs/astra-v2-models/registration/player-${i}.png.json`)));
assert.equal(rows.length,130);
for(const row of rows){
 const {data,info}=await sharp(`public/art/astra/${row.family}/${row.file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,row.baseline.width);assert.equal(info.height,row.baseline.height);
 let left=info.width,top=info.height,right=-1,bottom=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 const box={left,top,width:right-left+1,height:bottom-top+1};
 for(const key of Object.keys(box))assert.ok(Math.abs(box[key]-row.baseline.box[key])<=1,`${row.family}/${row.file} ${key} moved`);
}
const groups={players:AssetManifest.generated.playerPresentation,bosses:AssetManifest.generated.bossPresentation,worlds:AssetManifest.generated.sectorWorlds};
for(const [name,files]of Object.entries(groups)){
 const hashes=files.map(p=>createHash('sha256').update(readFileSync(`public${p}`)).digest('hex'));
 assert.equal(new Set(hashes).size,files.length,`${name}: duplicate art`);
}
assert.equal(groups.players.length,30);assert.equal(groups.bosses.length,50);assert.equal(groups.worlds.length,48);
for(const file of groups.worlds){const meta=await sharp(`public${file}`).metadata();assert.equal(meta.width,2048);assert.equal(meta.height,1152);}
for(const file of [AssetManifest.generated.menuBackdrop,AssetManifest.generated.shipHangar,AssetManifest.generated.codexBackdrop,AssetManifest.generated.leaderboardHall]){const m=await sharp(`public${file}`).metadata();assert.equal(m.width,2048);assert.equal(m.height,1152);}
const result={ok:true,registeredHulls:130,players:30,enemies:50,bosses:50,worlds:48,interfacePlates:3,registrationTolerancePixels:1};
mkdirSync('test-results/astra-v2-assets',{recursive:true});writeFileSync('test-results/astra-v2-assets/report.json',JSON.stringify(result,null,2));
console.log('[astra-v2-assets] PASS',result);
