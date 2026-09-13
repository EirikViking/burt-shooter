import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const outputRoot = path.resolve('release/steam-trailer/spectacular-20260713');

const sources = {
  a: 'E:/video-clips/Misfit-galaxy/Desktop/Desktop 2026.07.13 - 14.40.25.18.mp4',
  b: 'E:/video-clips/Misfit-galaxy/Desktop/Desktop 2026.07.13 - 14.45.50.19.mp4',
  c: 'E:/video-clips/Misfit-galaxy/Desktop/Desktop 2026.07.13 - 14.52.13.20.mp4',
  d: 'E:/video-clips/Misfit-galaxy/Desktop/Desktop 2026.07.13 - 12.28.53.16.mp4'
};

const assets = {
  background: path.resolve('release/steam-assets/draft-2026-05-17-nova-swarm/store_page_background_1438x810.jpg'),
  logo: path.resolve('release/steam-assets/draft-2026-05-17-nova-swarm/library_logo_1280x720.png'),
  whoosh: path.resolve('public/audio/sfx/nova-swarm/intro_panel_whoosh.mp3'),
  impact: path.resolve('public/audio/sfx/nova-swarm/nova_boss_death_cascade.mp3'),
  stinger: path.resolve('public/audio/sfx/nova-swarm/nova_highscore_chime.mp3'),
  endMusic: path.resolve('public/audio/music/nova-swarm/nova_swarm_victory_star_receipts.mp3'),
  font: 'C:/Windows/Fonts/bahnschrift.ttf',
  titleFont: 'C:/Windows/Fonts/ariblk.ttf'
};

const musicRoot = path.resolve('public/audio/music/nova-swarm');

