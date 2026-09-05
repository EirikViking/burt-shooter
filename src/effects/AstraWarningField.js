import { Matrix, Texture } from 'pixi.js';
import { getReducedMotionEnabled, getFlashIntensityScale } from '../config/AccessibilitySettings.js';

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
  const sx=x+c*start, sy=y+s*start, ex=x+c*length, ey=y+s*length;
  const points=[sx-px*halfWidth,sy-py*halfWidth,ex-px*halfWidth,ey-py*halfWidth,
    ex+px*halfWidth,ey+py*halfWidth,sx+px*halfWidth,sy+py*halfWidth];
  g.poly(points).fill({color:0x100e19,alpha:alpha*(active?.12:.18)});
  const matrix=new Matrix(c*len/128,s*len/128,px*halfWidth/16,py*halfWidth/16,
    sx-px*halfWidth,sy-py*halfWidth);
  g.poly(points).fill({texture:material(),matrix,textureSpace:'global',color,
    alpha:alpha*(active?.74:.24+p*.27)});
  for(const side of [-1,1]) {
    const w=halfWidth*side;
    g.moveTo(sx+px*w,sy+py*w).lineTo(ex+px*w,ey+py*w)
      .stroke({color:0x0a101a,width:3,alpha:alpha*.64});
    g.moveTo(sx+px*w,sy+py*w).lineTo(ex+px*w,ey+py*w)
      .stroke({color,width:active?2:1.7,alpha:alpha*(.58+p*.3)});
  }
  if(active) g.moveTo(sx,sy).lineTo(ex,ey).stroke({color:0xffeed8,width:1.15,alpha:alpha*.56});
  if (!markers) return;
  const motion=!getReducedMotionEnabled(), phase=motion?(Date.now()*.00038)%1:.5;
  const count=Math.max(2,Math.min(6,Math.floor(len/105)));
  const size=Math.min(halfWidth*.72,7);
  for(let i=0;i<count;i++) {
    const t=(i+phase)/count, d=start+len*(.08+t*.84), cx=x+c*d,cy=y+s*d;
    g.moveTo(cx-c*size+px*size,cy-s*size+py*size).lineTo(cx+c*size*.7,cy+s*size*.7)
      .lineTo(cx-c*size-px*size,cy-s*size-py*size)
      .stroke({color:0xffe4b9,width:1.3,alpha:alpha*(.28+p*.28)});
  }
  // The travelling charge highlight remains strictly inside its own lane.
  const d=start+len*(.10+p*.78), flash=getFlashIntensityScale();
  g.moveTo(x+c*(d-10),y+s*(d-10)).lineTo(x+c*(d+9),y+s*(d+9))
    .stroke({color:0xfff5df,width:Math.min(3,halfWidth*.45),alpha:alpha*(.2+p*.36)*flash});
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
  g.arc(x,y,length,angle-half,angle+half).stroke({color,width:1.1,alpha:alpha*.35});
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
    g.arc(x,y,r,start,end).stroke({color:0x070d17,width:5,alpha:alpha*.55});
    g.arc(x,y,r,start,end).stroke({color,width:active?2.4:1.5,alpha:alpha*(.5+progress*.3)});
  }
  const phase=getReducedMotionEnabled()?0:(Date.now()*.00013)%1;
  for(let i=0;i<12;i++) {
    const a=start+(end-start)*(i+.3)/12,r=inner+(outer-inner)*(.18+((phase+i*.19)%1)*.64);
    g.arc(x,y,r,a,a+Math.min(.08,(end-start)/48)).stroke({color:0xffe5c4,width:2,alpha:alpha*.34});
  }
  if(safeWedge>0)for(const a of [start,end]) {
    g.moveTo(x+Math.cos(a)*inner,y+Math.sin(a)*inner).lineTo(x+Math.cos(a)*outer,y+Math.sin(a)*outer)
      .stroke({color:0x9affcb,width:1.8,alpha:alpha*.72});
  }
}
