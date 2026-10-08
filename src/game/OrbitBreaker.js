export const ORBIT_BREAKER=Object.freeze({seconds:12,revolutionSeconds:1.1,radius:86,hitRadius:18,maxSamples:12,hitCooldown:.6,maxTargetsPerTick:6});
export function sweptOrbitTouches(samples,x,y,radius){
 for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));
  if((a.x+dx*t-x)**2+(a.y+dy*t-y)**2<=radius*radius)return true;}
 return false;
}
export function sweptOrbitTouchesEllipse(samples,x,y,rx,ry,padding=0){
 const width=Math.max(1,rx+padding),height=Math.max(1,ry+padding);
 return sweptOrbitTouches(samples.map(p=>({x:(p.x-x)/width,y:(p.y-y)/height})),0,0,1);
}
export class OrbitBreakerModel{
 constructor(){this.angle=-Math.PI/2;this.samples=[];this.position={x:0,y:0};this.hits=new WeakMap();this.previous=null;}
 update(dt,center,radius){const seconds=Math.max(0,Math.min(.1,Number(dt)||0)),old=this.angle,step=seconds*Math.PI*2/ORBIT_BREAKER.revolutionSeconds;
  const previous=this.previous||center,n=Math.min(ORBIT_BREAKER.maxSamples-1,Math.max(1,Math.ceil((step*radius+Math.hypot(center.x-previous.x,center.y-previous.y))/8)));
  this.samples=[];for(let i=0;i<=n;i++){const t=i/n,angle=old+step*t;this.samples.push({x:previous.x+(center.x-previous.x)*t+Math.cos(angle)*radius,y:previous.y+(center.y-previous.y)*t+Math.sin(angle)*radius});}
  this.angle=(old+step)%(Math.PI*2);this.position=this.samples.at(-1);this.previous={...center};
 }
 canHit(target,time){return target&&typeof target==='object'&&time-(this.hits.get(target)??-Infinity)>=ORBIT_BREAKER.hitCooldown;}
 noteHit(target,time){this.hits.set(target,time);}
 clear(){this.samples=[];this.hits=new WeakMap();this.previous=null;}
}
