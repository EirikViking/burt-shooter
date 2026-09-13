import sharp from 'sharp';import {readFile,mkdir,writeFile} from 'node:fs/promises';
const sources=JSON.parse(await readFile('docs/astra-v3-models/threat-sources.json','utf8'));
const family=process.argv[2]||'supports';
const sourceRoot='docs/astra-v3-models/source';
const roleNames=['fuel_runner','armor_mender','shield_tug','spark_barge','mercy_skiff','reactor_nurse','panic_patch','warranty_tow'];
await mkdir(`docs/astra-v3-models/renders/${family}`,{recursive:true});
const cropCache=new Map();
for(const p of sources[family]){
 let source,cell=null;
 if(family==='supports'){
  const role=roleNames.indexOf(p.role);
  if(role===5)source='reactor-nurse.png';
  else{source=`support-sheet-${Math.floor(role/4)+1}.png`;cell=role%4;}
 }else{
  const designs=family==='boss'?10:family==='elites'?12:16;
  const abilityArt={lane_blocker:8,orb_webber:9,missile_frigate:10,mirror_decoy:7,pulse_emp:5,anchor_turret:10,escort_commander:2,elite_hunter:0,prism_barrage:4,meteor_bloom:3,hunter_dash:0,satellite_ring:1,stasis_lattice:8,siphon_tether:9,resonance_command:2,warp_ambush:11,ion_shear:4,siege_beacon:10};
  const index=family==='elites'?(abilityArt[p.specialAbility]??p.index%designs):family==='boss'&&p.index%10===5?11:p.index%designs;
  source=`${family}-sheet-${Math.floor(index/4)+1}.png`;cell=index%4;
 }
 const key=`${source}:${cell}`;
 if(!cropCache.has(key)){
  const path=`${sourceRoot}/${source}`,meta=await sharp(path).metadata();
  if(!meta.hasAlpha)throw Error(`Generated ship asset is missing alpha: ${source}`);
  let raster=sharp(path);
  if(cell!==null){
   // Generated sheets may have unequal gutters. Locate their actual empty
   // separator, rather than cutting a nose at the mathematical midpoint.
   const {data,info}=await sharp(path).raw().toBuffer({resolveWithObject:true});
   const rows=new Uint32Array(info.height),cols=new Uint32Array(info.width);
   for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>24){rows[y]++;cols[x]++;}
   const divider=s=>Array.from(s,(n,i)=>({n,i})).filter(p=>p.i>s.length*.43&&p.i<s.length*.57).sort((a,b)=>a.n-b.n||Math.abs(a.i-s.length/2)-Math.abs(b.i-s.length/2))[0].i;
   const sx=divider(cols),left=cell%2?sx:0,right=cell%2?info.width:sx;
   rows.fill(0);
   for(let y=0;y<info.height;y++)for(let x=left;x<right;x++)if(data[(y*info.width+x)*4+3]>24)rows[y]++;
   const sy=divider(rows),top=cell>1?sy:0;
   raster=raster.extract({left,top,width:cell%2?meta.width-sx:sx,height:cell>1?meta.height-sy:sy});
  }
  cropCache.set(key,await raster.png().toBuffer());
 }
 await writeFile(`docs/astra-v3-models/renders/${family}/${String(p.index+1).padStart(family==='boss'?2:3,'0')}.png`,cropCache.get(key));
}
console.log('Normalized original generated source art',family,sources[family].length);
if(family==='boss'){
 // The spare cell is a dedicated articulated gun module, not a full hull.
 const file=`${sourceRoot}/boss-sheet-3.png`,m=await sharp(file).metadata(),top=Math.round(m.height*.505);
 const crop=await sharp(file).extract({left:0,top,width:Math.floor(m.width*.499),height:m.height-top}).png().toBuffer();
 await sharp(crop).trim({threshold:8}).resize(256,384,{fit:'contain',background:'#00000000'}).png().toFile('public/art/astra/component/03.png');
}
