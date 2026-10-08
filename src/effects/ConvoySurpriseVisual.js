import {Container,Graphics,Sprite,Texture,Rectangle} from 'pixi.js';
import {premiumTexture} from './PremiumArt.js';
import {convoyPartPoses} from '../game/ConvoySurprises.js';
import {ReactorTowVisual} from './ReactorTowVisual.js';
import {CounterweightVisual} from './CounterweightVisual.js';

// Preallocated physical machinery; no new per-frame sprites or texture views.
export class ConvoySurpriseVisual {
 constructor(contact,art){
  this.art=art;this.root=new Container();this.root.label='convoy_surprise_machinery';contact.addChild(this.root);
  this.hulls=Array.from({length:2},()=>{const s=new Sprite(art.convoy);s.anchor.set(.5);this.root.addChild(s);return s;});
  this.cables=new Graphics();this.root.addChild(this.cables);
  this.machines=Array.from({length:6},()=>{const s=new Sprite(premiumTexture('captureCradle'));s.anchor.set(.5);this.root.addChild(s);return s;});
  this.details=new Graphics();this.root.addChild(this.details);
  this.reactorView=new ReactorTowVisual(this.root,art);
  this.halves=[0,1].map(i=>new Texture({source:art.convoy.source,frame:new Rectangle(i*art.convoy.width/2,0,art.convoy.width/2,art.convoy.height)}));
 }
 update(e,pose,captives,charges,{reduced=false,flash=1}={}){
  this.root.visible=Boolean(e?.surprise);this.details.clear();this.cables.clear();
  this.machines.forEach(s=>s.visible=false);this.hulls.forEach(s=>s.visible=false);
  if(this.reactorView)this.reactorView.root.visible=false;
  if(this.counterweightView)this.counterweightView.root.visible=false;
  if(!e?.surprise)return [];
  if(e.counterweight){this.counterweightView||=new CounterweightVisual(this.root);return this.counterweightView.update(e,pose,{reduced,flash});}
  if(e.reactor)return this.reactorView.update(e,pose,{reduced,flash});
  const {x,y,width:w,height:h}=pose,tex=this.art.designs[e.recipe?['prison-transport','convoy-talon','convoy-pearl','convoy-ark'][e.variant]:'prison-transport'];
  const id=e.surprise,split=Math.max(0,Math.min(1,(e.age-1.6)/2))*.14;
  const pair=['twin-jailers','crossed-chains','prisoner-exchange','convoy-split','stolen-callsign'].includes(id);
  for(let i=0;i<(pair?2:1);i++){
   const side=i?1:-1,s=this.hulls[i];s.texture=id==='convoy-split'?this.halves[i]:tex;s.visible=true;
   const offset=id==='convoy-split'?side*(.25+split):pair?side*.30:0;
   s.position.set(x+offset*w,y);s.width=id==='convoy-split'?w*.5:pair?w*.51:w;s.scale.y=s.scale.x;
   s.rotation=reduced?0:(id==='last-shuttle'?-.025:id==='convoy-split'?side*split*.15:0);
  }
  const poses=convoyPartPoses(e),targets=[];
  for(const [i,p] of poses.entries()){
   const px=x+p.x*w,py=y+p.y*h,s=this.machines[i];if(!s)break;
   s.visible=true;s.position.set(px,py);
   const lock=p.role==='lock'||p.role==='tow';
   const tid=lock?'captureCradle':p.role==='cover'?'moltPlate':p.role==='gun'?'weaverGun':p.role==='shield'?'reactorClosed':'relay';
   s.texture=premiumTexture(tid);s.width=p.cover?96:lock?61:p.role==='gun'?58:52;s.scale.y=s.scale.x;
   s.rotation=p.role==='drive'?Math.PI/2:0;s.tint=p.cover?0x83a6ad:0xffffff;
   if(lock){
    const index=p.part==='right'?1:0,captive=captives[index];captive.texture=premiumTexture(index?'fighterB':'fighterA');
    captive.visible=true;captive.position.set(px,py-18);captive.width=42;captive.scale.y=captive.scale.x;captive.rotation=Math.PI;captive.alpha=p.blocked?.65:1;
    const color=p.blocked?0xe5b566:index?0xffd795:0x5cf0df;
    this.details.moveTo(px-24,py-15).lineTo(px-24,py+14).moveTo(px+24,py-15).lineTo(px+24,py+14).stroke({color,width:3});
    if(p.blocked)this.details.roundRect(px-31,py-25,62,52,9).fill({color:0x2d4c60,alpha:.34}).stroke({color:0xe5b566,width:2,alpha:.85});
   }
   if(['tether','relay','tow'].includes(p.role)){
    const links=p.role==='tether'?[poses.find(q=>q.part===(p.part==='leftTether'?'left':'right'))]:poses.filter(q=>q.role==='lock');
    for(const q of links.filter(Boolean))this.cables.moveTo(px,py).lineTo(x+q.x*w,y+q.y*h-16).stroke({color:0x233a46,width:7}).stroke({color:0x94bac5,width:2,alpha:.85});
   }
   if(p.role==='shield'){
    const lockPose=poses.find(q=>q.part===(p.part==='leftShield'?'left':'right'));
    if(lockPose)this.cables.moveTo(px,py).lineTo(x+lockPose.x*w,y+lockPose.y*h).stroke({color:0x83d7e2,width:2,alpha:.7});
   }
   const charge=charges[p.part]||0;
   if(charge>0){
    this.details.moveTo(px-20,py+17).lineTo(px+20,py+17).stroke({color:0xff7057,width:3,alpha:.6+charge*.35});
    this.details.circle(px,py+17,3+charge*5).fill({color:0xffba7d,alpha:.45+.25*flash});
   }
   if(!p.cover){
    const health=e.hp[p.part]/e.maxHp[p.part];
    this.details.roundRect(px-22,py+32,44,4,2).fill(0x07111b).roundRect(px-22,py+32,44*health,4,2).fill(lock?0x63e3d5:0xffb77c);
   }
   targets.push({...p,x:px,y:py,radius:p.cover?43:lock?25:23,...(p.cover?{halfWidth:s.width*.47,halfHeight:s.height*.42}:{})});
  }
  return targets;
 }
 destroy(){this.counterweightView?.destroy();this.reactorView.destroy();this.root.destroy({children:true});for(const tex of this.halves)tex.destroy(false);this.machines=[];this.hulls=[];}
}
