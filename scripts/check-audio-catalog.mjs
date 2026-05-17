import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { MUSIC_PLAYLISTS, SFX_CATALOG, SFX_MIX, VOICE_MIX, VOICE_EVENT_FALLBACKS } from '../src/audio/SoundCatalog.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(rootDir, 'public');

const errors = [];
const warnings = [];

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function publicFileFor(url) {
  return path.join(publicDir, String(url).replace(/^\//, ''));
}

function checkAssetUrl(url, label, manifestSet) {
  if (!url || typeof url !== 'string') {
    errors.push(`${label} has an empty audio URL`);
    return;
  }

  if (!url.startsWith('/audio/')) {
    errors.push(`${label} points outside public audio: ${url}`);
    return;
  }

  if (!manifestSet.has(url)) {
    errors.push(`${label} is not listed in AssetManifest.audio: ${url}`);
  }

  const filePath = publicFileFor(url);
  if (!fs.existsSync(filePath)) {
    errors.push(`${label} missing file: ${url}`);
    return;
  }

  const { size } = fs.statSync(filePath);
  if (size < 1000) {
    warnings.push(`${label} is suspiciously small (${size} bytes): ${url}`);
  }
}

function checkMixMap(name, mixMap, allowedKeys) {
  for (const [key, mix] of Object.entries(mixMap)) {
    if (!allowedKeys.has(key)) {
      errors.push(`${name} has no matching audio event key: ${key}`);
    }

    for (const [field, value] of Object.entries(mix)) {
      if (!Number.isFinite(Number(value))) {
        errors.push(`${name}.${key}.${field} must be numeric`);
      }
    }
  }
}

const manifestAudio = [
  ...AssetManifest.audio.voice,
  ...AssetManifest.audio.music,
  ...AssetManifest.audio.sfx
];
const manifestSet = new Set(manifestAudio);

for (const url of manifestAudio) {
  checkAssetUrl(url, `manifest:${url}`, manifestSet);
}

const requiredMusicContexts = ['intro', 'menu', 'scoreboard', 'gameplay', 'boss', 'gameover', 'victory'];
for (const context of requiredMusicContexts) {
  const playlist = MUSIC_PLAYLISTS[context] || [];
  if (!playlist.length) {
    errors.push(`Music context "${context}" has no tracks`);
  }

  for (const url of playlist) {
    checkAssetUrl(url, `music:${context}`, manifestSet);
  }
}

for (const [key, urls] of Object.entries(SFX_CATALOG)) {
  const list = asArray(urls).filter(Boolean);
  if (!list.length) {
    errors.push(`SFX/voice catalog key "${key}" has no assets`);
  }

  for (const url of list) {
    checkAssetUrl(url, `catalog:${key}`, manifestSet);
  }
}

const knownSfxEvents = new Set(Object.keys(SFX_CATALOG));
const knownVoiceEvents = new Set([
  ...Object.keys(SFX_CATALOG),
  ...Object.keys(VOICE_EVENT_FALLBACKS)
]);

checkMixMap('SFX_MIX', SFX_MIX, knownSfxEvents);
checkMixMap('VOICE_MIX', VOICE_MIX, knownVoiceEvents);

for (const [eventName, filename] of Object.entries(VOICE_EVENT_FALLBACKS)) {
  const match = AssetManifest.audio.voice.find((url) => url.endsWith(filename));
  if (!match) {
    errors.push(`Voice fallback "${eventName}" cannot find ${filename} in AssetManifest.audio.voice`);
  }
}

for (const message of warnings) {
  console.warn(`[audio-catalog] warning: ${message}`);
}

if (errors.length) {
  console.error('[audio-catalog] failed');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`[audio-catalog] ok: ${manifestAudio.length} manifest assets, ${Object.keys(SFX_CATALOG).length} catalog keys, ${requiredMusicContexts.length} music contexts`);
