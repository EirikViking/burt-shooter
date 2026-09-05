import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
const root='docs/astra-v5-models';
for(const folder of ['cells','registration'])await mkdir(`${root}/${folder}`,{recursive:true});
for(const folder of ['fleet-v5','dossier/fleet-v5','drone-v5'])await mkdir(`public/art/astra/${folder}`,{recursive:true});
async function bounds(input){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=-1,bottom=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 if(right<0)throw Error('Empty source');
 return {width:info.width,height:info.height,box:{left,top,width:right-left+1,height:bottom-top+1}};
}
async function cells(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const cols=new Uint32Array(info.width);for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>32)cols[x]++;
 const divide=(values,target,radius)=>{let best=Math.round(target),score=Infinity;for(let x=Math.floor(target-radius);x<=Math.ceil(target+radius);x++){const cost=values[x]*10+Math.abs(x-target)*.01;if(cost<score){score=cost;best=x;}}return best;};
 const xs=[0,...[1,2,3].map(n=>divide(cols,info.width*n/4,info.width*.03)),info.width],result=[];
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){
  const rows=new Uint32Array(info.height);for(let y=0;y<info.height;y++)for(let x=xs[col];x<xs[col+1];x++)if(data[(y*info.width+x)*4+3]>32)rows[y]++;
  const ys=[0,...[1,2].map(n=>divide(rows,info.height*n/3,info.height*.045)),info.height];
  const crop=await sharp(file).extract({left:xs[col],top:ys[row],width:xs[col+1]-xs[col],height:ys[row+1]-ys[row]}).png().toBuffer();
  result.push(await sharp(crop).extract((await bounds(crop)).box).png().toBuffer());
 }
 return result;
}
const fleet=[];
for(let n=1;existsSync(`${root}/source/fleet-${String(n).padStart(2,'0')}.png`);n++)fleet.push(...await cells(`${root}/source/fleet-${String(n).padStart(2,'0')}.png`));
for(let i=0;i<Math.min(227,fleet.length);i++){
 const id=String(i+1).padStart(3,'0');await writeFile(`${root}/cells/${id}.png`,fleet[i]);
 const old=i<50?`public/art/astra/enemy/${String(i+1).padStart(2,'0')}.png`:`public/art/astra/late/${String(i-49).padStart(3,'0')}.png`;
 const baseline=await bounds(old);
 const fitted=await sharp(fleet[i]).resize(baseline.box.width,baseline.box.height,{fit:'fill'}).png().toBuffer();
 const destination=`public/art/astra/fleet-v5/${id}.png`;
 await sharp({create:{width:baseline.width,height:baseline.height,channels:4,background:'#00000000'}}).composite([{input:fitted,left:baseline.box.left,top:baseline.box.top}]).png().toFile(destination);
 await sharp(fleet[i]).resize(640,640,{fit:'contain',background:'#00000000'}).webp({quality:94}).toFile(`public/art/astra/dossier/fleet-v5/${id}.webp`);
 await writeFile(`${root}/registration/${id}.json`,JSON.stringify({baseline,candidate:await bounds(destination),source:`cells/${id}.png`},null,2));
}
if(existsSync(`${root}/source/drones.png`)){
 const drones=await cells(`${root}/source/drones.png`);
 for(let i=0;i<drones.length;i++)await sharp(drones[i]).resize(128,128,{fit:'contain',background:'#00000000'}).png().toFile(`public/art/astra/drone-v5/${String(i+1).padStart(2,'0')}.png`);
}
console.log(`Packed ${Math.min(227,fleet.length)} fleet hulls with baseline registration and 12 drone designs.`);
