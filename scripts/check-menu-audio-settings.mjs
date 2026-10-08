import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { HANGAR_TRACK_SRC, HangarAmbience } from '../src/audio/HangarAmbience.js';
import { getMenuAudioSourceText } from '../src/i18n/menuAudioText.js';

const expectedHash = '89c9972a5dfcc0bd2f62e8a3485798684b67c6f2dcb203d9f4a583b36887defd';
const publicTrack = path.resolve('public', HANGAR_TRACK_SRC.replace(/^\//, ''));
const track = readFileSync(publicTrack);

assert.ok(statSync(publicTrack).size > 2_000_000, 'Hangar Departure track is unexpectedly small');
assert.equal(createHash('sha256').update(track).digest('hex'), expectedHash, 'Hangar Departure asset changed');

const fetches = [];
const mediaSource = {
  connected: false,
  connect() { this.connected = true; },
  disconnect() {}
};
const gainParam = {
  value: 0,
  cancelScheduledValues() {},
  setValueAtTime(value) { this.value = value; },
  linearRampToValueAtTime(value) { this.value = value; },
  setTargetAtTime(value) { this.value = value; }
};
const output = { gain: gainParam, connect() {}, disconnect() {} };
const context = {
  currentTime: 1,
  destination: {},
  createGain: () => output,
  createMediaElementSource: () => mediaSource
};
const previousAudio = globalThis.Audio;
globalThis.Audio = class {
  constructor(src) {
    fetches.push(src);
    this.src = src;
    this.loop = false;
    this.paused = true;
    this.currentTime = 0;
    this.volume = 1;
  }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
};

try {
  const ambience = new HangarAmbience(context, () => 0.2);
  await ambience.start();
  assert.deepEqual(fetches, [HANGAR_TRACK_SRC]);
  assert.equal(ambience.audio.loop, true, 'Hangar track must loop');
  assert.equal(mediaSource.connected, true, 'Hangar track must reach the output bus');
  assert.equal(ambience.audio.paused, false, 'Hangar track must start');
  assert.equal(ambience.layers.length, 1, 'Only the replacement track should play in ambient mode');
  ambience.stop(0);
} finally {
  globalThis.Audio = previousAudio;
}

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value))
};
globalThis.Audio = class {
  constructor() { this.paused = true; this.currentTime = 0; this.volume = 1; this.src = ''; }
  addEventListener() {}
  pause() { this.paused = true; }
  play() { this.paused = false; return Promise.resolve(); }
};
const { AudioManager } = await import(`../src/audio/AudioManager.js?menu-audio-defaults=${Date.now()}`);
assert.equal(AudioManager.menuVoiceEnabled, false, 'Fresh profiles must default Menu Voices to off');
assert.equal(AudioManager.menuAudioMode, 'ambient', 'Fresh profiles must default to the Hangar track');

store.set('burt_menu_voice_enabled', 'true');
store.set('burt_menu_audio_mode', 'music');
AudioManager.loadPreferences();
assert.equal(AudioManager.menuVoiceEnabled, true, 'A saved Menu Voices choice must be preserved');
assert.equal(AudioManager.menuAudioMode, 'music', 'A saved Playlist choice must be preserved');

store.set('burt_menu_audio_mode', 'legacy');
AudioManager.loadPreferences();
assert.equal(AudioManager.menuAudioMode, 'legacy');
AudioManager.setMenuAudioMode('ambient');
assert.equal(store.get('burt_menu_audio_mode'), 'ambient');
for (const key of ['codex_open', 'codex_move', 'codex_back', 'menu_tick', 'menuMove']) {
  assert.equal(AudioManager.playSfx(key), false, `${key} must remain silent during repeated navigation`);
}
AudioManager.inMenu = true;
for (const key of ['ui_open', 'ui_close', 'ui_cancel']) {
  assert.equal(AudioManager.playSfx(key, { force: true }), false, `${key} must be silent in menus`);
}
AudioManager.inMenu = false;

for (const locale of ['en', 'de', 'es', 'pt-BR', 'ru', 'zh-CN', 'ja', 'ko']) {
  const labels = getMenuAudioSourceText(locale);
  assert.ok(labels['HANGAR TRACK'], `${locale} is missing HANGAR TRACK`);
  assert.ok(labels['LEGACY AMBIENCE'], `${locale} is missing LEGACY AMBIENCE`);
  assert.ok(labels.PLAYLIST, `${locale} is missing PLAYLIST`);
}

console.log(`[menu-audio-settings] PASS track=${HANGAR_TRACK_SRC} bytes=${track.length} freshMenuVoices=off`);