const trailers = [
  {
    id: '01-flagship-swarm-does-not-wait',
    title: 'The Swarm Does Not Wait',
    endLine: 'THE SWARM DOES NOT WAIT.',
    music: 'nova_swarm_overdrive_vector_riot.mp3',
    segments: [
      clip('a', 108.10, 2.15, 'Boss ring pressure opens on frame one', 1.045),
      clip('b', 71.45, 2.05, 'Boss beam sweep', 1.04),
      clip('c', 26.00, 1.55, 'Fresh reinforcement wave', 1.035),
      clip('a', 36.20, 2.05, 'Boss crossfire', 1.04),
      clip('a', 40.10, 1.65, 'Boss break', 1.03),
      clip('a', 190.10, 2.15, 'Dense Overrun formation', 1.025),
      clip('b', 322.50, 2.10, 'Rare formation and warning lanes', 1.035),
      clip('a', 244.10, 2.10, 'Support wing laser attack', 1.04),
      clip('a', 257.00, 2.15, 'Orange boss beam lattice', 1.045),
      clip('d', 19.80, 2.25, 'Final boss fury', 1.04),
      clip('a', 115.80, 1.65, 'Boss defeat payoff', 1.035),
      clip('a', 130.00, 2.15, 'New sector immediately gets busy', 1.025)
    ],
    toasts: [
      toast(0.25, 2.65, 'CABINET WEATHER', 'MOSTLY LASERS.', '#ffcf3a'),
      toast(6.25, 9.05, 'BOSS ETIQUETTE', 'THEY BROUGHT FRIENDS. RUDE.', '#ff4fd8'),
      toast(14.05, 16.85, 'TACTICAL UPDATE', 'PANIC, BUT PROFESSIONALLY.', '#52f7ff'),
      toast(21.15, 24.10, 'OFFICIAL ADVICE', 'ONE MORE RUN. OBVIOUSLY.', '#9cff62')
    ],
    impacts: [4.15, 18.30]
  },
  {
    id: '02-tactical-build-a-worse-problem',
    title: 'Build A Worse Problem',
    endLine: 'DEFEAT. DRAFT. BECOME THE PROBLEM.',
    music: 'nova_swarm_gameplay_orbit_breaker.mp3',
    segments: [
      clip('a', 36.00, 2.80, 'Boss duel', 1.04),
      clip('a', 40.75, 1.35, 'Boss defeated', 1.03),
      clip('a', 43.70, 2.80, 'First Tactical Draft', 1.0),
      clip('a', 59.70, 2.75, 'Draft payoff against a boss', 1.035),
      clip('a', 105.70, 1.80, 'Next boss arrives', 1.035),
      clip('a', 108.00, 2.85, 'Next boss fight', 1.045),
      clip('a', 115.75, 1.35, 'Second boss defeated', 1.03),
      clip('a', 117.80, 2.90, 'Second Tactical Draft', 1.0),
      clip('a', 124.50, 2.75, 'Stacked build in combat', 1.03),
      clip('c', 83.30, 2.20, 'Tactical upgrades inspection', 1.0),
      clip('c', 92.20, 2.75, 'Upgrades return to combat', 1.035)
    ],
    toasts: [
      toast(0.25, 2.65, 'STEP ONE', 'REMOVE ONE BOSS.', '#ff4fd8'),
      toast(4.15, 7.00, 'STEP TWO', 'CHOOSE A TERRIBLE IDEA.', '#52f7ff'),
      toast(12.00, 14.75, 'STEP THREE', 'MAKE IT A PUBLIC PROBLEM.', '#ffcf3a'),
      toast(22.00, 25.10, 'CABINET APPROVED', 'STACK UNTIL PHYSICS COMPLAINS.', '#9cff62')
    ],
    impacts: [2.70, 13.50]
  },
  {
    id: '03-bosses-zero-chill',
    title: 'Bosses: Zero Chill',
    endLine: 'TEN SECTORS. TEN BOSSES. ZERO CHILL.',
    music: 'nova_swarm_boss_gate_overdrive.mp3',
    segments: [
      clip('c', 59.00, 2.35, 'Prism boss pressure opens on frame one', 1.045),
      clip('a', 34.10, 2.30, 'Magenta boss pattern', 1.045),
      clip('b', 71.45, 2.35, 'Boss laser wall', 1.045),
      clip('a', 160.00, 2.35, 'Boss beam and adds', 1.045),
      clip('a', 198.10, 2.40, 'Overrun boss crossfire', 1.05),
      clip('a', 258.10, 2.45, 'Forge boss lattice', 1.05),
      clip('d', 21.00, 2.70, 'Boss finale', 1.045),
      clip('a', 60.20, 2.30, 'Pink beam pressure', 1.045),
      clip('a', 244.10, 2.30, 'Boss support laser', 1.045),
      clip('b', 320.30, 2.30, 'Closing boss pressure', 1.04)
    ],
    toasts: [
      toast(0.25, 2.65, 'THREAT ASSESSMENT', 'LARGE. LOUD. UNIONIZED.', '#ff4fd8'),
      toast(6.20, 8.90, 'BOSS BENEFITS', 'INCLUDES FREE LASERS.', '#ffcf3a'),
      toast(12.10, 14.90, 'TACTICAL NOTE', 'THE RED LINES ARE BAD.', '#52f7ff'),
      toast(19.00, 21.80, 'CABINET POLICY', 'NO REFUNDS AFTER SECTOR TEN.', '#9cff62')
    ],
    impacts: [3.75, 12.30, 21.30]
  },
  {
    id: '04-overrun-survival-was-tutorial',
    title: 'Overrun: Survival Was The Tutorial',
    endLine: 'SURVIVAL WAS THE TUTORIAL.',
    music: 'nova_swarm_overdrive_boss_singularity.mp3',
    segments: [
      clip('a', 163.40, 2.40, 'Sector ten boss under pressure', 1.04),
      clip('a', 167.50, 1.45, 'Sector ten boss defeated', 1.03),
      clip('a', 169.80, 2.55, 'Final route Tactical Draft', 1.0),
      clip('a', 175.50, 2.90, 'Overrun unlock card', 1.0),
      clip('a', 179.10, 2.25, 'Overrun opens immediately', 1.03),
      clip('a', 189.50, 2.25, 'Overrun swarm pressure', 1.035),
      clip('a', 198.00, 1.65, 'Overrun boss attacks', 1.05),
      clip('a', 200.00, 2.35, 'Overrun boss fight', 1.05),
      clip('a', 216.10, 2.25, 'Overrun reinforcements', 1.035),
      clip('a', 244.10, 2.25, 'Overrun support laser', 1.04),
      clip('a', 257.80, 2.45, 'Overrun forge boss', 1.05)
    ],
    toasts: [
      toast(0.25, 2.75, 'ROUTE COMPLETE', 'THE CABINET IS NOT IMPRESSED.', '#9cff62'),
      toast(6.20, 9.20, 'OVERRUN UNLOCKED', 'COMMON SENSE HAS LEFT THE SHIP.', '#ffcf3a'),
      toast(13.05, 16.00, 'SCOREBOARD STATUS', 'NOW A CRIME SCENE.', '#ff4fd8'),
      toast(20.15, 23.25, 'EXIT STRATEGY', 'NO EXIT. KEEP FIRING.', '#52f7ff')
    ],
    impacts: [3.55, 17.30]
  },
  {
    id: '05-normal-ended-three-sectors-ago',
    title: 'Normal Ended Three Sectors Ago',
    endLine: 'NEW PROBLEMS. EVERY RUN.',
    music: 'nova_swarm_overdrive_quarterstorm.mp3',
    segments: [
      clip('b', 39.20, 1.70, 'Triangular laser lane opens', 1.035),
      clip('a', 13.30, 1.70, 'Mixed reinforcement wave', 1.025),
      clip('b', 254.80, 1.75, 'Colorful support swarm', 1.03),
      clip('a', 242.20, 1.75, 'Escort line and laser telegraph', 1.035),
      clip('c', 26.00, 1.65, 'Fresh reinforcement wave', 1.04),
      clip('c', 34.20, 1.75, 'Heavy formation collision', 1.04),
      clip('a', 59.80, 1.80, 'Pink boss beam', 1.045),
      clip('a', 128.00, 1.80, 'Rare formation', 1.03),
      clip('b', 322.20, 1.80, 'Reinforcement storm', 1.035),
      clip('b', 324.10, 1.80, 'Red warning lanes', 1.04),
      clip('a', 198.10, 1.85, 'Boss crossfire', 1.045),
      clip('a', 257.90, 1.90, 'Orange boss geometry', 1.05),
      clip('a', 115.70, 1.50, 'Boss pop punctuation', 1.035),
      clip('a', 130.20, 1.90, 'Another wave arrives', 1.025)
    ],
    toasts: [
      toast(0.20, 2.55, 'SHIFT REPORT', 'NORMAL ENDED THREE SECTORS AGO.', '#52f7ff'),
      toast(6.00, 8.70, 'UNSCHEDULED VISITOR', 'IT HAS SCHEDULED LASERS.', '#ffcf3a'),
      toast(12.10, 14.85, 'FORMATION UPDATE', 'THE FORMATION IS ON FIRE.', '#ff4fd8'),
      toast(19.00, 21.80, 'CABINET MOOD', 'DELIGHTED. SOMEHOW.', '#9cff62')
    ],
    impacts: [5.20, 16.30]
  }
];

