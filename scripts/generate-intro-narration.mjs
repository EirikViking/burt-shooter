import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
const voiceId = process.env.ELEVENLABS_INTRO_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || 'SIbt9DJkaY96v2K2fQyQ';
const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_v3';
const outputDir = path.resolve('public/audio/voice/nova-swarm');

const lines = [
  {
    file: 'intro_narrator_01.mp3',
    text: 'Nova Station was built around an impossible arcade cabinet: one coin, one pilot, one clean lane through the dark.'
  },
  {
    file: 'intro_narrator_02.mp3',
    text: 'Then the swarm arrived. Not random. Not dumb. It learned your dodges, shaped itself into patterns, and guarded every sector with a boss.'
  },
  {
    file: 'intro_narrator_03.mp3',
    text: 'Your ship is not the biggest thing out here. Good. Big things blink late. You thread the lanes, steal the openings, and turn danger into score.'
  },
  {
    file: 'intro_narrator_04.mp3',
    text: 'The cabinet wants proof. Break the formations, hijack their tricks, crack the boss gates, and put your name where the swarm can see it.'
  }
];

function requireEnv() {
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY or ELEVEN_LABS_API_KEY is required in the environment.');
  }
}

async function generateLine(line, index) {
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
      seed: 52180 + index,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.86,
        style: 0.58,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ElevenLabs TTS failed for ${line.file}: HTTP ${response.status} ${body.slice(0, 220)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(outputDir, line.file), buffer);
  console.log(`generated ${line.file} (${buffer.length} bytes)`);
}

async function main() {
  requireEnv();
  await mkdir(outputDir, { recursive: true });
  for (let i = 0; i < lines.length; i += 1) {
    await generateLine(lines[i], i);
  }
  console.log(`intro narration written to ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
