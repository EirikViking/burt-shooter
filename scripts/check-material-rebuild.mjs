import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {shadeHullPixels} from '../src/effects/AstraHullMaterial.js';
import {createEnginePlumePixels} from '../src/effects/AstraEnginePlume.js';
import {AssetManifest} from '../src/assets/assetManifest.js';
import {resolveGameplayBackdropSources} from '../src/config/GameplayBackdropMotion.js';
const worlds=AssetManifest.generated.sectorWorlds;
assert.equal(worlds.length,48);
for(const [level,name] of [[1,'ocean'],[6,'volcanic'],[11,'ice']]){
 assert.equal(resolveGameplayBackdropSources(level,'modern',AssetManifest.generated).base,`/art/material-rebuild/${name}.webp`);
 const meta=await sharp(`public/art/material-rebuild/${name}.webp`).metadata();assert.equal(meta.width,1920);assert.equal(meta.height,1080);
}
assert.equal(worlds[10],'/art/astra/world/11.webp','Sector 51 retains its established world');
assert.equal(AssetManifest.generated.playerPresentation.length,30);
assert.equal(AssetManifest.generated.playerPresentation[0],'/art/material-rebuild/scout.png');
assert.equal(AssetManifest.generated.playerPresentation[1],'/art/solid-fleet-20260908/player/02.png');
async function bounds(file){const{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=32){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return[info.width,info.height,x0,y0,x1,y1];}
assert.deepEqual(await bounds('public/art/material-rebuild/scout.png'),await bounds('public/art/solid-fleet-20260908/player/01.png'));
const pixels=new Uint8ClampedArray([10,30,70,0,80,90,100,128,230,240,250,255,90,10,30,255]);
const random=Math.random;Math.random=()=>{throw Error('Material consumed gameplay RNG');};
try{const output=shadeHullPixels(pixels,2,2);assert.deepEqual(output,shadeHullPixels(pixels,2,2));for(let i=3;i<pixels.length;i+=4)assert.equal(output[i],pixels[i]);assert.deepEqual([...output.slice(0,4)],[...pixels.slice(0,4)]);
 const plume=createEnginePlumePixels();assert.equal(plume.length,64*192*4);assert.deepEqual(plume,createEnginePlumePixels());assert(plume[32*4+3]>plume[3],'Nozzle must have a brighter core than its edge');for(let x=0;x<64;x++)assert.equal(plume[((191*64+x)*4)+3],0,'Jet must fade before texture edge');
}finally{Math.random=random;}
assert(!fs.readFileSync('src/effects/AstraEnginePlume.js','utf8').includes('Math.random'));
console.log('PASS: world boundaries, hull identity/registration, deterministic material, exact alpha preservation');
