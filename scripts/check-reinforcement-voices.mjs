import fs from 'node:fs';
import path from 'node:path';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, VOICE_EVENT_FALLBACKS, VOICE_MIX } from '../src/audio/SoundCatalog.js';
import {
  REINFORCEMENT_DEFAULT_VOICE_ID,
  REINFORCEMENT_VOICE_COUNT,
  reinforcementVoiceLines
} from '../src/config/ReinforcementVoiceLines.js';

const rootDir = process.cwd();
const eventName = 'mission_control_reinforcements_incoming';
const expectedUrls = Array.from(
  { length: REINFORCEMENT_VOICE_COUNT },
  (_, index) => `/audio/voice/mission-control/${eventName}_${String(index + 1).padStart(3, '0')}.mp3`
);

function fail(message) {
  console.error(`[reinforcement-voices] ${message}`);
  process.exit(1);
}

if (reinforcementVoiceLines.length !== REINFORCEMENT_VOICE_COUNT) {
  fail(`reinforcementVoiceLines expected ${REINFORCEMENT_VOICE_COUNT}, got ${reinforcementVoiceLines.length}`);
}

const ids = new Set();
const texts = new Set();
for (const line of reinforcementVoiceLines) {
  if (!/^mission_control_reinforcements_incoming_\d{3}$/.test(line.id)) fail(`bad reinforcement voice id: ${line.id}`);
  if (!line.text || line.text.length < 28) fail(`reinforcement line ${line.id} is too short`);
  if (/\b(sex|naked|porn|bedroom)\b/i.test(line.text)) fail(`reinforcement line is too explicit for arcade warning VO: ${line.id}`);
  if (ids.has(line.id)) fail(`duplicate reinforcement id: ${line.id}`);
  if (texts.has(line.text)) fail(`duplicate reinforcement text: ${line.text}`);
  ids.add(line.id);
  texts.add(line.text);
}

const oldSingleUrl = `/audio/voice/mission-control/${eventName}.mp3`;
if (AssetManifest.audio.voice.includes(oldSingleUrl)) {
  fail(`AssetManifest still includes old single reinforcement voice: ${oldSingleUrl}`);
}
if (fs.existsSync(path.join(rootDir, 'public', oldSingleUrl.replace(/^\//, '')))) {
  fail(`old single reinforcement voice still ships on disk: ${oldSingleUrl}`);
}

const manifestVoiceUrls = AssetManifest.audio.voice.filter((url) => (
  url.includes('/audio/voice/mission-control/mission_control_reinforcements_incoming_')
));
if (manifestVoiceUrls.length !== REINFORCEMENT_VOICE_COUNT) {
  fail(`AssetManifest reinforcement voice count expected ${REINFORCEMENT_VOICE_COUNT}, got ${manifestVoiceUrls.length}`);
}

for (const url of expectedUrls) {
  if (!AssetManifest.audio.voice.includes(url)) fail(`AssetManifest missing ${url}`);
  const diskPath = path.join(rootDir, 'public', url.replace(/^\//, ''));
  if (!fs.existsSync(diskPath)) fail(`missing reinforcement voice file: ${url}`);
  const size = fs.statSync(diskPath).size;
  if (size < 1000) fail(`reinforcement voice file is suspiciously small (${size} bytes): ${url}`);
}

const catalog = SFX_CATALOG[eventName] || [];
if (catalog.length !== REINFORCEMENT_VOICE_COUNT) {
  fail(`SFX_CATALOG.${eventName} expected ${REINFORCEMENT_VOICE_COUNT}, got ${catalog.length}`);
}
for (const url of expectedUrls) {
  if (!catalog.includes(url)) fail(`SFX_CATALOG.${eventName} missing ${url}`);
}

if (!VOICE_MIX[eventName]) {
  fail(`VOICE_MIX.${eventName} missing`);
}
if (VOICE_EVENT_FALLBACKS[eventName] !== `${eventName}_001.mp3`) {
  fail(`VOICE_EVENT_FALLBACKS.${eventName} must point at ${eventName}_001.mp3`);
}

const enemyManagerSource = fs.readFileSync(path.join(rootDir, 'src/managers/EnemyManager.js'), 'utf8');
if (!enemyManagerSource.includes(`MAYHEM_REINFORCEMENT_WAVE_SOUND_ID = '${eventName}'`)) {
  fail('EnemyManager reinforcement warning is not wired to the mission-control reinforcement voice event');
}

const generatorSource = fs.readFileSync(path.join(rootDir, 'scripts/generate-reinforcement-voice-warnings.mjs'), 'utf8');
if (!generatorSource.includes('REINFORCEMENT_DEFAULT_VOICE_ID')) {
  fail('reinforcement generator must use the approved mission-control voice constant');
}
if (!generatorSource.includes('voiceId !== REINFORCEMENT_DEFAULT_VOICE_ID')) {
  fail('reinforcement generator must reject non-approved voice IDs');
}
if (REINFORCEMENT_DEFAULT_VOICE_ID !== 'SIbt9DJkaY96v2K2fQyQ') {
  fail('reinforcement default voice ID drifted from the approved mission-control voice');
}

console.log(`[reinforcement-voices] PASS voices=${REINFORCEMENT_VOICE_COUNT} event=${eventName}`);
