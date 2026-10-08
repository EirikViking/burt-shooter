import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const [id,source,planFile]=process.argv.slice(2);
if(!process.env.TEMP?.replaceAll('\\','/').startsWith('E:/Codex/tmp/cosmic-fauna-'))throw Error('Owned E: TEMP required');
const plan=JSON.parse(fs.readFileSync(planFile));
const definition=plan.definitions.find(row=>row.id===id);
if(!definition||!/^\w+$/.test(id))throw Error('Missing authored production definition');
const asset=`public/art/cosmic-fauna/${id}.png`;
if(fs.existsSync(asset))throw Error('Preserve existing asset; explicit review needed for replacement');
const inspection=JSON.parse(execFileSync('python',['-c',
 'import json,sys; from PIL import Image; im=Image.open(sys.argv[1]); a=im.getchannel("A"); w,h=im.size; print(json.dumps({"mode":im.mode,"width":w,"height":h,"alphaExtrema":a.getextrema(),"alphaBounds":a.getbbox(),"corners":[a.getpixel(p) for p in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]]}))',source],{encoding:'utf8'}));
// Allow <=2/255 corner alpha from quantization; no visible background rectangle.
if(inspection.mode!=='RGBA'||inspection.width>2048||inspection.height>2048||inspection.alphaExtrema[0]!==0||inspection.alphaExtrema[1]<200||inspection.corners.some(alpha=>alpha>2))throw Error('RGBA/size/transparency gate failed: '+JSON.stringify(inspection));
const bytes=fs.readFileSync(source),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
const provenanceFile='docs/cosmic-fauna-art-provenance-20261002.json';
const provenance=JSON.parse(fs.readFileSync(provenanceFile));
if(provenance.assets.some(row=>row.id===id||row.sha256===sha256))throw Error('Duplicate identity/art');
fs.copyFileSync(source,asset,fs.constants.COPYFILE_EXCL);
provenance.assets.push({id,tool:'built-in image_gen',transparentBackground:true,prompt:plan.commonArtPrompt+definition.brief,...(definition.artEdit?{edit:definition.artEdit}:{}),source:path.resolve(source).replaceAll('\\','/'),asset,sha256,bytes:bytes.length,inspection,status:'Generated image visually inspected; alpha validated. Motion/audio integration and runtime review pending.'});
fs.writeFileSync(provenanceFile,JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify({id,asset,sha256,bytes:bytes.length,inspection}));
