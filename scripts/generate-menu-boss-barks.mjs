import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  MENU_BOSS_BARK_DEFAULT_VOICE_ID,
  MENU_BOSS_BARK_DEFAULT_VOICE_NAME,
  MENU_BOSS_BARK_MODEL_ID,
  menuBossBarkLines
} from '../src/config/MenuBossBarkLines.js';

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
const voiceId = process.env.ELEVENLABS_MENU_BOSS_VOICE_ID || MENU_BOSS_BARK_DEFAULT_VOICE_ID;
const modelId = process.env.ELEVENLABS_MENU_BOSS_MODEL_ID || process.env.ELEVENLABS_MODEL_ID || MENU_BOSS_BARK_MODEL_ID;
const outputDir = path.resolve('public/audio/voice/menu-boss-barks');
const force = process.argv.includes('--force');
const delayMs = Number(process.env.ELEVENLABS_MENU_BOSS_DELAY_MS || 725);
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const onlyIds = onlyArg
  ? new Set(onlyArg.slice('--only='.length).split(',').map((item) => item.trim()).filter(Boolean))
  : null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireGenerationInputs() {
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY or ELEVEN_LABS_API_KEY is required. Keep it in the environment and never commit or print it.');
  }
  if (!voiceId) {
    throw new Error('A menu boss voice id is required.');
  }
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
      text: line.generationText || line.text,
      model_id: modelId,
      seed: 88000 + index,
      voice_settings: {
        stability: 0.16,
        similarity_boost: 0.84,
        style: 1,
        use_speaker_boost: true
      },
      pronunciation_dictionary_locators: [],
      apply_text_normalization: 'auto'
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      const backoff = delayMs * (attempt + 1);
      console.warn(`retrying ${line.id} after HTTP ${response.status} in ${backoff}ms`);
      await sleep(backoff);
      return tts(line, index, attempt + 1);
    }
    throw new Error(`ElevenLabs menu boss bark failed for ${line.id}: HTTP ${response.status} ${body.slice(0, 220)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  requireGenerationInputs();
  await mkdir(outputDir, { recursive: true });

  const selectedLines = onlyIds
    ? menuBossBarkLines.filter((line) => onlyIds.has(line.id) || onlyIds.has(`${line.id}.mp3`))
    : menuBossBarkLines;

  if (onlyIds && selectedLines.length !== onlyIds.size) {
    const known = new Set(menuBossBarkLines.flatMap((line) => [line.id, `${line.id}.mp3`]));
    const unknown = [...onlyIds].filter((id) => !known.has(id));
    throw new Error(`Unknown menu boss bark id(s): ${unknown.join(', ')}`);
  }

  let generated = 0;
  let skipped = 0;
  for (let index = 0; index < selectedLines.length; index += 1) {
    const line = selectedLines[index];
    const filename = `${line.id}.mp3`;
    const target = path.join(outputDir, filename);
    if (!force && existsSync(target)) {
      skipped += 1;
      console.log(`skip ${filename} (exists; pass --force to overwrite)`);
      continue;
    }

    const sourceIndex = menuBossBarkLines.findIndex((candidate) => candidate.id === line.id);
    const buffer = await tts(line, sourceIndex >= 0 ? sourceIndex : index);
    await writeFile(target, buffer);
    generated += 1;
    console.log(`generated ${filename} (${buffer.length} bytes)`);
    if (index < selectedLines.length - 1) await sleep(delayMs);
  }

  console.log([
    `menu boss bark voicepack complete: generated=${generated}`,
    `skipped=${skipped}`,
    `voice=${MENU_BOSS_BARK_DEFAULT_VOICE_NAME}`,
    `voiceId=${voiceId}`,
    `dir=${outputDir}`
  ].join(' '));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
