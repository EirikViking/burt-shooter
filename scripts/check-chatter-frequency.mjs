import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CHATTER_FREQUENCY_KEY,
  CHATTER_FREQUENCY_OPTIONS,
  classifyVoiceEvent,
  getChatterFrequencyLabel,
  normalizeChatterFrequency,
  shouldPlayChatterRequest
} from '../src/audio/VoicePolicy.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

assert.equal(CHATTER_FREQUENCY_KEY, 'nova_audio_chatter_frequency');
assert.deepEqual(CHATTER_FREQUENCY_OPTIONS, ['full', 'reduced', 'minimal']);
assert.equal(normalizeChatterFrequency('REDUCED'), 'reduced');
assert.equal(normalizeChatterFrequency('unknown'), 'full');
assert.equal(getChatterFrequencyLabel('minimal'), 'Minimal');

for (const eventName of [
  'game_over_taunt',
  'level_clear_flirt',
  'mission_control_powerup',
  'boss_menu_bark_behemoth',
  'boss_tactical_inspect_warden',
  'one_more_run_01'
]) {
  assert.equal(classifyVoiceEvent(eventName).category, 'chatter', `${eventName} must be reducible chatter`);
}

for (const eventName of [
  'mission_control_boss_inbound',
  'mission_control_support_inbound',
  'mission_control_sector_50',
  'boss_death_agony',
  'mission_control_life_low',
  'future_critical_event'
]) {
  assert.equal(classifyVoiceEvent(eventName).category, 'critical', `${eventName} must always be critical`);
}

assert.deepEqual(Array.from({ length: 6 }, (_, sequence) => shouldPlayChatterRequest('full', sequence)),
  [true, true, true, true, true, true]);
assert.deepEqual(Array.from({ length: 6 }, (_, sequence) => shouldPlayChatterRequest('reduced', sequence)),
  [true, false, true, false, true, false]);
assert.deepEqual(Array.from({ length: 8 }, (_, sequence) => shouldPlayChatterRequest('minimal', sequence)),
  [true, false, false, false, true, false, false, false]);

const audioSource = read('../src/audio/AudioManager.js');
const settingsSource = read('../src/ui/SettingsOverlay.js');
const cloudSource = read('../src/steamCloudPersistence.js');

const muteGate = audioSource.indexOf('if (!this.voiceEnabled && options.ignoreVoiceEnabled !== true) return false;');
const policyGate = audioSource.indexOf('const classification = classifyVoiceEvent(eventName);');
const forceGate = audioSource.indexOf('const force = options.force === true;', policyGate);
assert.ok(muteGate >= 0 && policyGate > muteGate, 'voice mute must remain authoritative before chatter policy');
assert.ok(forceGate > policyGate, 'force must not bypass the chatter policy');
for (const token of [
  'setChatterFrequency(value)',
  "recordVoiceSuppression(eventName, 'chatter_frequency'",
  'localStorage.setItem(CHATTER_FREQUENCY_KEY, this.chatterFrequency)'
]) {
  assert.ok(audioSource.includes(token), `AudioManager missing chatter contract: ${token}`);
}
for (const token of [
  "addChatterFrequencyRow('Chatter Frequency'",
  'CHATTER_FREQUENCY_OPTIONS',
  'Only non-critical chatter is reduced. Boss warnings and mission updates always play.'
]) {
  assert.ok(settingsSource.includes(token), `Settings missing chatter contract: ${token}`);
}
for (const token of ['chatterFrequency: CHATTER_FREQUENCY_KEY', 'audio.chatterFrequency', 'normalizeChatterFrequency']) {
  assert.ok(cloudSource.includes(token), `Steam Cloud missing chatter contract: ${token}`);
}

for (const localePath of ['de.js', 'es.js', 'ja.js', 'ko.js', 'pt-BR.js', 'ru.js', 'zh-CN.js']) {
  const locale = read(`../src/i18n/locales/${localePath}`);
  for (const key of [
    'Chatter Frequency',
    'Full',
    'Reduced',
    'Minimal',
    'Only non-critical chatter is reduced. Boss warnings and mission updates always play.'
  ]) {
    assert.ok(locale.includes(`'${key}':`), `${localePath} missing ${key}`);
  }
}

console.log('[chatter-frequency] PASS critical warnings protected, chatter throttled, settings/cloud/locales wired');
