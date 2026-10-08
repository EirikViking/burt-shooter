// Independent deterministic regression harness. Reads application source; never edits it.
// Usage: node voice-regression.mjs [E:\path\to\runtime-copy | http://127.0.0.1:4877]
// Browser decoding/loudness are outside this fake-media harness.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const requestedSource = process.argv[2] || process.cwd();
const remote = /^http:\/\/(?:127\.0\.0\.1|localhost):4877\/?$/.test(requestedSource);
const sourceRoot = remote ? requestedSource.replace(/\/$/, '') : path.resolve(requestedSource);

const files = ['src/audio/AudioManager.js', 'src/audio/VoicePolicy.js', 'src/audio/MysteryAnnouncer.js', 'src/audio/MysteryAnnouncements.json', 'src/audio/SoundCatalog.js', 'src/scenes/PlayScene.js'];
const source = Object.fromEntries(await Promise.all(files.map(async name => {
  if (!remote) return [name, await fs.readFile(path.join(sourceRoot, name), 'utf8')];
  const response = await fetch(`${sourceRoot}/${name}?raw`);
  assert.equal(response.status, 200, `Could not read current runtime ${name}`);
  const body = await response.text();
  if (!body.startsWith('export default ')) return [name, body];
  const literal = body.split('\n')[0].replace(/^export default /, '').replace(/;\s*$/, '');
  return [name, JSON.parse(literal)];
})));
const hashes = Object.fromEntries(files.map(name => [name, createHash('sha256').update(source[name]).digest('hex')]));
const stripModule = text => text.replace(/^import\s[\s\S]*?;\s*$/gm, '').replace(/^export\s+/gm, '');
const catalogConst = name => {
  const text = source['src/audio/SoundCatalog.js'];
  const start = text.indexOf(`export const ${name} = `);
  assert.ok(start >= 0, `Missing ${name}`);
  const end = text.indexOf('\n};', start);
  assert.ok(end > start, `Unrecognized ${name} shape`);
  return text.slice(start, end + 3).replace('export ', '');
};
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