function clip(source, start, duration, note, punch = 1) {
  return { source, start, duration, note, punch };
}

function toast(start, end, label, text, accent) {
  return { start, end, label, text, accent };
}

function normalized(file) {
  return path.resolve(file).replaceAll('\\', '/').replaceAll("'", "'\\''");
}

function nextAvailablePath(directory, stem, extension) {
  const first = path.join(directory, `${stem}${extension}`);
  if (!existsSync(first)) return first;
  for (let version = 2; version < 100; version += 1) {
    const candidate = path.join(directory, `${stem}-v${version}${extension}`);
    if (!existsSync(candidate)) return candidate;
  }
  throw new Error(`Too many existing versions for ${stem}`);
}

function xml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function assertInputs() {
  for (const [label, file] of Object.entries({ ...sources, ...assets })) {
    if (label.endsWith('Font')) continue;
    if (!existsSync(file)) throw new Error(`Missing ${label}: ${file}`);
  }
  for (const trailer of trailers) {
    const music = path.join(musicRoot, trailer.music);
    if (!existsSync(music)) throw new Error(`Missing music for ${trailer.id}: ${music}`);
  }
}

function run(command, args, { allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 || allowFailure) resolve({ code, stdout, stderr });
      else reject(new Error(`${command} exited ${code}\n${stderr}`));
    });
  });
}

