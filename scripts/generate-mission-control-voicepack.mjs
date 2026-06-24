import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { reinforcementVoiceLines } from '../src/config/ReinforcementVoiceLines.js';

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'SIbt9DJkaY96v2K2fQyQ';
const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_v3';
const outputDir = path.resolve('public/audio/voice/mission-control');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const onlyFiles = onlyArg
  ? new Set(onlyArg.slice('--only='.length).split(',').map((item) => item.trim()).filter(Boolean))
  : null;

const lines = [
  {
    file: 'mission_control_launch.mp3',
    text: 'Cabinet live. Nova swarm incoming.'
  },
  {
    file: 'mission_control_launch_alt01.mp3',
    text: 'Pilot linked. Make the board nervous.'
  },
  {
    file: 'mission_control_launch_alt02.mp3',
    text: 'One ship. All eyes. Go.'
  },
  {
    file: 'mission_control_level_start.mp3',
    text: 'New pattern. Read it fast.'
  },
  {
    file: 'mission_control_level_start_alt01.mp3',
    text: 'Lane is open. Take it clean.'
  },
  {
    file: 'mission_control_level_start_alt02.mp3',
    text: 'Swarm is forming. Cute mistake.'
  },
  {
    file: 'mission_control_wave_clear.mp3',
    text: 'Wave erased. Score agrees.'
  },
  {
    file: 'mission_control_wave_clear_alt01.mp3',
    text: 'Clean clear. Keep the heat.'
  },
  {
    file: 'mission_control_wave_clear_alt02.mp3',
    text: 'That lane belongs to you now.'
  },
  {
    file: 'mission_control_boss_inbound.mp3',
    text: 'Boss gate open. Eyes sharp.'
  },
  {
    file: 'mission_control_boss_inbound_alt01.mp3',
    text: 'Big crown incoming. Do not flinch.'
  },
  {
    file: 'mission_control_boss_inbound_alt02.mp3',
    text: 'Boss pattern waking. Study the tell.'
  },
  {
    file: 'mission_control_life_low.mp3',
    text: 'Hull is thin. Nerve is not.'
  },
  {
    file: 'mission_control_life_low_alt01.mp3',
    text: 'One life. Make it count.'
  },
  {
    file: 'mission_control_life_low_alt02.mp3',
    text: 'Careful now. The board is watching.'
  },
  {
    file: 'mission_control_lives_max.mp3',
    text: 'Maximum lives reached. Cabinet says you are fully stocked.'
  },
  {
    file: 'mission_control_powerup.mp3',
    text: 'Powerup live. Use it hard.'
  },
  {
    file: 'mission_control_powerup_alt01.mp3',
    text: 'Oh, take that.'
  },
  {
    file: 'mission_control_powerup_alt02.mp3',
    text: 'Upgrade secured. Show off.'
  },
  {
    file: 'mission_control_victory.mp3',
    text: 'Boss down. Beautiful read.'
  },
  {
    file: 'mission_control_victory_alt01.mp3',
    text: 'Crown cracked. Next pattern.'
  },
  {
    file: 'mission_control_victory_alt02.mp3',
    text: 'That wreckage looks expensive.'
  },
  {
    file: 'mission_control_game_over.mp3',
    text: 'One more run. You know you want it.'
  },
  {
    file: 'mission_control_game_over_alt01.mp3',
    text: 'Signal lost. Pride recoverable.'
  },
  {
    file: 'mission_control_game_over_alt02.mp3',
    text: 'Not bad. Not final.'
  },
  {
    file: 'mission_control_ship_unlocked_01.mp3',
    text: 'Congratulations, pilot. New ship unlocked. The hangar says do not scratch the paint yet.'
  },
  {
    file: 'mission_control_ships_unlocked_01.mp3',
    text: 'Congratulations, pilot. Several ships unlocked. The hangar is showing off. Go pick a favorite.'
  },
  {
    file: 'mission_control_combo_01.mp3',
    text: 'That score just got interesting.'
  },
  {
    file: 'mission_control_combo_02.mp3',
    text: 'Clean dodge. Filthy score.'
  },
  {
    file: 'mission_control_combo_03.mp3',
    text: 'Combo is awake.'
  },
  {
    file: 'mission_control_local_highscore_01.mp3',
    text: 'Local board claimed.'
  },
  {
    file: 'mission_control_local_highscore_02.mp3',
    text: 'New local mark. Nice trouble.'
  },
  {
    file: 'mission_control_global_highscore_01.mp3',
    text: 'Global board. You earned that.'
  },
  {
    file: 'mission_control_global_highscore_02.mp3',
    text: 'That score travels. Global slot secured.'
  },
  {
    file: 'mission_control_global_close_01.mp3',
    text: 'Global board is in reach. Keep the run clean.'
  },
  {
    file: 'mission_control_top3_close_01.mp3',
    text: 'Top three is visible. This is the run.'
  },
  {
    file: 'mission_control_number_one_close_01.mp3',
    text: 'Number one is on the scope. Bring it home.'
  },
  {
    file: 'mission_control_top3_highscore_01.mp3',
    text: 'Top three. That is not a score, that is a statement.'
  },
  {
    file: 'mission_control_number_one_highscore_01.mp3',
    text: 'Number one. The cabinet is yours.'
  },
  {
    file: 'mission_control_near_miss_01.mp3',
    text: 'Global board was close. You are right there.'
  },
  {
    file: 'mission_control_personal_best_01.mp3',
    text: 'New personal best. Delicious.'
  },
  {
    file: 'mission_control_personal_best_02.mp3',
    text: 'Best run yet. I noticed.'
  },
  {
    file: 'mission_control_restart_01.mp3',
    text: 'Again. Faster.'
  },
  {
    file: 'mission_control_restart_02.mp3',
    text: 'Back in. Make it loud.'
  },
  {
    file: 'mission_control_hijacker_01.mp3',
    text: 'Hijacker beam hot. Break the lock.'
  },
  {
    file: 'mission_control_hijacker_02.mp3',
    text: 'Tractor trap. Slip it clean.'
  },
  {
    file: 'mission_control_tractor_hijack_01.mp3',
    text: 'Beam stolen. Gorgeous.'
  },
  {
    file: 'mission_control_tractor_hijack_02.mp3',
    text: 'Trap reversed. Make it hurt.'
  },
  {
    file: 'mission_control_tractor_hijack_03.mp3',
    text: 'Their beam. Your score.'
  },
  {
    file: 'mission_control_credits_01.mp3',
    text: 'Credits protocol open. Tinyfoundry Games denies responsibility for haunted cabinets, boss paperwork, and emotional damage caused by excellent dodging.'
  },
  {
    file: 'mission_control_eirik_viking_unlocked_01.mp3',
    text: 'Eirik the Viking! Eirik the Viking! Ro, ro, ro for Norge! Level fifty, storm the stars! Hei! Hei! Hei!'
  },
  {
    file: 'mission_control_overrun_clear_01.mp3',
    text: 'Sector ten cleared. Overrun authorized. The cabinet is applauding and will deny it later.'
  },
  {
    file: 'mission_control_overrun_clear_sector_10_01.mp3',
    text: 'Sector ten cleared. Overrun authorized. The cabinet is applauding and will deny it later.'
  },
  {
    file: 'mission_control_overrun_clear_sector_20_01.mp3',
    text: 'Sector twenty cleared. Second signal locked. The swarm is doubling back.'
  },
  {
    file: 'mission_control_overrun_clear_sector_30_01.mp3',
    text: 'Sector thirty cleared. Pattern storm confirmed. Read once, move twice.'
  },
  {
    file: 'mission_control_overrun_clear_sector_40_01.mp3',
    text: 'Sector forty cleared. Deep circuit holding. Every safe lane is temporary.'
  },
  {
    file: 'mission_control_overrun_clear_sector_50_01.mp3',
    text: 'Sector fifty cleared. Last cabinet call answered. This is legend territory.'
  },
  {
    file: 'mission_control_overrun_clear_far_signal_01.mp3',
    text: 'Far overrun sector cleared. The run is off the map. Keep the line.'
  },
  ...reinforcementVoiceLines.map((line) => ({
    file: `${line.id}.mp3`,
    text: line.text
  }))
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
        stability: 0.42,
        similarity_boost: 0.86,
        style: 0.62,
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
    if (onlyFiles && !onlyFiles.has(lines[i].file)) continue;
    await generateLine(lines[i], i);
  }

  console.log(`mission control voicepack written to ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
