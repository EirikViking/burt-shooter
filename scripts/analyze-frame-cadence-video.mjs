import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function parseArgs(argv) {
  const options = {
    start: 0,
    duration: 10,
    fps: 60,
    width: 160,
    height: 90,
    madThreshold: 0.2,
    minFreshFps: 55,
    maxP95FreshIntervalMs: 25,
    maxFreshIntervalMs: 100,
    maxNearDuplicateRatio: 0.1,
    expectRegression: false
  };
  const positional = [];
  const valueFlags = new Map([
    ['--start', 'start'],
    ['--duration', 'duration'],
    ['--fps', 'fps'],
    ['--width', 'width'],
    ['--height', 'height'],
    ['--mad-threshold', 'madThreshold'],
    ['--min-fresh-fps', 'minFreshFps'],
    ['--max-p95-fresh-interval-ms', 'maxP95FreshIntervalMs'],
    ['--max-fresh-interval-ms', 'maxFreshIntervalMs'],
    ['--max-near-duplicate-ratio', 'maxNearDuplicateRatio'],
    ['--report', 'reportPath'],
    ['--label', 'label'],
    ['--environment', 'environment'],
    ['--display-mode', 'displayMode'],
    ['--capture-mode', 'captureMode'],
    ['--vsync', 'vsync'],
    ['--focus', 'focus'],
    ['--visibility', 'visibility']
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--expect-regression') {
      options.expectRegression = true;
      continue;
    }
    if (valueFlags.has(arg)) {
      const value = argv[index + 1];
      if (value == null) throw new Error(`Missing value for ${arg}`);
      options[valueFlags.get(arg)] = value;
      index += 1;
      continue;
    }
    if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    positional.push(arg);
  }

  if (positional.length !== 1) {
    throw new Error('Usage: node scripts/analyze-frame-cadence-video.mjs <video> [--start 0] [--duration 10] [--expect-regression]');
  }

  for (const key of [
    'start',
    'duration',
    'fps',
    'width',
    'height',
    'madThreshold',
    'minFreshFps',
    'maxP95FreshIntervalMs',
    'maxFreshIntervalMs',
    'maxNearDuplicateRatio'
  ]) {
    options[key] = Number(options[key]);
    if (!Number.isFinite(options[key])) throw new Error(`Invalid numeric value for ${key}`);
  }
  options.input = path.resolve(positional[0]);
  return options;
}

function run(executable, args, options = {}) {
  const result = spawnSync(executable, args, {
    encoding: options.binary ? null : 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString('utf8') : result.stderr;
    throw new Error(`${executable} exited ${result.status}: ${String(stderr || '').trim()}`);
  }
  return result.stdout;
}

function percentile(sortedValues, percentileValue) {
  if (!sortedValues.length) return null;
  const position = (sortedValues.length - 1) * percentileValue;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function stats(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return {
    count: sorted.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted.length ? sorted.at(-1) : null
  };
}

function exactHash(frame) {
  return createHash('sha256').update(frame).digest('hex').slice(0, 24);
}

function perceptualHash(frame, width, height) {
  const columns = 16;
  const rows = 9;
  const blockWidth = width / columns;
  const blockHeight = height / rows;
  const samples = [];
  let overall = 0;
  for (const value of frame) overall += value;
  overall /= frame.length;

  for (let blockY = 0; blockY < rows; blockY += 1) {
    for (let blockX = 0; blockX < columns; blockX += 1) {
      let sum = 0;
      let count = 0;
      const xStart = Math.floor(blockX * blockWidth);
      const xEnd = Math.floor((blockX + 1) * blockWidth);
      const yStart = Math.floor(blockY * blockHeight);
      const yEnd = Math.floor((blockY + 1) * blockHeight);
      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = xStart; x < xEnd; x += 1) {
          sum += frame[y * width + x];
          count += 1;
        }
      }
      samples.push((sum / Math.max(1, count)) >= overall ? 1 : 0);
    }
  }

  let result = '';
  for (let index = 0; index < samples.length; index += 4) {
    const nibble = (samples[index] << 3)
      | (samples[index + 1] << 2)
      | (samples[index + 2] << 1)
      | samples[index + 3];
    result += nibble.toString(16);
  }
  return result;
}

