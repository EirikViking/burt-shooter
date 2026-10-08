const CUES=Object.freeze({arrival:['premium_breach_arrive',.72,.82],lock:['premium_weaver_arm',.38,.88],
  iris:['premium_hull_open',.5,1.08],anchor:['premium_armour_break',.68,.83],rupture:['premium_reactor_open',.7,.76],
  collapse:['premium_breach_collapse',.82,.78],fire:['premium_battery_fire',.62,.92],power:['premium_weaver_assembly',.30,.78]});
let ownerOrdinal=0;

// Simulation-time choreography only. No timers, gameplay RNG or new recordings.
export class PlanetfallAudio{
  constructor(manager){this.manager=manager;this.group=`planetfall-${++ownerOrdinal}`;this.beats=0;this.lastOpen=false;this.lastSealed=false;this.anchors=4;this.warning=null;this.destroyed=false;}
  event(name,index=0){
    if(this.destroyed)return false;const cue=CUES[name];if(!cue)return false;
    const load=(name==='power'||name==='iris') ? .5+this.anchors*.125 : 1;
    return this.manager.playSfx(cue[0],{volume:cue[1]*load,playbackRate:cue[2]+(name==='lock'?index*.035:0),
      preserveGameplayRng:true,sfxGroup:this.group});
  }
  update(model){
    if(this.destroyed)return;
    this.anchors=model.parts.slice(0,4).filter(p=>p.health>0).length;
    const times=[0,.8,1.6,2.4];
    while(this.beats<times.length&&model.age>=times[this.beats]){
      const index=this.beats++;this.event(index?'lock':'arrival',index);
    }
    if(model.irisOpen&&!this.lastOpen)this.event('iris');this.lastOpen=model.irisOpen;
    const sealed=model.stage!=='arrival'&&!model.defeated&&!model.irisOpen&&this.anchors>0;
    if(sealed&&!this.lastSealed)this.event('power');this.lastSealed=sealed;
    if(!model.warning)this.warning=null;
    else if(this.warning!==model.warning){
      if(this.manager.playSfx('premium_battery_charge',{volume:.8,playbackRate:1,preserveGameplayRng:true,sfxGroup:this.group}))this.warning=model.warning;
    }
  }
  suspend(){if(this.destroyed)return;this.manager.stopSfxGroup?.(this.group);this.warning=null;}
  destroy(){if(this.destroyed)return;this.suspend();this.destroyed=true;}
}
