// One field description drives both collision/pull and the visible beam boundaries.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function tractorLanes(profile,{depth,progress=0,time=0,span=1,aim=0}) {
 const t=clamp(depth,0,1),p=clamp(progress,0,1),base=profile.width*span;
 const taper=.18+.82*t,spread=span*.14*t;
 let center=aim*t,width=base*taper,strength=1,vertical=1,side=0;
 const lane=(x,w=width,s=strength,v=vertical,bias=side)=>({center:x,width:w,strength:s,vertical:v,bias});
 switch(profile.id){
  case 'harpoon': width*=.72;strength=1.15;break;
  case 'tide': center+=Math.sin(p*Math.PI*2)*spread;strength=.85;break;
  case 'pulse': strength=(p*3%1)<.40?1.7:.06;break;
  case 'twin': return [lane(center-spread,width,.82),lane(center+spread,width,.82)];
  case 'helix': center+=Math.sin(t*Math.PI*2.3-p*Math.PI*2)*spread*.72;side=Math.cos(t*Math.PI*2.3-p*Math.PI*2)*.8;break;
  case 'well': width*=Math.sin(t*Math.PI)*.65+.65;vertical=t>.52?1:-.4;strength=.8;break;
  case 'shepherd': side=2;vertical=.45;strength=.8;break;
  case 'anchor': vertical=t>.60?1:t<.48?-.5:0;strength=.75;break;
  case 'elevator': strength=((t+p*2.1)% .36)<.15?1.25:.05;break;
  case 'winch': strength=.25+p*1.35;width*=1-p*.25;break;
  case 'prism': return [-1,0,1].map((n,i)=>lane(center+n*spread*1.35,width,Math.min(2,Math.floor(p*3))===i?1.05:.025));
  case 'pendulum': center+=Math.sin(p*Math.PI*2)*spread*.7;vertical=Math.sin(p*Math.PI*4)>=0?1:-.5;break;
  case 'zipper': return [-1,1].map(n=>lane(center+n*spread*(1-p),width,.95));
  case 'eclipse': return [-1,1].map(n=>lane(center+n*spread*1.15,width*.8,.9));
  case 'sling': strength=p<.65?.65:1.15;vertical=p<.65?1:-.8;side=p<.65?0:2.4;break;
 }
 return [lane(center,width,strength,vertical,side)];
}

export function sampleTractorField(profile,{x,y,originX,originY,length,span,aim=0,progress=0,time=0}) {
 const depth=(y-originY)/length;
 if(depth<.08||depth>1)return null;
 const lanes=tractorLanes(profile,{depth,progress,time,span,aim});
 let best=null;
 for(const lane of lanes){
  const offset=x-originX-lane.center;
  if(Math.abs(offset)>lane.width||lane.strength<.1)continue;
  const edge=clamp((lane.width-Math.abs(offset))/Math.max(8,lane.width*.20),0,1);
  // Forces remain bounded and never reverse the player's controls.
  const lateral=lane.bias===2?Math.sign(offset||1)*3.1:lane.bias>2?Math.sign(offset||1)*4.0:clamp(-offset*.048,-4,4)+lane.bias;
  const value={x:lateral*lane.strength*edge,y:-4.9*lane.vertical*lane.strength*edge,strength:lane.strength*edge,lane};
  if(!best||value.strength>best.strength)best=value;
 }
 return best;
}
