import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const apiKey = process.env.ELEVENLABS_API_KEY;
const outputDir = path.resolve('public/audio/music/nova-swarm');
const force = process.argv.includes('--force');

const tracks = [
  {
    file: 'nova_swarm_menu_neon_cabinet.mp3',
    text: 'A super catchy original title-screen theme for Nova Swarm, a neon arcade space shooter. Bright hooky synth lead, confident cabinet attract-mode groove, heroic but playful, polished chiptune-synthwave fusion, no vocals, no copyrighted melody, seamless game menu loop energy.',
    duration_seconds: 22,
    prompt_influence: 0.72
  },
  {
    file: 'nova_swarm_menu_starcoin_parade.mp3',
    text: 'A catchy alternate menu theme for a premium retro space arcade game. Bouncy coin-op bassline, shimmering arpeggios, uplifting space-pilot melody, crisp modern synth production, no vocals, no copyrighted melody, designed to make pressing start feel irresistible.',
    duration_seconds: 22,
    prompt_influence: 0.72
  },
  {
    file: 'nova_swarm_scoreboard_trophy_orbit.mp3',
    text: 'A short prestige leaderboard hall music loop for Nova Swarm. Elegant cosmic trophy synths, arcade score counter sparkle, proud but not sleepy, subtle pulsing beat, premium high-score screen atmosphere, no vocals, no copyrighted melody.',
    duration_seconds: 20,
    prompt_influence: 0.68
  },
  {
    file: 'nova_swarm_gameplay_laser_lane.mp3',
    text: 'A very catchy high-energy gameplay track for a retro arcade space shooter. Fast driving synth bass, bright laser arpeggios, heroic hook, tight drums, urgent but clean for bullet-dodging, no vocals, no copyrighted melody, made for repeated runs.',
    duration_seconds: 24,
    prompt_influence: 0.74
  },
  {
    file: 'nova_swarm_gameplay_comet_chase.mp3',
    text: 'An original energetic arcade shooter gameplay tune. Propulsive comet-chase rhythm, playful synth melody, crisp electronic drums, sparkling space effects, big memorable chorus-like hook without vocals, no copyrighted melody, loop-friendly.',
    duration_seconds: 24,
    prompt_influence: 0.74
  },
  {
    file: 'nova_swarm_gameplay_orbit_breaker.mp3',
    text: 'A varied combat music loop for Nova Swarm. Darker but still catchy synthwave arcade groove, syncopated bass, tense formation-dodging energy, bright counter-melody, no vocals, no copyrighted melody, perfect for mid-level swarm waves.',
    duration_seconds: 24,
    prompt_influence: 0.72
  },
  {
    file: 'nova_swarm_gameplay_bonus_heat.mp3',
    text: 'A playful high-score chase track for a neon space arcade game. Funky synth bass, rapid coin sparkle arps, catchy triumphant lead, fast clean percussion, energetic and fun rather than grim, no vocals, no copyrighted melody.',
    duration_seconds: 24,
    prompt_influence: 0.73
  },
  {
    file: 'nova_swarm_boss_gate_overdrive.mp3',
    text: 'A spectacular boss battle theme for Nova Swarm. Heavy pulsing synth bass, dramatic arcade drums, threatening alien choir-like pads without voices, sharp heroic lead hook, intense but readable under combat SFX, no copyrighted melody.',
    duration_seconds: 24,
    prompt_influence: 0.75
  },
  {
    file: 'nova_swarm_boss_cabinet_judgement.mp3',
    text: 'An alternate boss fight music loop for a premium neon arcade shooter. Menacing mechanical rhythm, aggressive synth brass stabs, big memorable villain hook, cosmic danger, fast pulse, no vocals, no copyrighted melody.',
    duration_seconds: 24,
    prompt_influence: 0.74
  },
  {
    file: 'nova_swarm_victory_star_receipts.mp3',
    text: 'A triumphant original victory theme for Nova Swarm. Bright arcade fanfare expanded into a catchy synth celebration, trophy sparkle, heroic pilot payoff, short loopable win music, no vocals, no copyrighted melody.',
    duration_seconds: 18,
    prompt_influence: 0.7
  },
  {
    file: 'nova_swarm_gameover_last_coin.mp3',
    text: 'A stylish game-over theme for a neon arcade space shooter. Melancholy but motivating synth melody, coin-slot nostalgia, gentle pulsing bass, says one more run without feeling depressing, no vocals, no copyrighted melody.',
    duration_seconds: 20,
    prompt_influence: 0.7
  }
];

function requireApiKey() {
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is required. Keep it in the environment and never commit it.');
  }
}

async function generateTrack(track) {
  const target = path.join(outputDir, track.file);
  if (!force && existsSync(target)) {
    console.log(`skip existing ${track.file}`);
    return;
  }

  const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: track.text,
      duration_seconds: track.duration_seconds,
      prompt_influence: track.prompt_influence,
      output_format: 'mp3_44100_128'
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ElevenLabs music generation failed for ${track.file}: HTTP ${response.status} ${body.slice(0, 240)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(target, buffer);
  console.log(`generated ${track.file} (${buffer.length} bytes)`);
}

async function main() {
  requireApiKey();
  await mkdir(outputDir, { recursive: true });
  for (const track of tracks) {
    await generateTrack(track);
  }
  console.log(`Nova Swarm music written to ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