function harness() {
  let now = 1_000_000;
  const timers = new Map();
  let timerId = 0;
  const media = [];
  const logs = [];
  const behavior = { next: 'resolve' };
  let maximumConcurrent = 0;
  const activeMedia = () => media.filter(audio => audio.playCalls && (!audio.paused || audio.pending));
  const observe = () => { maximumConcurrent = Math.max(maximumConcurrent, activeMedia().length); };
  class FakeAudio {
    constructor(src = '') {
      this.src = src; this.paused = true; this.ended = false; this.currentTime = 0;
      this.duration = 10; this.volume = 1; this.listeners = new Map(); this.playCalls = 0;
      this.pending = false; media.push(this);
    }
    addEventListener(type, fn, options = {}) {
      const list = this.listeners.get(type) || [];
      list.push({ fn, once: options.once === true }); this.listeners.set(type, list);
    }
    removeEventListener(type, fn) {
      this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item.fn !== fn));
    }
    play() {
      this.playCalls++; this.ended = false;
      const mode = behavior.next; behavior.next = 'resolve';
      if (mode === 'pending') {
        this.pending = true;
        this.promise = new Promise((resolve, reject) => { this.resolvePlay = resolve; this.rejectPlay = reject; });
      } else if (mode === 'reject') {
        this.promise = Promise.reject(Object.assign(new Error('decode failed'), { name: 'NotSupportedError' }));
      } else {
        this.paused = false; this.promise = Promise.resolve();
      }
      observe(); return this.promise;
    }
    pause() { this.paused = true; this.pending = false; }
    resolvePending() {
      if (this.pending) { this.pending = false; this.paused = false; observe(); }
      this.resolvePlay?.();
    }
    rejectPending() {
      this.pending = false; this.paused = true;
      this.rejectPlay?.(Object.assign(new Error('play interrupted'), { name: 'AbortError' }));
    }
    emit(type) {
      if (type === 'ended' || type === 'error') { this.paused = true; this.pending = false; }
      if (type === 'ended') this.ended = true;
      for (const item of [...(this.listeners.get(type) || [])]) {
        if (item.once) this.removeEventListener(type, item.fn);
        item.fn({ type, target: this });
      }
    }
  }
  class FakeDate extends Date { static now() { return now; } }
  const context = vm.createContext({
    console: Object.fromEntries(['log', 'warn', 'error'].map(kind => [kind, (...args) => logs.push({ kind, args: args.map(String) })])),
    Audio: FakeAudio, Date: FakeDate, URL, URLSearchParams, queueMicrotask,
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, at: now + ms }); return id; },
    clearTimeout: id => timers.delete(id),
    setInterval: () => { throw new Error('Unexpected interval in voice test'); }, clearInterval: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    Features: { AUDIO_ENABLED: true, MUSIC_ENABLED: true, VOICE_ENABLED: true },
    AssetManifest: { audio: { voice: [], sfx: [], music: [] } }, BUILD_ID: 'independent-voice-regression',
    HANGAR_TRACK_SRC: '', HangarAmbience: class {}, LegacyHangarAmbience: class {},
    normalizeMusicPack: value => value, getMusicPlaylists: () => ({}),
    ELITE_EXPANSION_SFX_MIX: {}, MENU_BOSS_BARK_EVENT_IDS: [], TACTICAL_BOSS_BANTER_EVENT_IDS: [],
    lines: JSON.parse(source['src/audio/MysteryAnnouncements.json'])
  });
  vm.runInContext(stripModule(source['src/audio/VoicePolicy.js']), context, { filename: 'VoicePolicy.js' });
  vm.runInContext(`${catalogConst('SFX_MIX')}\n${catalogConst('VOICE_MIX')}\nconst VOICE_EVENT_FALLBACKS = {};\nconst SFX_CATALOG = Object.fromEntries([...Object.keys(VOICE_MIX), 'alpha', 'beta', 'gamma', 'trait_wing_hit', 'shoot_small'].map(key => [key, [key + '.mp3']]));`, context, { filename: 'SoundCatalog.mix.js' });
  vm.runInContext(stripModule(source['src/audio/AudioManager.js']) + '\nglobalThis.manager = AudioManager; globalThis.mix = SFX_MIX;', context, { filename: 'AudioManager.js' });
  vm.runInContext(stripModule(source['src/audio/MysteryAnnouncer.js']) + '\nglobalThis.mysteryApi = {requestMysteryAnnouncement, updateMysteryAnnouncement, cancelMysteryAnnouncement};', context, { filename: 'MysteryAnnouncer.js' });
  const a = context.manager;
  Object.assign(a, { enabled: true, voiceEnabled: true, tacticalVoiceEnabled: true, voiceDefaultTacticalOnly: false, menuVoiceEnabled: true, masterVolume: 1, voiceVolume: 1, sfxVolume: 1, uiVolume: 1, chatterFrequency: 'full' });
  a.duckMusic = () => {};
  a.handleVoicePlayFailure = (...args) => logs.push({ kind: 'playFailure', args: args.map(String) });
  return {
    a, media, behavior, logs, context,
    tick(ms) { now += ms; },
    get now() { return now; },
    get maximumConcurrent() { return maximumConcurrent; },
    activeMedia,
    play(event, options = {}) { return a.playVoice(event, { cooldownMs: 0, eventCooldownMs: 0, duckMusic: false, ...options }); },
    only() { assert.equal(a.activeVoices.size, 1); return [...a.activeVoices.values()][0]; },
    invariant() { assert.ok(activeMedia().length <= 1, `Concurrent media: ${activeMedia().map(item => item.src).join(', ')}`); assert.ok(a.activeVoices.size <= 1, `Active voices: ${a.activeVoices.size}`); assert.ok(maximumConcurrent <= 1, `Peak simultaneous media: ${maximumConcurrent}`); }
  };
}

const cases = [];
const test = (name, fn) => cases.push({ name, fn });

