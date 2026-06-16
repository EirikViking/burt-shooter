import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { BOSS_SUPPORT_SHIPS } from '../src/config/BossSupportShips.js';
import {
  GENERATED_ENEMY_EXTRA_TOTAL,
  GENERATED_ENEMY_LEGACY_ASSET_COUNT
} from '../src/config/GeneratedEnemyProfiles.js';

const root = process.cwd();
const errors = [];
const GENERATED_SECTOR_SCENE_TOTAL = 240;

function fail(message) {
  errors.push(message);
}

function publicFile(publicPath) {
  return path.join(root, 'public', String(publicPath || '').replace(/^\//, ''));
}

function readPngInfo(file) {
  const buffer = fs.readFileSync(file);
  const pngSignature = buffer.subarray(0, 8).toString('hex');
  if (pngSignature !== '89504e470d0a1a0a') {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25),
    hash: createHash('sha256').update(buffer).digest('hex')
  };
}

const enemies = AssetManifest.generated?.enemies || [];
const sectors = AssetManifest.generated?.sectors || [];
const lateMayhem = enemies.slice(GENERATED_ENEMY_LEGACY_ASSET_COUNT);

if (sectors.length !== GENERATED_SECTOR_SCENE_TOTAL) {
  fail(`expected ${GENERATED_SECTOR_SCENE_TOTAL} generated sector scene entries, found ${sectors.length}`);
}

const sectorHashes = new Set();
for (const assetPath of sectors) {
  if (!assetPath.endsWith('.png')) {
    fail(`sector art must use generated scene PNGs, found ${assetPath}`);
    continue;
  }
  if (!assetPath.includes('/replacements/sector-scenes/')) {
    fail(`sector art points at the wrong asset family: ${assetPath}`);
  }
  const file = publicFile(assetPath);
  if (!fs.existsSync(file)) {
    fail(`missing sector scene art ${assetPath}`);
    continue;
  }
  const info = readPngInfo(file);
  if (!info) {
    fail(`sector scene art is not a PNG file: ${assetPath}`);
    continue;
  }
  if (info.width !== 640 || info.height !== 360) {
    fail(`sector scene art must stay 640x360, found ${info.width}x${info.height} for ${assetPath}`);
  }
  sectorHashes.add(info.hash);
}

if (sectorHashes.size !== sectors.length) {
  fail(`sector scene art should be unique, found ${sectorHashes.size}/${sectors.length} unique PNG hashes`);
}

if (lateMayhem.length !== GENERATED_ENEMY_EXTRA_TOTAL) {
  fail(`expected ${GENERATED_ENEMY_EXTRA_TOTAL} late-mayhem ship art entries, found ${lateMayhem.length}`);
}

const hashes = new Set();
for (const assetPath of lateMayhem) {
  if (!assetPath.endsWith('.png')) {
    fail(`late-mayhem ship art must use generated PNG cutouts, found ${assetPath}`);
    continue;
  }
  if (assetPath.includes('/replacements/sector') || assetPath.includes('/sprites/xtra-sprites/')) {
    fail(`late-mayhem ship art points at the wrong asset family: ${assetPath}`);
  }
  const file = publicFile(assetPath);
  if (!fs.existsSync(file)) {
    fail(`missing late-mayhem ship art ${assetPath}`);
    continue;
  }
  const info = readPngInfo(file);
  if (!info) {
    fail(`late-mayhem ship art is not a PNG file: ${assetPath}`);
    continue;
  }
  if (info.width !== 128 || info.height !== 128) {
    fail(`late-mayhem ship art must stay 128x128, found ${info.width}x${info.height} for ${assetPath}`);
  }
  if (info.colorType !== 6) {
    fail(`late-mayhem ship art must include alpha, found PNG color type ${info.colorType} for ${assetPath}`);
  }
  hashes.add(info.hash);
}

if (hashes.size !== lateMayhem.length) {
  fail(`late-mayhem ship art should be unique, found ${hashes.size}/${lateMayhem.length} unique PNG hashes`);
}

const haloButton = BOSS_SUPPORT_SHIPS.find((ship) => ship.displayName === 'Halo Button 2');
const haloButtonArt = enemies[haloButton?.spriteIndex ?? -1] || '';
if (!haloButton) {
  fail('missing Halo Button 2 boss support profile used by the screenshot regression check');
} else if (!haloButtonArt.endsWith('.png')) {
  fail(`Halo Button 2 should resolve to a generated PNG, found ${haloButtonArt || 'none'}`);
}

if (errors.length) {
  console.error(`[generated-ship-art] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `[generated-ship-art] PASS sectorScenes=${sectors.length} uniqueSectorPngs=${sectorHashes.size} ` +
  `lateMayhem=${lateMayhem.length} uniqueShipPngs=${hashes.size} ` +
  `haloButton2=${haloButtonArt}`
);
