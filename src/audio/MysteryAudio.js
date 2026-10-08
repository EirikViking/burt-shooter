import { AudioManager } from './AudioManager.js';
import banks from './MysterySoundBanks.json' with { type: 'json' };

const PRIORITY = { death: 9, warning: 8, arrival: 7, attack: 6, break: 5, escape: 4, presence: 2 };
const LEVEL = { presence: .52, warning: .94, attack: .9, break: .75, arrival: .9, death: 1, escape: .55 };
const MAX_LATENCY = { warning: 180, attack: 220, break: 450, arrival: 4000 };
const TIMBRES = {
  predator: [.97, 190, 1.6, 2300, 1.1, .044],
  spatial: [1.02, 240, .6, 2900, 1.5, .079],
  ecosystem: [.95, 170, 1.9, 1900, .7, .061],
  machine: [.94, 145, 2.1, 2600, 1.3, .037],
  deceiver: [1.035, 260, .8, 3200, 1.4, .073],
  sculptor: [.965, 185, 1.8, 2400, 1.0, .053],
  temptation: [1.015, 220, 1.1, 3000, 1.2, .066],
  legend: [.925, 130, 2.3, 2100, 1.0, .087]
};
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function timbre(definition, event) {
  let hash = 2166136261;
  for (const character of definition.id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  const color = (hash >>> 0) / 4294967295;
  const grain = ((hash >>> 12) & 255) / 255;
  const [pitch, body, weight, clarity, edge, reflection] = TIMBRES[definition.family] || TIMBRES.spatial;
  return {
    rate: event === 'warning' ? 1 : pitch + (color - .5) * .065 + (event === 'attack_alt' ? .014 : 0),
    body: body + color * 55, weight: weight + grain * .35,
    clarity: clarity + grain * 480, edge: edge + color * .45,
    delay: reflection + grain * .012, wet: event === 'warning' ? 0 : .085 + color * .055,
    damping: 2700 + grain * 1500, side: hash & 1 ? 1 : -1,
    trim: .86 - weight * .025
  };
}

function envelope(parameter, start, duration, peak, event) {
  const onset = Math.min(event === 'warning' ? .002 : event.startsWith('attack') ? .004 : .018, duration * .1);
  const release = Math.min(event === 'death' ? .16 : .045, duration * .25);
  parameter.setValueAtTime(0, start);
  parameter.linearRampToValueAtTime(peak, start + onset);
  parameter.setValueAtTime(peak, start + duration - release);
  parameter.linearRampToValueAtTime(0, start + duration);
}

// Existing identity recordings only: four logical voices, at most eight sample
// sources and 42 owned nodes. Reflections have no feedback or synthesis.
class MysteryAudioBus {
  constructor() {
    this.cache = new Map(); this.voices = new Set(); this.owners = new WeakMap();
    this.epoch = 0; this.frame = 0; this.useOrder = 0; this.mix = null;
  }
  state(owner) {
    let state = this.owners.get(owner);
    if (!state) { state = { token: 0, last: {}, requests: new Map() }; this.owners.set(owner, state); }
    return state;
  }
  prepare(definition) {
    const id = definition?.id, bank = banks[id], context = AudioManager.context;
    if (!bank || !context) return Promise.resolve(null);
    let row = this.cache.get(id);
    if (row?.context !== context && row) { row.controller.abort(); this.cache.delete(id); row = null; }
    if (row) { row.used = ++this.useOrder; return row.promise; }
    while (this.cache.size >= 3) {
      const [key, victim] = [...this.cache.entries()].sort((a, b) => a[1].used - b[1].used)[0];
      victim.controller.abort(); this.cache.delete(key);
    }
    row = { used: ++this.useOrder, context, controller: new AbortController(), bytes: 0 };
    this.cache.set(id, row);
    row.promise = fetch(bank.url, { signal: row.controller.signal })
      .then(response => { if (!response.ok) throw Error(`HTTP ${response.status}`); return response.arrayBuffer(); })
      .then(data => this.cache.get(id) === row && !row.controller.signal.aborted ? context.decodeAudioData(data) : null).then(buffer => {
        if (!buffer || this.cache.get(id) !== row) return null;
        row.bytes = buffer.length * buffer.numberOfChannels * 4;
        return buffer;
      }).catch(error => {
        if (this.cache.get(id) === row) this.cache.delete(id);
        if (error.name !== 'AbortError') console.warn(`[MysteryAudio] ${id}: ${error.message}`);
        return null;
      });
    return row.promise;
  }
  play(owner, definition, event, { x = .5 } = {}) {
    const mixEvent = event.startsWith('motif_') || event === 'attack_alt' ? 'attack' : event;
    const bank = banks[definition?.id];
    if (!bank || !AudioManager.enabled || AudioManager.inMenu || !owner) return false;
    const state = this.state(owner);
    const now = performance.now();
    if (state.dead || now < (state.last[mixEvent] || 0)) return false;
    if (event === 'attack') event = (state.attackIndex = (state.attackIndex || 0) + 1) % 2 ? 'attack' : 'attack_alt';
    const cue = bank.cues[event === 'escape' ? 'presence' : event];
    if (!cue || PRIORITY[mixEvent] == null) return false;
    state.last[mixEvent] = now + ({ warning: 450, attack: 160, break: 180, presence: 7000 }[mixEvent] || 1200);
    const ending = event === 'death' || event === 'escape';
    if (ending) { this.stopOwner(owner); state.dead = true; }
    const token = state.token, epoch = this.epoch;
    const priority = PRIORITY[mixEvent], request = { priority };
    if (priority >= PRIORITY.warning)
      for (const [key, pending] of state.requests) if (pending.priority < priority) state.requests.delete(key);
    state.requests.set(mixEvent, request);
    this.prepare(definition).then(buffer => {
      const context = AudioManager.context;
      if (state.requests.get(mixEvent) !== request) return;
      state.requests.delete(mixEvent);
      if (!buffer || epoch !== this.epoch || token !== state.token || !AudioManager.enabled || AudioManager.inMenu || context?.state !== 'running'
        || performance.now() - now > (MAX_LATENCY[mixEvent] || 900)) return;
      if (this.voices.size >= 4) {
        const victim = [...this.voices].sort((a, b) => a.priority - b.priority)[0];
        if (victim.priority > priority) return;
        this.stopVoice(victim);
      }
      this.startVoice(context, buffer, cue, definition, event, mixEvent, owner, priority, x);
    });
    return true;
  }

  startVoice(context, buffer, cue, definition, event, mixEvent, owner, priority, x) {
    const duration = Math.min(cue.duration, buffer.duration - cue.offset);
    if (!(duration > 0)) return;
    const profile = timbre(definition, event);
    const voice = { owner, priority, event, nodes: [], sources: [], ended: new Set(), volume: LEVEL[mixEvent] * profile.trim };
    const own = node => { voice.nodes.push(node); return node; };
    try {
      if (this.mix && this.mix.context !== context) this.stopAll();
      if (!this.mix) {
        const mix = this.mix = { context, nodes: [] };
        const compressor = context.createDynamicsCompressor(); mix.nodes.push(compressor); mix.input = compressor;
        const master = context.createGain(); mix.nodes.push(master); mix.master = master;
        compressor.threshold.value = -14; compressor.knee.value = 12; compressor.ratio.value = 4;
        compressor.attack.value = .003; compressor.release.value = .12;
        compressor.connect(master); master.connect(context.destination);
      }
      voice.gain = own(context.createGain()); voice.gain.connect(this.mix.input);
      const source = voice.source = own(context.createBufferSource()); voice.sources.push(source);
      source.buffer = buffer; source.playbackRate.value = profile.rate;
      const body = own(context.createBiquadFilter()); body.type = 'lowshelf'; body.frequency.value = profile.body; body.gain.value = profile.weight;
      const clarity = own(context.createBiquadFilter()); clarity.type = 'peaking'; clarity.frequency.value = profile.clarity; clarity.Q.value = .75; clarity.gain.value = profile.edge;
      const dry = own(context.createGain()), pan = voice.pan = own(context.createStereoPanner());
      pan.pan.value = clamp((Number.isFinite(x) ? x - .5 : 0) * .9, -.45, .45);
      source.connect(body); body.connect(clarity); clarity.connect(dry); dry.connect(pan); pan.connect(voice.gain);
      const start = context.currentTime, wallDuration = duration / profile.rate;
      envelope(dry.gain, start, wallDuration, 1, event);
      if (profile.wet) {
        const reflection = own(context.createBufferSource()); voice.sources.push(reflection);
        reflection.buffer = buffer; reflection.playbackRate.value = profile.rate;
        const filter = own(context.createBiquadFilter()); filter.type = 'lowpass'; filter.frequency.value = profile.damping; filter.Q.value = .5;
        const wet = own(context.createGain()), side = own(context.createStereoPanner());
        side.pan.value = clamp(-pan.pan.value * .8 + profile.side * .24, -.65, .65);
        reflection.connect(filter); filter.connect(wet); wet.connect(side); side.connect(voice.gain);
        envelope(wet.gain, start + profile.delay, wallDuration, profile.wet, event);
      }
      for (const node of voice.sources) node.onended = () => {
        voice.ended.add(node);
        if (voice.ended.size === voice.sources.length) this.release(voice);
      };
      this.voices.add(voice); this.refresh();
      source.start(start, cue.offset, duration);
      voice.sources[1]?.start(start + profile.delay, cue.offset, duration);
    } catch (error) {
      this.stopVoice(voice);
      console.warn(`[MysteryAudio] ${definition.id}: ${error.message}`);
    }
  }

  refresh() {
    if (AudioManager.inMenu) { this.stopAll(); return; }
    // All dry/reflected paths cross this single local master, including ending
    // tails. No music, dialogue or global SFX priority is changed by this bus.
    if (this.mix?.master) this.mix.master.gain.value = AudioManager.enabled
      ? clamp(AudioManager.masterVolume, 0, 1) * clamp(AudioManager.sfxVolume, 0, 1) * .72 : 0;
    const foreground = [...this.voices].some(voice => voice.priority >= 7);
    for (const voice of this.voices) voice.gain.gain.value = voice.volume * (voice.event === 'presence' && foreground ? .35 : 1);
    if (this.voices.size && !this.frame)
      this.frame = requestAnimationFrame(() => { this.frame = 0; this.refresh(); });
  }
  release(voice) {
    if (voice.released) return;
    voice.released = true; this.voices.delete(voice);
    for (const source of voice.sources) source.onended = null;
    for (const node of voice.nodes) node.disconnect();
    if (!this.voices.size) {
      if (this.frame) cancelAnimationFrame(this.frame); this.frame = 0;
      for (const node of this.mix?.nodes || []) node.disconnect();
      this.mix = null;
    }
  }
  stopVoice(voice) {
    for (const source of voice.sources) { source.onended = null; try { source.stop(); } catch {} }
    this.release(voice);
  }
  stopOwner(owner) {
    const state = this.state(owner); state.token++; state.requests.clear();
    for (const voice of [...this.voices]) if (voice.owner === owner) this.stopVoice(voice);
  }
  stopAll({ unload = false } = {}) {

    this.epoch++; for (const voice of [...this.voices]) this.stopVoice(voice);
    if (this.frame) cancelAnimationFrame(this.frame); this.frame = 0;
    if (unload) { for (const row of this.cache.values()) row.controller.abort(); this.cache.clear(); }
  }
  diagnostics() {
    return { cached: this.cache.size, voices: this.voices.size,
      sources: [...this.voices].reduce((sum, voice) => sum + voice.sources.length - voice.ended.size, 0),
      nodes: [...this.voices].reduce((sum, voice) => sum + voice.nodes.length, this.mix?.nodes.length || 0),
      bytes: [...this.cache.values()].reduce((sum, row) => sum + row.bytes, 0) };
  }
}
export const MysteryAudio = new MysteryAudioBus();