test('cross-group force and cooldown bypass never overlap', () => {
  const h = harness(); assert.equal(h.play('mission_control_launch'), true);
  h.play('level_clear_flirt', { force: true, bypassGlobalCooldown: true, bypassEventCooldown: true, exclusiveGroup: 'level_clear_flirt', voicePriority: 10 });
  h.invariant();
});
test('pending play promise participates in admission', async () => {
  const h = harness(); h.behavior.next = 'pending';
  assert.equal(h.play('alpha', { exclusiveGroup: 'a' }), true); const first = h.only().audio;
  h.play('beta', { force: true, bypassGlobalCooldown: true, exclusiveGroup: 'b' }); h.invariant();
  first.resolvePending(); await flush(); h.invariant();
});
test('tactical warning beats numerically higher chatter', () => {
  const h = harness(); assert.equal(h.play('level_clear_flirt', { voicePriority: 10, exclusiveGroup: 'flirt' }), true);
  const first = h.only().audio;
  assert.equal(h.play('mission_control_reinforcements_incoming', { voicePriority: 7 }), true);
  assert.equal(first.paused, true); assert.equal(h.only().eventName, 'mission_control_reinforcements_incoming'); h.invariant();
});
test('ordinary force cannot interrupt tactical warning', () => {
  const h = harness(); assert.equal(h.play('mission_control_reinforcements_incoming', { voicePriority: 7 }), true);
  h.play('level_clear_flirt', { force: true, voicePriority: 10, exclusiveGroup: 'flirt' });
  assert.equal(h.only().eventName, 'mission_control_reinforcements_incoming'); h.invariant();
});
test('higher warning replaces lower; lower warning cannot replace higher', () => {
  const h = harness(); h.play('mission_control_reinforcements_incoming', { voicePriority: 7 });
  assert.equal(h.play('boss_rare_chaos_visitor_warning', { voicePriority: 9, exclusiveGroup: 'boss_voice' }), true);
  h.play('mission_control_reinforcements_incoming', { voicePriority: 7, force: true });
  assert.equal(h.only().eventName, 'boss_rare_chaos_visitor_warning'); h.invariant();
});
for (const terminal of ['ended', 'error', 'reject', 'groupStop', 'allStop']) {
  test(`${terminal}: terminal callback exactly once, including late events`, async () => {
    const h = harness(); let completions = 0;
    if (terminal === 'reject' || terminal === 'groupStop' || terminal === 'allStop') h.behavior.next = 'pending';
    assert.equal(h.play('alpha', { exclusiveGroup: 'test', onEnd: () => completions++ }), true);
    const media = h.only().audio;
    if (terminal === 'groupStop') h.a.stopVoiceGroup('test');
    else if (terminal === 'allStop') h.a.stopAllVoices('regression');
    else if (terminal === 'reject') media.rejectPending();
    else media.emit(terminal);
    await flush(); assert.equal(completions, 1); assert.equal(h.a.activeVoices.size, 0); assert.equal(Object.keys(h.a.activeVoiceGroups).length, 0);
    media.emit('ended'); media.emit('error'); media.rejectPending(); await flush();
    assert.equal(completions, 1); h.invariant();
  });
}
test('Mystery cancellation uses completion once and permits the next announcement', async () => {
  const h = harness(); const id = Object.keys(h.context.lines)[0]; const api = h.context.mysteryApi;
  const request = api.requestMysteryAnnouncement(id); api.updateMysteryAnnouncement(request, .016);
  assert.equal(request.state, 'playing'); const entry = h.only(); const media = entry.audio;
  let finishes = 0;
  assert.equal(typeof entry.finish, 'function', 'Central entry.finish missing');
  const originalFinish = entry.finish; entry.finish = (...args) => { finishes++; return originalFinish(...args); };
  api.cancelMysteryAnnouncement(request); await flush();
  assert.equal(finishes, 1); assert.equal(request.state, 'complete'); assert.equal(h.a.activeVoices.size, 0);
  media.emit('ended'); media.emit('error'); await flush(); assert.equal(request.state, 'complete');
  const next = api.requestMysteryAnnouncement(Object.keys(h.context.lines)[1]); api.updateMysteryAnnouncement(next, .016);
  assert.equal(next.state, 'playing'); h.invariant();
});
test('protected 9400ms boss lock survives early natural completion', () => {
  const h = harness(); h.a.reserveVoiceLock('boss_death_agony', { durationMs: 9400, voicePriority: 100, force: true });
  h.play('boss_death_agony', { voicePriority: 100, exclusiveGroup: 'boss', exclusiveLockMs: 9400 });
  const media = h.only().audio; h.tick(1000); media.emit('ended');
  assert.equal(h.a.getActiveVoiceLock()?.eventName, 'boss_death_agony');
  assert.equal(h.play('boss_rare_chaos_visitor_warning', { force: true, voicePriority: 9 }), false);
  h.tick(8401); assert.equal(h.a.getActiveVoiceLock(), null); assert.equal(h.play('boss_rare_chaos_visitor_warning', { voicePriority: 9 }), true); h.invariant();
});
test('protected lock extends through longer actual playback', () => {
  const h = harness(); h.play('boss_death_agony', { voicePriority: 100, exclusiveLockMs: 9400 });
  h.tick(10000); assert.equal(h.play('mission_control_reinforcements_incoming', { voicePriority: 7, force: true }), false);
  assert.equal(h.only().eventName, 'boss_death_agony'); h.invariant();
});
test('throwing completion cannot leak voice ownership or prevent later speech', () => {
  const h = harness(); h.play('alpha', { onEnd: () => { throw new Error('callback explosion'); } });
  assert.doesNotThrow(() => h.only().audio.emit('ended')); assert.equal(h.a.activeVoices.size, 0);
  assert.equal(h.play('beta'), true); h.invariant();
});
test('replacement callback reentry cannot steal or overlap incoming warning', () => {
  const h = harness(); let reentry;
  h.play('level_clear_flirt', { exclusiveGroup: 'flirt', onEnd: () => { reentry = h.play('gamma', { force: true, stopOtherVoices: true, voicePriority: 999 }); } });
  assert.equal(h.play('mission_control_reinforcements_incoming', { voicePriority: 7 }), true);
  assert.equal(reentry, false); assert.equal(h.only().eventName, 'mission_control_reinforcements_incoming'); h.invariant();
});
test('natural completion clears ownership before callback starts a successor', () => {
  const h = harness(); let replacement;
  h.play('alpha', { onEnd: () => { assert.equal(h.a.activeVoices.size, 0); replacement = h.play('beta'); } });
  h.only().audio.emit('ended'); assert.equal(replacement, true); assert.equal(h.only().eventName, 'beta'); h.invariant();
});
test('missing asset does not stop current voice or reserve silence', () => {
  const h = harness(); h.play('alpha'); const current = h.only();
  assert.equal(h.play('missing_fixture_asset', { force: true, stopOtherVoices: true, voicePriority: 100, exclusiveLockMs: 9000 }), false);
  assert.equal(h.only(), current); assert.equal(current.audio.paused, false); assert.equal(h.a.getActiveVoiceLock(), null); h.invariant();
});
test('rate-limited request does not stop current voice or reserve silence', () => {
  const h = harness(); h.play('alpha'); const current = h.only(); h.a.lastCelebrationTime = h.now;
  assert.equal(h.play('mission_control_wave_clear', { stopOtherVoices: true, voicePriority: 100, exclusiveLockMs: 9000 }), false);
  assert.equal(h.only(), current); assert.equal(current.audio.paused, false); assert.equal(h.a.getActiveVoiceLock(), null); h.invariant();
});
test('same-group deliberate menu replacement remains possible', () => {
  const h = harness(); h.a.inMenu = true; h.a.currentContext = 'menu';
  assert.equal(h.play('alpha', { exclusiveGroup: 'boss_menu_bark', voicePriority: 2 }), true); const first = h.only().audio;
  assert.equal(h.play('beta', { exclusiveGroup: 'boss_menu_bark', voicePriority: 4, bypassVoiceLock: true, force: true }), true);
  assert.equal(first.paused, true); assert.equal(h.only().eventName, 'beta'); h.invariant();
});
test('wing-hit caller uses bounded catalog gain and interval', () => {
  const h = harness();
  const call = source['src/scenes/PlayScene.js'].match(/AudioManager\.playSfx\('trait_wing_hit'\s*(?:,\s*(\{[^;]*?\}))?\s*\);/);
  assert.ok(call, 'Wing-hit call not found');
  const options = call[1] ? vm.runInNewContext(`(${call[1]})`) : {};
  const mix = h.context.mix.trait_wing_hit;
  assert.ok(mix.volume <= .15, `Catalog gain is ${mix.volume}`); assert.ok(mix.minIntervalMs >= 350, `Interval is ${mix.minIntervalMs}`);
  assert.ok(!('volume' in options) || options.volume <= mix.volume, 'Caller overrides lower catalog gain');
  assert.equal(h.a.playSfx('trait_wing_hit', options), true); const first = h.media.at(-1); assert.ok(first.volume <= .15, `Actual gain is ${first.volume}`);
  first.emit('ended'); h.tick(120); assert.equal(h.a.playSfx('trait_wing_hit', options), false);
  h.tick(mix.minIntervalMs); assert.equal(h.a.playSfx('trait_wing_hit', options), true);
});

const results = [];
for (const item of cases) {
  try { await item.fn(); results.push({ name: item.name, pass: true }); console.log(`PASS ${item.name}`); }
  catch (error) { results.push({ name: item.name, pass: false, error: error.stack }); console.log(`FAIL ${item.name}\n  ${error.message}`); }
}
const report = { generatedAt: new Date().toISOString(), sourceRoot, hashes, media: 'deterministic fake HTMLAudioElement', pass: results.every(result => result.pass), passed: results.filter(result => result.pass).length, total: results.length, results };
await fs.writeFile(path.join(process.env.CHECK_OUTPUT_DIR || process.env.TEMP, 'voice-regression-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`RESULT ${report.passed}/${report.total}`);
process.exitCode = report.pass ? 0 : 1;
