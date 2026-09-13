import { assaultWindows, assaultSectors } from '../config/ColossusAssault.js';
import { Assets, Matrix } from 'pixi.js';
import { COLOSSUS_FAMILIES } from '../config/BossReinvention.js';
import { getFlashIntensityScale, getReducedMotionEnabled } from '../config/AccessibilitySettings.js';
import { drawArsenalAnnulus } from './BossArsenalFields.js';
import { getBossArsenal } from '../config/BossArsenal.js';
import {drawEnergyArc,drawEnergyLink,drawEnergySurface} from './AstraEnergyMaterial.js';
let plasmaTexture;
export async function preloadColossusVfx(){
  plasmaTexture ||= await Assets.load('/assets/astra/colossus/plasma.png');
}

export function drawColossusWarning(g,b,token,progress) {
  g.clear(); const color=COLOSSUS_FAMILIES[b.profile.archetype].color;
  const type=token.type,angle=token.lockedAngle??Math.PI/2;
  if(['ring','adds','radial','spiral','clock','chord'].includes(type)||['spiral','clock','chord'].includes(token.attack)){
    const lane=(b.safeLanes||[]).find(l=>l.kind==='ring-wedge');
    const safeAngle=Number.isFinite(lane?.angle)?lane.angle:b.getRingSafeAngle(type==='adds'?14:16);
    const safeWedge=Number.isFinite(lane?.width)?lane.width*1.28:type==='adds'?.58:.56;
    const outer=Math.max(b.radius*2.05,token.category==='signature'?168:142),inner=outer*.48;
    const h={safeAngle,safeWedge,colossus:{motion:COLOSSUS_FAMILIES[b.profile.archetype].pulse}};
    for(const sector of assaultSectors(h)){
      const p=(a,r)=>[Math.cos(a)*r,18+Math.sin(a)*r],points=[];
      for(let j=0;j<=6;j++)points.push(...p(sector.start+(sector.end-sector.start)*j/6,outer));
      for(let j=6;j>=0;j--)points.push(...p(sector.start+(sector.end-sector.start)*j/6,inner));
      g.poly(points).fill({color,alpha:.035+progress*.065});
      const a=sector.start,hot=(sector.slot/12+progress*1.5)%1;
      // A material pressure front previews the same sector and open escape wedge.
      // The outer contact marks stay fixed; decorative spokes and carets are gone.
      const wave=inner+(outer-inner)*(.28+progress*.72);
      drawEnergyArc(g,{y:18,radius:wave,start:a,end:sector.end,thickness:Math.min(wave-inner,34),color,alpha:.16+progress*.37});
      g.moveTo(...p(a+(sector.end-a)*.12,outer)).lineTo(...p(a+(sector.end-a)*.88,outer)).stroke({color:hot>.65?0xffefd2:color,width:hot>.65?3:1.5,alpha:.55+progress*.3});
    }
    for(const a of [safeAngle-safeWedge,safeAngle+safeWedge])g.moveTo(Math.cos(a)*inner,18+Math.sin(a)*inner).lineTo(Math.cos(a)*outer,18+Math.sin(a)*outer).stroke({color:0x73d4b0,width:2,alpha:.75});
    return true;
  }
  if(type==='wall'||token.attack==='wall'){
    const length=b.game.getHeight()+80-b.y-18,width=Math.max(18,Math.min(26,b.game.getWidth()*.022));
    for(const x of b.getWallColumnOffsets()){
      g.rect(x-width*.5,Math.max(16,b.radius*.25)+18,width,length).fill({color,alpha:.04+progress*.06});
      drawEnergyLink(g,{x,y:Math.max(16,b.radius*.25)+18,toX:x,toY:length,width:width*.84,color,alpha:.13+progress*.25});
      for(const side of [-1,1]){
        g.moveTo(x+side*width*.5,Math.max(16,b.radius*.25)+18).lineTo(x+side*width*.5,length).stroke({color,width:2,alpha:.6});
      }
      for(let i=0;i<4;i++){const y=80+((i/4+progress*.5)%1)*Math.max(1,length-120);drawEnergySurface(g,{kind:'rift',x,y,width:width*.66,height:42,color,alpha:.18+progress*.35});}
    }
    return true;
  }
  const dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;
  const length=Math.max(b.game.getHeight()*1.05,560),radius=type==='lance'||token.attack==='sniper'?13:27;
  const lane=token.safeLanes?.find(l=>l.kind==='aimed-edges');
  const spread=Math.min(type==='lance'||token.attack==='sniper'?.12:.36,Number(lane?.width)||.15);
  const width=a=>Math.max(radius,a*Math.tan(spread*.41));
  const p=(a,c)=>[dx*a+nx*c,18+dy*a+ny*c];
  const start=Math.max(50,b.radius*.65),w=width(length);
  g.poly([...p(start,-width(start)),...p(length,-w),...p(length,w),...p(start,width(start))]).fill({color,alpha:.045+progress*.035});
  const source=p(start,0),end=p(length,0);
  drawEnergyLink(g,{x:source[0],y:source[1],toX:end[0],toY:end[1],width:width(start)*1.65,color,alpha:.12+progress*.28});
  for(const side of [-1,1]){
    g.moveTo(...p(start,side*width(start))).lineTo(...p(length,side*w)).stroke({color,width:3,alpha:.65});
    // Charge packets preview the same outward direction as the damaging front.
    for(let i=0;i<4;i++){
      const u=((i/4+progress*.7)%1),a=start+24+(length-start-48)*u,half=width(a),point=p(a,side*half*.48);
      drawEnergySurface(g,{kind:'rift',x:point[0],y:point[1],width:half*.4,height:40,angle:angle-Math.PI/2,color,alpha:.16+progress*.30});
    }
  }
  g.__debugBossSignatureWarning={phase:'warning',type,progress,aimLocked:Number.isFinite(token.lockedAngle),movementLocked:token.movementLocked,colossus:true};
  return true;
}