async function renderSegment(segment, index, workDir) {
  const output = path.join(workDir, `clip-${String(index + 1).padStart(2, '0')}.mp4`);
  const crop = segment.punch > 1
    ? `crop=iw/${segment.punch.toFixed(3)}:ih/${segment.punch.toFixed(3)}:(iw-ow)/2:(ih-oh)/2,`
    : '';
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-ss', segment.start.toFixed(3), '-t', segment.duration.toFixed(3), '-i', sources[segment.source],
    '-vf', `${crop}scale=1920:1080:flags=lanczos,setsar=1,fps=60,eq=saturation=1.18:contrast=1.08:brightness=0.012:gamma=1.02,unsharp=5:5:0.42:5:5:0,format=yuv420p`,
    '-af', 'aresample=48000,asetpts=PTS-STARTPTS,highpass=f=35,lowpass=f=17000,alimiter=limit=0.98',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-profile:v', 'high', '-level', '4.2',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', output
  ]);
  return output;
}

async function concatSegments(files, output, workDir, listName) {
  const concatFile = path.join(workDir, listName);
  writeFileSync(concatFile, `${files.map((file) => `file '${normalized(file)}'`).join('\n')}\n`, 'utf8');
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concatFile,
    '-c', 'copy', '-movflags', '+faststart', output
  ]);
}

function makeToastSvg(entry) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="780" height="136" viewBox="0 0 780 136">
  <defs>
    <linearGradient id="panel" x1="0" x2="1"><stop stop-color="#020916" stop-opacity="0.97"/><stop offset="1" stop-color="#071b2b" stop-opacity="0.91"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <path d="M18 4 H744 L776 36 V118 L758 134 H18 L2 118 V20 Z" fill="url(#panel)" stroke="${entry.accent}" stroke-width="3"/>
  <path d="M16 7 H230" stroke="${entry.accent}" stroke-width="7" filter="url(#glow)"/>
  <path d="M18 132 H540" stroke="${entry.accent}" stroke-width="3" opacity="0.85"/>
  <rect x="28" y="26" width="78" height="78" rx="16" fill="#04131f" stroke="${entry.accent}" stroke-width="3"/>
  <text x="67" y="76" text-anchor="middle" font-family="Bahnschrift, Arial" font-size="28" font-weight="700" fill="${entry.accent}">N//S</text>
  <text x="132" y="48" font-family="Bahnschrift, Arial" font-size="20" font-weight="700" letter-spacing="2.5" fill="${entry.accent}">${xml(entry.label)}</text>
  <text x="132" y="94" font-family="Bahnschrift, Arial" font-size="34" font-weight="800" fill="#ffffff">${xml(entry.text)}</text>
