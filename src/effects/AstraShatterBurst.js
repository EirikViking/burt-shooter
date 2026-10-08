import { getAccessibilitySettings } from '../config/AccessibilitySettings.js';
import { drawEnergySurface } from './AstraEnergyMaterial.js';

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
    // Compact plasma pockets and hot fragments; no wire rays survive a kill.
    drawEnergySurface(g,{kind:'corona',x:x-dx*length*.25,y:y-dy*length*.25,
      width:length*5,height:length*3,color,alpha:fade*.26*flash,angle:a});
    g.poly([x+dx*length,y+dy*length,x-dx*length-dy*w,y-dy*length+dx*w,
      x-dx*length*.35+dy*w*.6,y-dy*length*.35-dx*w*.6])
      .fill({color:i%3?color:accent,alpha:fade*(.6+(i%2)*.2)*flash});
    g.poly([x+dx*length*.72,y+dy*length*.72,
      x-dx*length*.4-dy*w*.5,y-dy*length*.4+dx*w*.5,
      x-dx*length*.35+dy*w*.5,y-dy*length*.35-dx*w*.5])
      .fill({color:accent,alpha:fade*.46*flash});
  }
}
