import { existsSync } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import {
  BOSS_DEATH_DEFAULT_VOICE_ID,
  BOSS_DEATH_DEFAULT_VOICE_NAME,
  BOSS_DEATH_MODEL_ID
} from '../src/config/BossDeathVoiceLines.js';

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
const rootDir = path.resolve('.');
const sfxDir = path.join(rootDir, 'public/audio/sfx/nova-swarm');
const voiceDir = path.join(rootDir, 'public/audio/voice/mission-control');
const metadataDir = path.join(rootDir, 'public/audio/generated/row-core');
const metadataPath = path.join(metadataDir, 'row-core-audio-manifest.json');
const outputFormat = process.env.ELEVENLABS_ROW_CORE_OUTPUT_FORMAT || process.env.ELEVENLABS_SFX_OUTPUT_FORMAT || 'mp3_44100_128';
const sfxModelId = process.env.ELEVENLABS_ROW_CORE_SFX_MODEL_ID || process.env.ELEVENLABS_SFX_MODEL_ID || 'eleven_text_to_sound_v2';
const voiceId = process.env.ELEVENLABS_ROW_CORE_VOICE_ID ||
  process.env.ELEVENLABS_MENU_BOSS_VOICE_ID ||
  process.env.ELEVENLABS_BOSS_DEATH_VOICE_ID ||
  BOSS_DEATH_DEFAULT_VOICE_ID;
const voiceModelId = process.env.ELEVENLABS_ROW_CORE_MODEL_ID ||
  process.env.ELEVENLABS_MENU_BOSS_MODEL_ID ||
  process.env.ELEVENLABS_MODEL_ID ||
  BOSS_DEATH_MODEL_ID;
const delayMs = Math.max(0, Number(process.env.ELEVENLABS_ROW_CORE_DELAY_MS || 650));

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const dryRun = args.has('--dry-run');
const sfxOnly = args.has('--sfx-only');
const voiceOnly = args.has('--voice-only');

const soundEffects = [
  {
    kind: 'sound-generation',
    file: 'nova_row_core_pickup.mp3',
    dir: sfxDir,
    duration_seconds: 0.9,
    prompt_influence: 0.58,
    text: 'Original retro arcade powerup pickup, Nordic sci-fi energy, bright synth sparkle, tiny crowd swell, no music melody, no real chant, 0.9 seconds.'
  },
  {
    kind: 'sound-generation',
    file: 'nova_row_core_horn.mp3',
    dir: sfxDir,
    duration_seconds: 1.4,
    prompt_influence: 0.62,
    text: 'Original deep sci-fi longship horn blast for an arcade shooter powerup, cinematic but short, metallic space resonance, no melody from any song, 1.4 seconds.'
  },
  {
    kind: 'sound-generation',
    file: 'nova_row_core_drum.mp3',
    dir: sfxDir,
    duration_seconds: 0.8,
    prompt_influence: 0.6,
    text: 'Two huge arcade war drum hits with stadium-sized reverb and synthetic low-end impact, original sound effect, no crowd recording, 0.8 seconds.'
  },
  {
    kind: 'sound-generation',
    file: 'nova_row_core_ro_01.mp3',
    dir: sfxDir,
    duration_seconds: 0.7,
    prompt_influence: 0.56,
    text: "A fictional arcade crowd chanting one short syllable 'RO!' in a sci-fi arena, layered original voices, punchy and clean, no real stadium recording, no song, 0.7 seconds."
  },
  {
    kind: 'sound-generation',
    file: 'nova_row_core_ro_02.mp3',
    dir: sfxDir,
    duration_seconds: 0.7,
    prompt_influence: 0.56,
    text: "A synthetic space-crowd shout 'RO!' with heroic arcade energy, slightly different pitch and timing, original generated chant, no real crowd sample, 0.7 seconds."
  },
  {
    kind: 'sound-generation',
    file: 'nova_row_core_ro_03.mp3',
    dir: sfxDir,
    duration_seconds: 0.7,
    prompt_influence: 0.56,
    text: "A tight group chant shouting 'RO!' like a futuristic arcade crew, compressed, rhythmic, original voices, no stadium sample, 0.7 seconds."
  },
  {
    kind: 'sound-generation',
    file: 'nova_row_core_ro_big.mp3',
    dir: sfxDir,
    duration_seconds: 1.2,
    prompt_influence: 0.62,
    text: "A massive final sci-fi arena crowd shout 'ROOO!' with thunderous arcade impact and short tail, original generated voices, no real stadium audio, 1.2 seconds."
  },
  {
    kind: 'sound-generation',
    file: 'nova_row_core_wave.mp3',
    dir: sfxDir,
    duration_seconds: 0.6,
    prompt_influence: 0.58,
    text: 'Neon energy wave sweeping outward, arcade shield pulse, laser wind, rhythmic whoosh, original game sound effect, 0.6 seconds.'
  },
  {
    kind: 'sound-generation',
    file: 'nova_row_core_perfect.mp3',
    dir: sfxDir,
    duration_seconds: 1.5,
    prompt_influence: 0.52,
    text: 'Triumphant retro arcade fanfare sting for perfect timing, Nordic sci-fi flavor, bright synth brass, no recognizable melody, 1.5 seconds.'
  }
];

