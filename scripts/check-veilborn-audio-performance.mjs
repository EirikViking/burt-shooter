import fs from 'node:fs';
import assert from 'node:assert/strict';

const banks = JSON.parse(fs.readFileSync(new URL('../src/audio/MysterySoundBanks.json', import.meta.url)));
const original = fs.readFileSync(new URL('../src/audio/MysteryAudio.js', import.meta.url), 'utf8');
let clock = 10000, moduleId = 0;
Object.defineProperty(globalThis, 'performance', { value: { now: () => clock }, configurable: true });
const frames = new Map();
let frameId = 0;
globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
globalThis.cancelAnimationFrame = id => frames.delete(id);
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

class Param {
  constructor(value = 0) { this.value = value; this.events = []; }
  setValueAtTime(value, time) { this.events.push({ type: 'set', value, time }); return this; }
  linearRampToValueAtTime(value, time) { this.events.push({ type: 'ramp', value, time }); return this; }
  cancelScheduledValues(time) { this.events = this.events.filter(event => event.time < time); return this; }
}
class Node {
  constructor(context, kind) {
    this.context = context; this.kind = kind; this.connections = new Set(); this.disconnected = false;
    for (const key of ['gain', 'frequency', 'Q', 'pan', 'playbackRate', 'threshold', 'knee', 'ratio', 'attack', 'release'])
      this[key] = new Param(key === 'gain' || key === 'playbackRate' ? 1 : 0);
    context.nodes.push(this);
  }
  connect(node) {
    if (this.context.failConnect || --this.context.connectUntilFailure === 0) {
      this.context.failConnect = false; throw Error('injected connect failure');
    }
    this.connections.add(node); return node;
  }
  disconnect() { this.connections.clear(); this.disconnected = true; }
  start(when = 0, offset = 0, duration) {
    if (this.context.failStart || --this.context.startsUntilFailure === 0) { this.context.failStart = false; throw Error('injected start failure'); }
    this.started = { when, offset, duration };
    this.end = Math.max(when, this.context.currentTime) + duration / this.playbackRate.value;
    this.context.peakSources = Math.max(this.context.peakSources, this.context.activeSources().length);
  }
  stop(when = 0) { if (when > this.context.currentTime) this.end = Math.min(this.end, when); else this.finish(); }
  finish() { if (this.ended) return; this.ended = true; this.onended?.(); }
}
class Context {
  constructor() { this.state = 'running'; this.currentTime = 0; this.nodes = []; this.destination = {}; this.peakSources = 0; }
  createBufferSource() { return new Node(this, 'source'); }
  createGain() { return new Node(this, 'gain'); }
  createStereoPanner() { return new Node(this, 'pan'); }
  createBiquadFilter() { return new Node(this, 'filter'); }
  createDynamicsCompressor() { return new Node(this, 'compressor'); }
  activeSources() { return this.nodes.filter(n => n.kind === 'source' && n.started && !n.ended); }
  async decodeAudioData() { return { duration: 20, length: 960000, numberOfChannels: 2 }; }
  advance(seconds) {
    this.currentTime += seconds; clock += seconds * 1000;
    for (const node of this.activeSources()) if (node.end <= this.currentTime) node.finish();
  }
}
async function fixture() {
  const context = new Context();
  const audio = globalThis.__veilbornAudio = { context, enabled: true, masterVolume: 1, sfxVolume: 1, inMenu: false,
    applyActiveVoiceVolumes() {}, duckMusic() { throw Error('global music mutation'); } };
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
  const source = original.replace("import { AudioManager } from './AudioManager.js';", 'const AudioManager = globalThis.__veilbornAudio;')
    .replace(/import banks from [^;]+;/, `const banks = ${JSON.stringify(banks)};`);
  const { MysteryAudio: bus } = await import(`data:text/javascript;base64,${Buffer.from(source + `\n// instance ${moduleId++}`).toString('base64')}`);
  return { bus, audio, context };
}
function paths(node, destination, seen = new Set()) {
  if (node === destination) return [[]];
  if (seen.has(node)) throw Error('feedback cycle in owned graph');
  return [...node.connections].flatMap(next => paths(next, destination, new Set([...seen, node])).map(path => [node, ...path]));
}
function clean(context) {
  assert.equal(context.activeSources().length, 0, 'no source survives teardown');
  assert.equal(context.nodes.filter(node => !node.disconnected).length, 0, 'every owned node is disconnected');
}
const tests = [];
const test = (name, run) => tests.push({ name, run });

test('all 56 identities shape existing samples with bounded pitch, EQ, dry onset and short reflections', async () => {
  const { bus, context } = await fixture();
  const identities = new Set();
  for (const id of Object.keys(banks)) {
    const before = context.nodes.length;
    assert.equal(bus.play({}, { id }, 'attack'), true);
    await tick();
    const nodes = context.nodes.slice(before), sources = context.activeSources();
    assert.equal(sources.length, 2, 'one dry source and one bounded stereo reflection');
    const dry = sources[0], reflection = sources[1];
    assert.equal(dry.started.when, context.currentTime, 'dry transient starts immediately');
    assert.ok(dry.playbackRate.value >= .85 && dry.playbackRate.value <= 1.15);
    assert.ok(reflection.started.when - dry.started.when >= .025 && reflection.started.when - dry.started.when <= .12);
    assert.equal(dry.started.duration, banks[id].cues.attack.duration, 'start duration remains source-time');
    assert.ok(nodes.some(n => n.kind === 'filter' && n.type === 'lowshelf'), 'body shaping exists');
    assert.ok(nodes.some(n => n.kind === 'filter' && n.type === 'peaking'), 'clarity shaping exists');
    identities.add(nodes.filter(n => n.kind === 'filter').map(n => `${n.type}:${n.frequency.value}:${n.gain.value}`).join(',') + dry.playbackRate.value);
    const envelope = paths(dry, context.destination)[0].find(n => n.kind === 'gain' && n.gain.events.length);
    assert.ok(envelope, 'sample has an onset/release envelope');
    const end = envelope.gain.events.at(-1);
    assert.equal(end.value, 0);
    assert.ok(Math.abs(end.time - (dry.started.when + dry.started.duration / dry.playbackRate.value)) < 1e-7, 'release ends in wall time after pitch change');
    bus.stopAll(); clean(context);
  }
  assert.equal(identities.size, 56, 'identities have distinct processing profiles');
});

test('warning remains immediate and four-voice priority bounds all owned branches', async () => {
  const { bus, context } = await fixture();
  for (let i = 0; i < 4; i++) { bus.play({}, { id: 'glass_widow' }, 'presence'); await tick(); }
  bus.play({}, { id: 'glass_widow' }, 'warning'); await tick();
  bus.play({}, { id: 'witness' }, 'death'); await tick();
  assert.equal(bus.diagnostics().voices, 4);
  assert.ok([...bus.voices].some(v => v.event === 'warning'));
  assert.ok([...bus.voices].some(v => v.event === 'death'));
  assert.ok(context.peakSources <= 8, 'physical sources never exceed eight, including preemption');
  assert.ok(context.nodes.filter(n => !n.disconnected).length <= 42, 'all branches and local bus stay within 42 nodes');
  const warning = [...bus.voices].find(v => v.event === 'warning');
  assert.equal(warning.source.playbackRate.value, 1, 'warning timing is not pitch shifted');
  bus.stopAll(); clean(context);
});

test('master/SFX/mute affect every dry and tail path exactly once, without changing global voice state', async () => {
  const { bus, context, audio } = await fixture();
  bus.play({}, { id: 'glass_widow' }, 'death'); await tick();
  const routes = context.activeSources().flatMap(source => paths(source, context.destination));
  const lastGains = routes.map(route => route.filter(node => node.kind === 'gain').at(-1));
  assert.equal(new Set(lastGains).size, 1, 'all branches share one final local volume control');
  const master = lastGains[0], initial = master.gain.value;
  assert.ok(initial > 0 && initial < 1, 'local bus reserves headroom');
  const otherGains = context.nodes.filter(n => n.kind === 'gain' && n !== master).map(n => [n, n.gain.value]);
  audio.masterVolume = .5; audio.sfxVolume = .5; bus.refresh();
  assert.equal(master.gain.value, initial * .25);
  for (const [node, value] of otherGains) assert.equal(node.gain.value, value, 'volume is not applied twice');
  audio.enabled = false; bus.refresh(); assert.equal(master.gain.value, 0, 'tails mute on the same refresh');
  assert.equal(audio.sfxPriorityLock, undefined); assert.equal(audio.mysteryVoiceDuckUntil, undefined);
  bus.stopAll(); clean(context);
});

test('normal ending survives without actor updates but explicit stopOwner kills its tail', async () => {
  const { bus, context } = await fixture(), owner = {};
  bus.play(owner, { id: 'glass_widow' }, 'death'); await tick();
  context.advance(.2); assert.ok(context.activeSources().length);
  bus.stopOwner(owner); clean(context);
});

test('reflection lifetime outlasts dry end and then releases its entire graph', async () => {
  const { bus, context } = await fixture();
  bus.play({}, { id: 'glass_widow' }, 'arrival'); await tick();
  const [dry, wet] = context.activeSources();
  assert.ok(wet && wet.end > dry.end);
  context.advance(dry.end + .001); assert.equal(bus.diagnostics().voices, 1);
  context.advance(.2); assert.equal(bus.diagnostics().voices, 0); clean(context);
});

test('late warning/attack loads and pre-warning attacks never emerge after their gameplay moment', async () => {
  for (const event of ['warning', 'attack']) {
    const { bus, context } = await fixture();
    let resolve;
    globalThis.fetch = () => new Promise(r => { resolve = r; });
    bus.play({}, { id: 'glass_widow' }, event);
    clock += 350;
    resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }); await tick();
    assert.equal(context.activeSources().length, 0, `${event} does not play 350 ms late`);
    bus.stopAll({ unload: true }); clean(context);
  }
  const { bus, context } = await fixture(), owner = {};
  let resolve;
  globalThis.fetch = () => new Promise(r => { resolve = r; });
  bus.play(owner, { id: 'glass_widow' }, 'attack');
  bus.play(owner, { id: 'glass_widow' }, 'warning');
  resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }); await tick();
  assert.deepEqual([...bus.voices].map(v => v.event), ['warning'], 'warning supersedes pending attack');
  bus.stopAll(); clean(context);
});

