import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const durationSeconds = Number(process.env.TRAILER_AUDIO_DURATION || 39.2);
const visualTrimSeconds = Number(process.env.TRAILER_AUDIO_VISUAL_TRIM || 2.6);
const trailerRoot = path.resolve(process.env.TRAILER_AUDIO_ROOT || 'release/steam-trailer');
const draftDir = path.resolve(process.env.TRAILER_AUDIO_DRAFT_DIR || findLatestDraftDir(trailerRoot));
const inputVideo = path.resolve(process.env.TRAILER_AUDIO_VIDEO || path.join(draftDir, 'nova-swarm-steam-trailer-visual-draft.webm'));
const outputVideo = path.resolve(process.env.TRAILER_AUDIO_OUTPUT || path.join(draftDir, 'nova-swarm-steam-trailer-audio-draft.mp4'));
const reportPath = path.join(draftDir, 'audio-mix-report.json');
const visualReportPath = path.join(draftDir, 'report.json');

const audio = {
  introMusic: 'public/audio/music/nova-swarm/nova_swarm_intro_overture.mp3',
  menuMusic: 'public/audio/music/Brave Pilots (Menu Screen).mp3',
  gameplayMusic: 'public/audio/music/Battle in the Stars.mp3',
  bossMusic: 'public/audio/music/DeathMatch (Boss Theme).mp3',
  victoryMusic: 'public/audio/music/Victory Tune.mp3',
  gameOverMusic: 'public/audio/music/Defeated (Game Over Tune).mp3',
  narrator01: 'public/audio/voice/nova-swarm/intro_narrator_01.mp3',
  narrator02: 'public/audio/voice/nova-swarm/intro_narrator_02.mp3',
  launchVoice: 'public/audio/voice/mission-control/mission_control_launch.mp3',
  bossVoice: 'public/audio/voice/mission-control/mission_control_boss_inbound.mp3',
  victoryVoice: 'public/audio/voice/mission-control/mission_control_victory.mp3',
  gameOverVoice: 'public/audio/voice/mission-control/mission_control_game_over.mp3',
  hijackerVoice: 'public/audio/voice/mission-control/mission_control_hijacker_01.mp3',
  whoosh: 'public/audio/sfx/nova-swarm/intro_panel_whoosh.mp3',
  portal: 'public/audio/sfx/nova-swarm/coin_portal_open.mp3',
  swarm: 'public/audio/sfx/nova-swarm/swarm_chatter_stinger.mp3',
  bossReveal: 'public/audio/sfx/nova-swarm/boss_reveal_stinger.mp3',
  confirm: 'public/audio/sfx/nova-swarm/start_game_confirm.mp3',
  laserSmall: 'public/audio/sfx/laserSmall_000.mp3',
  laserLarge: 'public/audio/sfx/laserLarge_000.mp3',
  explosion: 'public/audio/sfx/explosionCrunch_003.mp3',
  bossExplosion: 'public/audio/sfx/lowFrequency_explosion_000.mp3',
  shield: 'public/audio/sfx/forceField_002.mp3'
};

const clips = [
  sfx('confirm', 0.08, 0.58),
  music('gameplayMusic', 0, 4.95, 0.22, 0.35),
  voice('hijackerVoice', 0.48, 0.72),
  sfx('shield', 0.82, 0.52),
  ...repeatSfx('laserSmall', 1.0, 0.34, 9, 0.42),
  sfx('explosion', 2.15, 0.58),
  sfx('bossReveal', 3.35, 0.85),
  music('bossMusic', 3.55, 12.2, 0.2, 0.42),
  voice('bossVoice', 4.0, 0.72),
  ...repeatSfx('laserLarge', 7.0, 0.32, 12, 0.36),
  sfx('bossExplosion', 14.95, 0.82),
  music('victoryMusic', 15.05, 3.2, 0.2, 0.55),
  voice('victoryVoice', 15.75, 0.68),
  music('bossMusic', 18.25, 5.0, 0.18, 0.36),
  sfx('bossReveal', 18.7, 0.46),
  ...repeatSfx('laserLarge', 19.2, 0.52, 6, 0.24),
  sfx('bossReveal', 20.95, 0.4),
  music('gameplayMusic', 23.4, 4.6, 0.16, 0.45),
  voice('launchVoice', 24.0, 0.5),
  music('menuMusic', 27.6, 4.2, 0.14, 0.5),
  sfx('confirm', 29.4, 0.46),
  music('gameOverMusic', 31.4, 5.7, 0.24, 0.7),
  voice('gameOverVoice', 32.3, 0.68)
];

