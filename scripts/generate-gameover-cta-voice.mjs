import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gameOverCtaVoiceLines } from '../src/config/GameOverCtaVoiceLines.js';

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'SIbt9DJkaY96v2K2fQyQ';
const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_v3';
const outputDir = path.resolve('public/audio/voice/cta');
const force = process.argv.includes('--force');
const delayMs = Number(process.env.ELEVENLABS_TTS_DELAY_MS || 650);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireKey() {
  if (apiKey) return;
  console.log([
    'ELEVENLABS_API_KEY is required to generate CTA voice files.',
    'Keep it in your shell environment. Do not put it in tracked files.',
    'Example: $env:ELEVENLABS_API_KEY = "<secret>"; npm run generate:gameover-cta-voice'
  ].join('\n'));
  process.exit(0);
}

async function tts(line, index, attempt = 1) {
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  url.searchParams.set('output_format', 'mp3_44100_128');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: line.text,
      model_id: modelId,
      seed: 51000 + index,
      voice_settings: {
        stability: 0.38,
        similarity_boost: 0.86,
        style: 0.68,
        use_speaker_boost: true
      },
      pronunciation_dictionary_locators: [],
      apply_text_normalization: 'auto'
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      const backoff = delayMs * (attempt + 1);
      console.warn(`retrying ${line.id} after HTTP ${response.status} in ${backoff}ms`);
      await sleep(backoff);
      return tts(line, index, attempt + 1);
    }
    throw new Error(`ElevenLabs TTS failed for ${line.id}: HTTP ${response.status} ${body.slice(0, 220)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  requireKey();
  await mkdir(outputDir, { recursive: true });

  let generated = 0;
  let skipped = 0;
  for (let index = 0; index < gameOverCtaVoiceLines.length; index += 1) {
    const line = gameOverCtaVoiceLines[index];
    const filename = `${line.id}.mp3`;
    const target = path.join(outputDir, filename);
    if (!force && existsSync(target)) {
      skipped += 1;
      console.log(`skip ${filename} (exists; pass --force to overwrite)`);
      continue;
    }

    const buffer = await tts(line, index);
    await writeFile(target, buffer);
    generated += 1;
    console.log(`generated ${filename} (${buffer.length} bytes)`);
    if (index < gameOverCtaVoiceLines.length - 1) await sleep(delayMs);
  }

  console.log(`game-over CTA voicepack complete: generated=${generated} skipped=${skipped} dir=${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
