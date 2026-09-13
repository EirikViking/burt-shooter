import { Container, Sprite, Texture } from 'pixi.js';
import { getReducedMotionEnabled, getFlashIntensityScale } from '../config/AccessibilitySettings.js';

const textures={};
function material(kind){
  if(textures[kind])return textures[kind];
  const c=document.createElement('canvas');c.width=kind==='beam'?512:128;c.height=128;
  const g=c.getContext('2d');
  if(kind==='beam'){
    const halo=g.createLinearGradient(0,0,0,128);
    for(const [p,a]of [[0,0],[.2,0],[.36,.12],[.46,.65],[.5,1],[.54,.65],[.64,.12],[.8,0],[1,0]])halo.addColorStop(p,`rgba(255,255,255,${a})`);
    g.fillStyle=halo;g.fillRect(0,0,512,128);
    // Fine luminous filaments have fixed texture coordinates. No tiled global
    // Graphics matrix, dark lane rectangle, striped boundary or road markers.
    for(let i=0;i<5;i++){
      g.beginPath();g.moveTo(0,60+i*2);
      for(let x=0;x<=512;x+=8)g.lineTo(x,64+Math.sin(x*.033+i*1.9)*3.5+Math.sin(x*.08+i)*1.4);
      g.strokeStyle=`rgba(255,255,255,${.09+i*.025})`;g.lineWidth=.8;g.stroke();
    }
    g.globalCompositeOperation='destination-in';const end=g.createLinearGradient(0,0,512,0);
    for(const [p,a]of [[0,0],[.035,.8],[.09,1],[.91,1],[1,0]])end.addColorStop(p,`rgba(255,255,255,${a})`);
    g.fillStyle=end;g.fillRect(0,0,512,128);
  }else{
    const glow=g.createRadialGradient(64,64,0,64,64,64);
    for(const [p,a]of (kind==='flare'?[[0,1],[.07,1],[.16,.8],[.3,.25],[.65,.04],[1,0]]:[[0,.85],[.18,.65],[.42,.25],[.8,.03],[1,0]]))glow.addColorStop(p,`rgba(255,255,255,${a})`);
    g.fillStyle=glow;g.fillRect(0,0,128,128);
    if(kind==='flare'){
      g.globalAlpha=.4;g.fillStyle='white';g.beginPath();g.moveTo(0,64);g.quadraticCurveTo(62,61,64,4);g.quadraticCurveTo(66,61,128,64);g.quadraticCurveTo(66,67,64,124);g.quadraticCurveTo(62,67,0,64);g.fill();
    }
  }
  const t=Texture.from(c);t.label=`mystery_optics_${kind}`;textures[kind]=t;return t;
}

