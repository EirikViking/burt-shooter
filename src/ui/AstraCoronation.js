import {Assets,Container,Graphics,Sprite,Texture} from 'pixi.js';
import {getAccessibilitySettings} from '../config/AccessibilitySettings.js';

// Bounded presentation only: fixed geometry, no simulation state or gameplay RNG.
export class AstraCoronation extends Container {
 constructor({visual={},milestone=10,shipTexture=null,getShipTexture=null,shipIndex=0}={}){
  super();this.eventMode='none';this.interactiveChildren=false;this.visual=visual;this.milestone=milestone;
  this.getShipTexture=getShipTexture;this.fx=new Graphics();this.addChild(this.fx);
  this.crest=new Sprite(Texture.EMPTY);this.crest.anchor.set(.5);this.addChild(this.crest);
  this.hull=new Sprite(shipTexture||Texture.EMPTY);this.hull.anchor.set(.5);this.addChild(this.hull);
  this.label='astra_coronation';
  Assets.load('/art/astra/coronation-v6.webp').then(texture=>{if(!this.destroyed){this.crest.texture=texture;this.ready=true;}}).catch(error=>console.warn('[AstraCoronation]',error));
  // Own this small portrait texture, independently of hangar/turntable caches.
  const portrait=`/art/fleet-identity-20260908/showroom/${String(Math.max(0,Math.min(29,Number(shipIndex)||0))+1).padStart(2,'0')}.webp`;
  fetch(portrait).then(r=>{if(!r.ok)throw new Error(`Portrait ${r.status}`);return r.blob();})
   .then(blob=>createImageBitmap(blob,{resizeWidth:384,resizeHeight:384,resizeQuality:'high'}))
   .then(bitmap=>{if(this.destroyed){bitmap.close();return;}this.portraitBitmap=bitmap;this.ownedHull=Texture.from(bitmap);this.hull.texture=this.ownedHull;})
   .catch(error=>console.warn('[AstraCoronation] Using gameplay portrait',error));
 }
 update(elapsedMs,width,height,{compact=false}={}){
  const settings=getAccessibilitySettings(),motion=!settings.prefersReducedMotion;
  const t=motion?Math.max(0,elapsedMs)/1000:3;
  const entry=motion?1-Math.pow(1-Math.min(1,t/1.3),3):1;
  const v=this.visual,p=v.primaryColor||0xffd15c,a=v.accentColor||0x61f6ff;
  const radius=Math.min(width*.46,height*.43),g=this.fx;g.clear();
  const latestHull=this.getShipTexture?.();
  if(!this.ownedHull&&latestHull&&latestHull.width>1)this.hull.texture=latestHull;
  this.crest.width=this.crest.height=radius*1.94;
  this.crest.alpha=entry*(compact?.13:1);
  this.crest.scale.set(this.crest.scale.x*(.94+entry*.06));
  this.hull.visible=!compact&&this.hull.texture!==Texture.EMPTY;
  if(this.hull.visible){
   const scale=radius*1.02/Math.max(this.hull.texture.width,this.hull.texture.height);
   this.hull.scale.set(scale);this.hull.y=-radius*.035+(motion?Math.sin(t*.9)*radius*.016:0);
   this.hull.alpha=entry;
  }
  const opacity=compact?.18:1,count=12+Math.min(8,Math.floor(this.milestone/10))*4;
  for(let i=0;i<count;i++){
   const angle=i/count*Math.PI*2-Math.PI/2,major=i%4===0;
   const inner=radius*(major?1.03:1.08),outer=radius*(major?1.2:1.13);
   g.moveTo(Math.cos(angle)*inner,Math.sin(angle)*inner).lineTo(Math.cos(angle)*outer,Math.sin(angle)*outer).stroke({color:major?p:a,width:major?2:1,alpha:(major?.7:.28)*entry*opacity});
  }
  for(let i=0;i<3;i++){
   const r=radius*(1.16+i*.075),start=t*(i%2?-.12:.09)+i*2.1;
   g.moveTo(Math.cos(start)*r,Math.sin(start)*r).arc(0,0,r,start,start+Math.PI*.52).stroke({color:i%2?a:p,width:i===1?2.2:1,alpha:.32*opacity*entry});
  }
  if(motion&&t<2.7){
   const burst=Math.min(1,t/2.7),r=radius*(.3+burst*1.9);
   g.circle(0,0,r).stroke({color:p,width:2,alpha:(1-burst)*.55*settings.flashIntensity*opacity});
  }
  for(let i=0;i<28;i++){
   const q=(t*.11+i*.6180339)%1,side=i%2?1:-1;
   const x=side*radius*(.72+(i%7)*.065),y=radius*(1.3-q*2.6);
   g.moveTo(x,y).lineTo(x,y+radius*.035).stroke({color:i%3?a:p,width:1.2,alpha:Math.sin(q*Math.PI)*.42*entry*opacity});
  }
 }
 destroy(options){if(this.destroyed)return;super.destroy({...options,children:true,texture:false,textureSource:false});this.ownedHull?.destroy(true);this.portraitBitmap?.close();this.ownedHull=null;this.portraitBitmap=null;}
}
