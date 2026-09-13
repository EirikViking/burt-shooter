import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const outputRoot = path.resolve('release/steam-trailer/store-refresh-20260711');
const sources = {
  long: 'E:/video-clips/Misfit-galaxy/Desktop/Desktop 2026.07.11 - 18.24.16.13.mp4',
  short: 'E:/video-clips/Misfit-galaxy/Desktop/Desktop 2026.07.11 - 18.38.40.14.mp4'
};

const assets = {
  background: path.resolve('release/steam-assets/draft-2026-05-17-nova-swarm/store_page_background_1438x810.jpg'),
  logo: path.resolve('release/steam-assets/draft-2026-05-17-nova-swarm/library_logo_1280x720.png'),
  stinger: path.resolve('public/audio/sfx/nova-swarm/nova_highscore_chime.mp3'),
  endMusic: path.resolve('public/audio/music/nova-swarm/nova_swarm_menu_starcoin_parade.mp3'),
  font: 'C:/Windows/Fonts/bahnschrift.ttf',
  titleFont: 'C:/Windows/Fonts/ariblk.ttf'
};

const candidates = [
  {
    id: '01-action-cut',
    title: 'Action Cut',
    endLine: 'TACTICAL DRAFT. PILOT ORDERS. ONE MORE RUN.',
    segments: [
      clip('short', 103.5, 3.3, 'Opening boss beam pressure'),
      clip('short', 143.5, 3.3, 'Early support formation'),
      clip('long', 394.8, 3.3, 'Mid-route boss crossfire'),
      clip('long', 545.0, 3.3, 'Sector 9 boss ring pressure'),
      clip('long', 575.0, 3.3, 'Sector 9 boss phase'),
      clip('long', 600.0, 3.3, 'Sector 10 attack lane'),
      clip('long', 645.0, 3.3, 'Sector 10 support formation'),
      clip('long', 660.0, 3.3, 'Sector 10 boss payoff'),
      clip('long', 695.0, 3.3, 'Overrun swarm pressure'),
      clip('long', 710.0, 3.3, 'Overrun boss escalation'),
      clip('long', 117.8, 3.4, 'Tactical Draft decision')
    ],
    toasts: [
      toast(0.25, 2.75, '30 SHIPS. NO SAFE LANE.'),
      toast(9.4, 12.1, 'BOSSES CALL REINFORCEMENTS.'),
      toast(19.1, 21.9, 'PILOT ORDERS SET THE NEXT TARGET.'),
      toast(29.0, 32.0, 'SURVIVE TEN SECTORS. THEN OVERRUN.')
    ]
  },
  {
    id: '02-tactical-draft-cut',
    title: 'Tactical Draft Cut',
    endLine: 'DEFEAT. DRAFT. ADAPT. REPEAT.',
    segments: [
      clip('long', 344.3, 3.1, 'Sector 5 boss pressure'),
      clip('long', 353.0, 3.3, 'Tactical Draft choice three'),
      clip('long', 163.8, 3.1, 'New build in combat'),
      clip('long', 177.8, 3.3, 'Tactical Draft choice two'),
      clip('long', 394.8, 3.2, 'Mid-route boss payoff'),
      clip('long', 117.8, 3.3, 'Tactical Draft choice one'),
      clip('long', 545.0, 3.2, 'Later build against a boss'),
      clip('long', 588.5, 3.3, 'Late Tactical Draft'),
      clip('long', 645.0, 3.2, 'Sector 10 build payoff'),
      clip('long', 658.5, 3.2, 'Final route draft'),
      clip('long', 667.5, 3.5, 'Sector 11 reward and Overrun unlock'),
      clip('long', 695.0, 3.2, 'Overrun build payoff')
    ],
    toasts: [
      toast(0.25, 2.55, 'DEFEAT THE BOSS.'),
      toast(3.45, 6.35, 'DRAFT ONE PERMANENT AUGMENT.'),
      toast(12.9, 15.9, 'STACK A BUILD THAT FITS YOUR SHIP.'),
      toast(22.5, 25.5, 'PILOT ORDERS GIVE EVERY RUN A JOB.'),
      toast(32.0, 35.0, 'THE SWARM ADAPTS. SO DO YOU.')
    ]
  },
  {
    id: '03-boss-gauntlet-cut',
    title: 'Boss Gauntlet Cut',
    endLine: 'CLEAR THE ROUTE. BREAK INTO OVERRUN.',
    segments: [
      clip('short', 103.5, 3.0, 'Sector 1 boss beam'),
      clip('short', 143.5, 3.0, 'Sector 2 support pressure'),
      clip('short', 348.0, 3.0, 'Sector 4 boss combat'),
      clip('long', 394.8, 3.0, 'Sector 6 boss'),
      clip('long', 545.0, 3.0, 'Sector 9 boss ring pattern'),
      clip('long', 575.0, 3.0, 'Sector 9 boss phase'),
      clip('long', 600.0, 3.0, 'Sector 10 attack lane'),
      clip('long', 645.0, 3.0, 'Sector 10 boss and support'),
      clip('long', 660.0, 3.0, 'Sector 10 boss payoff'),
      clip('long', 695.0, 3.0, 'Overrun swarm pressure'),
      clip('long', 705.0, 3.0, 'Overrun boss arrival'),
      clip('long', 710.0, 3.0, 'Overrun boss escalation')
    ],
    toasts: [
      toast(0.25, 2.75, 'TEN SECTORS. TEN ANGRY BOSSES.'),
      toast(9.2, 12.0, 'SUPPORT SHIPS REFUEL THE PROBLEM.'),
      toast(19.0, 21.6, 'BREAK THE FORMATION.'),
      toast(29.0, 32.8, 'OVERRUN STARTS WHERE SENSIBLE PILOTS STOP.')
    ]
  }
];