export class MysteryEffects {
  constructor(actor){
    this.a=actor;this.container=new Container();this.container.label=`mystery_optics:${actor.type}`;
    this.container.zIndex=57;this.pool=[];this.used=0;this.particles=[];this.ghosts=[];this.lastGhost=-1;
  }
  sprite(texture,x,y,w,h,color,alpha,rotation=0,blend='add'){
    if(this.used>=180||!Number.isFinite(w+h+x+y))return;
    const s=this.pool[this.used]||this.container.addChild(new Sprite());
    this.pool[this.used++]=s;s.texture=texture;s.anchor.set(.5);s.position.set(x,y);s.width=Math.max(.1,w);s.height=Math.max(.1,h);
    s.rotation=rotation;s.tint=color;s.alpha=Math.min(1,alpha*getFlashIntensityScale());s.blendMode=blend;s.visible=true;return s;
  }
  beam(z){
    const a=this.a,active=z.age>=z.warning,t=active?(z.age-z.warning)/z.duration:z.age/z.warning;
    const dx=z.to.x-z.from.x,dy=z.to.y-z.from.y,angle=Math.atan2(dy,dx),length=Math.hypot(dx,dy),x=(z.from.x+z.to.x)/2,y=(z.from.y+z.to.y)/2;
    const motion=getReducedMotionEnabled()?0:Math.sin(a.age*49)*.045;
    if(active){
      const envelope=Math.min(1,(1-t)*6),w=z.radius*8;
      this.sprite(material('beam'),x,y,length,w,a.color,(.68+motion)*envelope,angle);
      this.sprite(material('beam'),x,y,length,z.radius*2.1,0xf2f8ff,.88*envelope,angle);
      this.sprite(material('flare'),z.from.x,z.from.y,z.radius*7,z.radius*7,a.color,.8*envelope);
    }else{
      this.sprite(material('beam'),x,y,length,10*a.scale,a.color,.28+t*.36,angle);
      this.sprite(material('flare'),z.from.x,z.from.y,(23+t*18)*a.scale,(23+t*18)*a.scale,a.color,.5+t*.3);
    }
  }
  zone(z){
    const active=z.age>=z.warning,t=active?(z.age-z.warning)/z.duration:z.age/z.warning,r=z.radius;
    // Compact charged point blooms outward on detonation; no enormous rings.
    if(active){
      this.sprite(material('glow'),z.from.x,z.from.y,r*2.7,r*2.7,this.a.color,.65*(1-t));
      this.sprite(material('flare'),z.from.x,z.from.y,r*1.9,r*1.9,0xfff6e0,.9*(1-t));
    }else{
      this.sprite(material('glow'),z.from.x,z.from.y,r*2,r*2,this.a.color,.22+t*.14);
      for(let i=0;i<3;i++){const ang=i*2.094+(getReducedMotionEnabled()?0:this.a.age*.9),rr=r*(1-t*.72);
        this.sprite(material('flare'),z.from.x+Math.cos(ang)*rr,z.from.y+Math.sin(ang)*rr,13,13,this.a.color,.6);}
    }
  }
  charge(c){this.chargeCue=c;}
  burst(x,y,count=12,strength=1,style='explosion'){
    const a=this.a,scale=a.scale;
    for(let i=0;i<count&&this.particles.length<84;i++){
      const angle=i*2.399+a.age,speed=(65+(i%5)*38)*strength*scale;
      this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,age:0,life:.25+(i%6)*.085,
        size:(style==='muzzle'?9:13)*scale*strength,color:i%4===0?0xfff3d0:a.color,style});
    }
  }
  breakPart(part){
    const a=this.a;this.burst(part.x,part.y,24,1.25,'explosion');
    if(this.ghosts.length>=12)return;
    this.ghosts.push({texture:part.sprite.texture,x:part.x,y:part.y,w:part.sprite.width,h:part.sprite.height,
      rotation:part.sprite.rotation+(a.bank||0),vx:(part.localX<0?-1:1)*125*a.scale,vy:90*a.scale,spin:part.localX<0?-1.8:1.8,age:0,life:1.15,alpha:1,debris:true});
  }
  afterimage(part,x,y,angle){
    if(getReducedMotionEnabled()||this.a.age-this.lastGhost<.10||this.ghosts.length>=12)return;
    this.lastGhost=this.a.age;this.ghosts.push({texture:part.sprite.texture,x,y,w:part.sprite.width,h:part.sprite.height,rotation:angle,vx:0,vy:0,spin:0,age:0,life:.28,alpha:.22});
  }
  update(dt,zones){
    this.used=0;
    if(this.a.combat.coreBonusUntil>this.a.age){
      const remaining=(this.a.combat.coreBonusUntil-this.a.age)/4;
      this.sprite(material('glow'),this.a.x,this.a.y,95*this.a.scale,95*this.a.scale,0xffbd64,.26);
      this.sprite(material('flare'),this.a.x,this.a.y,(28+remaining*24)*this.a.scale,(28+remaining*24)*this.a.scale,0xffefd0,.7);
    }
    for(const z of zones)if(z.age>=0){if(z.kind==='beam')this.beam(z);else this.zone(z);}
    const c=this.chargeCue;
    if(c&&this.a.age-c.born<c.warning)this.beam({...c,age:this.a.age-c.born,radius:14*this.a.scale});else this.chargeCue=null;
    this.particles=this.particles.filter(p=>{
      p.age+=dt;if(p.age>=p.life)return false;
      const motion=getReducedMotionEnabled()?.3:1;p.x+=p.vx*dt*motion;p.y+=p.vy*dt*motion;
      const f=1-p.age/p.life;
      this.sprite(material('beam'),p.x,p.y,p.size*(2.2+f*3),p.size*.6,p.color,f*.85,Math.atan2(p.vy,p.vx));return true;
    });
    this.ghosts=this.ghosts.filter(p=>{
      p.age+=dt;if(p.age>=p.life)return false;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rotation+=p.spin*dt;
      this.sprite(p.texture,p.x,p.y,p.w,p.h,p.debris?0x7c8fa5:this.a.color,p.alpha*(1-p.age/p.life),p.rotation,p.debris?'normal':'add');
      return true;
    });
    for(let i=this.used;i<this.pool.length;i++)this.pool[i].visible=false;
  }
  clear(){this.particles.length=0;this.ghosts.length=0;this.chargeCue=null;this.container.visible=false;}
  destroy(){this.clear();this.container.destroy({children:true});this.pool.length=0;}
}

