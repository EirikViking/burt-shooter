import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

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

function readPngRgba(file) {
  const buffer = fs.readFileSync(file);
  const pngSignature = buffer.subarray(0, 8).toString('hex');
  if (pngSignature !== '89504e470d0a1a0a') return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer.readUInt8(24);
  const colorType = buffer.readUInt8(25);
  if (bitDepth !== 8 || colorType !== 6) return null;

  const idat = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (type === 'IDAT') idat.push(buffer.subarray(dataStart, dataEnd));
    offset = dataEnd + 4;
    if (type === 'IEND') break;
  }
  if (!idat.length) return null;

  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const rgba = Buffer.alloc(stride * height);
  let inputOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const rowOffset = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[inputOffset];
      inputOffset += 1;
      const left = x >= bytesPerPixel ? rgba[rowOffset + x - bytesPerPixel] : 0;
      const up = previous[x] || 0;
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] || 0 : 0;
      let value = raw;
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) {
        const predictor = left + up - upLeft;
        const pa = Math.abs(predictor - left);
        const pb = Math.abs(predictor - up);
        const pc = Math.abs(predictor - upLeft);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      } else if (filter !== 0) {
        return null;
      }
      rgba[rowOffset + x] = value & 0xff;
    }
    previous = rgba.subarray(rowOffset, rowOffset + stride);
  }

  return { width, height, rgba };
}

function alphaComponents(image, alphaThreshold = 8) {
  if (!image?.rgba) return [];
  const { width, height, rgba } = image;
  const visited = new Uint8Array(width * height);
  const components = [];
  const queue = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x;
      if (visited[startIndex] || rgba[startIndex * 4 + 3] <= alphaThreshold) continue;
      let count = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      visited[startIndex] = 1;
      queue.length = 0;
      queue.push(startIndex);
      for (let qi = 0; qi < queue.length; qi += 1) {
        const index = queue[qi];
        const px = index % width;
        const py = Math.floor(index / width);
        count += 1;
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
        const neighbors = [
          px > 0 ? index - 1 : -1,
          px < width - 1 ? index + 1 : -1,
          py > 0 ? index - width : -1,
          py < height - 1 ? index + width : -1
        ];
        for (const neighbor of neighbors) {
          if (neighbor < 0 || visited[neighbor] || rgba[neighbor * 4 + 3] <= alphaThreshold) continue;
          visited[neighbor] = 1;
          queue.push(neighbor);
        }
      }
      components.push({ count, minX, minY, maxX, maxY });
    }
  }
  components.sort((a, b) => b.count - a.count);
  return components;
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

const grudgeSaintSpriteIndex = 59;
const grudgeSaintArt = enemies[grudgeSaintSpriteIndex] || '';
const grudgeSaintFile = grudgeSaintArt ? publicFile(grudgeSaintArt) : '';
if (!grudgeSaintArt.endsWith('/late-mayhem/nova-late-mayhem-enemy-010.png')) {
  fail(`Grudge Saint should keep its reviewed late-mayhem art, found ${grudgeSaintArt || 'none'}`);
} else if (!fs.existsSync(grudgeSaintFile)) {
  fail(`missing Grudge Saint art ${grudgeSaintArt}`);
} else {
  const components = alphaComponents(readPngRgba(grudgeSaintFile), 8).filter((component) => component.count >= 16);
  if (components.length !== 1) {
    fail(
      `Grudge Saint art should be one connected visible cutout, found ${components.length} components: ` +
      components.map((component) => `${component.count}@${component.minX},${component.minY}-${component.maxX},${component.maxY}`).join('; ')
    );
  }
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
