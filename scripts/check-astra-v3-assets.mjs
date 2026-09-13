import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import sharp from 'sharp';
import {GameAssets} from '../src/utils/GameAssets.js';
import {getThreatCodexCatalog} from '../src/config/ThreatCodexCatalog.js';
const sources=JSON.parse(readFileSync('docs/astra-v3-models/threat-sources.json'));
let registered=0,decodedBytes=0;const art=new Set();
for(const [family,entries]of Object.entries(sources))for(const entry of entries){
 const id=String(entry.index+1).padStart(family==='boss'?2:3,'0');
 const receipt=JSON.parse(readFileSync(`docs/astra-v3-models/registration/${family}-${id}.json`));
 const {data,info}=await sharp(`public/art/astra/${family}/${id}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,receipt.baseline.width);assert.equal(info.height,receipt.baseline.height);
 let left=info.width,top=info.height,right=-1,bottom=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 const box={left,top,width:right-left+1,height:bottom-top+1};
 for(const key of Object.keys(box))assert.ok(Math.abs(box[key]-receipt.baseline.box[key])<=1,`${family}/${id}: ${key} moved`);
 registered++;
}
const catalog=getThreatCodexCatalog(),coverage={};
for(const family of ['enemies','elites','bosses']){
 coverage[family]=0;
 for(const entry of catalog[family]){const source=GameAssets.getCodexPresentationSource({...entry,category:family});assert.ok(source,`${family}/${entry.id} unmapped`);art.add(source);coverage[family]++;}
}
for(const file of art){const m=await sharp(`public${file}`).metadata();assert.ok(m.width>0&&m.height>0,file);decodedBytes+=m.width*m.height*4;}
const turntables=[];
for(let i=1;i<=30;i++){
 const file=`public/art/astra/turntable/${String(i).padStart(2,'0')}`,data=JSON.parse(readFileSync(`${file}.json`));
 const m=await sharp(`${file}.webp`).metadata();assert.equal(data.count,72);assert.equal(data.views.length,72);assert.equal(m.width,data.size*data.columns);assert.ok(m.height>=Math.ceil(72/data.columns)*data.size);
 for(const view of data.views){assert.equal(view.emitters.length,2);for(const e of view.emitters)assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.y));}
 turntables.push({ship:i,views:72,decodedMiB:m.width*m.height*4/1048576});
}
const report={ok:true,registered,coverage,uniqueCodexImages:art.size,allCodexArtDecodedMiB:decodedBytes/1048576,turntables};
mkdirSync('test-results/astra-v3-assets',{recursive:true});writeFileSync('test-results/astra-v3-assets/report.json',JSON.stringify(report,null,2));console.log('PASS',registered,'registered threats;',art.size,'codex sources; 30 complete turntables');
