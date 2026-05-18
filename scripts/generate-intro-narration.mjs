import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
const voiceId = process.env.ELEVENLABS_INTRO_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const outputDir = path.resolve('public/audio/voice/nova-swarm');

const lines = [
  {
    file: 'intro_narrator_01.mp3',
    text: 'Long after the star lanes went quiet, a forgotten arcade cabinet kept one promise: if anyone pressed start, it would answer.'
  },
  {
    file: 'intro_narrator_02.mp3',
    text: 'The Nova Swarm was not an army at first. It was a navigation error that became a choir, then a machine, then a joke with teeth.'
  },
  {
    file: 'intro_narrator_03.mp3',
    text: 'Your ship was built for clean lanes and fair odds. The cabinet found neither, so it gave you a dodge thruster and lied about confidence.'
  },
  {
    file: 'intro_narrator_04.mp3',
    text: 'Every boss is a corrupted rule of the old game: hitboxes with grudges, patterns with punchlines, and one scoreboard waiting to remember your name.'
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
        stability: 0.6,
        similarity_boost: 0.8,
        style: 0.24,
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