// Death choreography outlives the combat actor, but not its scene. A retained
// atlas lease makes rapid tour switching safe while the final pieces dissolve.
export class MysteryAftermath {
  constructor(container){this.container=container;this.batches=[];}
  emit(a){
    if(this.batches.length>=3)this.retire(this.batches.shift());
    const root=new Container();root.zIndex=59;root.label=`mystery_aftermath:${a.type}`;this.container.addChild(root);
    const phase=a.combat.p.motion==='phase',choir=a.type==='choir_unbound',frozen=a.type==='avalanche_engine'||a.type==='glass_widow';
    const parts=a.parts.filter(p=>p.active&&p.sprite.visible&&!p.drone).slice(0,12),pieces=[];
    for(const [i,p]of parts.entries()){
      const s=new Sprite(p.sprite.texture);s.anchor.copyFrom(p.sprite.anchor);s.position.set(p.x,p.y);s.width=p.sprite.width;s.height=p.sprite.height;s.rotation=p.sprite.rotation+(a.bank||0);root.addChild(s);
      const ang=Math.atan2(p.y-a.y,p.x-a.x)+(i%2?.2:-.2);
      pieces.push({s,x:p.x,y:p.y,w:s.width,h:s.height,angle:s.rotation,vx:Math.cos(ang)*(phase?-75:95+i%3*36),vy:Math.sin(ang)*(phase?-75:70+i%3*25),i});
    }
    this.batches.push({root,pieces,lease:a.lease.retain(),age:0,phase,choir,frozen,color:a.color});
  }
  retire(b){b.root.destroy({children:true});b.lease.release();}
  update(delta){
    const dt=Math.min(.1,delta/60),motion=getReducedMotionEnabled()?.25:1;
    this.batches=this.batches.filter(b=>{
      b.age+=dt;if(b.age>1.25){this.retire(b);return false;}
      for(const p of b.pieces){const t=Math.max(0,b.age-(b.choir?p.i*.055:0)),f=Math.min(1,t/1.15);
        p.s.position.set(p.x+p.vx*t*motion,p.y+p.vy*t*motion+(b.phase?0:t*t*18));
        p.s.rotation=p.angle+(p.i%2?1:-1)*t*(b.phase?.12:1.1)*motion;
        p.s.width=p.w*(b.phase?1-f*.7:1-f*.06);p.s.height=p.h*(b.phase?1-f*.7:1-f*.08);
        p.s.alpha=(1-f)*(b.choir?1:.92);p.s.blendMode=b.phase?'add':'normal';
        p.s.tint=b.phase?b.color:b.frozen?0xa9c9ee:f<.12?0xffd9a9:0x8295ad;
      }return true;
    });
  }
  clear(){for(const b of this.batches)this.retire(b);this.batches.length=0;}
}
