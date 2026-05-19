import fs from 'node:fs';
import path from 'node:path';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, VOICE_MIX } from '../src/audio/SoundCatalog.js';

const rootDir = process.cwd();
const errors = [];

const requiredPools = {
  mission_control_launch: 3,
  mission_control_level_start: 3,
  mission_control_wave_clear: 3,
  mission_control_boss_inbound: 3,
  mission_control_life_low: 3,
  mission_control_powerup: 3,
  mission_control_victory: 3,
  mission_control_game_over: 3,
  mission_control_combo: 3,
  mission_control_local_highscore: 2,
  mission_control_global_highscore: 2,
  mission_control_personal_best: 2,
  mission_control_restart: 2,
  mission_control_hijacker: 2,
  mission_control_tractor_hijack: 3
};

function publicPath(url) {
  return path.join(rootDir, 'public', String(url).replace(/^\//, ''));
}

for (const [eventName, minimum] of Object.entries(requiredPools)) {
  const urls = (SFX_CATALOG[eventName] || []).filter(Boolean);
  if (urls.length < minimum) {
    errors.push(`${eventName} needs at least ${minimum} variants, found ${urls.length}`);
  }
  if (!VOICE_MIX[eventName]) {
    errors.push(`${eventName} is missing VOICE_MIX tuning`);
  }
  for (const url of urls) {
    if (!AssetManifest.audio.voice.includes(url)) {
      errors.push(`${eventName} variant missing from AssetManifest.audio.voice: ${url}`);
    }
    if (!fs.existsSync(publicPath(url))) {
      errors.push(`${eventName} variant missing on disk: ${url}`);
    }
  }
}

const rootVoiceFiles = fs.readdirSync(path.join(rootDir, 'public/audio/voice'), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.mp3'))
  .map((entry) => entry.name);
if (rootVoiceFiles.length) {
  errors.push(`legacy root voice files still ship from public/audio/voice: ${rootVoiceFiles.join(', ')}`);
}

const legacyManifestVoices = AssetManifest.audio.voice.filter((url) => /^\/audio\/voice\/[^/]+\.mp3$/i.test(url));
if (legacyManifestVoices.length) {
  errors.push(`legacy root voice files still appear in AssetManifest.audio.voice: ${legacyManifestVoices.join(', ')}`);
}

const runtimeFiles = [
  'src/audio/SoundCatalog.js',
  'src/audio/AudioManager.js',
  'src/managers/EnemyManager.js',
  'src/scenes/PlayScene.js',
  'src/scenes/GameOverScene.js',
  'src/assets/assetManifest.js'
];
const runtimeSource = runtimeFiles.map((file) => fs.readFileSync(path.join(rootDir, file), 'utf8')).join('\n');

for (const forbidden of [
  "playVoice('war_",
  'playVoice("war_',
  "playVoice('mission_complete'",
  'playVoice("mission_complete"',
  "playVoice('powerup'",
  'playVoice("powerup"',
  "playVoice('game_over'",
  'playVoice("game_over"',
  '/audio/voice/war_',
  '/audio/voice/power_up.mp3'
]) {
  if (runtimeSource.includes(forbidden)) {
    errors.push(`legacy voice reference remains in runtime source: ${forbidden}`);
  }
}

for (const requiredText of [
  'voiceVariantBags',
  'mission_control_global_highscore',
  'mission_control_local_highscore',
  'mission_control_combo',
  'mission_control_restart',
  'mission_control_tractor_hijack'
]) {
  if (!runtimeSource.includes(requiredText)) {
    errors.push(`announcer runtime marker missing: ${requiredText}`);
  }
}

if (errors.length) {
  console.error('[announcer-voice] failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[announcer-voice] ok: ${Object.keys(requiredPools).length} event pools, ${AssetManifest.audio.voice.length} manifest voice assets`);
