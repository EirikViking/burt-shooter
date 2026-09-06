import { getReducedMotionEnabled, getFlashIntensityScale } from '../config/AccessibilitySettings.js';
import { Matrix } from 'pixi.js';
import { getReactorMaterials } from './AstraReactorRupture.js';

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
  const arms=radial?8:family==='mirror'?6:4;
  const spin=motion?(Date.now()*.00038+p*p*.75)*(reverse?-1:1):0;
  const beat=motion?.5+.5*Math.sin(p*p*Math.PI*6):.5;
  const r=radius*(.70+p*.08);
  for(let i=0;i<arms;i++){
    const a=i*Math.PI*2/arms+spin,arc=(Math.PI*2/arms)*.42;
    g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r).arc(x,y,r,a,a+arc)
      .stroke({color,width:4,alpha:(.12+p*.14)*flash});
    g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r).arc(x,y,r,a,a+arc)
      .stroke({color:edge,width:1.3,alpha:.28+p*.5});
    // Short collapsing capacitors end on the armor, not in the dodge lanes.
    const u=motion?(Date.now()*.0007+p*p+i/arms)%1:.5;
    const outer=radius*(.95-u*.28),inner=outer-radius*(.05+p*.07);
    g.moveTo(x+Math.cos(a)*outer,y+Math.sin(a)*outer)
      .lineTo(x+Math.cos(a+.035)*inner,y+Math.sin(a+.035)*inner)
      .stroke({color:edge,width:1.5,alpha:(.25+p*.45)*Math.sin(u*Math.PI)});
    if(radial||!beam){
      const nx=x+Math.cos(a+arc)*r,ny=y+Math.sin(a+arc)*r;
      g.circle(nx,ny,1.5+p*1.5).fill({color:edge,alpha:(.35+p*.45)*flash});
    }
  }
  // The final charging beat is confined to the central reactor.
  const core=radius*(.06+p*.045);
  drawEnergyGlint(g,x,y+radius*.24,core*5,color,(.3+p*.45+beat*p*.15)*flash);
  if(p>.55){
    for(let side=-1;side<=1;side+=2){
      for(let j=0;j<7;j++){
        const u=j/6,px=x+side*radius*(.45-u*.36);
        const py=y+radius*.24+Math.sin(j*2.3+(motion?Date.now()*.012:0)+side)*radius*.025*Math.sin(u*Math.PI);
        if(j)g.lineTo(px,py);else g.moveTo(px,py);
      }
      g.stroke({color:edge,width:1.1,alpha:(p-.55)*1.2*flash});
    }
  }
}

export function drawBossDischarge(g,{radius,color,edge,angle,progress,family='aim'}) {
  if(!g||progress<=0)return;
  const p=Math.max(0,Math.min(1,progress)),age=1-p,motion=!getReducedMotionEnabled(),flash=getFlashIntensityScale();
  const radial=['ring','radial','adds','spiral','clock','chord'].includes(family);
  const beams=family==='mirror'||family==='split'?2:family==='fan'||family==='cone'?3:1;
  // Local muzzle shock collars dissipate within the hull's visual radius.
  const r=radius*(motion?.22+age*.65:.55);
  drawEnergyGlint(g,Math.cos(angle)*radius*.36,Math.sin(angle)*radius*.36,radius*.6,color,p*.7*flash);
  for(let i=0;i<(radial?8:4);i++){
    const a=i*Math.PI*2/(radial?8:4)+angle;
    g.moveTo(Math.cos(a)*r,Math.sin(a)*r).arc(0,0,r,a,a+.3)
      .stroke({color:edge,width:1+p*2,alpha:p*.6*flash});
  }
  if(radial)return;
  for(let i=0;i<beams;i++){
    const a=angle+(i-(beams-1)/2)*.22,c=Math.cos(a),s=Math.sin(a);
    const start=radius*.25,end=radius*(.6+p*.45),w=radius*(.025+p*.025);
    g.poly([c*start,s*start,c*end-s*w,s*end+c*w,c*(end+radius*.14),s*(end+radius*.14),c*end+s*w,s*end-c*w])
      .fill({color,alpha:p*.3*flash});
    g.moveTo(c*start,s*start).lineTo(c*end,s*end).stroke({color:edge,width:1+p*2,alpha:p*.8*flash});
  }
}