// Hot opaque edges describe actual contact; quiet broken guides describe the
// upcoming route. No full-screen flash, no decorative collision-looking circles.
export function drawColossusAssault(g,h) {
  const color=COLOSSUS_FAMILIES[h.colossus.family].color,armed=(h.elapsedMs||0)>=h.armingMs;
  const flash=getFlashIntensityScale(),t=getReducedMotionEnabled()?0:(h.elapsedMs||0)*.001;
  function front(x,y,angle,start,end,widthAt){
    const dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;
    const p=(a,c)=>[x+dx*a+nx*c,y+dy*a+ny*c];
    const ws=widthAt(start),we=widthAt(end);
    const polygon=[...p(start,-ws),...p(end,-we),...p(end,we),...p(start,ws)];
    g.poly(polygon).fill({color:0x361620,alpha:.14});
    if(plasmaTexture){
      const sx=(end-start)/plasmaTexture.width,sy=Math.max(ws,we)*2/plasmaTexture.height;
      const origin=p(start,-Math.max(ws,we));
      const matrix=new Matrix(dx*sx,dy*sx,nx*sy,ny*sy,origin[0],origin[1]);
      g.poly(polygon).fill({texture:plasmaTexture,matrix,textureSpace:'global',alpha:.92*flash});
    }
    // Turbulent, layered plasma contained inside the damaging front.
    for(let lane=0;lane<(plasmaTexture?0:5);lane++){
      const pts=[],n=16;
      for(let j=0;j<=n;j++){const u=j/n,a=start+(end-start)*u;
        const w=widthAt(a),cross=((lane-2)*.30+Math.sin(u*19-t*19+lane)*.065)*w;
        pts.push(...p(a,cross));}
      g.moveTo(pts[0],pts[1]);for(let j=2;j<pts.length;j+=2)g.lineTo(pts[j],pts[j+1]);
      g.stroke({color:lane===2?0xfff5d4:color,width:lane===2?4:2,alpha:(lane===2?.94:.7)*flash});
    }
    if(!plasmaTexture)for(const side of [-1,1]){
      const point=p(end,side*we);g.poly([point[0],point[1],...p(Math.max(start,end-24),side*we*.5),...p(Math.max(start,end-10),side*we*.65)]).fill({color:0xffffff,alpha:.85*flash});
    }
  }
  function route(x,y,angle,length,widthAt) {
    const dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;
    for(const side of [-1,1])for(let i=0;i<12;i++){
      const a=i*length/12,b=a+length/24;
      g.moveTo(x+dx*a+nx*side*widthAt(a),y+dy*a+ny*side*widthAt(a));
      g.lineTo(x+dx*b+nx*side*widthAt(b),y+dy*b+ny*side*widthAt(b));
    }
    g.stroke({color,width:1.5,alpha:armed?.14:.42});
  }
  if(h.kind==='wall'){
    for(const [slot,x] of (h.columns||[]).entries()){route(x,h.startY,Math.PI/2,h.endY-h.startY,()=>h.width*.5);
      if(armed)for(const[a,b]of assaultWindows(h,h.endY-h.startY,slot))front(x,h.startY,Math.PI/2,a,b,()=>h.width*.5);}
  }else if(h.kind==='ring'){
    if(!armed)return;
    for(const sector of assaultSectors(h))for(const[a,b]of assaultWindows(h,h.outerRadius-h.innerRadius,sector.slot)){
      const inner=h.innerRadius+a,outer=h.innerRadius+b,points=[];
      const start=sector.start,end=sector.end;
      for(let i=0;i<=8;i++){const v=start+(end-start)*i/8;points.push(h.sourceX+Math.cos(v)*outer,h.sourceY+Math.sin(v)*outer);}
      for(let i=8;i>=0;i--){const v=start+(end-start)*i/8;points.push(h.sourceX+Math.cos(v)*inner,h.sourceY+Math.sin(v)*inner);}
      // Irregular incandescent material, with a quiet precise contact boundary.
      drawArsenalAnnulus(g,{x:h.sourceX,y:h.sourceY,inner,outer,safeAngle:(start+end)/2-Math.PI,safeWedge:Math.PI-(end-start)/2,
        material:getBossArsenal(h.colossus.family).material,time:t,alpha:.92*flash});
      g.poly(points).stroke({color,width:1.5,alpha:.48});
    }
  }else{
    const widthAt=a=>Math.max(h.radius||24,a*Math.tan((h.spread||0)*.41));
    route(h.sourceX,h.sourceY,h.angle,h.length,widthAt);
    if(armed)for(const[a,b]of assaultWindows(h,h.length))front(h.sourceX,h.sourceY,h.angle,a,b,widthAt);
  }
  h._debugHazardArming={visible:!armed,kind:h.kind,armed,progress:Math.min(1,(h.elapsedMs||0)/h.armingMs),gateCount:armed?0:1,colossus:true};
}
