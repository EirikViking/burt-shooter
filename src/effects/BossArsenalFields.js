import { getBossArsenal, getBossArsenalDangerColor } from '../config/BossArsenal.js';
import { getReducedMotionEnabled, getFlashIntensityScale } from '../config/AccessibilitySettings.js';
import { Matrix } from 'pixi.js';
import { getArsenalFieldTexture } from './BossArsenalMaterials.js';

export function drawArsenalAnnulus(g,{x=0,y=0,inner,outer,safeAngle,safeWedge,material='magma',time=0,alpha=1}) {
  const start=safeAngle+safeWedge,end=safeAngle+Math.PI*2-safeWedge,points=[];
  for(let j=0;j<=80;j++){const a=start+(end-start)*j/80;points.push(x+Math.cos(a)*outer,y+Math.sin(a)*outer);}
  for(let j=80;j>=0;j--){const a=start+(end-start)*j/80;points.push(x+Math.cos(a)*inner,y+Math.sin(a)*inner);}
  const phase=(time*5)%4,index=Math.floor(phase),blend=phase-index;
  const matrix=new Matrix(outer/128,0,0,outer/128,x-outer,y-outer);
  for(const [frame,weight]of [[index,1-blend],[(index+1)%4,blend]]){
    if(weight>.001)g.poly(points).fill({texture:getArsenalFieldTexture(material,frame),matrix,textureSpace:'global',alpha:alpha*weight});
  }
}

// All energy is clipped analytically to the existing armed collision region.
// No extra attack, larger hitbox, tracking or screen-sized bloom is introduced.
export function drawArsenalField(g,h,progress) {
  if(!h.arsenalArchetype)return;
  const armed=(h.elapsedMs||0)>=(h.armingMs||0);if(!armed)return;
  const d=getBossArsenal(h.arsenalArchetype),reduced=getReducedMotionEnabled();
  const t=reduced?0:(h.elapsedMs||0)*.001;
  const fade=Math.min(1,(1-progress)*5),flash=getFlashIntensityScale();
  const color=getBossArsenalDangerColor(h.arsenalArchetype),alpha=fade*(.25+flash*.30);
  function lance(x,y,angle,length,halfWidth,phase=0){
    const dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;
    const point=(along,cross)=>[x+dx*along+nx*cross,y+dy*along+ny*cross];
    // Layered, continuous plasma ribbons with dark separation, not a flat line.
    for(let ribbon=0;ribbon<3;ribbon++){
      const points=[],steps=28;
      for(let j=0;j<=steps;j++){
        const u=j/steps,wave=Math.sin(u*22-t*9+phase+ribbon*2.1);
        const cross=wave*halfWidth*.40;
        const w=halfWidth*(ribbon===0?.42:.12)*(Math.sin(u*Math.PI)*.7+.3);
        points.push(...point(u*length,cross+w));
      }
      for(let j=steps;j>=0;j--){const u=j/steps,cross=Math.sin(u*22-t*9+phase+ribbon*2.1)*halfWidth*.40;const w=halfWidth*(ribbon===0?.42:.12)*(Math.sin(u*Math.PI)*.7+.3);points.push(...point(u*length,cross-w));}
      g.poly(points).fill({color:ribbon===2?0xfff6df:ribbon===1?0x0b1228:color,alpha:ribbon===1?alpha*.75:alpha});
    }
    // Discontinuous axial fragments give direction and material-specific cadence.
    for(let j=0;j<9;j++){
      const u=(j/9+t*(d.material==='rail'?1.1:.48))%1;
      const along=u*length,cross=Math.sin(j*2.4+phase)*halfWidth*.30;
      const [px,py]=point(along,cross),[ex,ey]=point(Math.min(length,along+length*.035),cross);
      g.moveTo(px,py).lineTo(ex,ey).stroke({color:0xfff7e5,width:Math.max(1,halfWidth*.10),alpha:fade*.72*flash});
    }
  }
  if(h.kind==='wall'){
    for(const [i,x]of (h.columns||[]).entries())lance(x,h.startY,Math.PI/2,h.endY-h.startY,h.width*.43,i*.7);
  }else if(h.kind==='ring'){
    drawArsenalAnnulus(g,{x:h.sourceX,y:h.sourceY,inner:h.innerRadius,outer:h.outerRadius,
      safeAngle:h.safeAngle,safeWedge:h.safeWedge,material:d.material,time:t,alpha:fade*(.40+.60*flash)});
  }else{
    lance(h.sourceX,h.sourceY,h.angle,h.length,(h.radius||24)*.86);
    if(h.kind==='cone'){
      // Broad fields become a comb of physical-looking energy teeth. They are
      // inside the already damaging fan; blank space remains translucent ink.
      const spread=(h.spread||.1)*.82;
      for(let j=0;j<6;j++){
        const angle=h.angle+((j/5)-.5)*spread*.88;
        const start=45,finish=Math.min(h.length,220+(j%3)*55);
        const x=h.sourceX+Math.cos(angle)*start,y=h.sourceY+Math.sin(angle)*start;
        lance(x,y,angle,finish-start,Math.min(4,(h.radius||24)*.13),j);
      }
    }
  }
}
