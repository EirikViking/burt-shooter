import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY;
const outputDir = path.resolve('public/audio/sfx/nova-swarm');
const force = process.argv.includes('--force');

const sounds = [
  {
    file: 'nova_boss_arrival_alarm.mp3',
    text: 'A short retro arcade boss arrival alarm, cinematic sci-fi siren, rising energy, punchy but not harsh, no voice, no melody, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.55
  },
  {
    file: 'nova_bonus_core_jackpot.mp3',
    text: 'A bright arcade bonus core jackpot pickup sound, sparkling coin-slot energy, quick upward chime, satisfying and playful, no voice, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.6
  },
  {
    file: 'nova_shield_snap.mp3',
    text: 'A crisp sci-fi shield activation snap, glassy force field shimmer with a tight arcade attack, clean and readable, no voice, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.55
  },
  {
    file: 'nova_rank_fanfare.mp3',
    text: 'A short victorious arcade rank-up fanfare, neon cabinet flourish, celebratory but compact, no voice, no copyrighted melody, under three seconds.',
    duration_seconds: 3,
    prompt_influence: 0.58
  },
  {
    file: 'nova_highscore_chime.mp3',
    text: 'A premium arcade high-score chime, glittering score counter sparkle, confident and clean, no voice, no melody quote, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.6
  },
  {
    file: 'nova_enemy_pew_cluster.mp3',
    text: 'A tiny clustered alien arcade laser shot, quick chirpy pew with digital swarm texture, readable in busy combat, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.62
  },
  {
    file: 'nova_player_hit_crackle.mp3',
    text: 'A short player ship damage crackle, metallic shield impact and electric fizz, urgent but not harsh, no voice, no melody, under one second.',
    duration_seconds: 1,
    prompt_influence: 0.6
  },
  {
    file: 'nova_life_extend_bloom.mp3',
    text: 'A warm arcade extra-life bloom, hopeful rising sparkle and soft coin cabinet reward, compact and premium, no voice, no melody quote, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.6
  },
  {
    file: 'nova_wave_clear_sweep.mp3',
    text: 'A bright wave-clear sweep for a neon arcade shooter, quick upward shimmer with tiny score-counter sparkle, satisfying but not too loud, no voice, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.58
  },
  {
    file: 'nova_game_over_drop.mp3',
    text: 'A compact arcade game-over stinger, descending sci-fi synth drop with a tiny coin-slot clack at the end, dramatic but playful, no voice, no melody quote, under two seconds.',
    duration_seconds: 2,
    prompt_influence: 0.58
  }
];

function requireApiKey() {
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is required. Keep it in the environment and never commit it.');
  }
}

async function generateSound(sound) {
  const target = path.join(outputDir, sound.file);
  if (!force && existsSync(target)) {
    console.log(`skip existing ${sound.file}`);
    return;
  }

  const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: sound.text,
      duration_seconds: sound.duration_seconds,
      prompt_influence: sound.prompt_influence,
      output_format: 'mp3_44100_128'
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ElevenLabs SFX failed for ${sound.file}: HTTP ${response.status} ${body.slice(0, 240)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(target, buffer);
  console.log(`generated ${sound.file} (${buffer.length} bytes)`);
}

async function main() {
  requireApiKey();
  await mkdir(outputDir, { recursive: true });

  for (const sound of sounds) {
    await generateSound(sound);
  }

  console.log(`Nova Swarm SFX written to ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
