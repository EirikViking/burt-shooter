import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const trailerRoot = path.resolve(process.env.TRAILER_CANDIDATE_ROOT || 'release/steam-trailer');
const draftDir = path.resolve(process.env.TRAILER_CANDIDATE_DRAFT_DIR || findLatestDraftDir(trailerRoot));
const inputVideo = path.resolve(process.env.TRAILER_CANDIDATE_INPUT || path.join(draftDir, 'nova-swarm-steam-trailer-audio-draft.mp4'));
const outputDir = path.resolve(process.env.TRAILER_CANDIDATE_OUTPUT_DIR || 'release/steam-trailer/candidate-2026-05-17-current');
const background = path.resolve(process.env.TRAILER_CANDIDATE_BG || 'release/steam-assets/draft-2026-05-17-nova-swarm/store_page_background_1438x810.jpg');
const titleFont = process.env.TRAILER_CANDIDATE_TITLE_FONT || 'C:/Windows/Fonts/ariblk.ttf';
const bodyFont = process.env.TRAILER_CANDIDATE_BODY_FONT || 'C:/Windows/Fonts/bahnschrift.ttf';
const outroStinger = path.resolve('public/audio/sfx/nova-swarm/nova_highscore_chime.mp3');
const outroSeconds = 4.2;

const paths = {
  outroPng: path.join(outputDir, '02-outro-card.png'),
  bodyMp4: path.join(outputDir, 'body-trailer.mp4'),
  outroMp4: path.join(outputDir, 'outro-card.mp4'),
  concatList: path.join(outputDir, 'concat.txt'),
  outputVideo: path.join(outputDir, 'nova-swarm-steam-trailer-candidate.mp4'),
  contactSheet: path.join(outputDir, 'candidate-contact-sheet.png'),
  report: path.join(outputDir, 'report.json')
};

function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return { error: error.message };
  }
}

function findLatestDraftDir(root) {
  if (!existsSync(root)) throw new Error(`Trailer root missing: ${root}`);
  const drafts = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('draft-'))
    .map((entry) => path.join(root, entry.name))
    .sort();
  if (!drafts.length) throw new Error(`No trailer draft directories found in ${root}`);
  return drafts[drafts.length - 1];
}

function assertFile(file, label) {
  if (!existsSync(file)) throw new Error(`Missing ${label}: ${file}`);
}

function normalize(file) {
  return path.resolve(file).replaceAll('\\', '/').replaceAll("'", "'\\''");
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

async function renderCardPng(output, title, subtitle, footer) {
  await run('magick', [
    background,
    '-resize', '1280x720^',
    '-gravity', 'center',
    '-extent', '1280x720',
    '-fill', 'rgba(1,5,14,0.48)',
    '-draw', 'rectangle 0,0 1280,720',
    '-fill', 'rgba(0,255,204,0.18)',
    '-draw', 'rectangle 0,92 1280,98',
    '-draw', 'rectangle 0,622 1280,628',
    '-font', titleFont,
    '-fill', '#f7fbff',
    '-pointsize', '92',
    '-gravity', 'center',
    '-annotate', '+0-66', title,
    '-font', bodyFont,
    '-fill', '#8ffcff',
    '-pointsize', '34',
    '-annotate', '+0+24', subtitle,
    '-fill', '#fff1a8',
    '-pointsize', '24',
    '-annotate', '+0+252', footer,
    output
  ]);
}

async function renderCardVideo(image, audio, output, duration, volume) {
  await run('ffmpeg', [
    '-y',
    '-loop', '1',
    '-framerate', '25',
    '-t', String(duration),
    '-i', image,
    '-i', audio,
    '-filter_complex', `[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${volume},afade=t=in:st=0:d=0.25,afade=t=out:st=${Math.max(0, duration - 0.45).toFixed(2)}:d=0.45,apad=pad_dur=${duration}[a]`,
    '-map', '0:v:0',
    '-map', '[a]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', '25',
    '-c:a', 'aac',
    '-ar', '48000',
    '-ac', '2',
    '-b:a', '192k',
    '-t', String(duration),
    '-movflags', '+faststart',
    output
  ]);
}

async function renderBodyVideo() {
  await run('ffmpeg', [
    '-y',
    '-i', inputVideo,
    '-vf', 'scale=1280:720,setsar=1,fps=25,format=yuv420p',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',
    '-c:a', 'aac',
    '-ar', '48000',
    '-ac', '2',
    '-b:a', '192k',
    '-movflags', '+faststart',
    paths.bodyMp4
  ]);
}

async function concatVideos() {
  writeFileSync(paths.concatList, [
    `file '${normalize(paths.bodyMp4)}'`,
    `file '${normalize(paths.outroMp4)}'`
  ].join('\n') + '\n');

  await run('ffmpeg', [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', paths.concatList,
    '-c', 'copy',
    '-movflags', '+faststart',
    paths.outputVideo
  ]);
}

async function ffprobe(file) {
  const result = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=codec_name,width,height,r_frame_rate,duration:format=duration,size,bit_rate',
    '-of', 'json',
    file
  ]);
  return JSON.parse(result.stdout);
}

