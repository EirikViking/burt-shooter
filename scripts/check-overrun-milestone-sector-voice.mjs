import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, VOICE_EVENT_FALLBACKS, VOICE_MIX } from '../src/audio/SoundCatalog.js';
import { getOverrunMilestoneCelebration, resolveOverrunMilestoneVoiceCue } from '../src/config/OverrunMilestoneCelebrations.js';

const expected = [
  { sector: 10, eventKind: 'run_clear', voiceCue: 'mission_control_overrun_clear_sector_10', file: 'mission_control_overrun_clear_sector_10_01.mp3' },
  { sector: 20, eventKind: 'overrun_milestone', voiceCue: 'mission_control_overrun_clear_sector_20', file: 'mission_control_overrun_clear_sector_20_01.mp3' },
  { sector: 30, eventKind: 'overrun_milestone', voiceCue: 'mission_control_overrun_clear_sector_30', file: 'mission_control_overrun_clear_sector_30_01.mp3' },
  { sector: 40, eventKind: 'overrun_milestone', voiceCue: 'mission_control_overrun_clear_sector_40', file: 'mission_control_overrun_clear_sector_40_01.mp3' },
  { sector: 50, eventKind: 'overrun_milestone', voiceCue: 'mission_control_overrun_clear_sector_50', file: 'mission_control_overrun_clear_sector_50_01.mp3' },
  { sector: 60, eventKind: 'overrun_milestone', voiceCue: 'mission_control_overrun_clear_far_signal', file: 'mission_control_overrun_clear_far_signal_01.mp3' }
];

for (const item of expected) {
  const celebration = getOverrunMilestoneCelebration({
    milestoneSector: item.sector,
    eventKind: item.eventKind
  });
  assert.equal(celebration.voiceCue, item.voiceCue, `sector ${item.sector} should use ${item.voiceCue}`);
  assert.equal(resolveOverrunMilestoneVoiceCue({
    milestoneSector: item.sector,
    eventKind: item.eventKind,
    celebration
  }), item.voiceCue, `sector ${item.sector} resolver should use ${item.voiceCue}`);
  assert.notEqual(item.voiceCue, 'mission_control_overrun_clear', `sector ${item.sector} should not reuse the old sector-10 cue`);
  assert.ok(VOICE_MIX[item.voiceCue], `${item.voiceCue} missing VOICE_MIX`);
  assert.equal(VOICE_EVENT_FALLBACKS[item.voiceCue], item.file, `${item.voiceCue} fallback mismatch`);
  const urls = SFX_CATALOG[item.voiceCue] || [];
  assert.equal(urls.length, 1, `${item.voiceCue} should have one explicit sector voice asset`);
  assert.ok(urls[0].endsWith(`/${item.file}`), `${item.voiceCue} should resolve ${item.file}`);
  assert.ok(AssetManifest.audio.voice.includes(urls[0]), `${item.file} missing from manifest`);
  assert.ok(existsSync(`public${urls[0]}`), `${item.file} missing on disk`);
}

for (const sector of [20, 30, 40, 50, 60]) {
  assert.equal(resolveOverrunMilestoneVoiceCue({
    milestoneSector: sector,
    eventKind: 'overrun_milestone',
    celebration: null
  }), 'mission_control_overrun_clear_far_signal', `sector ${sector} missing celebration should use far-signal fallback`);
  assert.equal(resolveOverrunMilestoneVoiceCue({
    milestoneSector: sector,
    eventKind: 'overrun_milestone',
    celebration: { voiceCue: 'mission_control_overrun_clear' }
  }), 'mission_control_overrun_clear_far_signal', `sector ${sector} old generic cue should be blocked`);
  assert.equal(resolveOverrunMilestoneVoiceCue({
    milestoneSector: sector,
    eventKind: 'overrun_milestone',
    celebration: { voiceCue: 'mission_control_overrun_clear_sector_10' }
  }), 'mission_control_overrun_clear_far_signal', `sector ${sector} sector-10 cue should be blocked`);
}

const playSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
assert.match(playSource, /resolveOverrunMilestoneVoiceCue\(\{ milestoneSector, eventKind, celebration \}\)/);
assert.match(playSource, /AudioManager\.playVoice\(voiceCue,/);
assert.doesNotMatch(playSource, /AudioManager\.playVoice\('mission_control_overrun_clear'/);

console.log('[overrun-milestone-sector-voice] PASS sector 10/20/30/40/50/fallback milestones use sector-aware voice cues');
