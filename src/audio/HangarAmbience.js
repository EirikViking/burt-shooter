// All sound comes from ElevenLabs recordings. Automation only mixes their level
// and stereo position; there are no oscillators, generated noise or musical notes.
export const HANGAR_STEMS = Object.freeze([
  {id:'reactor',gain:.70,period:47,pan:.04},
  {id:'machinery',gain:.30,period:71,pan:.17},
  {id:'signals',gain:.17,period:109,pan:.26},
  {id:'shimmer',gain:.12,period:83,pan:.21}
]);
export class HangarAmbience {
  constructor(context,volume) {
    this.context=context;this.volume=volume;this.active=false;this.generation=0;this.layers=[];this.fadeJobs=new Set();
    this.buffers=null;this.timer=null;this.startedAt=0;this.retiring=new Set();
  }
  load() {
    if(!this.buffers)this.buffers=Promise.all(HANGAR_STEMS.map(async stem=>{
      const response=await fetch(`/audio/ambience/orbital-hangar/${stem.id}.mp3`);
      if(!response.ok)throw new Error(`Hangar ambience unavailable: ${stem.id}`);
      return this.context.decodeAudioData(await response.arrayBuffer());
    })).catch(error=>{this.buffers=null;throw error;});
    return this.buffers;
  }
  async start() {
    if(this.active)return;
    this.active=true;const token=++this.generation;
    try {
      const buffers=await this.load();
      if(!this.active||token!==this.generation)return;
      const ctx=this.context;this.startedAt=ctx.currentTime;
      this.output=ctx.createGain();this.output.gain.value=0;this.output.connect(ctx.destination);
      this.output.gain.linearRampToValueAtTime(this.volume(),ctx.currentTime+2.6);
      this.layers=HANGAR_STEMS.map((stem,i)=>{
        const source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner();
        source.buffer=buffers[i];source.loop=true;gain.gain.value=stem.gain*.7;
        source.connect(gain);gain.connect(pan);pan.connect(this.output);
        source.start(0,i*3.73%source.buffer.duration);
        return {source,gain,pan,stem};
      });
      this.timer=setInterval(()=>this.update(),500);this.update();
    }catch(error){if(token===this.generation)this.active=false;console.warn('[HangarAmbience]',error.message);}
  }
  update() {
    if(!this.active||!this.output)return;
    const now=this.context.currentTime,t=now-this.startedAt;
    for(const{gain,pan,stem}of this.layers){
      const breath=.76+.15*Math.sin(t*Math.PI*2/stem.period)+.09*Math.sin(t*Math.PI*2/(stem.period*1.71)+1.4);
      gain.gain.setTargetAtTime(stem.gain*breath,now,1.8);
      pan.pan.setTargetAtTime(stem.pan*Math.sin(t*Math.PI*2/(stem.period*1.37)),now,2.2);
    }
    this.refreshVolume();
  }
  refreshVolume(){
    const volume=this.volume();if(volume===0)this.silenceRetiring();
    if(this.output&&this.active){const now=this.context.currentTime,entrance=Math.min(1,Math.max(0,(now-this.startedAt)/2.6));this.output.gain.cancelScheduledValues(now);if(volume===0)this.output.gain.setValueAtTime(0,now);else this.output.gain.setTargetAtTime(volume*entrance,now,.18);}
  }
  silenceRetiring(){for(const group of this.retiring){group.output.gain.cancelScheduledValues(this.context.currentTime);group.output.gain.setValueAtTime(0,this.context.currentTime);}}
  stop(seconds=1.3) {
    if(seconds<=.1)this.silenceRetiring();
    const wasActive=this.active;this.active=false;++this.generation;
    clearInterval(this.timer);this.timer=null;
    const layers=this.layers,output=this.output;this.layers=[];this.output=null;
    if(output){
      const now=this.context.currentTime;output.gain.cancelScheduledValues(now);output.gain.setValueAtTime(output.gain.value,now);output.gain.linearRampToValueAtTime(0,now+seconds);
      for(const layer of layers)layer.source.stop(now+seconds+.02);
      const group={output,layers};this.retiring.add(group);
      const job=setTimeout(()=>{for(const layer of layers){layer.source.disconnect();layer.gain.disconnect();layer.pan.disconnect();}output.disconnect();this.fadeJobs.delete(job);this.retiring.delete(group);},seconds*1000+100);
      this.fadeJobs.add(job);
    }
    return wasActive;
  }
  debug(){return {active:this.active,layers:this.layers.length,loaded:Boolean(this.buffers),seconds:this.active?this.context.currentTime-this.startedAt:0};}
}