function meanAbsoluteDifference(previous, current) {
  let total = 0;
  for (let index = 0; index < current.length; index += 1) {
    total += Math.abs(current[index] - previous[index]);
  }
  return total / current.length;
}

function histogram(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((a, b) => Number(a[0]) - Number(b[0])));
}

function round(value, digits = 4) {
  return value == null ? null : Number(value.toFixed(digits));
}

const options = parseArgs(process.argv.slice(2));
if (!existsSync(options.input)) throw new Error(`Video not found: ${options.input}`);
if (options.duration <= 0 || options.fps <= 0 || options.width <= 0 || options.height <= 0) {
  throw new Error('Duration, fps, width, and height must be positive');
}

const ffprobeRaw = run('ffprobe', [
  '-v', 'error',
  '-select_streams', 'v:0',
  '-show_entries', 'stream=width,height,r_frame_rate,avg_frame_rate,nb_frames:format=duration',
  '-of', 'json',
  options.input
]);
const ffprobe = JSON.parse(ffprobeRaw);
const ffmpegVersion = String(run('ffmpeg', ['-version'])).split(/\r?\n/, 1)[0];
const rawVideo = run('ffmpeg', [
  '-v', 'error',
  '-ss', String(options.start),
  '-t', String(options.duration),
  '-i', options.input,
  '-an',
  '-vf', `fps=${options.fps},scale=${options.width}:${options.height}:flags=area,format=gray`,
  '-pix_fmt', 'gray',
  '-f', 'rawvideo',
  'pipe:1'
], { binary: true });

const frameBytes = options.width * options.height;
const frameCount = Math.floor(rawVideo.length / frameBytes);
if (frameCount < 2) throw new Error(`Only ${frameCount} frame(s) decoded`);
const trailingBytes = rawVideo.length % frameBytes;
const frameDurationMs = 1000 / options.fps;
const frames = [];
const freshFrameIndices = [];
const duplicateRuns = [];
let currentDuplicateRun = 0;
let previous = null;

for (let index = 0; index < frameCount; index += 1) {
  const frame = rawVideo.subarray(index * frameBytes, (index + 1) * frameBytes);
  const mad = previous ? meanAbsoluteDifference(previous, frame) : null;
  const changed = index === 0 || mad > options.madThreshold;
  if (changed) {
    freshFrameIndices.push(index);
    if (currentDuplicateRun) duplicateRuns.push(currentDuplicateRun);
    currentDuplicateRun = 0;
  } else {
    currentDuplicateRun += 1;
  }
  frames.push({
    index,
    timestampMs: round(index * frameDurationMs, 3),
    exactHash: exactHash(frame),
    perceptualHash: perceptualHash(frame, options.width, options.height),
    meanAbsoluteDifference: round(mad, 6),
    markerChanged: changed,
    nearDuplicate: !changed
  });
  previous = frame;
}
if (currentDuplicateRun) duplicateRuns.push(currentDuplicateRun);

const freshFrameGaps = [];
for (let index = 1; index < freshFrameIndices.length; index += 1) {
  freshFrameGaps.push(freshFrameIndices[index] - freshFrameIndices[index - 1]);
}
const freshIntervalsMs = freshFrameGaps.map((gap) => gap * frameDurationMs);
const analyzedDurationSeconds = frameCount / options.fps;
const freshFrameCount = freshFrameIndices.length;
const nearDuplicateCount = frameCount - freshFrameCount;
const effectiveFreshFps = freshFrameCount / analyzedDurationSeconds;
const nearDuplicateRatio = nearDuplicateCount / frameCount;
const threeFrameStrideCount = freshFrameGaps.filter((gap) => gap === 3).length;
const threeFrameStrideRatio = freshFrameGaps.length ? threeFrameStrideCount / freshFrameGaps.length : 0;
const freshIntervalStats = stats(freshIntervalsMs);
const repeatingOneNewTwoRepeated = effectiveFreshFps >= 15
  && effectiveFreshFps <= 25
  && threeFrameStrideRatio >= 0.3;

