import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};
globalThis.window = {
  localStorage: globalThis.localStorage,
  matchMedia: () => ({ matches: false }),
  __novaSteamCloudDiagnostics: { sync() {} }
};
globalThis.Audio = class AudioMock {
  constructor() {
    this.volume = 1;
    this.paused = true;
    this.ended = false;
    this.currentTime = 0;
    this.readyState = 4;
    this.src = '';
  }
  addEventListener() {}
  removeEventListener() {}
  load() {}
  pause() { this.paused = true; }
  play() { this.paused = false; return Promise.resolve(); }
  cloneNode() { return new AudioMock(); }
};

const accessibility = await import('../src/config/AccessibilitySettings.js');
assert.equal(accessibility.setFlashIntensityScale(0.35), 0.35);
assert.equal(accessibility.setReducedMotionEnabled(true), true);
assert.equal(accessibility.getAccessibilitySettings().flashIntensity, 0.35);
assert.equal(accessibility.getAccessibilitySettings().reducedMotion, true);
assert.equal(accessibility.getAccessibilitySettings().prefersReducedMotion, true);
assert.equal(localStorage.getItem('nova_accessibility_flash_intensity'), '0.35');
assert.equal(localStorage.getItem('nova_accessibility_reduced_motion'), '1');

const { AudioManager } = await import('../src/audio/AudioManager.js');
AudioManager.enabled = true;
AudioManager.setVolume('master', 0.5);
AudioManager.setVolume('sfx', 0.8);
AudioManager.setVolume('ui', 0.25);
assert.equal(AudioManager.getSettings().uiVolume, 0.25);
assert.equal(localStorage.getItem('burt_volume_ui'), '0.25');

let lastAudio = null;
AudioManager.getSfxAudio = () => {
  lastAudio = new Audio();
  return lastAudio;
};
assert.equal(AudioManager.playSfx('ui_open', { force: true, volume: 1, minIntervalMs: 0 }), true);
assert.equal(AudioManager.getSettings().lastSfxBus, 'ui');
assert.equal(Number(lastAudio.volume.toFixed(3)), 0.125);
assert.equal(AudioManager.playSfx('hit', { force: true, volume: 1, minIntervalMs: 0 }), true);
assert.equal(AudioManager.getSettings().lastSfxBus, 'sfx');
assert.equal(Number(lastAudio.volume.toFixed(3)), 0.4);

console.log('[footage-polish-accessibility] PASS persisted flash/reduced-motion controls and independent UI audio bus');
