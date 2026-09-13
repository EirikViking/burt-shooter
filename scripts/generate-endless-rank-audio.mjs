import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
const voiceId = process.env.ELEVENLABS_ENDLESS_RANK_VOICE_ID
  || process.env.ELEVENLABS_VOICE_ID
  || 'SIbt9DJkaY96v2K2fQyQ';
const voiceModelId = process.env.ELEVENLABS_ENDLESS_RANK_MODEL_ID
  || process.env.ELEVENLABS_MODEL_ID
  || 'eleven_v3';
const sfxModelId = process.env.ELEVENLABS_SFX_MODEL_ID || 'eleven_text_to_sound_v2';
const outputFormat = 'mp3_44100_128';

const voiceOutput = path.resolve('public/audio/voice/mission-control/mission_control_endless_rank_01.mp3');
const sfxOutput = path.resolve('public/audio/sfx/nova-swarm/nova_endless_rank_ascent.mp3');

async function request(url, body, label) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`ElevenLabs ${label} failed: HTTP ${response.status} ${detail.slice(0, 220)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY or ELEVEN_LABS_API_KEY is required in the environment.');

  const voiceUrl = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  voiceUrl.searchParams.set('output_format', outputFormat);
  const voice = await request(voiceUrl, {
    text: 'Career signal rising. There is no ceiling.',
    model_id: voiceModelId,
    seed: 6070000,
    voice_settings: {
      stability: 0.52,
      similarity_boost: 0.88,
      style: 0.62,
      use_speaker_boost: true
    }
  }, 'endless-rank voice');

  const sfxUrl = new URL('https://api.elevenlabs.io/v1/sound-generation');
  sfxUrl.searchParams.set('output_format', outputFormat);
  const sfx = await request(sfxUrl, {
    text: 'A short premium sci-fi arcade ascension sting: deep clean energy rise, crystalline cyan and magenta shimmer, one warm golden impact, triumphant but restrained, no melody, no voice, no alarm, no distortion, exactly one second.',
    model_id: sfxModelId,
    duration_seconds: 1.1,
    prompt_influence: 0.45
  }, 'endless-rank SFX');

  await mkdir(path.dirname(voiceOutput), { recursive: true });
  await mkdir(path.dirname(sfxOutput), { recursive: true });
  await writeFile(voiceOutput, voice);
  await writeFile(sfxOutput, sfx);
  console.log(`generated ${path.basename(voiceOutput)} (${voice.length} bytes)`);
  console.log(`generated ${path.basename(sfxOutput)} (${sfx.length} bytes)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
