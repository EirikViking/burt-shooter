import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { AssetManifest } from '../src/assets/assetManifest.js';
import { ALL_POWERUP_TYPES, NEW_POWERUP_TYPES } from '../src/config/PowerupCatalog.js';

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
  if (!url.startsWith('/art/generated/nova-swarm/powerups/')) {
    errors.push(`${key} should use generated Nova Swarm powerup art, got ${url}`);
  }
  const filePath = path.join(root, 'public', url.replace(/^\//, ''));
  if (!existsSync(filePath)) {
    errors.push(`${key} asset missing on disk: ${url}`);
    continue;
  }
  try {
    const { width, height } = pngDimensions(filePath);
    if (width !== 192 || height !== 192) {
      errors.push(`${key} expected 192x192 PNG, got ${width}x${height}: ${url}`);
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

const imagegenNormalizeScript = path.join(root, 'scripts/normalize-powerup-imagegen-icons-20260617.py');
if (!existsSync(imagegenNormalizeScript)) {
  errors.push('Imagegen powerup normalization script missing: scripts/normalize-powerup-imagegen-icons-20260617.py');
}

const imagegenSourceDir = path.join(root, 'public/art/generated/nova-swarm/powerups/imagegen-source-20260617');
const sourceDirByPowerup = new Map([
  ['super_extra_life', path.join(root, 'public/art/generated/nova-swarm/powerups/imagegen-source-20260626')]
]);
const expectedAssetSuffixByPowerup = new Map([
  ['super_extra_life', '-20260626.png']
]);

for (const key of NEW_POWERUP_TYPES) {
  const sourcePath = path.join(sourceDirByPowerup.get(key) || imagegenSourceDir, `${key}.png`);
  if (!existsSync(sourcePath)) {
    errors.push(`${key} imagegen source icon missing: ${sourcePath}`);
  }
}

for (const key of NEW_POWERUP_TYPES) {
  const url = generatedPowerups[key] || '';
  const expectedSuffix = expectedAssetSuffixByPowerup.get(key) || '-20260613.png';
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
