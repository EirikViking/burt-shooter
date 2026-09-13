import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { AssetManifest } from '../src/assets/assetManifest.js';
import {
  ALL_POWERUP_TYPES,
  NEW_POWERUP_TYPES,
  SPECTACLE_EXPANSION_POWERUP_TYPES
} from '../src/config/PowerupCatalog.js';

const requiredPowerups = [...ALL_POWERUP_TYPES, 'bonus_core'];

function pngDimensions(filePath) {
  const bytes = readFileSync(filePath);
  const signature = bytes.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`${filePath} is not a PNG`);
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

const root = process.cwd();
const generatedPowerups = AssetManifest.generated?.powerups || {};
const errors = [];

for (const key of requiredPowerups) {
  const url = generatedPowerups[key] || (key === 'bonus_core' ? AssetManifest.sprites?.bonusCore : null);
  if (!url) {
    errors.push(`Missing AssetManifest.generated.powerups.${key}`);
    continue;
  }
  const premiumRail = key === 'rail_surge' && url === '/art/celebration-polish-20260908/hyper-rail.png';
  if (!premiumRail && !url.startsWith('/art/generated/nova-swarm/powerups/')) {
    errors.push(`${key} should use generated Nova Swarm powerup art, got ${url}`);
  }
  const filePath = path.join(root, 'public', url.replace(/^\//, ''));
  if (!existsSync(filePath)) {
    errors.push(`${key} asset missing on disk: ${url}`);
    continue;
  }
  try {
    const { width, height } = pngDimensions(filePath);
    // Row Core's existing approved artwork was replaced at native resolution
    // in ed3f925. Keep the size contract explicit for that exact asset slot.
    const premiumRowCore = key === 'row_core' && url === '/art/generated/nova-swarm/powerups/nova-powerup-row_core-20260613.png';
    const expectedSize = premiumRail || premiumRowCore ? 1254 : 192;
    if (width !== expectedSize || height !== expectedSize) {
      errors.push(`${key} expected ${expectedSize}x${expectedSize} PNG, got ${width}x${height}: ${url}`);
    }
  } catch (error) {
    errors.push(error.message);
  }
}

if (AssetManifest.sprites?.bonusCore !== generatedPowerups.bonus_core) {
  errors.push('AssetManifest.sprites.bonusCore must point at generatedPowerups.bonus_core');
}

const reviewSheet = path.join(root, 'public/art/generated/nova-swarm/powerups/nova-powerups-contact-sheet-20260519.jpg');
if (!existsSync(reviewSheet)) {
  errors.push('Powerup contact sheet missing: public/art/generated/nova-swarm/powerups/nova-powerups-contact-sheet-20260519.jpg');
}

const refreshedBatchReviewSheet = path.join(root, 'public/art/generated/nova-swarm/powerups/nova-powerups-contact-sheet-20260617-new-batch.png');
if (!existsSync(refreshedBatchReviewSheet)) {
  errors.push('Refreshed 2026-06-13 powerup review sheet missing: public/art/generated/nova-swarm/powerups/nova-powerups-contact-sheet-20260617-new-batch.png');
}

const spectacleRefreshReviewSheet = path.join(root, 'public/art/generated/nova-swarm/powerups/nova-powerups-contact-sheet-20260714-refresh.png');
if (!existsSync(spectacleRefreshReviewSheet)) {
  errors.push('Refreshed spectacle powerup review sheet missing: public/art/generated/nova-swarm/powerups/nova-powerups-contact-sheet-20260714-refresh.png');
}

const imagegenNormalizeScript = path.join(root, 'scripts/normalize-powerup-imagegen-icons-20260617.py');
if (!existsSync(imagegenNormalizeScript)) {
  errors.push('Imagegen powerup normalization script missing: scripts/normalize-powerup-imagegen-icons-20260617.py');
}

const imagegenSourceDir = path.join(root, 'public/art/generated/nova-swarm/powerups/imagegen-source-20260617');
const spectacleExpansionSourceDir = path.join(root, 'public/art/generated/nova-swarm/powerups/design-source-20260713-spectacle-expansion');
const spectacleExpansionTypes = new Set(SPECTACLE_EXPANSION_POWERUP_TYPES);
const sourceDirByPowerup = new Map([
  ['super_extra_life', path.join(root, 'public/art/generated/nova-swarm/powerups/imagegen-source-20260626')],
  ['nova_miracle', path.join(root, 'public/art/generated/nova-swarm/powerups/imagegen-source-20260713')]
]);
const expectedAssetSuffixByPowerup = new Map([
  ['rail_surge', '/hyper-rail.png'],
  ['super_extra_life', '-20260626.png'],
  ['nova_miracle', '-20260713.png']
]);

for (const key of NEW_POWERUP_TYPES) {
  const sourcePath = path.join(
    spectacleExpansionTypes.has(key)
      ? spectacleExpansionSourceDir
      : sourceDirByPowerup.get(key) || imagegenSourceDir,
    `${key}.png`
  );
  if (!existsSync(sourcePath)) {
    errors.push(`${key} imagegen source icon missing: ${sourcePath}`);
  }
}

for (const key of NEW_POWERUP_TYPES) {
  const url = generatedPowerups[key] || '';
  const expectedSuffix = spectacleExpansionTypes.has(key)
    ? '-20260714.png'
    : expectedAssetSuffixByPowerup.get(key) || '-20260613.png';
  if (!url.endsWith(expectedSuffix)) {
    errors.push(`${key} should stay on the expected powerup asset slot ${expectedSuffix}, got ${url || 'missing'}`);
  }
}

if (errors.length) {
  console.error('[powerup-assets] failed');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[powerup-assets] ok: ${requiredPowerups.length} generated powerup icons`);

// Keep the perceptual and small-size safeguards on every build path that already
// treats this manifest check as the authoritative powerup-art gate.
await import('./check-powerup-icon-distinctness.mjs');
