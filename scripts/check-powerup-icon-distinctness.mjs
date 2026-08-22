import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { AssetManifest } from '../src/assets/assetManifest.js';
import { ALL_POWERUP_TYPES } from '../src/config/PowerupCatalog.js';

const REQUIRED_SIZE = 192;
const GAMEPLAY_SIZE = 48;
const FINGERPRINT_SIZE = 16;
const MAX_NEAR_IDENTICAL_DHASH_BITS = 10;
const MAX_NEAR_IDENTICAL_RMSE = 0.04;
const MIN_NEAR_IDENTICAL_CORRELATION = 0.96;
const MIN_SMALL_VISIBLE_PIXELS = 120;
const MIN_SMALL_LUMA_DEVIATION = 0.075;

const AFFECTED_PAIRS = Object.freeze([
  ['overdrive_core', 'jackpot_lens'],
  ['slow_time', 'chrono_anchor'],
  ['shield', 'aegis_burst'],
  ['life', 'mercy_protocol'],
  ['rapid_fire', 'saw_matrix'],
  ['double_shot', 'ion_dash'],
  ['speed_up', 'rail_surge'],
  ['pierce', 'prism_splitter'],
  ['score_x2', 'score_fever'],
  ['magnet', 'nano_patch'],
  ['drones', 'drone_carousel'],
  ['bomb', 'pulse_refund'],
  ['orbital_strike', 'plasma_lance']
]);

const root = process.cwd();
const assetRoot = path.resolve(process.env.POWERUP_ASSET_ROOT || path.join(root, 'public'));
const errors = [];
const records = new Map();