const voiceLines = [
  { kind: 'tts', file: 'mission_control_row_core_01.mp3', dir: voiceDir, text: 'Longship protocol online.' },
  { kind: 'tts', file: 'mission_control_row_core_02.mp3', dir: voiceDir, text: 'Oars out. Lasers in.' },
  { kind: 'tts', file: 'mission_control_row_core_03.mp3', dir: voiceDir, text: 'The swarm rows with you.' },
  { kind: 'tts', file: 'mission_control_row_core_04.mp3', dir: voiceDir, text: 'Row the void.' },
  { kind: 'tts', file: 'mission_control_row_core_05.mp3', dir: voiceDir, text: 'Brace for the ro.' }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function selectedAssets() {
  if (sfxOnly && voiceOnly) throw new Error('Use only one of --sfx-only or --voice-only.');
  if (sfxOnly) return soundEffects;
  if (voiceOnly) return voiceLines;
  return [...soundEffects, ...voiceLines];
}

function requireApiKey() {
  if (dryRun) return;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY or ELEVEN_LABS_API_KEY is required to generate Row Core audio. Keep it in the environment and never commit or print it.');
  }
}

function ffmpegAvailable() {
  const result = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  return result.status === 0;
}

async function normalizeAudio(rawPath, targetPath) {
  if (!ffmpegAvailable()) {
    await rename(rawPath, targetPath);
    console.warn(`[row-core-audio] ffmpeg unavailable; kept raw MP3 for ${path.basename(targetPath)}`);
    return false;
  }
  const result = spawnSync('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    rawPath,
    '-af',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-ar',
    '44100',
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '128k',
    targetPath
  ], { encoding: 'utf8' });

  await unlink(rawPath).catch(() => {});
  if (result.status !== 0) {
    throw new Error(`ffmpeg normalization failed for ${path.basename(targetPath)}: ${result.stderr || result.error?.message || 'unknown error'}`);
  }
  return true;
}

async function requestSound(asset, attempt = 1) {
  const url = new URL('https://api.elevenlabs.io/v1/sound-generation');
  url.searchParams.set('output_format', outputFormat);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: asset.text,
      duration_seconds: asset.duration_seconds,
      prompt_influence: asset.prompt_influence,
      model_id: sfxModelId
    })
  });

  if (response.ok) return Buffer.from(await response.arrayBuffer());
  const body = await response.text().catch(() => '');
  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    const retryMs = Math.min(8000, delayMs * (attempt + 1));
    console.warn(`[row-core-audio] retrying ${asset.file} after HTTP ${response.status} in ${retryMs}ms`);
    await sleep(retryMs);
    return requestSound(asset, attempt + 1);
  }
  throw new Error(`ElevenLabs sound generation failed for ${asset.file}: HTTP ${response.status} ${body.slice(0, 220)}`);
}

