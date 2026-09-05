import {Assets,Container,Sprite,Texture,Rectangle} from 'pixi.js';
import {getAccessibilitySettings} from '../config/AccessibilitySettings.js';
import {createText} from '../utils/pixiText.js';
import {translateText} from '../i18n/index.js';

// Only displayed hulls retain an atlas. Late async loads release themselves if
// a pilot navigated away in the meantime; no gameplay RNG or timers are used.
const atlases=new Map();
async function acquire(index){
 let entry=atlases.get(index);
 if(entry?.disposal){await entry.disposal;return acquire(index);}
 if(!entry){
  const path=`/art/astra/turntable/${String(index+1).padStart(2,'0')}`;
  entry={refs:0,path,promise:Promise.all([Assets.load(`${path}.webp`),Assets.load(`${path}.json`)]).then(([sheet,data])=>({sheet,data,frames:Array.from({length:data.count},(_,f)=>new Texture({source:sheet.source,frame:new Rectangle(f%data.columns*data.size,Math.floor(f/data.columns)*data.size,data.size,data.size)}))}))};
  atlases.set(index,entry);
 }
 entry.refs++;
 try{return {entry,...await entry.promise};}
 catch(error){if(--entry.refs===0&&atlases.get(index)===entry)atlases.delete(index);throw error;}
}
function release(index,entry){
 if(!entry||entry.refs<=0||--entry.refs>0)return;
 // Keep the entry locked until Pixi has finished unloading it. A quick return
 // to the same ship must not acquire a sheet that is about to be destroyed.
 entry.disposal=entry.promise.then(async({frames})=>{
  frames.forEach(t=>t.destroy(false));await Assets.unload([`${entry.path}.webp`,`${entry.path}.json`]);
 }).catch(()=>{}).finally(()=>{if(atlases.get(index)===entry)atlases.delete(index);});
}

export class AstraTurntable extends Container{
 constructor(index,fallback,{idle=false,captionRatio=.018,captionY=.32}={}){
  super();this.index=index;this.idle=idle;this.viewAngle=0;this.targetAngle=0;this.manualUntil=0;this.clock=0;
  this.baseSize=fallback.width;this.fallback=fallback;this.ready=false;
  this.views=[new Sprite(fallback),new Sprite(fallback)];this.views.forEach(v=>{v.anchor.set(.5);v.eventMode='none';this.addChild(v);});this.views[1].alpha=0;
  this.caption=createText(translateText('DRAG TO ROTATE'),{fontFamily:'Rajdhani, Bahnschrift, sans-serif',fontSize:this.baseSize*captionRatio,fontWeight:'700',fill:'#a9d9e4',letterSpacing:this.baseSize*.001,stroke:'#05101a',strokeThickness:2});
  this.caption.anchor.set(.5,0);this.caption.y=this.baseSize*captionY;this.caption.eventMode='none';this.addChild(this.caption);
  this.eventMode='static';this.cursor='grab';this.label=`astra_turntable_${index}`;
  this.hitArea=new Rectangle(-this.baseSize*.37,-this.baseSize*.34,this.baseSize*.74,this.baseSize*.68);
  this.on('pointerdown',e=>{if(e.button!==0)return;e.stopPropagation();this.dragging=true;this.dragX=e.global.x;this.cursor='grabbing';this.manualUntil=this.clock+14;});
  this.on('globalpointermove',e=>{if(!this.dragging)return;const dx=e.global.x-this.dragX;this.dragX=e.global.x;this.targetAngle+=dx*.012;this.manualUntil=this.clock+14;});
  this.on('pointermove',e=>{if(this.dragging)e.stopPropagation();});
  const stop=e=>{if(this.dragging)e.stopPropagation();this.dragging=false;this.cursor='grab';};this.on('pointerup',stop);this.on('pointerupoutside',stop);this.on('pointercancel',stop);
  acquire(index).then(data=>{
   if(this.destroyed){release(index,data.entry);return;}
   this.asset=data;this.ready=true;this.update(0);
  }).catch(error=>{console.warn('[AstraTurntable] View atlas unavailable',index,error);});
 }
 get texture(){return this.fallback;}
 get emitters(){if(!this.asset)return null;const f=((Math.round(this.viewAngle/Math.PI/2*this.asset.data.count)%this.asset.data.count)+this.asset.data.count)%this.asset.data.count;return this.asset.data.views[f].emitters;}
 update(delta=1){
  const dt=Math.min(3,Math.max(0,delta))/60;this.clock+=dt;
  this.caption.alpha=this.dragging?.18:.68;
  if(this.idle&&!this.dragging&&this.clock>this.manualUntil&&!getAccessibilitySettings().prefersReducedMotion)this.targetAngle+=dt*.085;
  this.viewAngle+=(this.targetAngle-this.viewAngle)*Math.min(1,dt*18);
  if(!this.asset)return;
  const {data,frames}=this.asset;const p=((this.viewAngle/(Math.PI*2)*data.count)%data.count+data.count)%data.count;const a=Math.round(p)%data.count,blend=0;
  for(let i=0;i<2;i++){this.views[i].texture=frames[(a+i)%data.count];this.views[i].scale.set(this.baseSize/data.size);this.views[i].alpha=i?blend:1-blend;}
 }
 destroy(options){if(this.destroyed)return;if(this.asset){release(this.index,this.asset.entry);this.asset=null;}super.destroy({...options,children:true,texture:false,textureSource:false});}
 static getResidentCount(){return atlases.size;}
}
