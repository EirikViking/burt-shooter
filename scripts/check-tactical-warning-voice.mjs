import assert from 'node:assert/strict';
import { classifyVoiceEvent } from '../src/audio/VoicePolicy.js';

const played = [];
globalThis.Audio = class {
  constructor(src) { this.src = src; this.paused = true; this.ended = false; }
  addEventListener() {}
  play() { this.paused = false; played.push(this.src); return Promise.resolve(); }
  pause() { this.paused = true; }
};

const { AudioManager: audio } = await import('../src/audio/AudioManager.js');
Object.assign(audio, {
  enabled: true, inMenu: false, currentContext: 'gameplay',
  voiceEnabled: false, tacticalVoiceEnabled: true, menuVoiceEnabled: false,
  voiceDefaultTacticalOnly: false, masterVolume: 1, voiceVolume: 0.6
});
const options = { force: true, bypassEventCooldown: true, eventCooldownMs: 0, cooldownMs: 0 };
for (const event of ['mission_control_reinforcements_incoming', 'mission_control_boss_inbound']) {
  audio.stopAllVoices('independent_routing_case');
  assert.equal(classifyVoiceEvent(event).tacticalWarning, true);
  assert.equal(audio.playVoice(event, options), true, `${event} should play with ordinary Voice off`);
}
audio.stopAllVoices('independent_veilborn_case');
assert.equal(audio.playVoice('mystery_arrival_veilborn', { ...options, asset: '/audio/test-veilborn.mp3' }), true);
assert.equal(audio.playVoice('mission_control_powerup', options), false, 'optional voice stays muted');
audio.tacticalVoiceEnabled = false;
assert.equal(audio.playVoice('mission_control_reinforcements_incoming', options), false, 'explicit warning mute applies');
audio.tacticalVoiceEnabled = true;
audio.voiceVolume = 0;
assert.equal(audio.playVoice('mission_control_reinforcements_incoming', options), false, 'zero voice volume still mutes');
audio.voiceVolume = 0.6;
audio.inMenu = true;
audio.stopAllVoices('independent_audition_case');
audio.currentContext = 'menu';
assert.equal(audio.playAuditionCue('voice'), true, 'Voice test plays despite ordinary and menu voices being off');
assert.equal(played.length, 4);
console.log('[tactical-warning-voice] PASS warning and Veilborn routing, independent mute, volume, audition');