</svg>`;
}

async function renderToastAssets(trailer, cardDir) {
  mkdirSync(cardDir, { recursive: true });
  const files = [];
  for (const [index, entry] of trailer.toasts.entries()) {
    const base = `toast-${String(index + 1).padStart(2, '0')}`;
    const svg = path.join(cardDir, `${base}.svg`);
    const png = path.join(cardDir, `${base}.png`);
    writeFileSync(svg, makeToastSvg(entry), 'utf8');
    await run('magick', ['-background', 'none', svg, png]);
    files.push(png);
  }
  return files;
}

function slideX(start, end) {
  const enter = 0.18;
  const leave = 0.18;
  const parked = 48;
  const travel = 840;
  return `if(lt(t,${(start + enter).toFixed(3)}),-${travel}+(t-${start.toFixed(3)})/${enter}*${travel + parked},if(lt(t,${(end - leave).toFixed(3)}),${parked},${parked}-(t-${(end - leave).toFixed(3)})/${leave}*${travel + parked}))`;
}

async function overlayToasts(rawBody, toastFiles, trailer, output, duration) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', rawBody];
  toastFiles.forEach((file) => args.push('-loop', '1', '-framerate', '60', '-i', file));
  let previous = '0:v';
  const filters = [];
  trailer.toasts.forEach((entry, index) => {
    const next = `toastv${index + 1}`;
    filters.push(`[${previous}][${index + 1}:v]overlay=x='${slideX(entry.start, entry.end)}':y=858:enable='between(t,${entry.start.toFixed(3)},${entry.end.toFixed(3)})':eof_action=pass:shortest=0[${next}]`);
    previous = next;
  });
  filters.push(`[${previous}]fade=t=out:st=${Math.max(0, duration - 0.18).toFixed(3)}:d=0.18,format=yuv420p[vout]`);
  args.push(
    '-filter_complex', filters.join(';'), '-map', '[vout]', '-map', '0:a:0',
    '-t', duration.toFixed(3), '-c:v', 'libx264', '-preset', 'medium', '-crf', '15',
    '-profile:v', 'high', '-level', '4.2', '-c:a', 'copy', '-movflags', '+faststart', output
  );
  await run('ffmpeg', args);
}

async function mixBodyAudio(input, trailer, output, duration) {
  const music = path.join(musicRoot, trailer.music);
  const args = [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', input,
    '-stream_loop', '-1', '-i', music,
    '-i', assets.whoosh,
    '-i', assets.impact
  ];
  const filters = [
    `[0:a]aresample=48000,asplit=2[gameMix][gameKey]`,
    `[1:a]atrim=0:${duration.toFixed(3)},asetpts=PTS-STARTPTS,volume=0.34,afade=t=in:st=0:d=0.12,afade=t=out:st=${Math.max(0, duration - 0.35).toFixed(3)}:d=0.35[music]`,
    '[music][gameKey]sidechaincompress=threshold=0.045:ratio=4:attack=18:release=280[ducked]'
  ];
  const mixInputs = ['[gameMix]', '[ducked]'];
  if (trailer.toasts.length) {
    filters.push(`[2:a]asplit=${trailer.toasts.length}${trailer.toasts.map((_, index) => `[wh${index}]`).join('')}`);
    trailer.toasts.forEach((entry, index) => {
      const delay = Math.max(0, Math.round(entry.start * 1000));
      filters.push(`[wh${index}]atrim=0:0.75,asetpts=PTS-STARTPTS,volume=0.58,adelay=${delay}|${delay}[whoosh${index}]`);
      mixInputs.push(`[whoosh${index}]`);
    });
  }
  if (trailer.impacts.length) {
    filters.push(`[3:a]asplit=${trailer.impacts.length}${trailer.impacts.map((_, index) => `[im${index}]`).join('')}`);
    trailer.impacts.forEach((time, index) => {
      const delay = Math.max(0, Math.round(time * 1000));
      filters.push(`[im${index}]atrim=0:1.1,asetpts=PTS-STARTPTS,volume=0.44,adelay=${delay}|${delay}[impact${index}]`);
      mixInputs.push(`[impact${index}]`);
    });
  }
  filters.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=longest:normalize=0,alimiter=limit=0.96,loudnorm=I=-14:LRA=8:TP=-1.0[aout]`);
  args.push(
    '-filter_complex', filters.join(';'), '-map', '0:v:0', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2',
    '-t', duration.toFixed(3), '-movflags', '+faststart', output
  );
  await run('ffmpeg', args);
}

