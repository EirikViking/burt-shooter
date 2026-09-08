import {Container,Sprite,Texture,Rectangle} from 'pixi.js';
import {getAccessibilitySettings} from '../config/AccessibilitySettings.js';
import {createText} from '../utils/pixiText.js';
import {translateText} from '../i18n/index.js';

import { SolidShipView } from './SolidShipView.js';

export class AstraTurntable extends Container{
 constructor(index,fallback,{idle=false,captionRatio=.018,captionY=.32,highResolution=false}={}){
  super();this.index=index;this.idle=idle;this.viewAngle=0;this.targetAngle=0;this.manualUntil=0;this.clock=0;
  this.baseSize=fallback.width;this.fallback=fallback;this.ready=false;
  this.views=[new Sprite(fallback),new Sprite(fallback)];this.views.forEach(v=>{v.anchor.set(.5);v.eventMode='none';this.addChild(v);});this.views[1].alpha=0;
  this.caption=createText(translateText('DRAG TO ROTATE'),{fontFamily:'Rajdhani, Bahnschrift, sans-serif',fontSize:this.baseSize*captionRatio,fontWeight:'700',fill:'#a9d9e4',letterSpacing:this.baseSize*.001,stroke:'#05101a',strokeThickness:2});
  this.caption.anchor.set(.5,0);this.caption.y=this.baseSize*captionY;this.caption.eventMode='none';this.addChild(this.caption);
  this.eventMode='static';this.cursor='grab';this.label=`astra_turntable_${index}`;
  this.hitArea=new Rectangle(-this.baseSize*.37,-this.baseSize*.34,this.baseSize*.74,this.baseSize*.68);
  this.pitch=0;this.targetPitch=0;
  this.on('pointerdown',e=>{if(e.button!==0)return;e.stopPropagation();this.dragging=true;this.dragX=e.global.x;this.dragY=e.global.y;this.cursor='grabbing';this.manualUntil=this.clock+14;});
  this.on('globalpointermove',e=>{if(!this.dragging)return;const dx=e.global.x-this.dragX,dy=e.global.y-this.dragY;this.dragX=e.global.x;this.dragY=e.global.y;this.targetAngle+=dx*.012;this.targetPitch=Math.max(-1.4,Math.min(1.4,this.targetPitch+dy*.009));this.manualUntil=this.clock+14;});
  this.on('pointermove',e=>{if(this.dragging)e.stopPropagation();});
  const stop=e=>{if(this.dragging)e.stopPropagation();this.dragging=false;this.cursor='grab';};this.on('pointerup',stop);this.on('pointerupoutside',stop);this.on('pointercancel',stop);
  const showroomPixels = Math.min(2560, Math.max(1536, Math.ceil(window.innerWidth * .55 / 128) * 128));
  this.solid = new SolidShipView(index, highResolution ? showroomPixels : 768);
  this.solid.promise.then(()=>{
   if(this.destroyed || !this.solid.ready)return;
   this.liveTexture=Texture.from(this.solid.canvas);
   this.views[0].texture=this.liveTexture;
   this.views[0].scale.set(this.baseSize/this.solid.size);
   this.ready=true;this.update(0);
  }).catch(error=>console.warn('[AstraTurntable] Solid hull unavailable',index,error));
 }
 get texture(){return this.fallback;}
 get emitters(){return this.ready ? [] : null;}
 update(delta=1){
  const dt=Math.min(3,Math.max(0,delta))/60;this.clock+=dt;
  this.caption.alpha=this.dragging?.18:.68;
  if(this.idle&&!this.dragging&&this.clock>this.manualUntil&&!getAccessibilitySettings().prefersReducedMotion)this.targetAngle+=dt*.085;
  this.viewAngle+=(this.targetAngle-this.viewAngle)*Math.min(1,dt*18);
  this.pitch+=(this.targetPitch-this.pitch)*Math.min(1,dt*18);
  if(!this.ready)return;
  // Render only when the angle changes. Idle menus retain a full-resolution
  // frame without spending GPU time on an unchanged ship.
  if(this.lastRenderedAngle === undefined || Math.abs(this.viewAngle-this.lastRenderedAngle)>.0005 || Math.abs(this.pitch-this.lastRenderedPitch)>.0005){
   if(this.solid.render(this.viewAngle,this.pitch))this.liveTexture.source.update();
   this.lastRenderedAngle=this.viewAngle;
   this.lastRenderedPitch=this.pitch;
  }
 }
 destroy(options){
  if(this.destroyed)return;
  this.solid?.dispose();
  super.destroy({...options,children:true,texture:false,textureSource:false});
  this.liveTexture?.destroy(true);
 }
 static getResidentCount(){return SolidShipView.resident;}
 static getDetailResidentCount(){return 0;}
}
