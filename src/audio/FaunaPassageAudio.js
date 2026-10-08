// One preloaded performance, one optional stereo panner, no timers or gameplay RNG.
// A warning/pause retires the performance instead of queuing it for a later fight.
export class FaunaPassageAudio {
 constructor(audio,context) {
  this.audio=audio;this.context=context;this.started=false;this.retired=false;
  this.destroyed=false;this.pan=0;this.source=null;this.panner=null;
  if(context?.createMediaElementSource&&context?.createStereoPanner) {
   try {
    this.panner=context.createStereoPanner();
    this.source=context.createMediaElementSource(audio);
    this.source.connect(this.panner);this.panner.connect(context.destination);
   } catch {
    // Once a media element is routed, it must retain an audible destination.
    this.panner?.disconnect();this.panner=null;
    if(this.source){this.source.disconnect();this.source.connect(context.destination);}
   }
  }
 }
 update({progress,direction,volume,allowed}) {
  if(this.destroyed||this.retired)return;
  if(!allowed){this.stop();return;}
  const level=Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):0;
  this.audio.volume=level;
  this.pan=Math.max(-.65,Math.min(.65,(1-progress*2)*direction*.85));
  this.panner?.pan.setTargetAtTime(this.pan,this.context.currentTime,.14);
  if(!this.started&&progress>=.04) {
   this.started=true;
   if(level<=0){this.stop();return;}
   this.audio.play().then(()=>{if(this.retired||this.destroyed)this.audio.pause();}).catch(()=>this.stop());
  }
 }
 stop(){this.retired=true;this.audio.pause();}
 destroy(){
  if(this.destroyed)return;this.destroyed=true;this.stop();
  this.source?.disconnect();this.panner?.disconnect();this.source=null;this.panner=null;this.context=null;
 }
}
