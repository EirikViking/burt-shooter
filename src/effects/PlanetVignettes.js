import { Container, Sprite, Texture } from 'pixi.js';
import { PLANET_VIGNETTES, samplePlanetActor, planetIndexForLevel } from '../config/PlanetVignettes.js';
import { planetActorTexture } from './PlanetVignetteArt.js';
import { PLANET_CUES } from '../audio/VisualLifeSounds.js';

// Harmless, render-only background theatre. Six pooled actors, three cables,
// one spectacle, then a quiet interval. No gameplay object or ticker ownership.
export class PlanetVignettes extends Container {
  constructor(){
    super();this.label='planetVignettes';this.eventMode='none';this.index=-1;this.age=0;this.sample={};
    this.cables=Array.from({length:3},()=>{const s=new Sprite(Texture.WHITE);s.anchor.set(0,.5);s.tint=0x596f74;this.addChild(s);return s;});
    this.actors=Array.from({length:6},()=>{const s=new Sprite();s.anchor.set(.5);this.addChild(s);return s;});
  }
  setLevel(level){
    const index=planetIndexForLevel(level);if(this.index===index)return;
    this.index=index;this.definition=PLANET_VIGNETTES[index];this.age=0;this.cuedRound=-1;this.pendingCue=null;
    for(let i=0;i<this.actors.length;i++){
      const s=this.actors[i],a=this.definition.actors[i];s.visible=Boolean(a);
      if(a)s.texture=planetActorTexture(a.motif);
    }
  }
  static async prewarm(renderer){
    const motifs=new Set(PLANET_VIGNETTES.flatMap(v=>v.actors.map(a=>a.motif)));
    for(const motif of motifs){const tex=planetActorTexture(motif);await renderer?.prepare?.upload?.(tex);}
  }
  update(delta,width,height,{reduced=false,pressure=0,warning=false,boss=false}={}){
    if(!this.definition)return;
    this.age+=Math.max(0,Math.min(100,Number(delta)*16.67||0))/1000;
    const v=this.definition,cycle=(this.age+v.period-4)%v.period;
    const running=cycle<v.duration;
    const envelope=running?Math.min(1,cycle/2,(v.duration-cycle)/2):0;
    this.alpha=Math.max(0,envelope)*(.78-Math.min(1,pressure)*.42)*(warning||boss?.32:1);
    this.visible=this.alpha>.002;
    const round=Math.floor((this.age+v.period-4)/v.period);
    if(running&&envelope>.5&&round!==this.cuedRound&&!warning&&!boss&&pressure<.5){
      this.cuedRound=round;this.pendingCue=`visual_${PLANET_CUES[this.index%6]}`;
    }
    if(!this.visible)return;
    // Reduced Motion preserves a quiet static tableau, with a slow fade and
    // no orbiting/rolling, instead of merely slowing all the same movements.
    const time=reduced?6:cycle;
    for(let i=0;i<v.actors.length;i++){
      const a=v.actors[i],s=this.actors[i],p=samplePlanetActor(v,i,time,this.sample);
      s.position.set(p.x*width,p.y*height);s.rotation=reduced?0:p.rotation;
      s.width=a.size*width*p.scale;s.scale.y=s.scale.x;
    }
    const tether=['tow','fish','laundry','kite','dragon','donuts','hammock','toast'].includes(v.story);
    for(let i=0;i<this.cables.length;i++){
      const s=this.cables[i],a=this.actors[0],b=this.actors[i+1];s.visible=tether&&i<v.actors.length-1;
      if(!s.visible)continue;
      s.position.set(a.x,a.y);s.width=Math.hypot(b.x-a.x,b.y-a.y);s.height=Math.max(.7,width*.0007);s.rotation=Math.atan2(b.y-a.y,b.x-a.x);s.alpha=.6;
    }
  }
  getDebugState(){return {id:this.definition?.id,index:this.index,actors:this.definition?.actors.length||0,visible:this.visible,age:this.age,alpha:this.alpha,decorativeOnly:true};}
  takeArrivalCue(){const cue=this.pendingCue;this.pendingCue=null;return cue;}
}
