import { getAccessibilitySettings } from '../config/AccessibilitySettings.js';

// Uneven ballistic fragments, rather than expanding target diagrams. All
// positions are analytic; no extra random draws or particle-pool allocations.
export function drawAstraShatterBurst(g,{progress=0,radius=32,count=6,color=0xffaa55,accent=0xffedbc,seed=0}={}) {
  const t=Math.max(0,Math.min(1,progress)),settings=getAccessibilitySettings();
  const motion=settings.prefersReducedMotion?.25:1,flash=settings.flashIntensity;
  const fade=(1-t)**1.65,travel=1-(1-t)**2;
  g.clear();
  for(let i=0;i<count;i++){
    const a=i*2.399963+seed*.17,dx=Math.cos(a),dy=Math.sin(a);
    const speed=.45+(i%4)*.19,d=radius*(.19+travel*speed*motion);
    const x=dx*d,y=dy*d*.78+t*t*radius*.12*motion;
    const length=radius*(.09+(i%3)*.025)*(1-t*.6),w=1.1+(i%3)*.45;
    // Heated shard with an asymmetrical silhouette and a thin cooling wake.
    g.moveTo(x-dx*length*2,y-dy*length*2).lineTo(x,y)
      .stroke({color,width:w*2,alpha:fade*.12*flash});
    g.poly([x+dx*length,y+dy*length,x-dx*length-dy*w,y-dy*length+dx*w,
      x-dx*length*.35+dy*w*.6,y-dy*length*.35-dx*w*.6])
      .fill({color:i%3?color:accent,alpha:fade*(.6+(i%2)*.2)*flash});
    g.moveTo(x-dx*length,y-dy*length).lineTo(x+dx*length*.7,y+dy*length*.7)
      .stroke({color:accent,width:.8,alpha:fade*.65*flash});
  }
}
