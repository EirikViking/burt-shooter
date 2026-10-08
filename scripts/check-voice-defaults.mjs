import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value))
};
globalThis.Audio = class { addEventListener() {} };
globalThis.window = {
  AudioContext: class { state = 'running'; },
  addEventListener() {}
};

const { AudioManager } = await import('../src/audio/AudioManager.js');
AudioManager.init();
assert.equal(AudioManager.voiceEnabled, false, 'ordinary voices must default off');
assert.equal(AudioManager.tacticalVoiceEnabled, true, 'tactical warnings must default on');
assert.equal(AudioManager.voiceDefaultTacticalOnly, true);
assert.equal(AudioManager.menuVoiceEnabled, false);
assert.equal(AudioManager.ctaVoiceEnabled, false);
assert.equal(AudioManager.bossVoiceEnabled, false);

values.set('burt_voice_enabled', 'true');
values.set('burt_menu_voice_enabled', 'true');
values.set('burt_cta_voice_enabled', 'true');
values.set('burt_boss_voice_enabled', 'true');
AudioManager._initialized = false;
AudioManager.init();
assert.equal(AudioManager.voiceEnabled, true, 'existing voice preference must survive');
assert.equal(AudioManager.voiceDefaultTacticalOnly, false);
assert.equal(AudioManager.menuVoiceEnabled, true);
assert.equal(AudioManager.ctaVoiceEnabled, true);
assert.equal(AudioManager.bossVoiceEnabled, true);

values.clear();
AudioManager.loadPreferences();
assert.equal(AudioManager.voiceEnabled, false, 'ordinary voices must stay off after a profile switch');
assert.equal(AudioManager.voiceDefaultTacticalOnly, true);
assert.equal(AudioManager.menuVoiceEnabled, false);
assert.equal(AudioManager.ctaVoiceEnabled, false);
assert.equal(AudioManager.bossVoiceEnabled, false);

values.set('burt_voice_enabled', 'false');
values.set('burt_boss_voice_enabled', 'false');
AudioManager.loadPreferences();
assert.equal(AudioManager.voiceEnabled, false, 'explicit voice-off remains off');
assert.equal(AudioManager.bossVoiceEnabled, false, 'explicit boss voice-off remains off');
assert.equal(AudioManager.tacticalVoiceEnabled, true, 'turning off other voices must preserve warnings');
values.set('nova_audio_tactical_announcer_enabled', 'false');
AudioManager.loadPreferences();
assert.equal(AudioManager.tacticalVoiceEnabled, false, 'explicit tactical warning mute must persist');

console.log('[voice-defaults] PASS');
