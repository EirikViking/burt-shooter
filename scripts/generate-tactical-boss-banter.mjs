import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  TACTICAL_BOSS_BANTER_DEFAULT_VOICE_ID,
  TACTICAL_BOSS_BANTER_DEFAULT_VOICE_NAME,
  TACTICAL_BOSS_BANTER_MODEL_ID,
  TACTICAL_BOSS_BANTER_TOTAL_COUNT,
  tacticalBossBanterLines
} from '../src/config/TacticalBossBanterLines.js';

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
const voiceId = process.env.ELEVENLABS_TACTICAL_BOSS_VOICE_ID || TACTICAL_BOSS_BANTER_DEFAULT_VOICE_ID;
const modelId = process.env.ELEVENLABS_TACTICAL_BOSS_MODEL_ID || process.env.ELEVENLABS_MODEL_ID || TACTICAL_BOSS_BANTER_MODEL_ID;
const outputFormat = process.env.ELEVENLABS_TACTICAL_BOSS_OUTPUT_FORMAT || 'mp3_44100_128';
const delayMs = Math.max(0, Number(process.env.ELEVENLABS_TACTICAL_BOSS_DELAY_MS || 725));
const outputDir = path.resolve('public/audio/voice/tactical-boss-banter');
const manifestPath = path.join(outputDir, 'tactical-boss-banter-manifest.json');
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');
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
  if (voiceId !== TACTICAL_BOSS_BANTER_DEFAULT_VOICE_ID) {
    throw new Error(
      `Tactical boss banter must use ${TACTICAL_BOSS_BANTER_DEFAULT_VOICE_NAME} ` +
      `(${TACTICAL_BOSS_BANTER_DEFAULT_VOICE_ID}). Unset ELEVENLABS_TACTICAL_BOSS_VOICE_ID or restore the approved boss voice.`
    );
  }
  if (tacticalBossBanterLines.length !== TACTICAL_BOSS_BANTER_TOTAL_COUNT) {
    throw new Error(`Expected ${TACTICAL_BOSS_BANTER_TOTAL_COUNT} tactical boss comments, got ${tacticalBossBanterLines.length}.`);
  }
}

function selectLines() {
  if (!onlyIds) return tacticalBossBanterLines;
  const selected = tacticalBossBanterLines.filter((line) => onlyIds.has(line.id) || onlyIds.has(`${line.id}.mp3`));
  const known = new Set(tacticalBossBanterLines.flatMap((line) => [line.id, `${line.id}.mp3`]));
  const unknown = [...onlyIds].filter((id) => !known.has(id));
  if (unknown.length) throw new Error(`Unknown tactical boss banter id(s): ${unknown.join(', ')}`);
  return selected;
}

async function tts(line, sourceIndex, attempt = 1) {
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  url.searchParams.set('output_format', outputFormat);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: line.generationText || line.text,
      model_id: modelId,
      seed: 297000 + sourceIndex,
      voice_settings: {
        stability: 0.18,
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
    if ((response.status === 429 || response.status >= 500) && attempt < 5) {
      const retryAfterSeconds = Number(response.headers.get('retry-after')) || 0;
      const backoff = Math.max(delayMs * (attempt + 1), retryAfterSeconds * 1000);
      console.warn(`retrying ${line.id} after HTTP ${response.status} in ${backoff}ms`);
      await sleep(backoff);
      return tts(line, sourceIndex, attempt + 1);
    }
    throw new Error(`ElevenLabs tactical boss banter failed for ${line.id}: HTTP ${response.status} ${body.slice(0, 220)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function sha256(file) {
  const bytes = await readFile(file);
  return createHash('sha256').update(bytes).digest('hex');
}

async function writeManifest({ generated, skipped }) {
  const files = [];
  for (const line of tacticalBossBanterLines) {
    const filename = `${line.id}.mp3`;
    const file = path.join(outputDir, filename);
    if (!existsSync(file)) continue;
    const info = await stat(file);
    files.push({
      id: line.id,
      augmentId: line.augmentId,
      file: filename,
      bytes: info.size,
      sha256: await sha256(file)
    });
  }
  const manifest = {
    generatedAt: new Date().toISOString(),
    generator: 'scripts/generate-tactical-boss-banter.mjs',
    provider: 'ElevenLabs',
    modelId,
    voiceId,
    voiceName: TACTICAL_BOSS_BANTER_DEFAULT_VOICE_NAME,
    outputFormat,
    expectedCount: TACTICAL_BOSS_BANTER_TOTAL_COUNT,
    presentCount: files.length,
    generatedThisRun: generated,
    skippedThisRun: skipped,
    sourceCharacterCount: tacticalBossBanterLines.reduce((sum, line) => sum + (line.generationText || line.text).length, 0),
    aiGeneratedVoiceDisclosure: true,
    files
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return files.length;
}

async function main() {
  const selectedLines = selectLines();
  const sourceCharacterCount = selectedLines.reduce((sum, line) => sum + (line.generationText || line.text).length, 0);
  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      selectedCount: selectedLines.length,
      totalCount: tacticalBossBanterLines.length,
      sourceCharacterCount,
      voiceId,
      modelId,
      outputFormat,
      outputDir
    }, null, 2));
    return;
  }

  requireGenerationInputs();
  await mkdir(outputDir, { recursive: true });
  let generated = 0;
  let skipped = 0;
  for (let index = 0; index < selectedLines.length; index += 1) {
    const line = selectedLines[index];
    const target = path.join(outputDir, `${line.id}.mp3`);
    if (!force && existsSync(target)) {
      skipped += 1;
      console.log(`skip ${line.id}.mp3 (exists; pass --force to overwrite)`);
      continue;
    }
    const sourceIndex = tacticalBossBanterLines.findIndex((candidate) => candidate.id === line.id);
    const bytes = await tts(line, sourceIndex >= 0 ? sourceIndex : index);
    await writeFile(target, bytes);
    generated += 1;
    console.log(`generated ${line.id}.mp3 (${bytes.length} bytes)`);
    if (index < selectedLines.length - 1) await sleep(delayMs);
  }
  const present = await writeManifest({ generated, skipped });
  console.log([
    `tactical boss banter complete: generated=${generated}`,
    `skipped=${skipped}`,
    `present=${present}`,
    `voice=${TACTICAL_BOSS_BANTER_DEFAULT_VOICE_NAME}`,
    `voiceId=${voiceId}`,
    `dir=${outputDir}`
  ].join(' '));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