test('pause/unload/owner cancellation reject pending decodes and pending cache stays at three', async () => {
  for (const cancel of ['owner', 'pause', 'unload']) {
    const { bus, context } = await fixture(), owner = {};
    let resolve;
    globalThis.fetch = () => new Promise(r => { resolve = r; });
    bus.play(owner, { id: 'glass_widow' }, 'warning');
    if (cancel === 'owner') bus.stopOwner(owner); else bus.stopAll({ unload: cancel === 'unload' });
    resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }); await tick();
    assert.equal(context.activeSources().length, 0);
    bus.stopAll({ unload: true }); clean(context);
  }
  const { bus } = await fixture();
  let aborted = 0;
  globalThis.fetch = (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => { aborted++; reject(Object.assign(Error('aborted'), { name: 'AbortError' })); }));
  for (const id of Object.keys(banks).slice(0, 8)) { bus.prepare({ id }); assert.ok(bus.diagnostics().cached <= 3, 'pending banks obey lazy-cache cap'); }
  assert.equal(aborted, 5); bus.stopAll({ unload: true }); await tick(); assert.equal(bus.diagnostics().cached, 0);
});

test('an in-flight decode cannot revive audio after stopAll and unload', async () => {
  const { bus, context } = await fixture();
  let complete;
  context.decodeAudioData = () => new Promise(resolve => { complete = resolve; });
  bus.play({}, { id: 'glass_widow' }, 'arrival'); await tick();
  assert.equal(typeof complete, 'function');
  bus.stopAll({ unload: true });
  complete({ duration: 20, length: 960000, numberOfChannels: 2 }); await tick();
  assert.equal(bus.diagnostics().cached, 0); assert.equal(bus.diagnostics().voices, 0); clean(context);
});

