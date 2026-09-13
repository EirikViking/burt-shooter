import fs from 'node:fs';
import path from 'node:path';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, VOICE_MIX } from '../src/audio/SoundCatalog.js';
import {
  GAME_OVER_TAUNT_DEFAULT_VOICE_ID,
  GAME_OVER_TAUNT_VOICE_COUNT,
  gameOverTauntVoiceLines
} from '../src/config/GameOverTauntVoiceLines.js';

const rootDir = process.cwd();
const expectedUrls = Array.from(
  { length: GAME_OVER_TAUNT_VOICE_COUNT },
  (_, index) => `/audio/voice/game-over-taunt/game_over_taunt_${String(index + 1).padStart(3, '0')}.mp3`
);

function fail(message) {
  console.error(`[gameover-taunts] ${message}`);
  process.exit(1);
}

if (gameOverTauntVoiceLines.length !== GAME_OVER_TAUNT_VOICE_COUNT) {
  fail(`gameOverTauntVoiceLines expected ${GAME_OVER_TAUNT_VOICE_COUNT}, got ${gameOverTauntVoiceLines.length}`);
}

if (GAME_OVER_TAUNT_DEFAULT_VOICE_ID !== 'KLZOWyG48RjZkAAjuM89') {
  fail('game-over taunts must default to the male space misfit voice');
}

const ids = new Set();
const texts = new Set();
for (const line of gameOverTauntVoiceLines) {
  if (!/^game_over_taunt_\d{3}$/.test(line.id)) fail(`bad game-over taunt id: ${line.id}`);
  if (!line.text || line.text.length < 35) fail(`game-over taunt line ${line.id} is too short`);
  if (!/\b(game over|swarm|void|ship|pilot|leaderboard|wreckage|reactor|cockpit|signal|legend|warning|debris|cannons|hull|stars|dodge|exploded|explosion|launch|cabinet|survival|transmission|mission|pattern|relaunch)\b/i.test(line.text)) {
    fail(`game-over taunt line does not read as game-over specific: ${line.text}`);
  }
  if (ids.has(line.id)) fail(`duplicate game-over taunt id: ${line.id}`);
  if (texts.has(line.text)) fail(`duplicate game-over taunt text: ${line.text}`);
  ids.add(line.id);
  texts.add(line.text);
}

const manifestVoiceUrls = AssetManifest.audio.voice.filter((url) => url.includes('/audio/voice/game-over-taunt/'));
if (manifestVoiceUrls.length !== GAME_OVER_TAUNT_VOICE_COUNT) {
  fail(`AssetManifest game-over taunt voice count expected ${GAME_OVER_TAUNT_VOICE_COUNT}, got ${manifestVoiceUrls.length}`);
}

for (const url of expectedUrls) {
  if (!AssetManifest.audio.voice.includes(url)) fail(`AssetManifest missing ${url}`);
  const diskPath = path.join(rootDir, 'public', url.replace(/^\//, ''));
  if (!fs.existsSync(diskPath)) fail(`missing game-over taunt voice file: ${url}`);
  const size = fs.statSync(diskPath).size;
  if (size < 1000) fail(`game-over taunt voice file is suspiciously small (${size} bytes): ${url}`);
}

const catalog = SFX_CATALOG.game_over_taunt || [];
if (catalog.length !== GAME_OVER_TAUNT_VOICE_COUNT) {
  fail(`SFX_CATALOG.game_over_taunt expected ${GAME_OVER_TAUNT_VOICE_COUNT}, got ${catalog.length}`);
}

for (const url of expectedUrls) {
  if (!catalog.includes(url)) fail(`SFX_CATALOG.game_over_taunt missing ${url}`);
}

if (!VOICE_MIX.game_over_taunt) fail('VOICE_MIX.game_over_taunt missing');
if ((VOICE_MIX.game_over_taunt.volume || 0) < 0.95) fail('game_over_taunt should be dramatic and loud');

const sceneSource = fs.readFileSync(path.join(rootDir, 'src/scenes/GameOverScene.js'), 'utf8');
if (!sceneSource.includes("AudioManager.playVoice('game_over_taunt'")) {
  fail('GameOverScene does not play game_over_taunt');
}
if (!sceneSource.includes('GAME_OVER_EFFECT_PROFILES')) {
  fail('GameOverScene is missing the 100-profile effect pool');
}
if (!sceneSource.includes('GAME_OVER_EFFECT_COUNT = 100')) {
  fail('GameOverScene effect pool must declare 100 variants');
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
AudioManager.voiceVariantBags.game_over_taunt = [];
AudioManager.lastVoiceVariantByEvent.game_over_taunt = undefined;
const sampledPicks = Array.from({ length: 16 }, () => AudioManager.pickVoiceVariant('game_over_taunt', catalog));
if (new Set(sampledPicks).size !== sampledPicks.length) {
  fail('game-over taunt voice variant bag repeated before the pool was exhausted');
}

console.log(`[gameover-taunts] PASS voices=${GAME_OVER_TAUNT_VOICE_COUNT} event=game_over_taunt`);