async function renderEndCard(trailer, outputDir) {
  const card = path.join(outputDir, 'end-card.png');
  const prepared = path.join(outputDir, 'end-card-background.png');
  const mp4 = path.join(outputDir, 'end-card.mp4');
  await run('magick', [
    assets.background, '-resize', '1920x1080^', '-gravity', 'center', '-extent', '1920x1080',
    '-modulate', '88,126,100', '-fill', 'rgba(0,3,12,0.44)', '-draw', 'rectangle 0,0 1920,1080',
    '-blur', '0x1.2', prepared
  ]);
  await run('magick', [
    prepared,
    '-stroke', '#12e9ff', '-strokewidth', '3', '-fill', 'none', '-draw', 'line 130,154 620,154', '-draw', 'line 1300,154 1790,154',
    '(', assets.logo, '-resize', '1450x816', ')', '-gravity', 'center', '-geometry', '+0-62', '-composite',
    '-font', assets.font, '-fill', '#fff1a0', '-pointsize', '48', '-gravity', 'south', '-annotate', '+0+152', trailer.endLine,
    '-fill', '#91f8ff', '-pointsize', '30', '-annotate', '+0+95', 'AVAILABLE NOW ON STEAM', card
  ]);
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-loop', '1', '-framerate', '60', '-t', '3.20', '-i', card,
    '-i', assets.stinger, '-stream_loop', '-1', '-i', assets.endMusic,
    '-vf', "zoompan=z='min(zoom+0.00035,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=60,fade=t=in:st=0:d=0.16,fade=t=out:st=2.92:d=0.28,vignette=PI/5,format=yuv420p",
    '-filter_complex', '[1:a]atrim=0:3.2,asetpts=PTS-STARTPTS,volume=0.68,apad=pad_dur=3.2[s];[2:a]atrim=0:3.2,asetpts=PTS-STARTPTS,volume=0.20,afade=t=in:st=0:d=0.1,afade=t=out:st=2.75:d=0.45[m];[s][m]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.96[aout]',
    '-map', '0:v:0', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-profile:v', 'high', '-level', '4.2',
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2', '-t', '3.20',
    '-movflags', '+faststart', mp4
  ]);
  return { card, mp4 };
}

async function masterFinal(input, output) {
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', input,
    '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy',
    '-af', 'loudnorm=I=-14:LRA=8:TP=-1.0',
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', output
  ]);
}

async function probe(file) {
  const result = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration,size,bit_rate:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels,bit_rate',
    '-of', 'json', file
  ]);
  return JSON.parse(result.stdout);
}

async function audioQc(file) {
  const loudness = await run('ffmpeg', [
    '-hide_banner', '-nostats', '-i', file, '-filter_complex', 'ebur128=framelog=verbose', '-f', 'null', 'NUL'
  ], { allowFailure: true });
  const integrated = [...loudness.stderr.matchAll(/I:\s*(-?[\d.]+) LUFS/g)].at(-1)?.[1] ?? null;
  const peak = [...loudness.stderr.matchAll(/Peak:\s*(-?[\d.]+) dBFS/g)].at(-1)?.[1] ?? null;
  const silence = await run('ffmpeg', [
    '-hide_banner', '-nostats', '-i', file, '-af', 'silencedetect=noise=-46dB:d=0.45', '-f', 'null', 'NUL'
  ], { allowFailure: true });
  return {
    integratedLufs: integrated ? Number(integrated) : null,
    truePeakDbfs: peak ? Number(peak) : null,
    silenceEvents: [...silence.stderr.matchAll(/silence_(start|end):\s*([\d.]+)/g)].map((match) => `${match[1]}:${match[2]}`)
  };
}

async function visualQc(file) {
  const result = await run('ffmpeg', [
    '-hide_banner', '-nostats', '-i', file,
    '-vf', 'blackdetect=d=0.12:pix_th=0.04,freezedetect=n=-55dB:d=1.0', '-an', '-f', 'null', 'NUL'
  ], { allowFailure: true });
  return {
    blackFrames: [...result.stderr.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((match) => ({ start: Number(match[1]), end: Number(match[2]) })),
    freezes: [...result.stderr.matchAll(/freeze_start:\s*([\d.]+)/g)].map((match) => Number(match[1]))
  };
}

async function makeContactSheet(video, output, duration, frameDir) {
  const count = 12;
  const frames = [];
  mkdirSync(frameDir, { recursive: true });
  for (let index = 0; index < count; index += 1) {
    const time = 0.15 + ((duration - 0.30) * index) / (count - 1);
    const frame = path.join(frameDir, `review-${String(index + 1).padStart(2, '0')}.jpg`);
    await run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error', '-ss', time.toFixed(3), '-i', video,
      '-frames:v', '1', '-vf', `scale=480:270:flags=lanczos,drawbox=x=0:y=0:w=150:h=30:color=black@0.72:t=fill,drawtext=fontfile='C\\:/Windows/Fonts/bahnschrift.ttf':text='${time.toFixed(2)}s':x=7:y=4:fontsize=21:fontcolor=white`,
      '-q:v', '2', frame
    ]);
    frames.push(frame);
  }
  await run('magick', ['montage', ...frames, '-tile', '4x3', '-geometry', '480x270+6+6', '-background', '#030914', output]);
  return frames;
}

