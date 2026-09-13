import { Matrix, Texture } from 'pixi.js';
import { getReducedMotionEnabled, getFlashIntensityScale } from '../config/AccessibilitySettings.js';
import {drawEnergyArc,drawEnergyLink,drawEnergySurface} from './AstraEnergyMaterial.js';

let fieldTexture;
function material() {
  if (fieldTexture) return fieldTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const light = ctx.createLinearGradient(0, 0, 0, 32);
  light.addColorStop(0, '#ffffff00'); light.addColorStop(.08, '#ffffff28');
  light.addColorStop(.42, '#ffffff90'); light.addColorStop(.5, '#ffffffdd');
  light.addColorStop(.58, '#ffffff90'); light.addColorStop(.92, '#ffffff28');
  light.addColorStop(1, '#ffffff00');
  ctx.fillStyle = light; ctx.fillRect(0, 0, 128, 32);
  ctx.globalCompositeOperation = 'destination-in';
  const fade = ctx.createLinearGradient(0, 0, 128, 0);
  fade.addColorStop(0, '#ffffff10'); fade.addColorStop(.12, '#ffffffff');
  fade.addColorStop(.85, '#ffffffdd'); fade.addColorStop(1, '#ffffff08');
  ctx.fillStyle = fade; ctx.fillRect(0, 0, 128, 32);
  fieldTexture = Texture.from(canvas);
  return fieldTexture;
}

// Presentation only: every endpoint and boundary is supplied by the attack.
// One shared 128x32 light texture; no particles, random calls or simulation clock.
export function drawAstraWarningLane(g, {x=0, y=0, angle=Math.PI/2, start=0,
  length, halfWidth=7, color=0xff8c56, progress=0, active=false, alpha=1, markers=true}) {
  if (!g || length <= start || halfWidth <= 0) return;
  const p = Math.max(0, Math.min(1, progress)), c = Math.cos(angle), s = Math.sin(angle);
  const px = -s, py = c, len = length-start;
  const motion = !getReducedMotionEnabled(), flash = getFlashIntensityScale();
  // Integrated acceleration avoids speed jumps as charge increases. This clock
  // only affects the ink inside the attack-owned, stationary boundary.
  const flow = motion ? (Date.now() * .00055 + p * p * 1.7) % 1 : .35;
  const pulse = motion ? .5 + .5 * Math.sin(p * p * Math.PI * 6) : .5;
  const sx=x+c*start, sy=y+s*start, ex=x+c*length, ey=y+s*length;
  const points=[sx-px*halfWidth,sy-py*halfWidth,ex-px*halfWidth,ey-py*halfWidth,
    ex+px*halfWidth,ey+py*halfWidth,sx+px*halfWidth,sy+py*halfWidth];
  // Charging lanes have a quiet interior and dashed boundaries; damaging
  // lanes switch to an unbroken edge and luminous core at the supplied state.
  // Geometry and lifecycle continue to belong entirely to the attack owner.
  g.poly(points).fill({color:0x080d18,alpha:alpha*(active ? .32 : .24)});
  g.poly(points).fill({color,alpha:alpha*(active ? .36 : .035+p*.045)});
  const matrix=new Matrix(c*len/128,s*len/128,px*halfWidth/16,py*halfWidth/16,
    sx-px*halfWidth,sy-py*halfWidth);
  g.poly(points).fill({texture:material(),matrix,textureSpace:'global',color,
    alpha:alpha*(active ? .8 : .13+p*.15+pulse*p*.07*flash)});
  drawEnergyLink(g,{x:sx,y:sy,toX:ex,toY:ey,width:halfWidth*1.8,color,alpha:alpha*(active?.62:.12+p*.14)});
  const edge=(d0,d1,w,ink,width,opacity)=>{
    g.moveTo(sx+c*d0+px*w,sy+s*d0+py*w)
      .lineTo(sx+c*d1+px*w,sy+s*d1+py*w)
      .stroke({color:ink,width,alpha:alpha*opacity});
  };
  for(const side of [-1,1]) {
    const w=halfWidth*side;
    edge(0,len,w,0x030811,4,.88);
    if(active) edge(0,len,w,color,2,.95);
    else {
      // Fixed dashes do not drift or imply that an attack is already moving.
      const count=Math.max(1,Math.min(16,Math.ceil(len/52))),step=len/count;
      for(let i=0;i<count;i++) edge(i*step,Math.min(len,(i+.6)*step),w,color,2.2,.82+p*.18);
      // Charge moves only along the boundary, leaving the safe gaps unobscured.
      if(p>0) edge(0,len*p,w,0xffdf9c,1,.35+p*.4);
    }
  }
  if(active) {
    edge(0,len,0,0xfff4dc,Math.min(halfWidth*.45,3),.8*getFlashIntensityScale());
  }
  if (!markers) return;
  const size=Math.min(halfWidth*.65,6);
  const count = Math.max(2, Math.min(5, Math.ceil(len / 120)));
  for(let i=0;i<count;i++) {
    const t=(i+flow)/count;
    const cx=sx+c*len*t,cy=sy+s*len*t;
    const fade=Math.min(1,t*10,(1-t)*10);
    drawEnergySurface(g,{kind:'rift',x:cx,y:cy,width:size*1.1,height:size*4,angle:angle-Math.PI/2,color:0xffdf9c,alpha:alpha*fade*(.3+p*.3)});
  }
  // A short ion filament travels down the center; it never sweeps safe space.
  const head=len*(.06+flow*.88),tail=Math.max(0,head-Math.min(30,len*.12));
  edge(tail,head,0,color,Math.min(halfWidth*.6,4),(.16+p*.2)*flash);
  edge(Math.max(tail,head-9),head,0,0xffeed4,1.2,(.35+p*.4)*flash);
}

