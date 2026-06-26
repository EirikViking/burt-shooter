import fs from 'node:fs';
import path from 'node:path';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, VOICE_EVENT_FALLBACKS, VOICE_MIX } from '../src/audio/SoundCatalog.js';
import {
  MAYHEM_SUPER_STORM_DEFAULT_VOICE_ID,
  MAYHEM_SUPER_STORM_SURVIVED_VOICE_COUNT,
  MAYHEM_SUPER_STORM_WARNING_VOICE_COUNT,
  mayhemSuperStormSurvivedVoiceLines,
  mayhemSuperStormWarningVoiceLines,
  mayhemSuperStormVoiceLines
} from '../src/config/MayhemSuperStormVoiceLines.js';

const rootDir = process.cwd();
const warningEvent = 'boss_mayhem_super_storm_warning';
const survivedEvent = 'boss_mayhem_super_storm_survived';

function fail(message) {
  console.error(`[mayhem-super-storm-voices] ${message}`);
  process.exit(1);
}

function assertLines(lines, count, eventName) {
  if (lines.length !== count) fail(`${eventName} expected ${count} lines, got ${lines.length}`);
  const ids = new Set();
  const texts = new Set();
  for (const line of lines) {
    if (!new RegExp(`^${eventName}_\\d{2}$`).test(line.id)) fail(`bad ${eventName} id: ${line.id}`);
    if (line.event !== eventName) fail(`${line.id} has wrong event ${line.event}`);
    if (!line.text || line.text.length < 28) fail(`${line.id} text is too short`);
    if (/\b(sex|naked|porn|bedroom)\b/i.test(line.text)) fail(`${line.id} is too explicit for arcade VO`);
    if (ids.has(line.id)) fail(`duplicate id: ${line.id}`);
    if (texts.has(line.text)) fail(`duplicate text: ${line.text}`);
    ids.add(line.id);
    texts.add(line.text);
  }
}

function assertAudioEvent(eventName, count) {
  const expectedUrls = Array.from(
    { length: count },
    (_, index) => `/audio/voice/mayhem-super-storm/${eventName}_${String(index + 1).padStart(2, '0')}.mp3`
  );
  const catalog = SFX_CATALOG[eventName] || [];
  if (catalog.length !== count) fail(`SFX_CATALOG.${eventName} expected ${count}, got ${catalog.length}`);
  if (!VOICE_MIX[eventName]) fail(`VOICE_MIX.${eventName} missing`);
  if (VOICE_EVENT_FALLBACKS[eventName] !== `${eventName}_01.mp3`) {
    fail(`VOICE_EVENT_FALLBACKS.${eventName} must point at ${eventName}_01.mp3`);
  }
  for (const url of expectedUrls) {
    if (!AssetManifest.audio.voice.includes(url)) fail(`AssetManifest missing ${url}`);
    if (!catalog.includes(url)) fail(`SFX_CATALOG.${eventName} missing ${url}`);
    const diskPath = path.join(rootDir, 'public', url.replace(/^\//, ''));
    if (!fs.existsSync(diskPath)) fail(`missing Mayhem super-storm voice file: ${url}`);
    const size = fs.statSync(diskPath).size;
    if (size < 1000) fail(`Mayhem super-storm voice file is suspiciously small (${size} bytes): ${url}`);
  }
}

assertLines(mayhemSuperStormWarningVoiceLines, MAYHEM_SUPER_STORM_WARNING_VOICE_COUNT, warningEvent);
assertLines(mayhemSuperStormSurvivedVoiceLines, MAYHEM_SUPER_STORM_SURVIVED_VOICE_COUNT, survivedEvent);

if (mayhemSuperStormVoiceLines.length !== MAYHEM_SUPER_STORM_WARNING_VOICE_COUNT + MAYHEM_SUPER_STORM_SURVIVED_VOICE_COUNT) {
  fail(`combined voice line count drifted: ${mayhemSuperStormVoiceLines.length}`);
}
if (MAYHEM_SUPER_STORM_DEFAULT_VOICE_ID !== 'YO6HUzlgJ0HQvmYejW5c') {
  fail('Mayhem super-storm default voice drifted from the approved boss voice');
}

assertAudioEvent(warningEvent, MAYHEM_SUPER_STORM_WARNING_VOICE_COUNT);
assertAudioEvent(survivedEvent, MAYHEM_SUPER_STORM_SURVIVED_VOICE_COUNT);

const enemyManagerSource = fs.readFileSync(path.join(rootDir, 'src/managers/EnemyManager.js'), 'utf8');
for (const snippet of [
  `MAYHEM_SUPER_STORM_WARNING_SOUND_ID = '${warningEvent}'`,
  `MAYHEM_SUPER_STORM_SURVIVED_SOUND_ID = '${survivedEvent}'`,
  'state.isSuperStorm ? MAYHEM_SUPER_STORM_WARNING_SOUND_ID',
  'AudioManager.playVoice(MAYHEM_SUPER_STORM_SURVIVED_SOUND_ID',
  'mayhemSuperStormSurvivalWaveCounts'
]) {
  if (!enemyManagerSource.includes(snippet)) fail(`EnemyManager missing super-storm voice wiring: ${snippet}`);
}

const generatorSource = fs.readFileSync(path.join(rootDir, 'scripts/generate-mayhem-super-storm-voices.mjs'), 'utf8');
if (!generatorSource.includes('MAYHEM_SUPER_STORM_DEFAULT_VOICE_ID')) {
  fail('Mayhem super-storm generator must use the approved boss voice constant');
}
if (generatorSource.includes('xi-api-key:')) {
  fail('Mayhem super-storm generator must not print or hardcode the ElevenLabs API key');
}

console.log(`[mayhem-super-storm-voices] PASS warning=${MAYHEM_SUPER_STORM_WARNING_VOICE_COUNT} survived=${MAYHEM_SUPER_STORM_SURVIVED_VOICE_COUNT}`);