async function requestVoice(asset, index, attempt = 1) {
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  url.searchParams.set('output_format', outputFormat);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: `[energetic arcade mission control, amused, original character voice, not a celebrity] ${asset.text}`,
      model_id: voiceModelId,
      seed: 71200 + index,
      voice_settings: {
        stability: 0.28,
        similarity_boost: 0.82,
        style: 0.86,
        use_speaker_boost: true
      },
      pronunciation_dictionary_locators: [],
      apply_text_normalization: 'auto'
    })
  });

  if (response.ok) return Buffer.from(await response.arrayBuffer());
  const body = await response.text().catch(() => '');
  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    const retryMs = Math.min(8000, delayMs * (attempt + 1));
    console.warn(`[row-core-audio] retrying ${asset.file} after HTTP ${response.status} in ${retryMs}ms`);
    await sleep(retryMs);
    return requestVoice(asset, index, attempt + 1);
  }
  throw new Error(`ElevenLabs TTS failed for ${asset.file}: HTTP ${response.status} ${body.slice(0, 220)}`);
}

async function generateAsset(asset, index) {
  await mkdir(asset.dir, { recursive: true });
  const targetPath = path.join(asset.dir, asset.file);
  if (!force && existsSync(targetPath)) {
    console.log(`skip ${asset.file} (exists; pass --force to overwrite)`);
    return { file: asset.file, skipped: true, path: path.relative(rootDir, targetPath).replaceAll(path.sep, '/') };
  }

  const buffer = asset.kind === 'tts'
    ? await requestVoice(asset, index)
    : await requestSound(asset);
  const rawPath = `${targetPath}.raw`;
  await writeFile(rawPath, buffer);
  const normalized = await normalizeAudio(rawPath, targetPath);
  console.log(`generated ${asset.file} (${buffer.length} bytes${normalized ? ', normalized' : ''})`);
  return { file: asset.file, skipped: false, path: path.relative(rootDir, targetPath).replaceAll(path.sep, '/') };
}

async function writeMetadata(results, assets) {
  await mkdir(metadataDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const metadata = {
    feature: 'ROW CORE',
    generatedAt,
    legalNote: 'Original generated development assets. No real stadium, team, player, broadcast, fan-group, song, football organization, or tournament source was used.',
    outputFormat,
    voice: {
      defaultName: BOSS_DEATH_DEFAULT_VOICE_NAME,
      voiceId,
      modelId: voiceModelId
    },
    sfx: {
      modelId: sfxModelId
    },
    files: assets.map((asset) => {
      const result = results.find((entry) => entry.file === asset.file) || {};
      return {
        filename: asset.file,
        path: result.path || path.relative(rootDir, path.join(asset.dir, asset.file)).replaceAll(path.sep, '/'),
        kind: asset.kind,
        endpoint: asset.kind === 'tts' ? 'text-to-speech' : 'sound-generation',
        promptText: asset.text,
        durationTargetSeconds: asset.duration_seconds || null,
        model_id: asset.kind === 'tts' ? voiceModelId : sfxModelId,
        skipped: Boolean(result.skipped)
      };
    })
  };
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  return metadataPath;
}

async function main() {
  const assets = selectedAssets();
  if (dryRun) {
    console.log('[row-core-audio] dry run');
    for (const asset of assets) {
      console.log(`${asset.kind} ${asset.file}: ${asset.text}`);
    }
    return;
  }

  requireApiKey();
  await mkdir(sfxDir, { recursive: true });
  await mkdir(voiceDir, { recursive: true });

  const results = [];
  for (let index = 0; index < assets.length; index += 1) {
    results.push(await generateAsset(assets[index], index));
    if (index < assets.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  const reportPath = await writeMetadata(results, assets);
  const generated = results.filter((entry) => !entry.skipped).length;
  const skipped = results.filter((entry) => entry.skipped).length;
  console.log(`[row-core-audio] complete generated=${generated} skipped=${skipped} voice=${BOSS_DEATH_DEFAULT_VOICE_NAME} metadata=${path.relative(rootDir, reportPath).replaceAll(path.sep, '/')}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
