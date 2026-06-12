import fs from 'node:fs';
import path from 'node:path';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, VOICE_MIX } from '../src/audio/SoundCatalog.js';
import {
  LEVEL_CLEAR_VOICE_COUNT,
  levelClearVoiceLines
} from '../src/config/LevelClearVoiceLines.js';

const rootDir = process.cwd();
const expectedUrls = Array.from(
  { length: LEVEL_CLEAR_VOICE_COUNT },
  (_, index) => `/audio/voice/level-clear/level_clear_flirt_${String(index + 1).padStart(3, '0')}.mp3`
);

function fail(message) {
  console.error(`[level-clear-voices] ${message}`);
  process.exit(1);
}

if (levelClearVoiceLines.length !== LEVEL_CLEAR_VOICE_COUNT) {
  fail(`levelClearVoiceLines expected ${LEVEL_CLEAR_VOICE_COUNT}, got ${levelClearVoiceLines.length}`);
}

const ids = new Set();
const texts = new Set();
for (const line of levelClearVoiceLines) {
  if (!/^level_clear_flirt_\d{3}$/.test(line.id)) fail(`bad level-clear voice id: ${line.id}`);
  if (!line.text || line.text.length < 18) fail(`level-clear line ${line.id} is too short`);
  if (/\b(sex|naked|porn|bedroom)\b/i.test(line.text)) fail(`level-clear line is too explicit for arcade reward VO: ${line.id}`);
  if (ids.has(line.id)) fail(`duplicate level-clear id: ${line.id}`);
  if (texts.has(line.text)) fail(`duplicate level-clear text: ${line.text}`);
  ids.add(line.id);
  texts.add(line.text);
}

const manifestVoiceUrls = AssetManifest.audio.voice.filter((url) => url.includes('/audio/voice/level-clear/'));
if (manifestVoiceUrls.length !== LEVEL_CLEAR_VOICE_COUNT) {
  fail(`AssetManifest level-clear voice count expected ${LEVEL_CLEAR_VOICE_COUNT}, got ${manifestVoiceUrls.length}`);
}

for (const url of expectedUrls) {
  if (!AssetManifest.audio.voice.includes(url)) fail(`AssetManifest missing ${url}`);
  const diskPath = path.join(rootDir, 'public', url.replace(/^\//, ''));
  if (!fs.existsSync(diskPath)) fail(`missing level-clear voice file: ${url}`);
  const size = fs.statSync(diskPath).size;
  if (size < 1000) fail(`level-clear voice file is suspiciously small (${size} bytes): ${url}`);
}

const catalog = SFX_CATALOG.level_clear_flirt || [];
if (catalog.length !== LEVEL_CLEAR_VOICE_COUNT) {
  fail(`SFX_CATALOG.level_clear_flirt expected ${LEVEL_CLEAR_VOICE_COUNT}, got ${catalog.length}`);
}
for (const url of expectedUrls) {
  if (!catalog.includes(url)) fail(`SFX_CATALOG.level_clear_flirt missing ${url}`);
}

if (!VOICE_MIX.level_clear_flirt) {
  fail('VOICE_MIX.level_clear_flirt missing');
}

const playSceneSource = fs.readFileSync(path.join(rootDir, 'src/scenes/PlayScene.js'), 'utf8');
if (!playSceneSource.includes("AudioManager.playDiegeticVoice('level_clear_flirt'")) {
  fail('PlayScene level clear does not play level_clear_flirt as a diegetic voice');
}
if (!playSceneSource.includes("exclusiveGroup: 'level_clear_flirt'")) {
  fail('level-clear voice should have an exclusive group to avoid stacked compliments');
}

const generatorSource = fs.readFileSync(path.join(rootDir, 'scripts/generate-level-clear-voices.mjs'), 'utf8');
if (!generatorSource.includes('ELEVENLABS_LEVEL_CLEAR_VOICE_ID')) {
  fail('level-clear voice generator should support ELEVENLABS_LEVEL_CLEAR_VOICE_ID override');
}

if (typeof globalThis.Audio === 'undefined') {
  globalThis.Audio = class {
    constructor(src = '') {
      this.src = src;
      this.preload = '';
      this.volume = 1;
      this.paused = true;
      this.ended = false;
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
}

const { AudioManager } = await import('../src/audio/AudioManager.js');
AudioManager.voiceVariantBags.level_clear_flirt = [];
AudioManager.lastVoiceVariantByEvent.level_clear_flirt = undefined;
const sampledPicks = Array.from({ length: 16 }, () => AudioManager.pickVoiceVariant('level_clear_flirt', catalog));
if (new Set(sampledPicks).size !== sampledPicks.length) {
  fail('level-clear voice variant bag repeated before the pool was exhausted');
}

console.log(`[level-clear-voices] PASS voices=${LEVEL_CLEAR_VOICE_COUNT} event=level_clear_flirt`);
