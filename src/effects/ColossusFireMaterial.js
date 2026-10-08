import { Assets, Matrix, Rectangle, Texture } from 'pixi.js';

let frames = [], loading;
export function preloadColossusFire() {
  return loading ||= Assets.load('/art/first-light/boss-fire-atlas.webp').then(atlas=>{
    const width=atlas.width/4,height=atlas.height/2;
    frames=Array.from({length:8},(_,i)=>new Texture({source:atlas.source,
      frame:new Rectangle((i%4)*width,Math.floor(i/4)*height,width,height)}));
  }).catch(error=>{loading=null;throw error;});
}

// All vertices remain inside the shared collision envelope. The flame artwork
// supplies volume and smoke; geometry, warning time and damage stay unchanged.
export function drawColossusFire(g,{x,y,angle,start,end,widthAt,fullLength,time=0,flash=1,maxLobes=6}) {
  const dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;
  const p=(along,cross)=>[x+dx*along+nx*cross,y+dy*along+ny*cross];
  const span=end-start;if(span<=0)return 0;
  // Keep gaps in the damaging envelope readable without a flat opaque slab.
  // Four inset layers soften its edge and remain inside the same contact bounds.
  for(let inset=0;inset<4;inset++){
    const a=start+Math.min(inset,span*.25),b=end-Math.min(inset,span*.25);
    const wa=Math.max(0,widthAt(a)-inset),wb=Math.max(0,widthAt(b)-inset);
    g.poly([...p(a,-wa),...p(b,-wb),...p(b,wb),...p(a,wa)])
      .fill({color:0xb85026,alpha:inset===0?.025:.018});
  }
  if(!frames.length)return 0;
  const bodyCount=Math.max(0,maxLobes-1),step=Math.max(84,fullLength/Math.max(1,bodyCount));
  const cells=Array.from({length:bodyCount},(_,i)=>({a:Math.max(0,(i-.12)*step),b:Math.min(fullLength,(i+1.12)*step)}));
  // A moving, full-sized combustion head keeps the very first and last slices
  // visible. Cropping changes the window, never the texture's physical scale.
  cells.push({a:end-Math.max(84,fullLength/6),b:end});
  let draws=0;
  for(const [i,{a,b}] of cells.entries()){
    const mid=(a+b)/2;
    if(b<=start||a>=end)continue;
    const half=Math.max(widthAt(a),widthAt(b));
    // Rounded, irregular silhouette with a continuous underlying contact floor.
    const polygon=[];
    for(let j=0;j<16;j++){
      const theta=j*Math.PI/8,along=Math.max(start,Math.min(end,mid+Math.cos(theta)*(b-a)*.5));
      polygon.push(...p(along,Math.sin(theta)*widthAt(along)));
    }
    const phase=(((flash>0?time:0)*9+i*1.73)%8+8)%8,index=Math.floor(phase),blend=phase-index;
    const opacity=.72+.18*flash,first=opacity*(1-blend),second=opacity*blend/(1-first);
    // Compensate source-over blending so opaque areas keep a steady intensity.
    for(const [frame,weight] of [[frames[index],first],[frames[(index+1)%8],second]]){
      if(weight<=.001)continue;
      const sx=(b-a)/frame.width,sy=half*2/frame.height,origin=p(a,-half);
      const matrix=new Matrix(dx*sx,dy*sx,nx*sy,ny*sy,...origin);
      g.poly(polygon).fill({texture:frame,matrix,textureSpace:'global',color:0xffffff,alpha:weight});
      draws++;
    }
  }
  return draws;
}