async function volumedetect(file) {
  const sink = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const result = await run('ffmpeg', ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', sink]);
  const text = result.stderr;
  return {
    meanVolumeDb: text.match(/mean_volume:\s*([-\d.]+) dB/)?.[1] || null,
    maxVolumeDb: text.match(/max_volume:\s*([-\d.]+) dB/)?.[1] || null
  };
}

async function extractContactSheet(duration) {
  const times = [1.2, 4.2, 16.0, 31.0, Math.max(1, duration - 1.2)];
  const frames = [];
  for (const [index, time] of times.entries()) {
    const frame = path.join(outputDir, `frame-${String(index + 1).padStart(2, '0')}.jpg`);
    await run('ffmpeg', ['-y', '-ss', time.toFixed(2), '-i', paths.outputVideo, '-frames:v', '1', '-q:v', '2', '-update', '1', frame]);
    frames.push(frame);
  }
  await run('magick', [
    ...frames,
    '-resize', '384x216',
    '-background', '#060b18',
    '-bordercolor', '#17223f',
    '-border', '4',
    '+append',
    paths.contactSheet
  ]);
  return frames;
}

async function main() {
  assertFile(inputVideo, 'audio trailer draft');
  assertFile(background, 'Steam background art');
  assertFile(outroStinger, 'outro card stinger');
  mkdirSync(outputDir, { recursive: true });

  await renderCardPng(paths.outroPng, 'CHASE THE SWARM', 'DODGE. SCORE. BRAG.', 'STEAM RELEASE CANDIDATE - PENDING HUMAN APPROVAL');
  await renderBodyVideo();
  await renderCardVideo(paths.outroPng, outroStinger, paths.outroMp4, outroSeconds, 0.42);
  await concatVideos();

  const probe = await ffprobe(paths.outputVideo);
  const duration = Number(probe.format?.duration || 0);
  const volume = await volumedetect(paths.outputVideo);
  const frames = await extractContactSheet(duration);

  const report = {
    generatedAt: new Date().toISOString(),
    status: duration >= 30 && duration <= 45 && probe.streams?.some((stream) => stream.codec_name === 'h264') ? 'passed' : 'needs_review',
    inputVideo,
    outputVideo: paths.outputVideo,
    build: readJson(path.join(draftDir, 'audio-mix-report.json'))?.build || readJson(path.join(draftDir, 'report.json'))?.build || null,
    opening: 'gameplay_first',
    titleCards: [
      { image: paths.outroPng, durationSeconds: outroSeconds, title: 'CHASE THE SWARM', subtitle: 'DODGE. SCORE. BRAG.' }
    ],
    contactSheet: paths.contactSheet,
    frames,
    notes: [
      'Editorial Steam trailer candidate starts on captured gameplay: no logo-first opening, no lore card, no menu dwell.',
      'Still requires human by-ear and store-submission approval before Steam upload.'
    ],
    ffprobe: probe,
    volume
  };
  writeFileSync(paths.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[trailer-candidate] wrote ${paths.outputVideo}`);
  console.log(`[trailer-candidate] wrote ${paths.report}`);
}

main().catch((error) => {
  console.error('[trailer-candidate] failed');
  console.error(error);
  process.exit(1);
});