function assetPathFor(type) {
  const url = AssetManifest.generated?.powerups?.[type];
  if (!url) return null;
  return path.join(assetRoot, url.replace(/^\//, ''));
}

function hammingDistance(first, second) {
  let distance = 0;
  for (let index = 0; index < Math.min(first.length, second.length); index += 1) {
    if (first[index] !== second[index]) distance += 1;
  }
  return distance + Math.abs(first.length - second.length);
}

function rmse(first, second) {
  const count = Math.min(first.length, second.length);
  let sum = 0;
  for (let index = 0; index < count; index += 1) {
    const delta = first[index] - second[index];
    sum += delta * delta;
  }
  return Math.sqrt(sum / Math.max(1, count)) / 255;
}

function correlation(first, second) {
  const count = Math.min(first.length, second.length);
  const firstMean = first.slice(0, count).reduce((sum, value) => sum + value, 0) / Math.max(1, count);
  const secondMean = second.slice(0, count).reduce((sum, value) => sum + value, 0) / Math.max(1, count);
  let numerator = 0;
  let firstEnergy = 0;
  let secondEnergy = 0;
  for (let index = 0; index < count; index += 1) {
    const firstDelta = first[index] - firstMean;
    const secondDelta = second[index] - secondMean;
    numerator += firstDelta * secondDelta;
    firstEnergy += firstDelta * firstDelta;
    secondEnergy += secondDelta * secondDelta;
  }
  return numerator / Math.max(1, Math.sqrt(firstEnergy * secondEnergy));
}

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function inspect(type, filePath) {
  const bytes = readFileSync(filePath);
  const image = sharp(bytes, { failOn: 'error' });
  const metadata = await image.metadata();
  if (metadata.format !== 'png') errors.push(`${type}: expected PNG, got ${metadata.format || 'unknown'}`);
  if (metadata.width !== REQUIRED_SIZE || metadata.height !== REQUIRED_SIZE) {
    errors.push(`${type}: expected ${REQUIRED_SIZE}x${REQUIRED_SIZE}, got ${metadata.width}x${metadata.height}`);
  }
  if (!metadata.hasAlpha || metadata.channels !== 4) errors.push(`${type}: PNG must have an alpha channel`);

  const { data: nativePixels, info: nativeInfo } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparentPixels = 0;
  let edgeVisiblePixels = 0;
  for (let y = 0; y < nativeInfo.height; y += 1) {
    for (let x = 0; x < nativeInfo.width; x += 1) {
      const alpha = nativePixels[(y * nativeInfo.width + x) * 4 + 3];
      if (alpha === 0) transparentPixels += 1;
      if ((x === 0 || y === 0 || x === nativeInfo.width - 1 || y === nativeInfo.height - 1) && alpha > 8) {
        edgeVisiblePixels += 1;
      }
    }
  }
  if (transparentPixels === 0) errors.push(`${type}: transparent background is missing`);
  if (edgeVisiblePixels > 0) errors.push(`${type}: ${edgeVisiblePixels} visible pixels touch the canvas edge`);

  const { data: smallPixels } = await sharp(bytes)
    .resize(GAMEPLAY_SIZE, GAMEPLAY_SIZE, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const visibleLuma = [];
  for (let index = 0; index < smallPixels.length; index += 4) {
    const alpha = smallPixels[index + 3];
    if (alpha < 24) continue;
    visibleLuma.push(luma(smallPixels[index], smallPixels[index + 1], smallPixels[index + 2]));
  }
  if (visibleLuma.length < MIN_SMALL_VISIBLE_PIXELS) {
    errors.push(`${type}: only ${visibleLuma.length} visible pixels survive at ${GAMEPLAY_SIZE}px`);
  }
  const mean = visibleLuma.reduce((sum, value) => sum + value, 0) / Math.max(1, visibleLuma.length);
  const deviation = Math.sqrt(
    visibleLuma.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / Math.max(1, visibleLuma.length)
  ) / 255;
  if (deviation < MIN_SMALL_LUMA_DEVIATION) {
    errors.push(`${type}: small-size luminance deviation ${deviation.toFixed(3)} is below ${MIN_SMALL_LUMA_DEVIATION}`);
  }

  // Compare the symbol-dominant inner half so shared Nova framing cannot hide reused artwork.
  const cropInset = Math.round(REQUIRED_SIZE * 0.25);
  const cropSize = REQUIRED_SIZE - cropInset * 2;
  const { data: fingerprintPixels } = await sharp(bytes)
    .extract({ left: cropInset, top: cropInset, width: cropSize, height: cropSize })
    .flatten({ background: '#020812' })
    .resize(FINGERPRINT_SIZE + 1, FINGERPRINT_SIZE, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const fingerprint = [];
  const samples = [];
  for (let y = 0; y < FINGERPRINT_SIZE; y += 1) {
    for (let x = 0; x < FINGERPRINT_SIZE; x += 1) {
      const offset = y * (FINGERPRINT_SIZE + 1) + x;
      fingerprint.push(fingerprintPixels[offset] > fingerprintPixels[offset + 1] ? 1 : 0);
      samples.push(fingerprintPixels[offset]);
    }
  }

  return {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    fingerprint,
    samples
  };
}

for (const type of ALL_POWERUP_TYPES) {
  const filePath = assetPathFor(type);
  if (!filePath) {
    errors.push(`${type}: no AssetManifest.generated.powerups mapping`);
    continue;
  }
  if (!existsSync(filePath)) {
    errors.push(`${type}: mapped asset is missing: ${filePath}`);
    continue;
  }
  try {
    records.set(type, await inspect(type, filePath));
  } catch (error) {
    errors.push(`${type}: ${error.message}`);
  }
}

for (const [firstType, secondType] of AFFECTED_PAIRS) {
  const first = records.get(firstType);
  const second = records.get(secondType);
  if (!first || !second) continue;
  if (first.sha256 === second.sha256) {
    errors.push(`${firstType} / ${secondType}: assets are byte-identical`);
    continue;
  }
  const hashDistance = hammingDistance(first.fingerprint, second.fingerprint);
  const sampleRmse = rmse(first.samples, second.samples);
  const sampleCorrelation = correlation(first.samples, second.samples);
  if (
    hashDistance <= MAX_NEAR_IDENTICAL_DHASH_BITS
    || sampleRmse <= MAX_NEAR_IDENTICAL_RMSE
    || sampleCorrelation >= MIN_NEAR_IDENTICAL_CORRELATION
  ) {
    errors.push(
      `${firstType} / ${secondType}: perceptually near-identical ` +
      `(dHash distance ${hashDistance}, RMSE ${sampleRmse.toFixed(3)}, correlation ${sampleCorrelation.toFixed(3)})`
    );
  }
}

if (errors.length) {
  console.error('[powerup-icon-distinctness] FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `[powerup-icon-distinctness] PASS catalog=${records.size} pairs=${AFFECTED_PAIRS.length} ` +
  `native=${REQUIRED_SIZE}px gameplay=${GAMEPLAY_SIZE}px`
);