test('low-priority cues cannot evict warnings and muted or suspended audio cannot start', async () => {
  const { bus, context, audio } = await fixture();
  for (let i = 0; i < 4; i++) { bus.play({}, { id: 'glass_widow' }, 'warning'); await tick(); }
  bus.play({}, { id: 'glass_widow' }, 'presence'); await tick();
  assert.equal(bus.diagnostics().voices, 4);
  assert.ok([...bus.voices].every(voice => voice.event === 'warning'));
  bus.stopAll();
  audio.enabled = false; assert.equal(bus.play({}, { id: 'glass_widow' }, 'attack'), false);
  audio.enabled = true; context.state = 'suspended'; bus.play({}, { id: 'glass_widow' }, 'attack'); await tick();
  clean(context);
});

test('partial graph failure cannot leak sources or nodes', async () => {
  const warn = console.warn;
  let handled = 0;
  console.warn = message => { assert.match(message, /injected (connect|start) failure/); handled++; };
  try {
    for (const [property, value] of [['failConnect', true], ['connectUntilFailure', 7], ['failStart', true], ['startsUntilFailure', 2]]) {
      const { bus, context } = await fixture(); context[property] = value;
      bus.play({}, { id: 'glass_widow' }, 'arrival'); await tick();
      assert.equal(bus.diagnostics().voices, 0); clean(context);
      bus.stopAll({ unload: true });
    }
    assert.equal(handled, 4, 'each injected construction/start failure was actually reached');
  } finally {
    console.warn = warn;
  }
});

let failed = 0;
for (const { name, run } of tests) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
}
assert.equal(failed, 0, `${failed} Veilborn audio contract checks failed`);
console.log('PASS actual audio bus: 56 identity profiles, <=4 voices / <=8 sources / <=42 nodes, cancellation and teardown. WebAudio boundary stubs; no listening or browser performance claim.');
