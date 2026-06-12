import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, VOICE_MIX } from '../src/audio/SoundCatalog.js';
import {
  BOSS_DEATH_DEFAULT_VOICE_ID,
  BOSS_DEATH_FORBIDDEN_VOICE_IDS,
  BOSS_DEATH_VOICE_COUNT,
  bossDeathVoiceLines
} from '../src/config/BossDeathVoiceLines.js';

const errors = [];
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(rootDir, 'public');

function fail(message) {
  errors.push(message);
}

const expectedUrls = Array.from(
  { length: BOSS_DEATH_VOICE_COUNT },
  (_, index) => `/audio/voice/boss-death/boss_death_agony_${String(index + 1).padStart(3, '0')}.mp3`
);

if (bossDeathVoiceLines.length !== BOSS_DEATH_VOICE_COUNT) {
  fail(`bossDeathVoiceLines expected ${BOSS_DEATH_VOICE_COUNT}, got ${bossDeathVoiceLines.length}`);
}

const ids = new Set();
const texts = new Set();
for (const line of bossDeathVoiceLines) {
  if (!/^boss_death_agony_\d{3}$/.test(line.id)) fail(`bad boss death voice id: ${line.id}`);
  if (!line.text || line.text.length < 8) fail(`boss death line ${line.id} is too short`);
  if (ids.has(line.id)) fail(`duplicate boss death id: ${line.id}`);
  if (texts.has(line.text)) fail(`duplicate boss death text: ${line.text}`);
  ids.add(line.id);
  texts.add(line.text);
}

if (BOSS_DEATH_FORBIDDEN_VOICE_IDS.includes(BOSS_DEATH_DEFAULT_VOICE_ID)) {
  fail('default boss death voice id matches a forbidden/current mission-control voice id');
}

const manifestVoiceUrls = AssetManifest.audio.voice.filter((url) => url.includes('/audio/voice/boss-death/'));
if (manifestVoiceUrls.length !== BOSS_DEATH_VOICE_COUNT) {
  fail(`AssetManifest boss-death voice count expected ${BOSS_DEATH_VOICE_COUNT}, got ${manifestVoiceUrls.length}`);
}

for (const url of expectedUrls) {
  if (!AssetManifest.audio.voice.includes(url)) fail(`AssetManifest missing ${url}`);
  const file = path.join(publicDir, url.replace(/^\//, ''));
  if (!fs.existsSync(file)) {
    fail(`missing boss death voice file: ${url}`);
    continue;
  }
  const size = fs.statSync(file).size;
  if (size < 1000) fail(`boss death voice file is suspiciously small (${size} bytes): ${url}`);
}

const catalog = SFX_CATALOG.boss_death_agony || [];
if (catalog.length !== BOSS_DEATH_VOICE_COUNT) {
  fail(`SFX_CATALOG.boss_death_agony expected ${BOSS_DEATH_VOICE_COUNT}, got ${catalog.length}`);
}
for (const url of expectedUrls) {
  if (!catalog.includes(url)) fail(`SFX_CATALOG.boss_death_agony missing ${url}`);
}

if (!VOICE_MIX.boss_death_agony) {
  fail('VOICE_MIX.boss_death_agony missing');
}

const playSceneSource = fs.readFileSync(path.join(rootDir, 'src/scenes/PlayScene.js'), 'utf8');
if (!playSceneSource.includes("AudioManager.playDiegeticVoice('boss_death_agony'")) {
  fail('PlayScene boss death impact does not play boss_death_agony as a diegetic voice');
}
if (!playSceneSource.includes("exclusiveGroup: 'boss_death_agony'")) {
  fail('boss death agony voice should have an exclusive group to prevent layered screams');
}
if (!playSceneSource.includes('volume: 2.6')) {
  fail('boss death agony voice should be loud enough to cut through the death SFX bed');
}

const generatorSource = fs.readFileSync(path.join(rootDir, 'scripts/generate-boss-death-voices.mjs'), 'utf8');
if (!generatorSource.includes('ELEVENLABS_BOSS_DEATH_VOICE_ID')) {
  fail('boss death voice generator should support ELEVENLABS_BOSS_DEATH_VOICE_ID override');
}
if (!generatorSource.includes('BOSS_DEATH_FORBIDDEN_VOICE_IDS.includes(voiceId)')) {
  fail('generator does not explicitly guard against forbidden/current mission-control voice ids');
}
for (const forbiddenId of BOSS_DEATH_FORBIDDEN_VOICE_IDS) {
  if (BOSS_DEATH_DEFAULT_VOICE_ID === forbiddenId) {
    fail(`default boss death voice id must not use forbidden voice id ${forbiddenId}`);
  }
}

if (typeof globalThis.Audio === 'undefined') {
  globalThis.Audio = class {
    constructor(src = '') {
      this.src = src;
      this.loop = false;
      this.paused = true;
      this.volume = 1;
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
AudioManager.voiceVariantBags.boss_death_agony = [];
AudioManager.lastVoiceVariantByEvent.boss_death_agony = undefined;
const sampledPicks = Array.from({ length: 12 }, () => AudioManager.pickVoiceVariant('boss_death_agony', catalog));
if (new Set(sampledPicks).size !== sampledPicks.length) {
  fail('boss death agony voice variant bag repeated before the pool was exhausted');
}

if (errors.length) {
  console.error('[boss-death-voices] FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[boss-death-voices] PASS voices=${BOSS_DEATH_VOICE_COUNT} event=boss_death_agony`);