function findLatestDraftDir(root) {
  if (!existsSync(root)) throw new Error(`Trailer root missing: ${root}`);
  const drafts = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('draft-'))
    .map((entry) => path.join(root, entry.name))
    .sort();
  if (!drafts.length) throw new Error(`No trailer draft directories found in ${root}`);
  return drafts[drafts.length - 1];
}

function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return { error: error.message };
  }
}

function music(key, start, duration, volume, fade = 0.4) {
  return { kind: 'music', key, start, duration, volume, fadeIn: fade, fadeOut: fade };
}

function voice(key, start, volume) {
  return { kind: 'voice', key, start, duration: null, volume, fadeIn: 0.02, fadeOut: 0.04 };
}

function sfx(key, start, volume) {
  return { kind: 'sfx', key, start, duration: null, volume, fadeIn: 0.005, fadeOut: 0.02 };
}

function repeatSfx(key, start, spacing, count, volume) {
  return Array.from({ length: count }, (_, index) => sfx(key, start + index * spacing, volume));
}

function audioPathFor(key) {
  const relative = audio[key];
  if (!relative) throw new Error(`Unknown audio key: ${key}`);
  const absolute = path.resolve(relative);
  if (!existsSync(absolute)) throw new Error(`Missing audio asset: ${relative}`);
  return absolute;
}

function buildFilter() {
  const pieces = [`anullsrc=channel_layout=stereo:sample_rate=48000:d=${durationSeconds.toFixed(3)}[base]`];
  const labels = ['[base]'];
  clips.forEach((clip, index) => {
    const inputIndex = index + 1;
    const label = `c${index}`;
    const delayMs = Math.round(clip.start * 1000);
    const filters = ['aformat=sample_fmts=fltp:channel_layouts=stereo'];
    if (clip.duration) filters.push(`atrim=0:${clip.duration.toFixed(3)}`);
    filters.push('asetpts=PTS-STARTPTS');
    filters.push(`volume=${clip.volume}`);
    if (clip.fadeIn) filters.push(`afade=t=in:st=0:d=${clip.fadeIn}`);
    if (clip.duration && clip.fadeOut) {
      const fadeStart = Math.max(0, clip.duration - clip.fadeOut);
      filters.push(`afade=t=out:st=${fadeStart.toFixed(3)}:d=${clip.fadeOut}`);
    }
    filters.push(`adelay=${delayMs}:all=1`);
    pieces.push(`[${inputIndex}:a]${filters.join(',')}[${label}]`);
    labels.push(`[${label}]`);
  });
  pieces.push(`${labels.join('')}amix=inputs=${labels.length}:duration=first:normalize=0,alimiter=limit=0.95,loudnorm=I=-16:LRA=11:TP=-1.5[aout]`);
  return pieces.join(';');
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}\n${stderr}`));
    });
  });
}

async function main() {
  if (!existsSync(inputVideo)) throw new Error(`Missing trailer video: ${inputVideo}`);
  mkdirSync(draftDir, { recursive: true });

  const audioInputs = clips.map((clip) => audioPathFor(clip.key));
  const filterComplex = buildFilter();
  const args = [
    '-y',
    '-ss', visualTrimSeconds.toFixed(3),
    '-i', inputVideo,
    ...audioInputs.flatMap((file) => ['-i', file]),
    '-filter_complex', filterComplex,
    '-map', '0:v:0',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-t', durationSeconds.toFixed(3),
    '-shortest',
    outputVideo
  ];

  await run('ffmpeg', args);
  const ffprobe = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=codec_name,width,height,r_frame_rate,duration:format=duration,size',
    '-of', 'json',
    outputVideo
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    draftDir,
    inputVideo,
    outputVideo,
    build: readJson(visualReportPath)?.build || null,
    durationSeconds,
    visualTrimSeconds,
    notes: [
      'Audio-mixed Steam trailer draft rendered from captured game footage and shipped Nova Swarm audio assets.',
      'The visual source is trimmed to open on active hijacker tractor-beam pressure and the Tractor Hijack payoff, then boss footage, instead of pre-wave setup.',
      'This is still a draft: final Steam upload needs human by-ear approval and any desired title-card/editorial pass.'
    ],
    clips,
    ffprobe: JSON.parse(ffprobe.stdout)
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[trailer-audio] wrote ${outputVideo}`);
  console.log(`[trailer-audio] wrote ${reportPath}`);
}

main().catch((error) => {
  console.error('[trailer-audio] failed');
  console.error(error);
  process.exit(1);
});
