import assert from 'node:assert/strict';

globalThis.Audio = class { addEventListener() {} };
globalThis.window = { location: { origin: 'http://localhost', search: '' } };
const { GameOverScene } = await import('../src/scenes/GameOverScene.js');
const { AudioManager } = await import('../src/audio/AudioManager.js');

for (const voiceEnabled of [false, true]) {
  const events = [];
  const timers = [];
  AudioManager.stopMusic = () => events.push('stop');
  AudioManager.playMusicContext = () => events.push('music');
  AudioManager.playSfx = key => events.push(key);
  AudioManager.playVoice = key => { events.push(key); return voiceEnabled; };
  const scene = {
    game: { runMode: 'overrun_tactical' },
    confirmedOnslaughtPlacement: { qualified: true },
    isSteamBestUnchangedResult: () => false,
    isSceneActive: () => true,
    qualificationFanfarePlayed: false,
    globalPlacement: { numberOne: true },
    scheduleSceneTimeout: (callback, delayMs) => timers.push({ callback, delayMs })
  };
  GameOverScene.prototype.playGlobalQualificationFanfare.call(scene);
  assert.deepEqual(events, ['stop', 'nova_number_one_fanfare']);
  assert.equal(timers[0].delayMs, 10000);
  timers.shift().callback();
  assert.equal(events[2], 'mission_control_number_one_highscore');
  assert.equal(timers[0].delayMs, voiceEnabled ? 3300 : 0);
  timers.shift().callback();
  assert.equal(events[3], 'music');
  GameOverScene.prototype.playGlobalQualificationFanfare.call(scene);
  assert.equal(events.length, 4, 're-entering the result must not replay the celebration');
}

console.log('[onslaught-fanfare-sequence] PASS isolated fanfare, optional voice, then music');