export function drawAstraWarningSector(g,{x=0,y=0,angle,length,spread,color=0xff8356,
  progress=0,alpha=1,active=false}) {
  const half=spread*.5,points=[x,y];
  for(let i=0;i<=16;i++){const a=angle-half+spread*i/16;points.push(x+Math.cos(a)*length,y+Math.sin(a)*length);}
  g.poly(points).fill({color,alpha:alpha*(active?.12:.035+progress*.035)});
  for(const side of [-1,1]) {
    const a=angle+half*side,ex=x+Math.cos(a)*length,ey=y+Math.sin(a)*length;
    g.moveTo(x,y).lineTo(ex,ey).stroke({color:0x090e18,width:3.5,alpha:alpha*.6});
    g.moveTo(x,y).lineTo(ex,ey).stroke({color,width:1.3,alpha:alpha*(.45+progress*.35)});
  }
  g.moveTo(x+Math.cos(angle-half)*length,y+Math.sin(angle-half)*length);
  g.arc(x,y,length,angle-half,angle+half).stroke({color,width:1.1,alpha:alpha*.35});
  const motion=!getReducedMotionEnabled(),p=Math.max(0,Math.min(1,progress));
  const phase=motion?(Date.now()*.00042+p*p*.8)%1:.5;
  // Broken wavefronts inside the existing fan, never across its safe exterior.
  for(let i=0;i<3;i++){
    const u=(i+phase)/3,r=length*(.12+u*.83),fade=Math.sin(u*Math.PI);
    for(const side of [-1,1]){
      const a=angle+side*half*.18,b=angle+side*half*.86;
      drawEnergyArc(g,{x,y,radius:r,start:Math.min(a,b),end:Math.max(a,b),thickness:Math.min(24,r*.23),color,alpha:alpha*fade*(.18+p*.24)});
    }
  }
}

export function drawAstraWarningRing(g,{x=0,y=0,inner,outer,color=0xff715c,
  progress=0,alpha=1,active=false,safeAngle=0,safeWedge=0}) {
  const start=safeAngle+safeWedge,end=safeAngle+Math.PI*2-safeWedge;
  if(end<=start)return;
  const points=[],steps=64;
  for(let i=0;i<=steps;i++){const a=start+(end-start)*i/steps;points.push(x+Math.cos(a)*outer,y+Math.sin(a)*outer);}
  for(let i=steps;i>=0;i--){const a=start+(end-start)*i/steps;points.push(x+Math.cos(a)*inner,y+Math.sin(a)*inner);}
  g.poly(points).fill({color,alpha:alpha*(active?.13:.055)});
  for(const r of [inner,outer]) {
    g.moveTo(x+Math.cos(start)*r,y+Math.sin(start)*r);
    g.arc(x,y,r,start,end).stroke({color:0x070d17,width:5,alpha:alpha*.55});
    g.moveTo(x+Math.cos(start)*r,y+Math.sin(start)*r);
    g.arc(x,y,r,start,end).stroke({color,width:active?2.4:1.5,alpha:alpha*(.5+progress*.3)});
  }
  const phase=getReducedMotionEnabled()?0:(Date.now()*.00013)%1;
  // Concentric charge waves respect the exact open escape wedge.
  for(let i=0;i<2;i++){
    const u=(i*.5+phase*2)%1,r=inner+(outer-inner)*(.08+u*.84);
    drawEnergyArc(g,{x,y,radius:r,start,end,thickness:Math.min(outer-inner,r*.28),color,alpha:alpha*Math.sin(u*Math.PI)*(.24+progress*.18)});
  }
  for(let i=0;i<12;i++) {
    const a=start+(end-start)*(i+.3)/12,r=inner+(outer-inner)*(.18+((phase+i*.19)%1)*.64);
    g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
    g.arc(x,y,r,a,a+Math.min(.08,(end-start)/48)).stroke({color:0xffe5c4,width:2,alpha:alpha*.34});
  }
  if(safeWedge>0)for(const a of [start,end]) {
    g.moveTo(x+Math.cos(a)*inner,y+Math.sin(a)*inner).lineTo(x+Math.cos(a)*outer,y+Math.sin(a)*outer)
      .stroke({color:0x9affcb,width:1.8,alpha:alpha*.72});
  }
}
