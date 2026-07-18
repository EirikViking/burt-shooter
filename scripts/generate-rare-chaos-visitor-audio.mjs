import { existsSync } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import {
  RARE_CHAOS_VISITOR_DEFAULT_VOICE_ID,
  RARE_CHAOS_VISITOR_DEFAULT_VOICE_NAME,
  RARE_CHAOS_VISITOR_MODEL_ID,
  rareChaosVisitorVoiceLines
} from '../src/config/RareChaosVisitorVoiceLines.js';

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
const root = path.resolve('.');
const sfxDir = path.join(root, 'public/audio/sfx/nova-swarm');
const voiceDir = path.join(root, 'public/audio/voice/rare-chaos-visitors');
const metadataDir = path.join(root, 'public/audio/generated/rare-chaos-visitors');
const outputFormat = 'mp3_44100_128';
const sfxModelId = process.env.ELEVENLABS_SFX_MODEL_ID || 'eleven_text_to_sound_v2';
const voiceId = process.env.ELEVENLABS_RARE_CHAOS_VOICE_ID || RARE_CHAOS_VISITOR_DEFAULT_VOICE_ID;
const voiceModelId = process.env.ELEVENLABS_RARE_CHAOS_MODEL_ID || RARE_CHAOS_VISITOR_MODEL_ID;
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');
const delayMs = Math.max(0, Number(process.env.ELEVENLABS_RARE_CHAOS_DELAY_MS || 700));

const sfx = [
  ['nova_rare_visitor_arrival.mp3', 3.2, 'Terrifying extinction-class spacecraft arrival: subsonic pressure wave, distant metal distress siren, reversed reactor breath, three slow seismic impacts, corrupted radio tail, no voice, original cinematic science-fiction horror sound.'],
  ['nova_rare_visitor_theme_sting.mp3', 9.0, 'Original nine-second cosmic horror mini-boss sting: very low brass clusters, bowed metal groans, irregular war drums, pulsing reactor heartbeat, rising impossible choir texture without words, catastrophic final impact, no recognizable melody.'],
  ['nova_rare_visitor_laser_charge.mp3', 1.6, 'Lethal alien extinction beam charging: deep magnetic hum, accelerating electrical scream, precise three-step warning pulse, readable arcade telegraph, no voice.'],
  ['nova_rare_visitor_laser_fire.mp3', 1.0, 'Enormous alien beam discharge: airless vacuum crack, violent plasma rupture, deep hull-shaking impact and short black-hole tail, powerful but not painfully harsh.'],
  ['nova_rare_visitor_barrage.mp3', 1.0, 'Dense coordinated alien weapon barrage: rapid heavy cannon sequence with predatory rhythm, metallic recoil and distant impact wash, frightening polished arcade combat sound, no voice.'],
  ['nova_rare_visitor_armor_crack.mp3', 1.4, 'Ancient hostile armor seal rupturing: stressed metal scream, glass-black energy shell fracture, low creature-like reactor inhale, ominous escalation hit, no voice.'],
  ['nova_rare_visitor_defeat.mp3', 3.4, 'Catastrophic extinction vessel destruction: imploding reactor, layered hull collapse, enormous vacuum shockwave, danger siren dying in pitch, then one clean victorious impact, no voice.'],
  ['nova_rare_visitor_reward.mp3', 2.0, 'Rare forbidden technology reward reveal: dark energy bloom resolving into a clear premium arcade reward chord, crystalline fragments, relieved upward shimmer, no voice.']
].map(([file, duration_seconds, text]) => ({ kind: 'sfx', file, duration_seconds, text }));

const voice = rareChaosVisitorVoiceLines.map((line) => ({
  kind: 'voice',
  file: `${line.id}.mp3`,
  text: line.text,
  generationText: line.generationText
}));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireInputs() {
  if (dryRun) return;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY or ELEVEN_LABS_API_KEY is required. Keep it in the environment; never print or commit it.');
}

async function request(asset, index, attempt = 1) {
  const soundGeneration = asset.kind === 'sfx';
  const url = soundGeneration
    ? new URL('https://api.elevenlabs.io/v1/sound-generation')
    : new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  url.searchParams.set('output_format', outputFormat);
  const body = soundGeneration
    ? { text: asset.text, duration_seconds: asset.duration_seconds, prompt_influence: 0.66, model_id: sfxModelId }
    : {
        text: asset.generationText || asset.text,
        model_id: voiceModelId,
        seed: 99100 + index,
        voice_settings: { stability: 0.2, similarity_boost: 0.84, style: 1, use_speaker_boost: true },
        pronunciation_dictionary_locators: [],
        apply_text_normalization: 'auto'
      };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (response.ok) return Buffer.from(await response.arrayBuffer());
  const detail = await response.text().catch(() => '');
  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    await sleep(delayMs * (attempt + 1));
    return request(asset, index, attempt + 1);
  }
  throw new Error(`ElevenLabs ${asset.kind} generation failed for ${asset.file}: HTTP ${response.status} ${detail.slice(0, 220)}`);
}

async function normalize(raw, target, loudness = -16) {
  const result = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', raw,
    '-af', `loudnorm=I=${loudness}:TP=-1.2:LRA=9`,
    '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '128k', target
  ], { encoding: 'utf8' });
  await unlink(raw).catch(() => {});
  if (result.status !== 0) {
    if (!existsSync(target) && existsSync(raw)) await rename(raw, target);
    throw new Error(`ffmpeg normalization failed for ${path.basename(target)}: ${result.stderr || result.error?.message || 'unknown error'}`);
  }
}

async function main() {
  requireInputs();
  const assets = [...sfx, ...voice];
  if (dryRun) {
    assets.forEach((asset) => console.log(`${asset.kind} ${asset.file}: ${asset.text}`));
    return;
  }
  await mkdir(sfxDir, { recursive: true });
  await mkdir(voiceDir, { recursive: true });
  const results = [];
  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const dir = asset.kind === 'sfx' ? sfxDir : voiceDir;
    const target = path.join(dir, asset.file);
    if (!force && existsSync(target)) {
      results.push({ ...asset, path: path.relative(root, target).replaceAll(path.sep, '/'), skipped: true });
      continue;
    }
    const raw = `${target}.raw`;
    const buffer = await request(asset, index);
    await writeFile(raw, buffer);
    await normalize(raw, target, asset.kind === 'sfx' && asset.file.includes('arrival') ? -14 : -16);
    results.push({ ...asset, path: path.relative(root, target).replaceAll(path.sep, '/'), bytes: buffer.length, skipped: false });
    console.log(`generated ${asset.file} (${buffer.length} bytes)`);
    if (index < assets.length - 1 && delayMs > 0) await sleep(delayMs);
  }
  await mkdir(metadataDir, { recursive: true });
  const manifest = {
    feature: 'Rare Chaos Visitors',
    generatedAt: new Date().toISOString(),
    legalNote: 'Original generated development assets. No celebrity, song, film, broadcast, or third-party recording was requested or used.',
    outputFormat,
    voice: { name: RARE_CHAOS_VISITOR_DEFAULT_VOICE_NAME, voiceId, modelId: voiceModelId },
    sfx: { modelId: sfxModelId },
    files: results
  };
  await writeFile(path.join(metadataDir, 'rare-chaos-visitor-audio-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[rare-chaos-audio] complete generated=${results.filter((item) => !item.skipped).length} skipped=${results.filter((item) => item.skipped).length}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
