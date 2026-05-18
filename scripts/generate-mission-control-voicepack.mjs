import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const outputDir = path.resolve('public/audio/voice/mission-control');

const lines = [
  {
    file: 'mission_control_launch.mp3',
    text: 'Nova hot. Swarm hotter.'
  },
  {
    file: 'mission_control_level_start.mp3',
    text: 'New wave. Same bad idea.'
  },
  {
    file: 'mission_control_wave_clear.mp3',
    text: 'Clean sweep. Keep flirting with danger.'
  },
  {
    file: 'mission_control_boss_inbound.mp3',
    text: 'Boss gate open. Try not to blink.'
  },
  {
    file: 'mission_control_life_low.mp3',
    text: 'One life. Make it gorgeous.'
  },
  {
    file: 'mission_control_powerup.mp3',
    text: 'Take the upgrade. Be rude.'
  },
  {
    file: 'mission_control_victory.mp3',
    text: 'Boss down. That was stylish.'
  },
  {
    file: 'mission_control_game_over.mp3',
    text: 'One more run. You know you want it.'
  }
];

function requiredEnv() {
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is required. The key must stay in the environment, not in tracked files.');
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
      seed: 42000 + index,
      voice_settings: {
        stability: 0.58,
        similarity_boost: 0.78,
        style: 0.18,
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
  requiredEnv();
  await mkdir(outputDir, { recursive: true });

  for (let i = 0; i < lines.length; i += 1) {
    await generateLine(lines[i], i);
  }

  console.log(`mission control voicepack written to ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