const failures = [];
if (effectiveFreshFps < options.minFreshFps) {
  failures.push(`effective fresh FPS ${effectiveFreshFps.toFixed(2)} below ${options.minFreshFps}`);
}
if ((freshIntervalStats.p95 ?? Infinity) > options.maxP95FreshIntervalMs) {
  failures.push(`fresh-frame interval p95 ${freshIntervalStats.p95?.toFixed(2) ?? 'missing'} ms above ${options.maxP95FreshIntervalMs} ms`);
}
if ((freshIntervalStats.max ?? Infinity) >= options.maxFreshIntervalMs) {
  failures.push(`fresh-frame interval max ${freshIntervalStats.max?.toFixed(2) ?? 'missing'} ms not below ${options.maxFreshIntervalMs} ms`);
}
if (nearDuplicateRatio > options.maxNearDuplicateRatio) {
  failures.push(`near-duplicate ratio ${(nearDuplicateRatio * 100).toFixed(2)}% above ${(options.maxNearDuplicateRatio * 100).toFixed(2)}%`);
}
if (repeatingOneNewTwoRepeated) {
  failures.push(`stable one-new-plus-two-repeated cadence detected (${(threeFrameStrideRatio * 100).toFixed(2)}% of fresh-frame gaps are three encoded frames)`);
}

const reportPath = path.resolve(
  options.reportPath
    || path.join('test-results', `frame-cadence-video-${timestamp()}`, 'report.json')
);
mkdirSync(path.dirname(reportPath), { recursive: true });
const report = {
  status: failures.length ? 'failed' : 'passed',
  label: options.label || path.basename(options.input),
  source: {
    path: options.input,
    probe: ffprobe,
    startSeconds: options.start,
    requestedDurationSeconds: options.duration
  },
  context: {
    environment: options.environment || null,
    displayMode: options.displayMode || null,
    captureMode: options.captureMode || null,
    vsync: options.vsync || null,
    focus: options.focus || null,
    visibility: options.visibility || null
  },
  analyzer: {
    ffmpegVersion,
    targetFps: options.fps,
    analysisSize: { width: options.width, height: options.height },
    madThreshold: options.madThreshold,
    decodedFrames: frameCount,
    trailingBytes,
    analyzedDurationSeconds: round(analyzedDurationSeconds, 6)
  },
  cadence: {
    freshFrameCount,
    nearDuplicateCount,
    effectiveFreshFps: round(effectiveFreshFps, 6),
    nearDuplicateRatio: round(nearDuplicateRatio, 6),
    freshFrameIntervalMs: Object.fromEntries(
      Object.entries(freshIntervalStats).map(([key, value]) => [key, round(value, 6)])
    ),
    countsOverMs: {
      '25': freshIntervalsMs.filter((value) => value > 25).length,
      '33.3': freshIntervalsMs.filter((value) => value > (1000 / 30)).length,
      '50': freshIntervalsMs.filter((value) => value > 50).length,
      '100': freshIntervalsMs.filter((value) => value > 100).length
    },
    freshFrameGapHistogram: histogram(freshFrameGaps),
    duplicateRunLengthHistogram: histogram(duplicateRuns),
    threeFrameStrideCount,
    threeFrameStrideRatio: round(threeFrameStrideRatio, 6),
    repeatingOneNewTwoRepeated
  },
  thresholds: {
    minFreshFps: options.minFreshFps,
    maxP95FreshIntervalMs: options.maxP95FreshIntervalMs,
    maxFreshIntervalMs: options.maxFreshIntervalMs,
    maxNearDuplicateRatio: options.maxNearDuplicateRatio
  },
  failures,
  frames
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const relativeReport = path.relative(process.cwd(), reportPath).replaceAll(path.sep, '/');
console.log(`[frame-cadence-video] ${report.status.toUpperCase()} fresh_fps=${effectiveFreshFps.toFixed(2)} near_duplicates=${(nearDuplicateRatio * 100).toFixed(2)}% stride3=${(threeFrameStrideRatio * 100).toFixed(2)}% report=${relativeReport}`);
if (options.expectRegression) {
  if (!failures.length) {
    console.error('[frame-cadence-video] Expected a regression, but the sample passed');
    process.exit(1);
  }
} else if (failures.length) {
  process.exit(1);
}
