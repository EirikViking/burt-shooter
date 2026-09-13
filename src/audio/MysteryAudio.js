import { AudioManager } from './AudioManager.js';
import banks from './MysterySoundBanks.json' with { type: 'json' };

// Original ElevenLabs cues, lazy per encounter, four voices maximum. The
// simulation requests sounds; no random calls or game timers live on this bus.
class MysteryAudioBus {
  constructor() { this.cache = new Map(); this.voices = new Set(); this.owners = new WeakMap(); this.epoch = 0; this.frame = 0; }
  state(owner) {
    let state = this.owners.get(owner);
    if (!state) { state = { token: 0, last: {} }; this.owners.set(owner, state); }
    return state;
  }
  prepare(definition) {
    const id = definition?.id, bank = banks[id], context = AudioManager.context;
    if (!bank || !context) return Promise.resolve(null);
    let row = this.cache.get(id);
    if (row) { row.used = performance.now(); return row.promise; }
    row = { used: performance.now(), controller: new AbortController(), bytes: 0 };
    this.cache.set(id, row);
    row.promise = fetch(bank.url, { signal: row.controller.signal })
      .then(response => { if (!response.ok) throw Error(`HTTP ${response.status}`); return response.arrayBuffer(); })
      .then(data => context.decodeAudioData(data)).then(buffer => {
        if (this.cache.get(id) !== row) return null;
        row.bytes = buffer.length * buffer.numberOfChannels * 4;
        while (this.cache.size > 3) {
          const victim = [...this.cache.entries()].filter(([key]) => key !== id).sort((a, b) => a[1].used - b[1].used)[0];
          victim[1].controller.abort(); this.cache.delete(victim[0]);
        }
        return buffer;
      }).catch(error => {
        if (this.cache.get(id) === row) this.cache.delete(id);
        if (error.name !== 'AbortError') console.warn(`[MysteryAudio] ${id}: ${error.message}`);
        return null;
      });
    return row.promise;
  }
  play(owner, definition, event, { x = .5 } = {}) {
    const mixEvent = event.startsWith('motif_') || event==='attack_alt' ? 'attack' : event;
    const bank = banks[definition?.id];
    if (!bank || !AudioManager.enabled || !owner) return false;
    const state = this.state(owner);
    if(event==='attack')event=(state.attackIndex=(state.attackIndex||0)+1)%2?'attack':'attack_alt';
    const cue = bank.cues[event==='escape'?'presence':event];
    if (!cue) return false;
    const now = performance.now();
    if (state.dead || now < (state.last[mixEvent] || 0)) return false;
    state.last[mixEvent] = now + ({ warning: 450, attack: 160, break: 180, presence: 7000 }[mixEvent] || 1200);
    const ending = event === 'death' || event === 'escape';
    if (ending) { this.stopOwner(owner); state.dead = true; }
    const token = state.token, epoch = this.epoch;
    this.prepare(definition).then(buffer => {
      const context = AudioManager.context;
      if (!buffer || epoch !== this.epoch || token !== state.token || !AudioManager.enabled || context?.state !== 'running'
        || performance.now() - now > (event === 'arrival' ? 4000 : 900)) return;
      const priority = { death: 9, warning: 8, arrival: 7, attack: 6, break: 5, escape: 4, presence: 2 }[mixEvent];
      if (this.voices.size >= 4) {
        const victim = [...this.voices].sort((a, b) => a.priority - b.priority)[0];
        if (victim.priority > priority) return;
        this.stopVoice(victim);
      }
      const source = context.createBufferSource(), gain = context.createGain(), pan = context.createStereoPanner();
      source.buffer = buffer; pan.pan.value = Math.max(-.45, Math.min(.45, (x - .5) * .9));
      source.connect(gain); gain.connect(pan); pan.connect(context.destination);
      const voice = { source, gain, pan, owner: ending ? null : owner, priority, event,
        volume: { presence: .52, warning: .94, attack: .9, break: .75, arrival: .9, death: 1, escape: .55 }[mixEvent] };
      this.voices.add(voice); source.onended = () => this.release(voice);
      // This bus never ducks music, reserves global SFX priority, or mutes
      // dialogue. Only its own four source voices compete for room in the mix.
      this.refresh(); source.start(0, cue.offset, cue.duration);
    });
    return true;
  }
  refresh() {
    if (AudioManager.inMenu) { this.stopAll(); return; }
    AudioManager.applyActiveVoiceVolumes();
    for (const voice of this.voices) voice.gain.gain.value = AudioManager.enabled
      ? AudioManager.masterVolume * AudioManager.sfxVolume * voice.volume
        * (voice.event === 'presence' && [...this.voices].some(v => v.priority >= 7) ? .35 : 1) : 0;
    if (this.voices.size && !this.frame)
      this.frame = requestAnimationFrame(() => { this.frame = 0; this.refresh(); });
  }
  release(voice) { if (!this.voices.delete(voice)) return; voice.source.disconnect(); voice.gain.disconnect(); voice.pan.disconnect(); }
  stopVoice(voice) { try { voice.source.stop(); } catch {} this.release(voice); }
  stopOwner(owner) { this.state(owner).token++; for (const voice of [...this.voices]) if (voice.owner === owner) this.stopVoice(voice); }
  stopAll({ unload = false } = {}) {

    this.epoch++; for (const voice of [...this.voices]) this.stopVoice(voice);
    if (this.frame) cancelAnimationFrame(this.frame); this.frame = 0;
    if (unload) { for (const row of this.cache.values()) row.controller.abort(); this.cache.clear(); }
  }
  diagnostics() { return { cached: this.cache.size, voices: this.voices.size, bytes: [...this.cache.values()].reduce((sum, row) => sum + row.bytes, 0) }; }
}
export const MysteryAudio = new MysteryAudioBus();
