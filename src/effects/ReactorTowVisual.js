import {Container,Graphics,Sprite,Texture,Rectangle} from 'pixi.js';
import {premiumTexture} from './PremiumArt.js';
import {REACTOR_TOW,reactorTowPosition,reactorTowPoses} from '../game/ReactorTow.js';

// Articulated machinery from already shipped, prewarmed art. Every solid body is
// harmless; the thin amber lanes mark the five ordinary projectiles only.
export class ReactorTowVisual {
  constructor(parent,art){
    this.root=new Container();this.root.label='reactor_tow';parent.addChild(this.root);
    this.lines=new Graphics();this.root.addChild(this.lines);
    this.tug=new Sprite(art.designs['convoy-ark']);this.tug.anchor.set(.5);this.root.addChild(this.tug);
    this.closed=new Sprite(premiumTexture('reactorClosed'));this.closed.anchor.set(.5);this.root.addChild(this.closed);
    this.open=new Sprite(premiumTexture('reactorOpen'));this.open.anchor.set(.5);this.root.addChild(this.open);
    const texture=premiumTexture('reactorClosed'),frame=texture.frame;
    this.shellTextures=[];this.vanes=[];
    for(const [sx,sy]of [[-1,-1],[1,-1],[-1,1],[1,1]]){
      const part=new Texture({source:texture.source,frame:new Rectangle(frame.x+(sx+1)*frame.width/4,frame.y+(sy+1)*frame.height/4,frame.width/2,frame.height/2)});
      const sprite=new Sprite(part);sprite.anchor.set(.5);this.root.addChild(sprite);
      this.shellTextures.push(part);this.vanes.push({sprite,sx,sy});
    }
    this.root.visible=false;
    this.coupler=new Sprite(premiumTexture('relay'));this.coupler.anchor.set(.5);this.root.addChild(this.coupler);
    this.details=new Graphics();this.root.addChild(this.details);
  }
  update(e,pose,{reduced=false,flash=1}={}){
    const {x,y,width:w,height:h}=pose,r=e.reactor,at=reactorTowPosition(e);
    const rx=x+at.x*w,ry=y+at.y*h,cx=x-.02*w,cy=y+.12*h;
    const charge=r.warning/REACTOR_TOW.warning,linked=r.releaseAt===null;
    this.root.visible=true;this.lines.clear();this.details.clear();
    this.tug.position.set(x-w*.3,y-h*.08);this.tug.width=w*.57;this.tug.scale.y=this.tug.scale.x;
    this.tug.rotation=reduced?0:-.055;
    const size=Math.min(132,w*.32);
    for(const s of [this.closed,this.open]){s.position.set(rx,ry);s.width=size;s.scale.y=s.scale.x;}
    this.closed.alpha=.32;
    const aperture=r.harmless?.7:r.spent?.4:charge;
    this.open.alpha=r.harmless?.52:.24+aperture*(.42+.24*flash);
    this.open.tint=r.harmless?0x79aebb:0xffffff;
    this.open.rotation=reduced||r.harmless?0:Math.sin(e.age*1.8)*.018;
    // Physical armour reveals the core without changing hit geometry or clocks.
    const opening=aperture*size*.09;
    for(const {sprite,sx,sy}of this.vanes){
      sprite.width=size*.5;sprite.scale.y=sprite.scale.x;
      sprite.position.set(rx+sx*(size*.25+opening),ry+sy*(size*.25+opening));
      sprite.tint=r.harmless?0x82979b:0xffffff;sprite.alpha=1;
    }
    this.coupler.visible=linked&&!r.harmless&&!r.spent;this.coupler.position.set(cx,cy);
    this.coupler.width=38;this.coupler.scale.y=this.coupler.scale.x;this.coupler.rotation=Math.PI/2;
    if(linked){
      for(const dy of [-12,12])this.lines.moveTo(x-w*.13,cy+dy).lineTo(rx-size*.38,ry+dy)
        .stroke({color:0x101c27,width:8}).stroke({color:0x97b6c1,width:2});
    }
    if(!linked){
      const since=Math.max(0,e.age-r.releaseAt),fade=Math.max(0,1-since/.65);
      if(fade>0)for(const dy of [-12,12]){
        const recoil=reduced?0:Math.sin(since*15)*14*fade;
        this.lines.moveTo(x-w*.13,cy+dy).quadraticCurveTo(cx-28,cy+dy+recoil,cx-12-since*32,cy+dy+recoil)
          .stroke({color:0x97b6c1,width:2,alpha:fade});
      }
    }
    if(charge>0){
      const bottom=pose.fieldHeight||y+h*3;
      for(const offset of [-28,-14,0,14,28]){
        for(let ly=ry+size*.5;ly<bottom-20;ly+=40)
          this.lines.moveTo(rx+offset,ly).lineTo(rx+offset,Math.min(ly+16,bottom-20))
            .stroke({color:0xffb66e,width:1.5,alpha:.2+charge*.22});
      }
      this.details.arc(rx,ry,size*.56,-Math.PI*.5,-Math.PI*.5+Math.PI*2*charge)
        .stroke({color:0xffbd7a,width:3,alpha:.75});
      this.details.circle(rx,ry+size*.4,4+charge*4).fill({color:0xffcd8c,alpha:.45+.3*flash});
    }
    const targets=reactorTowPoses(e).map(p=>({...p,x:x+p.x*w,y:y+p.y*h,radius:p.part==='vent'?32:21}));
    for(const t of targets){
      const half=t.part==='vent'?27:20,hp=e.hp[t.part]/e.maxHp[t.part];
      this.details.roundRect(t.x-half,t.y+size*.48,half*2,4,2).fill(0x07111b)
        .roundRect(t.x-half,t.y+size*.48,half*2*hp,4,2).fill(t.part==='vent'?0xffb66e:0x96dbe8);
    }
    return targets;
  }
  destroy(){this.root.destroy({children:true});for(const texture of this.shellTextures)texture.destroy(false);this.shellTextures=[];this.vanes=[];}
}
