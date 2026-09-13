import { getReducedMotionEnabled, getFlashIntensityScale } from '../config/AccessibilitySettings.js';
import { Matrix } from 'pixi.js';
import { getReactorMaterials } from './AstraReactorRupture.js';
import {drawEnergySurface,drawEnergyLink,energyClock} from './AstraEnergyMaterial.js';

export function drawEnergyGlint(g,x,y,r,color,alpha) {
  const texture=getReactorMaterials().core;
  g.poly([x-r,y-r,x+r,y-r,x+r,y+r,x-r,y+r]).fill({texture,
    matrix:new Matrix(r/64,0,0,r/64,x-r,y-r),textureSpace:'global',color,alpha});
}

// Boss-local energy only. No particles, filters, entities, RNG or attack logic.
// Existing Graphics are cleared and owned by the boss presentation lifecycle.
export function drawBossChargeCrown(g,{x=0,y=0,radius,color,edge,progress=0,family='aim',reverse=false}) {
  if(!g)return;
  const p=Math.max(0,Math.min(1,progress)),motion=!getReducedMotionEnabled(),flash=getFlashIntensityScale();
  const radial=['ring','radial','adds'].includes(family),beam=['lance','aim','split'].includes(family);
  const arms=radial?6:family==='mirror'?4:2;
  const time=energyClock(),r=radius*(.68+p*.1);
  for(let i=0;i<arms;i++){
    const angle=radial?i*Math.PI*2/arms+(reverse?-1:1)*time*.12:Math.PI*.12+i*Math.PI*2/arms;
    const nx=x+Math.cos(angle)*r,ny=y+Math.sin(angle)*r;
    drawEnergySurface(g,{kind:'corona',x:nx,y:ny,width:radius*(.18+p*.24),height:radius*(.16+p*.20),color:edge,alpha:.12+p*.35});
    drawEnergyLink(g,{x:x+(nx-x)*.36,y:y+(ny-y)*.36,toX:nx,toY:ny,width:radius*(.06+p*.07),color,alpha:.10+p*.30});
  }
  drawEnergySurface(g,{kind:radial?'pressure':'membrane',x,y:y+radius*.12,width:radius*(1.15+p*.3),height:radius*(.80+p*.2),color,alpha:p*.18});
  drawEnergyGlint(g,x,y+radius*.24,radius*(.25+p*.15),color,(.2+p*.4)*flash);
}

export function drawBossDischarge(g,{radius,color,edge,angle,progress,family='aim'}) {
  if(!g||progress<=0)return;
  const p=Math.max(0,Math.min(1,progress)),age=1-p,motion=!getReducedMotionEnabled(),flash=getFlashIntensityScale();
  const radial=['ring','radial','adds','spiral','clock','chord'].includes(family);
  const beams=family==='mirror'||family==='split'?2:family==='fan'||family==='cone'?3:1;
  // A broad local pressure wake, followed by directional plasma discharge.
  const r=radius*(motion?.22+age*.65:.55);
  drawEnergySurface(g,{kind:'pressure',width:r*2,height:r*1.55,color:edge,alpha:p*.45});
  drawEnergyGlint(g,Math.cos(angle)*radius*.36,Math.sin(angle)*radius*.36,radius*.6,color,p*.55*flash);
  if(radial)return;
  for(let i=0;i<beams;i++){
    const a=angle+(i-(beams-1)/2)*.22,c=Math.cos(a),s=Math.sin(a);
    drawEnergyLink(g,{x:c*radius*.25,y:s*radius*.25,toX:c*radius*(.6+p*.45),toY:s*radius*(.6+p*.45),width:radius*(.12+p*.12),color,alpha:p*.65});
  }
}
