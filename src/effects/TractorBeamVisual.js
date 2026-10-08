import {Container,Graphics,Mesh,MeshGeometry,Sprite,Texture} from 'pixi.js';
import {tractorLanes} from '../config/TractorFields.js';
import {getReducedMotionEnabled,getFlashIntensityScale} from '../config/AccessibilitySettings.js';
import {drawEnergySurface} from './AstraEnergyMaterial.js';
let fieldTexture,cloudTexture;
const FIELD_SURFACE_MAX_ALPHA=.3;
const ROWS=97;
// Each mechanism has its own field structure, beyond its collision shape/color.
function texture(){
 if(fieldTexture)return fieldTexture;
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d'),data=ctx.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<128;x++){
  const u=(x/127-.5)*2,v=y/256;
  const envelope=Math.pow(Math.max(0,1-Math.abs(u)),.72);
  const curl=Math.sin(v*19+u*5)+.48*Math.sin(v*43-u*11)+.28*Math.sin(v*79+u*23);
  const cloud=Math.max(0,.55+.19*curl);
  const core=Math.exp(-u*u*7),mist=Math.exp(-u*u*1.9);
  const flow=.82+.18*Math.cos(v*Math.PI*5+u*3);
  const i=(y*256+x)*4;data.data[i]=data.data[i+1]=data.data[i+2]=255;
  data.data[i+3]=Math.round(Math.min(FIELD_SURFACE_MAX_ALPHA,(cloud*mist*.72+core*.2)*envelope*flow)*255);
 }
 ctx.putImageData(data,0,0);fieldTexture=Texture.from(canvas);fieldTexture.source.style.addressMode='repeat';return fieldTexture;
}
function cloud(){
 if(cloudTexture)return cloudTexture;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),data=ctx.createImageData(128,128);
 const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
 const noise=(x,y)=>{
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const a=hash(ix,iy)*(1-sx)+hash(ix+1,iy)*sx;
  const b=hash(ix,iy+1)*(1-sx)+hash(ix+1,iy+1)*sx;
  return a*(1-sy)+b*sy;
 };
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const u=(x-63.5)/63.5,v=(y-63.5)/63.5;
  const warp=noise(u*3+9,v*3+4)-.5;
  const radius=Math.hypot(u+warp*.23,v*.84);
  const falloff=Math.pow(Math.max(0,1-radius),1.7);
  const turbulence=.2+.55*noise(u*5+19,v*5+7)+.25*noise(u*12+3,v*12+15);
  const i=(y*128+x)*4;
  data.data[i]=data.data[i+1]=data.data[i+2]=255;
  data.data[i+3]=Math.round(150*falloff*turbulence);
 }
 ctx.putImageData(data,0,0);cloudTexture=Texture.from(canvas);
 cloudTexture.label='astra_tractor_plasma_cloud';return cloudTexture;
}
export class TractorBeamVisual extends Container {
 constructor(profile){
  super();this.eventMode='none';this.profile=profile;this.meshes=[];
  for(let i=0;i<3;i++){
   const count=ROWS,positions=new Float32Array(count*4),uvs=new Float32Array(count*4),indices=[];
   for(let k=0;k<count-1;k++){const j=k*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
   const geometry=new MeshGeometry({positions,uvs,indices:new Uint32Array(indices)});
   const mesh=new Mesh({geometry,texture:texture()});mesh.tint=profile.color;this.addChild(mesh);this.meshes.push(mesh);
  }
  this.clouds=Array.from({length:18},()=>{
   const sprite=new Sprite(cloud());sprite.anchor.set(.5);sprite.tint=profile.color;
   sprite.blendMode='add';this.addChild(sprite);return sprite;
  });
  this.filaments=new Graphics();this.addChild(this.filaments);
 }
 clear(){this.visible=false;this.filaments.clear();for(const cloud of this.clouds)cloud.visible=false;}
 render({span,length,aim,originX=0,originY=22,progress,time,active}){
  this.visible=true;const p=this.profile,g=this.filaments;g.clear();
  const reduced=getReducedMotionEnabled(),clock=reduced?0:time,flash=getFlashIntensityScale();
  const phase=active?progress:0,params={span,aim,progress:phase,time:clock};
  const lanes=tractorLanes(p,{...params,depth:.7});
  this.meshes.forEach((mesh,laneIndex)=>{
   mesh.visible=laneIndex<lanes.length;if(!mesh.visible)return;
   const positions=mesh.geometry.positions,uvs=mesh.geometry.uvs;
   for(let k=0;k<ROWS;k++){
    const depth=k/(ROWS-1),lane=tractorLanes(p,{...params,depth})[laneIndex];
    const strength=active?lane.strength:1,w=lane.width*(strength<.1?.38:1);
    const cx=originX+lane.center,cy=originY+length*depth;
    positions.set([cx-w,cy,cx+w,cy],k*4);
    // The right half of the atlas is transparent: inactive lift bands and pulse
    // gaps disappear at the same depths as the physical field.
    const u0=strength<.1?.75:0,u1=strength<.1?.75:.496;
    uvs.set([u0,depth*1.6+clock*.42,u1,depth*1.6+clock*.42],k*4);
   }
   mesh.geometry.getBuffer('aPosition').update();mesh.geometry.getBuffer('aUV').update();
   mesh.alpha=(active?.48:.12+progress*.1)*(.65+.35*flash);
   // The continuous mesh carries the field. Short, soft plasma knots reveal
   // its flow without drawing screen-length strands through the playfield.
   for(let i=0;i<6;i++){
    const sprite=this.clouds[laneIndex*6+i];
    const depth=((i/6-clock*.11+(laneIndex*.17))%1+1)%1;
    const lane=tractorLanes(p,{...params,depth})[laneIndex];
    const strength=active?lane.strength:1;
    sprite.visible=strength>.12;
    sprite.x=originX+lane.center+Math.sin(depth*17+i*2.4+clock*.8)*lane.width*.3;
    sprite.y=originY+length*depth;
    sprite.width=lane.width*(1.3+(i%3)*.15);
    sprite.height=Math.min(130,Math.max(52,length*.13))*(.8+(i%2)*.25);
    sprite.rotation=Math.sin(depth*12+i)*.17;
    sprite.alpha=(active?.44:.12+progress*.12)*strength*(.68+.32*Math.sin(depth*Math.PI))*(.4+.6*flash);
   }
   for(let i=0;i<6;i++){
    const depth=((i/6-clock*(p.id==='sling'&&progress>.65?-.32:.32))%1+1)%1;
    const lane=tractorLanes(p,{...params,depth});const l=lane[laneIndex];
    if(active&&l.strength<.1)continue;
    const x=originX+l.center,y=originY+length*depth,r=l.width*.80;
    if(['pulse','elevator','anchor','winch'].includes(p.id)){
     drawEnergySurface(g,{kind:'pressure',x,y,width:r*2,height:Math.max(15,r*.40),color:p.color,alpha:(active?.42:.16)*Math.sin(depth*Math.PI)});
    }else if(['prism','harpoon','zipper'].includes(p.id)){
     drawEnergySurface(g,{kind:'corona',x,y,width:Math.max(26,r*1.35),
       height:Math.max(34,r*.9),color:p.color,alpha:active?.38:.13});
     drawEnergySurface(g,{kind:'pressure',x:x+Math.sin(clock*2+i*1.7)*r*.18,y,
       width:Math.max(24,r*1.1),height:Math.max(20,r*.46),color:p.color,alpha:active?.24:.07});
    }else{
     const a=depth*16+clock+i;
     const px=x+Math.sin(a)*r*.7;
     drawEnergySurface(g,{kind:'corona',x:px,y,width:12+depth*10,height:20+depth*12,color:p.color,alpha:active?.58:.16});
    }
   }
  });
  if(p.id==='well'&&active){
   const focus=tractorLanes(p,{...params,depth:.52})[0],x=originX+focus.center,y=originY+length*.52;
   drawEnergySurface(g,{kind:'pressure',x,y,width:focus.width*2,height:focus.width*.68,color:p.color,alpha:.52,angle:reduced?0:Math.sin(clock*.3)*.10});
  }
  // Emitter flare stays compact; hostile bullets remain above the field.
  g.alpha=.55+.45*flash;
  drawEnergySurface(g,{kind:'corona',x:originX,y:originY,width:42,height:28,color:p.color,alpha:.65*(active?1:progress),minExposure:.45});
  return {active,profile:p.id,lanes:lanes.length,blendMode:'normal',hostileProjectilesAboveBeam:true,surfacePeakAlpha:FIELD_SURFACE_MAX_ALPHA,inactiveSurfaceAlpha:0};
 }
 destroy(options){for(const m of this.meshes)m.geometry.destroy();super.destroy({...options,children:true});}
}
