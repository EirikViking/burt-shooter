import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, VOICE_MIX } from '../src/audio/SoundCatalog.js';
import { TACTICAL_DRAFT_AUGMENTS } from '../src/config/TacticalDraft.js';
import {
  TACTICAL_BOSS_BANTER_DEFAULT_VOICE_ID,
  TACTICAL_BOSS_BANTER_EVENT_COUNTS,
  TACTICAL_BOSS_BANTER_EVENT_IDS,
  TACTICAL_BOSS_BANTER_TOTAL_COUNT,
  getTacticalBossBanterEvent,
  tacticalBossBanterGroups,
  tacticalBossBanterLines
} from '../src/config/TacticalBossBanterLines.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(rootDir, 'public');
const audioDir = path.join(publicDir, 'audio', 'voice', 'tactical-boss-banter');
const manifestPath = path.join(audioDir, 'tactical-boss-banter-manifest.json');
const approvedBossVoiceId = 'YO6HUzlgJ0HQvmYejW5c';
const errors = [];

function fail(message) {
  errors.push(message);
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function hasMp3Signature(file) {
  const bytes = fs.readFileSync(file).subarray(0, 4);
  return bytes.subarray(0, 3).toString('ascii') === 'ID3'
    || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
}

if (TACTICAL_BOSS_BANTER_DEFAULT_VOICE_ID !== approvedBossVoiceId) {
  fail(`tactical banter must use approved boss voice ${approvedBossVoiceId}`);
}
if (TACTICAL_DRAFT_AUGMENTS.length !== 32) fail(`expected 32 Tactical Draft augments, got ${TACTICAL_DRAFT_AUGMENTS.length}`);
if (tacticalBossBanterGroups.length !== TACTICAL_DRAFT_AUGMENTS.length) {
  fail(`expected one banter group per augment, got ${tacticalBossBanterGroups.length}`);
}
if (tacticalBossBanterLines.length !== TACTICAL_BOSS_BANTER_TOTAL_COUNT || TACTICAL_BOSS_BANTER_TOTAL_COUNT !== 297) {
  fail(`expected exactly 297 tactical boss comments, got ${tacticalBossBanterLines.length}`);
}

const augmentIds = new Set(TACTICAL_DRAFT_AUGMENTS.map((augment) => augment.id));
const groupIds = new Set(tacticalBossBanterGroups.map((group) => group.id));
for (const id of augmentIds) {
  if (!groupIds.has(id)) fail(`missing tactical boss banter group for ${id}`);
  const event = getTacticalBossBanterEvent(id);
  if (event !== `boss_tactical_inspect_${id}`) fail(`bad tactical boss banter event for ${id}: ${event}`);
}
for (const id of groupIds) {
  if (!augmentIds.has(id)) fail(`banter group does not map to a Tactical Draft augment: ${id}`);
}

const ids = new Set();
const texts = new Set();
for (const [index, group] of tacticalBossBanterGroups.entries()) {
  const expected = index < 9 ? 10 : 9;
  if (group.comments.length !== expected) fail(`${group.id} expected ${expected} comments, got ${group.comments.length}`);
  if (TACTICAL_BOSS_BANTER_EVENT_COUNTS[group.event] !== expected) fail(`${group.event} count map mismatch`);
  if (!TACTICAL_BOSS_BANTER_EVENT_IDS.includes(group.event)) fail(`${group.event} missing from event id list`);
  const catalog = SFX_CATALOG[group.event] || [];
  if (catalog.length !== expected) fail(`SFX_CATALOG.${group.event} expected ${expected}, got ${catalog.length}`);
  if (!VOICE_MIX[group.event]) fail(`VOICE_MIX.${group.event} missing`);
  for (let variant = 0; variant < expected; variant += 1) {
    const expectedUrl = `/audio/voice/tactical-boss-banter/${group.event}_${String(variant + 1).padStart(3, '0')}.mp3`;
    if (!catalog.includes(expectedUrl)) fail(`SFX_CATALOG.${group.event} missing ${expectedUrl}`);
  }
}

const manifestVoiceUrls = AssetManifest.audio.voice.filter((url) => url.includes('/audio/voice/tactical-boss-banter/'));
if (manifestVoiceUrls.length !== TACTICAL_BOSS_BANTER_TOTAL_COUNT) {
  fail(`AssetManifest expected 297 tactical boss voices, got ${manifestVoiceUrls.length}`);
}

const audioHashes = new Set();
for (const line of tacticalBossBanterLines) {
  if (!/^boss_tactical_inspect_[a-z0-9_]+_\d{3}$/.test(line.id)) fail(`bad line id: ${line.id}`);
  if (!line.text || line.text.length < 18) fail(`comment too short: ${line.id}`);
  if (!line.generationText?.includes('alien boss voice')) fail(`missing boss voice direction: ${line.id}`);
  if (ids.has(line.id)) fail(`duplicate line id: ${line.id}`);
  if (texts.has(line.text)) fail(`duplicate comment text: ${line.text}`);
  ids.add(line.id);
  texts.add(line.text);
  if (line.event !== getTacticalBossBanterEvent(line.augmentId)) fail(`event/augment mismatch: ${line.id}`);
  const url = `/audio/voice/tactical-boss-banter/${line.id}.mp3`;
  if (!AssetManifest.audio.voice.includes(url)) fail(`AssetManifest missing ${url}`);
  const file = path.join(publicDir, url.replace(/^\//, ''));
  if (!fs.existsSync(file)) {
    fail(`missing tactical boss voice file: ${url}`);
    continue;
  }
  const size = fs.statSync(file).size;
  if (size < 12000) fail(`suspiciously small tactical boss voice (${size} bytes): ${url}`);
  if (!hasMp3Signature(file)) fail(`invalid MP3 signature: ${url}`);
  const hash = sha256(file);
  if (audioHashes.has(hash)) fail(`duplicate audio bytes detected: ${url}`);
  audioHashes.add(hash);
}

if (!fs.existsSync(manifestPath)) {
  fail('missing tactical-boss-banter-manifest.json');
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.provider !== 'ElevenLabs') fail(`manifest provider must be ElevenLabs, got ${manifest.provider}`);
  if (manifest.voiceId !== approvedBossVoiceId) fail(`manifest voice id mismatch: ${manifest.voiceId}`);
  if (manifest.expectedCount !== 297 || manifest.presentCount !== 297 || manifest.files?.length !== 297) {
    fail(`manifest count mismatch: expected=${manifest.expectedCount} present=${manifest.presentCount} files=${manifest.files?.length}`);
  }
  if (manifest.aiGeneratedVoiceDisclosure !== true) fail('manifest must disclose AI-generated voice');
  for (const entry of manifest.files || []) {
    const file = path.join(audioDir, entry.file || '');
    if (!fs.existsSync(file)) continue;
    if (entry.bytes !== fs.statSync(file).size) fail(`manifest byte mismatch: ${entry.file}`);
    if (entry.sha256 !== sha256(file)) fail(`manifest hash mismatch: ${entry.file}`);
  }
}

const playSceneSource = fs.readFileSync(path.join(rootDir, 'src/scenes/PlayScene.js'), 'utf8');
for (const snippet of [
  'TACTICAL_BOSS_BANTER_FOCUS_DELAY_MS',
  'scheduleTacticalBossBanter',
  'tryPlayTacticalBossBanter',
  "exclusiveGroup: 'boss_tactical_inspect'",
  'AudioManager.isBossVoiceEnabled',
  "AudioManager.stopVoiceGroup?.('boss_tactical_inspect')",
  'busyWithOtherVoice',
  'pendingBossBanterId',
  'lastBossBanterEvent',
  "context: 'loadout'",
  'lastBossBanterTrack'
]) {
  if (!playSceneSource.includes(snippet)) fail(`PlayScene missing ${snippet}`);
}

const loadoutSource = fs.readFileSync(path.join(rootDir, 'src/ui/TacticalLoadoutOverlay.js'), 'utf8');
for (const snippet of ['onInspect', "reason: 'pointer'", "reason: 'detail'", "reason: 'page'"]) {
  if (!loadoutSource.includes(snippet)) fail(`TacticalLoadoutOverlay missing ${snippet}`);
}

const generatorSource = fs.readFileSync(path.join(rootDir, 'scripts/generate-tactical-boss-banter.mjs'), 'utf8');
for (const snippet of [
  'ELEVENLABS_API_KEY',
  'TACTICAL_BOSS_BANTER_DEFAULT_VOICE_ID',
  'ELEVENLABS_TACTICAL_BOSS_VOICE_ID',
  'mp3_44100_128',
  '--dry-run',
  '--only=',
  'retry-after',
  'tactical-boss-banter-manifest.json'
]) {
  if (!generatorSource.includes(snippet)) fail(`generator missing ${snippet}`);
}
if (/YO6HUzlgJ0HQvmYejW5c/.test(generatorSource)) fail('generator should import the approved boss voice id instead of duplicating it');
if (/ELEVENLABS_API_KEY\s*=\s*['"][^'"]+['"]/.test(generatorSource)) fail('generator must not hardcode an ElevenLabs key');

if (errors.length) {
  console.error('[tactical-boss-banter] FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[tactical-boss-banter] PASS comments=${tacticalBossBanterLines.length} augments=${tacticalBossBanterGroups.length} uniqueAudio=${audioHashes.size}`);
