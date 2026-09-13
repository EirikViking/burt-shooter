import { Container, Graphics, Sprite } from 'pixi.js';
import { getBossArsenal } from '../config/BossArsenal.js';
import { getReducedMotionEnabled, getFlashIntensityScale } from '../config/AccessibilitySettings.js';
import { getArsenalModule, getArsenalProjectile, getArsenalFieldTexture } from './BossArsenalMaterials.js';
import { drawEnergyGlint } from './AstraBossEnergy.js';

const ease = x => { const p=Math.max(0,Math.min(1,x));return p*p*(3-2*p); };

// Complete ten-family deploy / charge / discharge / recover performance.
// This owns only sprites: no projectiles, targets, damage, RNG or callbacks.
export class BossArsenalRig extends Container {
  constructor(radius, archetype, color, tier=1) {
    super();this.eventMode='none';this.label='boss_arsenal';
    this.radius=radius;this.archetype=archetype;this.color=color;this.tier=tier;
    this.design=getBossArsenal(archetype);this.energy=new Graphics();
    this.modules=Array.from({length:this.design.count},(_,i)=>{
      const node=new Container();const armor=new Sprite(getArsenalModule(this.design.module,color));
      armor.anchor.set(.5);armor.width=radius*(this.design.module==='hammer'?.40:.29);armor.height=radius*(this.design.module==='rail'?1.10:.78);
      node.addChild(armor);node.armor=armor;node.index=i;this.addChild(node);return node;
    });
    this.addChild(this.energy);
    // Prewarm munition types outside the firing path; hostile ink has a finite palette.
    for(const ink of [0xffb34f,0xff78bd,0xff854a,0xff5d6a])getArsenalProjectile(this.design.material,ink);
    for(let frame=0;frame<4;frame++)getArsenalFieldTexture(this.design.material,frame);
  }
  update({charge=0,recoil=0,time=0,angle=Math.PI/2,phase=1,signature=false,death=0,sequence=0}={}) {
    const r=this.radius,g=this.energy,d=this.design,reduced=getReducedMotionEnabled(),flash=getFlashIntensityScale();
    const t=reduced?0:time,deploy=ease(charge*2.7),compression=ease((charge-.46)*2.6);
    const power=Math.max(charge,recoil);g.clear();this.visible=death<1;
    const cadence=(sequence+this.tier-1)%3,direction=cadence===1?-1:1;
    this.alpha=1-Math.min(1,death);
    for(let i=0;i<this.modules.length;i++){
      const n=this.modules[i],count=this.modules.length,side=i%2?-1:1,u=count===1?0:i/(count-1)-.5;
      let x=0,y=0,a=0,extension=deploy;
      switch(d.formation){
        case 'fan': x=u*r*(1.25+deploy*.35);y=-r*.16+Math.abs(u)*r*.42;a=-u*(.4+deploy*.8);break;
        case 'jaws': x=side*r*(.30+deploy*.37-compression*.14);y=r*(.02-compression*.18);a=side*(.18+deploy*.4-compression*.42);break;
        case 'diamond': {const q=i*Math.PI/2+Math.PI/4;x=Math.cos(q)*r*(.40+deploy*.27);y=Math.sin(q)*r*(.30+deploy*.24);a=q-Math.PI/2+compression*side*.25;break;}
        case 'rail': x=side*r*(.17+deploy*.22-compression*.16);y=r*(-.12+deploy*.17);a=side*.20*(1-compression);break;
        case 'rotor': {const q=i*Math.PI*2/count+(reduced?0:t*.28)*direction+deploy*.6;x=Math.cos(q)*r*(.38+deploy*.28);y=Math.sin(q)*r*(.38+deploy*.28);a=q+Math.PI*.4*direction;break;}
        case 'shuffle': {const q=(i-1)*.85;extension=ease(charge*3-i*.18);x=Math.sin(q)*r*(.48+extension*.4);y=Math.cos(q)*r*.08-r*.15;a=q+(reduced?0:Math.sin(t*1.5+i)*.10)*(1-compression);break;}
        case 'bays': x=side*r*(.34+deploy*.26);y=(Math.floor(i/2)-.5)*r*.63;a=side*deploy*.22;break;
        case 'battery': x=u*r*(1.30+deploy*.3);y=-r*.10+Math.abs(u)*r*.26;a=0;break;
        case 'organ': x=u*r*(1.10+deploy*.44);y=-r*(.05+Math.abs(u)*.65)-r*compression*.1;a=-u*.14;break;
        case 'escapement': {const q=i*Math.PI*2/count+(reduced?0:Math.floor(t*1.5)*Math.PI/16+ease((t*1.5)%1)*Math.PI/16);x=Math.cos(q)*r*(.38+deploy*.23);y=Math.sin(q)*r*(.38+deploy*.23);a=q+Math.PI/2-compression*.6;break;}
      }
      // No idle translational motion in Reduced Motion; charge remains legible.
      if(signature){x*=1+deploy*.08;y-=r*compression*.04;}
      if(phase===3)a+=side*deploy*(d.formation==='battery'?.035:.065);
      n.position.set(x,y-r*recoil*.10);n.rotation=a+(d.formation==='rail'?(angle-Math.PI/2)*.28:0);
      n.scale.set(1+Math.min(phase-1,2)*.025);n.alpha=.72+power*.28;
      const muzzleX=x-Math.sin(a)*r*.30,muzzleY=y+Math.cos(a)*r*.30;
      const order=cadence===0?i:cadence===1?count-1-i:Math.abs(i-(count-1)/2)*2;
      const stagger=ease((charge-.20-order/count*.16)*1.65);
      if(power>.01){
        // Supply cables visibly load each weapon in sequence, then snap into discharge.
        const strength=(.2+stagger*.8)*flash;
        for(let j=0;j<2;j++){
          g.moveTo(side*r*.08,-r*.05);
          g.bezierCurveTo(x*.65-r*.04*j,y*.2,x*.4,y*.8,muzzleX,muzzleY);
          g.stroke({color:this.color,width:1+j,alpha:power*strength*(j?.13:.62)});
        }
        for(let j=0;j<3;j++){
          const v=reduced?.5:((t*(.7+compression)+j/3+i*.13)%1);
          const px=muzzleX*v,py=muzzleY*v;
          g.moveTo(px,py).lineTo(px+muzzleX*.07,py+muzzleY*.07).stroke({color:0xeaffff,width:1.5,alpha:charge*Math.sin(v*Math.PI)*.8*flash});
        }
        drawEnergyGlint(g,muzzleX,muzzleY,r*(.05+stagger*.11+recoil*.10),this.color,(stagger*.75+recoil*.85)*flash);
        if(recoil>0){
          const len=r*(.16+recoil*(signature?.66:.40)),width=r*.035;
          const ex=muzzleX-Math.sin(a)*len,ey=muzzleY+Math.cos(a)*len;
          g.poly([muzzleX-width,muzzleY,ex,ey,muzzleX+width,muzzleY]).fill({color:0xfff3dd,alpha:recoil*.85*flash});
        }
      }
    }
    // Archetype-specific central assembly: reactor crucible, lens or launch spine.
    if(charge>.1){
      const focus=signature?1.2:1,core=r*(.07+compression*.10)*focus;
      drawEnergyGlint(g,0,r*.12,core*(d.material==='magma'?2:1.5),this.color,charge*.8*flash);
      if(d.formation==='rail'||d.formation==='organ'){
        for(const s of [-1,1])g.moveTo(s*r*.10,-r*.50).lineTo(s*r*.045,r*.38).stroke({color:0xe7fbff,width:1.5,alpha:compression*.85*flash});
      }else if(d.formation==='diamond'||d.formation==='shuffle'){
        g.poly([0,-core*1.3,core,0,0,core*1.5,-core,0]).stroke({color:0xf0faff,width:1.6,alpha:compression*.85*flash});
      }
    }
    this.debug={archetype:this.archetype,formation:d.formation,modules:this.modules.length,charge,recoil,phase,signature,reduced,cadence};
  }
}
