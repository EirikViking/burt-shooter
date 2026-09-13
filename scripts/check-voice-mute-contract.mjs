import assert from 'node:assert/strict';

const createdAudio = [];

globalThis.Audio = class {
  constructor(src = '') {
    this.src = src;
    this.preload = '';
    this.volume = 1;
    this.paused = true;
    this.ended = false;
    createdAudio.push(this);
  }

  addEventListener() {}

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
};

const { AudioManager } = await import('../src/audio/AudioManager.js');

AudioManager.enabled = true;
AudioManager.masterVolume = 1;
AudioManager.sfxVolume = 0.9;
AudioManager.voiceVolume = 0.25;
AudioManager.voiceEnabled = false;

assert.equal(
  AudioManager.playDiegeticVoice('level_clear_flirt', {
    force: true,
    bypassGlobalCooldown: true,
    bypassEventCooldown: true
  }),
  false,
  'diegetic voices must obey the global Voice switch'
);
assert.equal(AudioManager.activeVoices.size, 0);

AudioManager.voiceEnabled = true;
AudioManager.voiceVolume = 0;
assert.equal(
  AudioManager.playDiegeticVoice('level_clear_flirt', {
    force: true,
    bypassGlobalCooldown: true,
    bypassEventCooldown: true
  }),
  false,
  'diegetic voices must obey zero Voice volume'
);
assert.equal(AudioManager.lastVoiceSuppression?.reason, 'voice_muted');

AudioManager.voiceVolume = 0.25;
assert.equal(
  AudioManager.playDiegeticVoice('level_clear_flirt', {
    force: true,
    bypassGlobalCooldown: true,
    bypassEventCooldown: true,
    eventCooldownMs: 0,
    cooldownMs: 0,
    volume: 0.8
  }),
  true,
  'enabled diegetic voice should still play'
);

const activeEntry = Array.from(AudioManager.activeVoices.values())[0];
assert.equal(activeEntry?.volumeBus, 'voice');
assert.equal(activeEntry?.audio?.volume, 0.2, 'diegetic voice must use Voice volume, not SFX volume');

AudioManager.setVolume('voice', 0.1);
assert.ok(
  Math.abs(activeEntry.audio.volume - 0.08) < Number.EPSILON * 2,
  'active voice should follow Voice volume changes'
);

AudioManager.setVolume('voice', 0);
assert.equal(activeEntry.audio.paused, true, 'zero Voice volume should stop an active voice immediately');
assert.equal(AudioManager.activeVoices.size, 0);

AudioManager.voiceVolume = 0.25;
assert.equal(
  AudioManager.playDiegeticVoice('boss_death_agony', {
    force: true,
    bypassGlobalCooldown: true,
    bypassEventCooldown: true,
    eventCooldownMs: 0,
    cooldownMs: 0
  }),
  true
);
const bossVoice = Array.from(AudioManager.activeVoices.values())[0]?.audio;
AudioManager.setVoiceEnabled(false);
assert.equal(bossVoice?.paused, true, 'turning Voice off should stop an active voice immediately');
assert.equal(AudioManager.activeVoices.size, 0);

console.log(`[voice-mute-contract] PASS audioInstances=${createdAudio.length}`);