async function renderTrailer(trailer) {
  const outputDir = path.join(outputRoot, trailer.id);
  const workDir = path.join(outputDir, `work-${Date.now()}`);
  const cardDir = path.join(outputDir, 'cards');
  const frameDir = path.join(outputDir, 'review-frames');
  mkdirSync(workDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  console.log(`[spectacular-trailers] ${trailer.id}: rendering ${trailer.segments.length} shots`);
  const clips = [];
  for (const [index, segment] of trailer.segments.entries()) {
    clips.push(await renderSegment(segment, index, workDir));
  }
  const bodyDuration = trailer.segments.reduce((sum, segment) => sum + segment.duration, 0);
  const rawBody = path.join(workDir, 'body-raw.mp4');
  await concatSegments(clips, rawBody, workDir, 'body-concat.txt');

  const toastFiles = await renderToastAssets(trailer, cardDir);
  const visualBody = path.join(workDir, 'body-visual.mp4');
  await overlayToasts(rawBody, toastFiles, trailer, visualBody, bodyDuration);
  const body = path.join(outputDir, 'body-mixed.mp4');
  await mixBodyAudio(visualBody, trailer, body, bodyDuration);

  const endCard = await renderEndCard(trailer, outputDir);
  const preMaster = path.join(workDir, 'final-pre-master.mp4');
  await concatSegments([body, endCard.mp4], preMaster, workDir, 'final-concat.txt');
  const final = nextAvailablePath(outputDir, `nova-swarm-${trailer.id}`, '.mp4');
  await masterFinal(preMaster, final);

  const technical = await probe(final);
  const duration = Number(technical.format?.duration || 0);
  const audio = await audioQc(final);
  const visual = await visualQc(final);
  const contactSheet = path.join(outputDir, 'contact-sheet.jpg');
  const frames = await makeContactSheet(final, contactSheet, duration, frameDir);
  const video = technical.streams?.find((stream) => stream.codec_type === 'video');
  const sound = technical.streams?.find((stream) => stream.codec_type === 'audio');
  const status = duration >= 23 && duration <= 36
    && video?.codec_name === 'h264' && video?.width === 1920 && video?.height === 1080 && video?.r_frame_rate === '60/1'
    && sound?.codec_name === 'aac' && sound?.sample_rate === '48000' && sound?.channels === 2
    && audio.integratedLufs !== null && audio.integratedLufs >= -15.5 && audio.integratedLufs <= -12.5
    ? 'passed'
    : 'needs_review';

  const report = {
    generatedAt: new Date().toISOString(),
    status,
    title: trailer.title,
    output: final,
    contactSheet,
    frames,
    bodyDuration,
    totalDuration: duration,
    segments: trailer.segments,
    toasts: trailer.toasts,
    music: path.join(musicRoot, trailer.music),
    technical,
    audio,
    visual,
    qc: [
      'First visible frame is current captured gameplay.',
      'No desktop, browser, pause menu, or debug footage is included.',
      'Toast cards stay in the lower-left safe zone and slide fully off-screen.',
      'Visible combat retains current gameplay audio under the music mix.',
      'End card music and stinger continue through the final fade.',
      'All music and sound design ship with Nova Swarm.'
    ]
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[spectacular-trailers] ${trailer.id}: ${status} (${duration.toFixed(2)}s, ${audio.integratedLufs} LUFS)`);
}

async function main() {
  assertInputs();
  mkdirSync(outputRoot, { recursive: true });
  const requested = process.env.NOVA_TRAILER_ID;
  const selected = requested ? trailers.filter((trailer) => trailer.id === requested) : trailers;
  if (!selected.length) throw new Error(`Unknown NOVA_TRAILER_ID: ${requested}`);
  for (const trailer of selected) await renderTrailer(trailer);
}

main().catch((error) => {
  console.error('[spectacular-trailers] failed');
  console.error(error);
  process.exit(1);
});
