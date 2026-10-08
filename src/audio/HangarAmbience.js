export const HANGAR_TRACK_SRC = '/audio/music/nova-swarm/hangar_departure.mp3';

// Keep the existing ambient-mode interface so saved settings remain compatible.
// The replacement track streams instead of being decoded into a large audio buffer.
export class HangarAmbience {
  constructor(context, volume) {
    this.context = context;
    this.volume = volume;
    this.active = false;
    this.generation = 0;
    this.layers = [];
    this.audio = null;
    this.source = null;
    this.output = null;
    this.timer = null;
    this.fadeJob = null;
    this.startedAt = 0;
  }

  load() {
    if (this.audio) return this.audio;
    this.audio = new Audio(HANGAR_TRACK_SRC);
    this.audio.preload = 'auto';
    this.audio.loop = true;
    this.audio.volume = 1;
    this.source = this.context.createMediaElementSource(this.audio);
    this.output = this.context.createGain();
    this.output.gain.value = 0;
    this.source.connect(this.output);
    this.output.connect(this.context.destination);
    return this.audio;
  }

  async start() {
    if (this.active) {
      this.refreshVolume();
      return;
    }
    const audio = this.load();
    clearTimeout(this.fadeJob);
    this.fadeJob = null;
    this.active = true;
    const token = ++this.generation;
    const now = this.context.currentTime;
    this.startedAt = now;
    this.layers = [{ source: this.source, audio }];
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(this.output.gain.value, now);
    this.output.gain.linearRampToValueAtTime(this.volume(), now + 2.6);
    try {
      await audio.play();
      if (!this.active || token !== this.generation) return;
      clearInterval(this.timer);
      this.timer = setInterval(() => this.refreshVolume(), 500);
    } catch (error) {
      if (token === this.generation) {
        this.active = false;
        this.layers = [];
      }
      console.warn('[HangarAmbience]', error?.message || error);
    }
  }

  refreshVolume() {
    if (!this.active || !this.output) return;
    const now = this.context.currentTime;
    const entrance = Math.min(1, Math.max(0, (now - this.startedAt) / 2.6));
    this.output.gain.cancelScheduledValues(now);
    const target = this.volume() * entrance;
    if (target === 0) this.output.gain.setValueAtTime(0, now);
    else this.output.gain.setTargetAtTime(target, now, 0.18);
  }

  silenceRetiring() {
    if (!this.output) return;
    const now = this.context.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(0, now);
  }

  stop(seconds = 1.3) {
    const wasActive = this.active || Boolean(this.audio && !this.audio.paused);
    this.active = false;
    ++this.generation;
    clearInterval(this.timer);
    this.timer = null;
    this.layers = [];
    if (!this.audio || !this.output) return wasActive;

    clearTimeout(this.fadeJob);
    const now = this.context.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(this.output.gain.value, now);
    this.output.gain.linearRampToValueAtTime(0, now + Math.max(0, seconds));
    const token = this.generation;
    this.fadeJob = setTimeout(() => {
      if (token !== this.generation || this.active) return;
      this.audio.pause();
      this.audio.currentTime = 0;
      this.fadeJob = null;
    }, Math.max(0, seconds) * 1000 + 30);
    return wasActive;
  }

  debug() {
    return {
      active: this.active,
      layers: this.layers.length,
      loaded: Boolean(this.audio),
      track: HANGAR_TRACK_SRC,
      seconds: this.active ? Math.max(0, this.context.currentTime - this.startedAt) : 0
    };
  }
}