function clip(source, start, duration, note) {
  return { source, start, duration, note };
}

function toast(start, end, text) {
  return { start, end, text };
}

function normalized(file) {
  return path.resolve(file).replaceAll('\\', '/').replaceAll("'", "'\\''");
}

function filterPath(file) {
  return file.replaceAll('\\', '/').replace(':', '\\:');
}

function assertInputs() {
  for (const [label, file] of Object.entries({ ...sources, ...assets })) {
    if (label.endsWith('Font')) continue;
    if (!existsSync(file)) throw new Error(`Missing ${label}: ${file}`);
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}\n${stderr}`));
    });
  });
}

async function renderSegment(segment, index, workDir) {
  const output = path.join(workDir, `clip-${String(index + 1).padStart(2, '0')}.mp4`);
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-ss', segment.start.toFixed(3), '-t', segment.duration.toFixed(3),
    '-i', sources[segment.source],
    '-vf', 'scale=1920:1080:flags=lanczos,setsar=1,fps=30,format=yuv420p',
    '-af', 'aresample=48000,asetpts=PTS-STARTPTS,alimiter=limit=0.96',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-profile:v', 'high', '-level', '4.2',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', output
  ]);
  return output;
}

async function concatSegments(files, output, workDir) {
  const concatFile = path.join(workDir, 'concat.txt');
  writeFileSync(concatFile, `${files.map((file) => `file '${normalized(file)}'`).join('\n')}\n`, 'utf8');
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concatFile,
    '-c', 'copy', '-movflags', '+faststart', output
  ]);
}

async function masterAudio(input, output) {
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', input,
    '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy',
    '-af', 'loudnorm=I=-16:LRA=9:TP=-1.5',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', output
  ]);
}

function toastFilters(toasts) {
  const font = filterPath(assets.font);
  return toasts.flatMap(({ start, end, text }) => {
    const enabled = `between(t,${start.toFixed(2)},${end.toFixed(2)})`;
    return [
      `drawbox=x=210:y=ih-194:w=iw-420:h=112:color=0x020914@0.76:t=fill:enable='${enabled}'`,
      `drawbox=x=210:y=ih-194:w=iw-420:h=5:color=0x00d7ef@0.95:t=fill:enable='${enabled}'`,
      `drawtext=fontfile='${font}':text='${text}':x=(w-text_w)/2:y=h-160:fontsize=48:fontcolor=white:borderw=2:bordercolor=0x00131e:enable='${enabled}'`
    ];
  }).join(',');
}

async function renderBody(candidate, rawBody, output, duration) {
  const fadeStart = Math.max(0, duration - 0.5);
  const videoFilters = [
    toastFilters(candidate.toasts),
    `fade=t=out:st=${fadeStart.toFixed(3)}:d=0.5`,
    'format=yuv420p'
  ].filter(Boolean).join(',');
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', rawBody,
    '-vf', videoFilters,
    '-af', `afade=t=out:st=${fadeStart.toFixed(3)}:d=0.5,alimiter=limit=0.95`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-profile:v', 'high', '-level', '4.2',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', output
  ]);
}

async function renderEndCard(candidate, outputDir) {
  const png = path.join(outputDir, 'end-card.png');
  const mp4 = path.join(outputDir, 'end-card.mp4');
  const backgroundPrepared = path.join(outputDir, 'end-card-background.png');
  await run('magick', [
    assets.background, '-resize', '1920x1080^', '-gravity', 'center', '-extent', '1920x1080',
    '-fill', 'rgba(0,3,10,0.62)', '-draw', 'rectangle 0,0 1920,1080', backgroundPrepared
  ]);
  await run('magick', [
    backgroundPrepared, '(', assets.logo, '-resize', '1520x855', ')', '-gravity', 'center', '-geometry', '+0-40', '-composite',
    '-font', assets.font, '-fill', '#fff2a6', '-pointsize', '42', '-gravity', 'south', '-annotate', '+0+150', candidate.endLine,
    '-fill', '#8ffcff', '-pointsize', '28', '-annotate', '+0+98', 'AVAILABLE NOW ON STEAM', png
  ]);
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-loop', '1', '-framerate', '30', '-t', '4.6', '-i', png,
    '-i', assets.stinger,
    '-stream_loop', '-1', '-i', assets.endMusic,
    '-vf', 'fade=t=in:st=0:d=0.5,fade=t=out:st=4.1:d=0.5,format=yuv420p',
    '-filter_complex', '[1:a]atrim=0:4.6,asetpts=PTS-STARTPTS,volume=0.52,apad=pad_dur=4.6[s];[2:a]atrim=0:4.6,asetpts=PTS-STARTPTS,volume=0.16,afade=t=in:st=0:d=0.3,afade=t=out:st=4.0:d=0.6[m];[s][m]amix=inputs=2:duration=longest:normalize=0,afade=t=out:st=4.0:d=0.6,alimiter=limit=0.95[aout]',
    '-map', '0:v:0', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-profile:v', 'high', '-level', '4.2',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', '4.6',
    '-movflags', '+faststart', mp4
  ]);
  return { png, mp4 };
}

async function probe(file) {
  const result = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration,size,bit_rate:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels',
    '-of', 'json', file
  ]);
  return JSON.parse(result.stdout);
}

async function volume(file) {
  const result = await run('ffmpeg', ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', 'NUL']);
  return {
    meanDb: result.stderr.match(/mean_volume:\s*([-\d.]+) dB/)?.[1] || null,
    maxDb: result.stderr.match(/max_volume:\s*([-\d.]+) dB/)?.[1] || null
  };
}

async function makeContactSheet(video, output, duration, frameDir) {
  const count = 10;
  const frames = [];
  for (let index = 0; index < count; index += 1) {
    const time = 0.8 + ((duration - 1.6) * index) / (count - 1);
    const frame = path.join(frameDir, `review-${String(index + 1).padStart(2, '0')}.jpg`);
    await run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error', '-ss', time.toFixed(3), '-i', video,
      '-frames:v', '1', '-vf', 'scale=480:270:flags=lanczos', '-q:v', '2', frame
    ]);
    frames.push(frame);
  }
  await run('magick', ['montage', ...frames, '-tile', '5x2', '-geometry', '480x270+6+6', '-background', '#030914', output]);
  return frames;
}

async function renderCandidate(candidate) {
  const outputDir = path.join(outputRoot, candidate.id);
  const workDir = path.join(outputDir, 'work');
  const frameDir = path.join(outputDir, 'review-frames');
  mkdirSync(workDir, { recursive: true });
  mkdirSync(frameDir, { recursive: true });

  console.log(`[trailer-refresh] rendering ${candidate.title}`);
  const clips = [];
  for (const [index, segment] of candidate.segments.entries()) {
    clips.push(await renderSegment(segment, index, workDir));
  }

  const bodyDuration = candidate.segments.reduce((sum, segment) => sum + segment.duration, 0);
  const rawBody = path.join(workDir, 'body-raw.mp4');
  const body = path.join(outputDir, 'body-with-toasts.mp4');
  await concatSegments(clips, rawBody, workDir);
  await renderBody(candidate, rawBody, body, bodyDuration);
  const endCard = await renderEndCard(candidate, outputDir);

  const preMaster = path.join(workDir, 'final-pre-master.mp4');
  const final = path.join(outputDir, `nova-swarm-${candidate.id}.mp4`);
  await concatSegments([body, endCard.mp4], preMaster, workDir);
  await masterAudio(preMaster, final);
  const technical = await probe(final);
  const totalDuration = Number(technical.format?.duration || 0);
  const audio = await volume(final);
  const contactSheet = path.join(outputDir, 'contact-sheet.jpg');
  const frames = await makeContactSheet(final, contactSheet, totalDuration, frameDir);
  const video = technical.streams?.find((stream) => stream.codec_type === 'video');
  const sound = technical.streams?.find((stream) => stream.codec_type === 'audio');
  const status = totalDuration >= 40 && totalDuration <= 65
    && video?.codec_name === 'h264' && video?.width === 1920 && video?.height === 1080
    && sound?.codec_name === 'aac' ? 'passed' : 'needs_review';

  const report = {
    generatedAt: new Date().toISOString(),
    status,
    candidate: candidate.title,
    output: final,
    contactSheet,
    frames,
    bodyDuration,
    totalDuration,
    segments: candidate.segments,
    toasts: candidate.toasts,
    technical,
    volume: audio,
    qc: [
      'Opens on live gameplay, not a logo or menu.',
      'Uses only captured Nova Swarm gameplay and shipped Nova Swarm audio.',
      'Ends with a fade to the Nova Swarm logo.',
      'Requires final human by-ear approval before manual Steam upload.'
    ]
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[trailer-refresh] wrote ${final}`);
}

async function main() {
  assertInputs();
  mkdirSync(outputRoot, { recursive: true });
  const requested = process.env.TRAILER_REFRESH_CANDIDATE;
  const selected = requested ? candidates.filter((candidate) => candidate.id === requested) : candidates;
  if (!selected.length) throw new Error(`Unknown trailer candidate: ${requested}`);
  for (const candidate of selected) await renderCandidate(candidate);
}

main().catch((error) => {
  console.error('[trailer-refresh] failed');
  console.error(error);
  process.exit(1);
});
