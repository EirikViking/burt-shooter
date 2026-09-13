import {Container,Graphics,Mesh,MeshGeometry,Texture} from 'pixi.js';
import {tractorLanes} from '../config/TractorFields.js';
import {getReducedMotionEnabled,getFlashIntensityScale} from '../config/AccessibilitySettings.js';
import {drawEnergySurface} from './AstraEnergyMaterial.js';
let fieldTexture;
const FIELD_SURFACE_MAX_ALPHA=.54;
const ROWS=97;
// Each mechanism has its own field structure, beyond its collision shape/color.
const STRUCTURES={harpoon:[2,12,.18],tide:[3,2,.82],pulse:[0,0,0],twin:[2,4,.45],helix:[4,8,.70],
 well:[5,1,.86],shepherd:[7,.5,.92],anchor:[2,0,.78],elevator:[0,0,0],winch:[4,14,.42],
 prism:[2,0,.65],pendulum:[3,3,.7],zipper:[2,0,.8],eclipse:[2,5,.88],sling:[3,8,.55]};
function texture(){
 if(fieldTexture)return fieldTexture;
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d'),data=ctx.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<128;x++){
  const u=(x/127-.5)*2,v=y/256,edge=Math.exp(-Math.pow((Math.abs(u)-.91)/.055,2));
  const core=Math.exp(-u*u*26),mist=Math.exp(-u*u*2.8);
  const flow=.75+.25*Math.cos(v*Math.PI*8+u*5);
  const i=(y*256+x)*4;data.data[i]=data.data[i+1]=data.data[i+2]=255;
  const filament=Math.pow(Math.max(0,Math.cos(u*28+Math.sin(v*Math.PI*6)*1.2)),16)*mist;
  data.data[i+3]=Math.round(Math.min(FIELD_SURFACE_MAX_ALPHA,edge*.46+core*.28+mist*.095+filament*.13)*flow*255);
 }
 ctx.putImageData(data,0,0);fieldTexture=Texture.from(canvas);fieldTexture.source.style.addressMode='repeat';return fieldTexture;
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
  this.filaments=new Graphics();this.addChild(this.filaments);
 }
 clear(){this.visible=false;this.filaments.clear();}
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
   mesh.alpha=(active?1:.18+progress*.2)*(.65+.35*flash);
   // Depth-shaded helical threads and travelling energy packets articulate motion.
   const [strands,twists,amplitude]=STRUCTURES[p.id];
   for(let strand=0;strand<strands;strand++){
    for(let glow=1;glow>=0;glow--){
     for(let k=0;k<ROWS;k++){
      const depth=k/(ROWS-1),lane=tractorLanes(p,{...params,depth})[laneIndex];
      const angle=depth*Math.PI*twists-clock*(2.2+p.index*.07)+strand*Math.PI*2/strands;
      const offset=twists?Math.sin(angle):strand===0?-1:1;
      const x=originX+lane.center+offset*lane.width*amplitude,y=originY+length*depth;
      if(k===0||(active&&lane.strength<.1))g.moveTo(x,y);else g.lineTo(x,y);
     }
     g.stroke({color:glow?p.color:strand===0?0xe7fbff:p.color,width:glow?9:2,
      alpha:glow?(active?.09:.025):(active?.40+.18*flash:.16+progress*.10)});
    }
   }
   for(let i=0;i<6;i++){
    const depth=((i/6-clock*(p.id==='sling'&&progress>.65?-.32:.32))%1+1)%1;
    const lane=tractorLanes(p,{...params,depth});const l=lane[laneIndex];
    if(active&&l.strength<.1)continue;
    const x=originX+l.center,y=originY+length*depth,r=l.width*.80;
    if(['pulse','elevator','anchor','winch'].includes(p.id)){
     drawEnergySurface(g,{kind:'pressure',x,y,width:r*2,height:Math.max(15,r*.40),color:p.color,alpha:(active?.42:.16)*Math.sin(depth*Math.PI)});
    }else if(['prism','harpoon','zipper'].includes(p.id)){
     drawEnergySurface(g,{kind:'rift',x,y,width:Math.min(r*.5,18),height:40,color:p.color,alpha:active?.55:.18});
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
  drawEnergySurface(g,{kind:'corona',x:originX,y:originY,width:42,height:28,color:p.color,alpha:.65*(active?1:progress)*flash});
  return {active,profile:p.id,lanes:lanes.length,blendMode:'normal',hostileProjectilesAboveBeam:true,surfacePeakAlpha:FIELD_SURFACE_MAX_ALPHA,inactiveSurfaceAlpha:0};
 }
 destroy(options){for(const m of this.meshes)m.geometry.destroy();super.destroy({...options,children:true});}
}
