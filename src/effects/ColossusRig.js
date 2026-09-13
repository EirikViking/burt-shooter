import { Assets, Container, Graphics, Mesh, MeshGeometry, Rectangle, Sprite, Texture } from 'pixi.js';
import { COLOSSUS_FAMILIES } from '../config/BossReinvention.js';
import { getReducedMotionEnabled, getFlashIntensityScale } from '../config/AccessibilitySettings.js';
import { preloadColossusVfx } from './ColossusAssaultVfx.js';

const smooth = v => { const x = Math.max(0, Math.min(1, v)); return x*x*(3-2*x); };
const textures = new Map();
export async function loadColossus(archetype) {
  if (!textures.has(archetype)) textures.set(archetype, Assets.load(`/assets/astra/colossus/${archetype}.png`).then(texture=>{
    texture.source.autoGenerateMipmaps=true;
    texture.source.scaleMode='linear';
    texture.source.updateMipmaps();
    return texture;
  }));
  await preloadColossusVfx();
  return textures.get(archetype);
}

// Actual replacement body. The previous hull and its ornamental rigs are hidden,
// while their collision reference remains untouched. No simulation or random draws.
export class ColossusRig extends Container {
  constructor(texture, radius, archetype, collisionRadius) {
    super(); this.eventMode = 'none'; this.label = 'colossus_hull';
    this.design = COLOSSUS_FAMILIES[archetype]; this.archetype = archetype;
    this.r = radius; this.collisionRadius = collisionRadius; this.ownedTextures = [];
    this.sourceTexture=texture;
    const w = texture.width, h = texture.height;
    this.back = new Graphics(); this.addChild(this.back);
    this.halves = this.design.layout==='rotor' ? Array.from({length:this.design.arms||6},(_,i)=>{
      const count=this.design.arms||6,a=i*Math.PI*2/count,b=(i+1)*Math.PI*2/count;
      const uv=[.5,.5,.5+Math.cos(a)*.85,.5+Math.sin(a)*.85,.5+Math.cos(b)*.85,.5+Math.sin(b)*.85];
      const positions=uv.map((v,j)=>(v-.5)*radius*2.6*(j%2?h/w:1));
      const geometry=new MeshGeometry({positions:new Float32Array(positions),uvs:new Float32Array(uv),indices:new Uint32Array([0,1,2])});
      const mesh=new Mesh({geometry,texture});mesh.armAngle=(a+b)/2;this.addChild(mesh);return mesh;
    }) : [-1,1].map(side => {
      const part = new Texture({source:texture.source, frame:new Rectangle(side < 0 ? 0 : w*.56, 0, w*.44, h)});
      this.ownedTextures.push(part);
      const sprite = new Sprite(part); sprite.anchor.set(side < 0 ? 1 : 0, .35);
      sprite.scale.set(radius*2.6/w); this.addChild(sprite); return sprite;
    });
    const spineTexture=new Texture({source:texture.source,frame:this.design.layout==='rotor'?new Rectangle(w*.32,h*.32,w*.36,h*.36):new Rectangle(w*.40,0,w*.20,h*(this.design.coreHeight||.30))});
    this.ownedTextures.push(spineTexture);this.spine=new Sprite(spineTexture);
    this.spine.anchor.set(.5,this.design.coreHeight===1?.35:.5);this.spine.scale.set(radius*(this.design.layout==='rotor'?2.6:this.design.coreScale||5.2)/w);
    this.addChild(this.spine);
    this.deathBody=new Sprite(texture);this.deathBody.anchor.set(.5);this.deathBody.scale.set(radius*2.6/w);this.deathBody.visible=false;this.addChild(this.deathBody);
    this.front = new Graphics(); this.addChild(this.front);
  }
  update({charge=0,recoil=0,phase=1,time=0,angle=Math.PI/2,death=0,hurt=0,signature=false}={}) {
    const r=this.r,d=this.design,reduced=getReducedMotionEnabled(),flash=getFlashIntensityScale();
    const t=reduced?0:time,open=smooth(charge*1.5),load=smooth((charge-.55)*2.3);
    const stance=(phase-1)*.09, spread=d.opening*open+stance;
    this.rotation = Math.max(-.32,Math.min(.32,angle-Math.PI/2))*(charge>0?1:.2);
    if(d.layout==='rotor')this.rotation=t*(this.archetype==='clock'?.07:.20);
    this.alpha=1-death; this.y=-recoil*r*.14;
    this.halves.forEach((s,i)=>{
      if(d.layout==='rotor'){
        s.position.set(Math.cos(s.armAngle)*r*open*.24,Math.sin(s.armAngle)*r*open*.24);
        s.rotation=open*(this.archetype==='clock'?.18:.34)+(i%2?1:-1)*recoil*.04;
        s.tint=hurt>.1?0xffdfbf:0xffffff;return;
      }
      const side=i?1:-1; s.x=side*r*(spread-.20+death*.6);
      s.y=-load*r*.08 + (i?1:-1)*Math.sin(t*1.3)*r*.007;
      s.rotation=side*(open*d.twist+stance*.4-recoil*.13+death*.65);
      if(this.archetype==='forge')s.y+=r*(load*.25-recoil*.30);
      if(this.archetype==='mirror')s.y+=side*r*open*.18;
      if(this.archetype==='jester'){s.rotation*=i?1.4:.55;s.y+=side*r*open*.16;}
      if(this.archetype==='carrier'){s.y+=r*load*.08;s.rotation*=.2;}
      if(this.archetype==='monolith'){s.y+=r*load*.20;s.rotation=side*recoil*.04;}
      if(this.archetype==='choir'){s.y+=side*r*open*.24;s.rotation*=.35;}
      s.tint=hurt>.1?0xffdfbf:0xffffff;
    });
    const g=this.back; g.clear();
    // A solid central reactor visibly occupies the inherited collision volume.
    const cr=this.collisionRadius*.84;
    this.spine.y=d.layout==='rotor'?0:this.design.coreHeight===1?-load*r*.05:-r*.08-load*r*.08;
    if(d.layout!=='rotor')for(const side of [-1,1])for(let i=0;i<5;i++){
      const y=-r*.15+i*r*.09;
      g.moveTo(side*cr*.5,y).lineTo(side*r*(.5+spread),y-r*.08).stroke({color:0x293b48,width:8});
      g.moveTo(side*cr*.5,y-2).lineTo(side*r*(.5+spread),y-r*.08-2).stroke({color:0xa8ac9c,width:2});
    }
    const f=this.front; f.clear();
    const core=cr*(.025+open*.045+recoil*.03);
    for(let j=2;j>=0;j--){const k=(j+1)*.32;
      f.poly([0,cr*.1,core*k,cr*.25,core*k*.65,cr*.48,0,cr*.56,-core*k*.65,cr*.48,-core*k,cr*.25])
        .fill({color:j===0?0xfff6dc:d.color,alpha:(.23+charge*.55+recoil*.20)*flash});
    }
    // Charge travels down the inner rails. Big hull articulation owns anticipation.
    if(d.layout!=='rotor')for(const side of [-1,1])for(let i=0;i<7;i++){
      const p=i/6,x=side*r*(.30+spread+(.30-p*.12)),y=r*(-.1+p*.96);
      const hot=Math.max(0,Math.min(1,charge*1.5-i*.075));
      f.moveTo(x,y).lineTo(x-side*r*.05,y+r*.065).stroke({color:hot>.75?0xfff2c7:d.color,width:3+hot*4,alpha:(.08+hot*.8)*flash});
    }
    this.debug={archetype:this.archetype,charge,open,phase,signature,spread,bodyReplaced:true};
  }
  destroy(options) { super.destroy(options); this.ownedTextures.forEach(t=>t.destroy(false)); }
}
