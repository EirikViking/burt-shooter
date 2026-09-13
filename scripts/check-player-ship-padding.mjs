import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';

const shipDir = path.resolve('public/art/generated/nova-swarm/ships');
const sourceSheetPath = path.resolve('public/art/generated/nova-swarm/source/nova-player-ships-25-sheet-20260518-source.png');
const minPaddingPx = 12;
const minSourceSheetMarginPx = 12;
const expectedSize = 256;
const expectedCount = 25;

function parsePngImage(buffer, file) {
  const signature = buffer.subarray(0, 8).toString('hex');
  assert.equal(signature, '89504e470d0a1a0a', `${file}: invalid PNG signature`);

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  assert.equal(bitDepth, 8, `${file}: expected 8-bit PNG, got ${bitDepth}`);
  assert.ok(colorType === 2 || colorType === 6, `${file}: expected RGB/RGBA PNG color type 2/6, got ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const sourceBytesPerPixel = colorType === 6 ? 4 : 3;
  const sourceStride = width * sourceBytesPerPixel;
  const pixels = Buffer.alloc(width * height * 4);
  let rawOffset = 0;
  let pixelOffset = 0;
  let prevRow = Buffer.alloc(sourceStride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const row = Buffer.from(raw.subarray(rawOffset, rawOffset + sourceStride));
    rawOffset += sourceStride;

    for (let x = 0; x < sourceStride; x += 1) {
      const left = x >= sourceBytesPerPixel ? row[x - sourceBytesPerPixel] : 0;
      const up = prevRow[x] || 0;
      const upLeft = x >= sourceBytesPerPixel ? prevRow[x - sourceBytesPerPixel] || 0 : 0;
      let value = row[x];
      if (filter === 1) {
        value = (value + left) & 0xff;
      } else if (filter === 2) {
        value = (value + up) & 0xff;
      } else if (filter === 3) {
        value = (value + Math.floor((left + up) / 2)) & 0xff;
      } else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : (pb <= pc ? up : upLeft);
        value = (value + predictor) & 0xff;
      } else if (filter !== 0) {
        throw new Error(`${file}: unsupported PNG row filter ${filter}`);
      }
      row[x] = value;
    }

    for (let x = 0; x < width; x += 1) {
      const sourceIndex = x * sourceBytesPerPixel;
      pixels[pixelOffset] = row[sourceIndex];
      pixels[pixelOffset + 1] = row[sourceIndex + 1];
      pixels[pixelOffset + 2] = row[sourceIndex + 2];
      pixels[pixelOffset + 3] = colorType === 6 ? row[sourceIndex + 3] : 255;
      pixelOffset += 4;
    }
    prevRow = row;
  }

  return { width, height, pixels };
}

function alphaBounds(image) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  const alphaHash = createHash('sha256');

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.pixels[(y * image.width + x) * 4 + 3];
      alphaHash.update(Buffer.from([alpha > 12 ? 1 : 0]));
      if (alpha <= 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  assert.ok(maxX >= 0 && maxY >= 0, 'ship has no visible alpha');
  return {
    left: minX,
    top: minY,
    right: image.width - maxX - 1,
    bottom: image.height - maxY - 1,
    alphaHash: alphaHash.digest('hex')
  };
}

function findConnectedComponents(image, isForeground, minPixels = 1) {
  const total = image.width * image.height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const components = [];

  for (let start = 0; start < total; start += 1) {
    if (visited[start]) continue;
    const base = start * 4;
    if (!isForeground(
      image.pixels[base],
      image.pixels[base + 1],
      image.pixels[base + 2],
      image.pixels[base + 3],
      start % image.width,
      Math.floor(start / image.width)
    )) {
      visited[start] = 1;
      continue;
    }

    let head = 0;
    let tail = 0;
    queue[tail] = start;
    tail += 1;
    visited[start] = 1;
    let count = 0;
    let minX = start % image.width;
    let maxX = minX;
    let minY = Math.floor(start / image.width);
    let maxY = minY;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      count += 1;
      const x = index % image.width;
      const y = Math.floor(index / image.width);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const neighbors = [
        x > 0 ? index - 1 : -1,
        x < image.width - 1 ? index + 1 : -1,
        y > 0 ? index - image.width : -1,
        y < image.height - 1 ? index + image.width : -1
      ];
      for (const next of neighbors) {
        if (next < 0 || visited[next]) continue;
        const nextBase = next * 4;
        if (!isForeground(
          image.pixels[nextBase],
          image.pixels[nextBase + 1],
          image.pixels[nextBase + 2],
          image.pixels[nextBase + 3],
          next % image.width,
          Math.floor(next / image.width)
        )) {
          visited[next] = 1;
          continue;
        }
        visited[next] = 1;
        queue[tail] = next;
        tail += 1;
      }
    }

    if (count >= minPixels) {
      components.push({
        count,
        bbox: [minX, minY, maxX + 1, maxY + 1],
        cx: (minX + maxX + 1) / 2,
        cy: (minY + maxY + 1) / 2
      });
    }
  }

  return components;
}

function isSourceBackgroundPixel(r, g, b) {
  return g >= 185 && r <= 95 && b <= 95 && (g - Math.max(r, b)) >= 115;
}

function auditSourceSheet() {
  const image = parsePngImage(readFileSync(sourceSheetPath), path.basename(sourceSheetPath));
  const components = findConnectedComponents(
    image,
    (r, g, b) => !isSourceBackgroundPixel(r, g, b),
    500
  );
  assert.equal(components.length, expectedCount, `source sheet should contain ${expectedCount} full ship components, got ${components.length}`);

  components.sort((a, b) => a.cy - b.cy);
  const rows = [];
  for (const component of components) {
    const row = rows.find((candidate) => Math.abs(candidate.cy - component.cy) < 80);
    if (row) {
      row.items.push(component);
      row.cy = row.items.reduce((sum, item) => sum + item.cy, 0) / row.items.length;
    } else {
      rows.push({ cy: component.cy, items: [component] });
    }
  }
  rows.sort((a, b) => a.cy - b.cy);
  const rowCounts = rows.map((row) => row.items.length);
  assert.deepEqual(rowCounts, [5, 5, 5, 5, 5], `source sheet ships should stay in five complete rows, got ${rowCounts.join('/')}`);

  for (const [index, component] of rows.flatMap((row) => row.items.sort((a, b) => a.cx - b.cx)).entries()) {
    const [left, top, right, bottom] = component.bbox;
    const margins = {
      left,
      top,
      right: image.width - right,
      bottom: image.height - bottom
    };
    for (const [side, padding] of Object.entries(margins)) {
      assert.ok(padding >= minSourceSheetMarginPx, `source ship ${String(index + 1).padStart(2, '0')} touches/crowds ${side} sheet edge (${padding}px)`);
    }
  }

  return { components: components.length, rowCounts };
}

const files = readdirSync(shipDir)
  .filter((file) => /^nova-player-ship-\d\d\.png$/.test(file))
  .sort();

assert.equal(files.length, expectedCount, `expected ${expectedCount} player ship PNGs, got ${files.length}`);

const imageHashes = new Set();
const alphaHashes = new Set();
const report = [];

for (const file of files) {
  const filePath = path.join(shipDir, file);
  const buffer = readFileSync(filePath);
  const imageHash = createHash('sha256').update(buffer).digest('hex');
  const image = parsePngImage(buffer, file);
  assert.equal(image.width, expectedSize, `${file}: expected ${expectedSize}px width, got ${image.width}`);
  assert.equal(image.height, expectedSize, `${file}: expected ${expectedSize}px height, got ${image.height}`);
  const bounds = alphaBounds(image);
  const alphaComponents = findConnectedComponents(
    image,
    (r, g, b, alpha) => alpha > 12,
    60
  ).sort((a, b) => b.count - a.count);
  const mainArea = alphaComponents[0]?.count || 0;
  const largeDetached = alphaComponents.slice(1).filter((component) => component.count > Math.max(450, mainArea * 0.04));
  imageHashes.add(imageHash);
  alphaHashes.add(bounds.alphaHash);
  assert.ok(mainArea > 1000, `${file}: visible ship component is unexpectedly tiny`);
  assert.equal(largeDetached.length, 0, `${file}: contains detached alpha fragments ${JSON.stringify(largeDetached.map((component) => ({ count: component.count, bbox: component.bbox })))}`);
  for (const [side, padding] of Object.entries({
    left: bounds.left,
    top: bounds.top,
    right: bounds.right,
    bottom: bounds.bottom
  })) {
    assert.ok(padding >= minPaddingPx, `${file}: ${side} alpha padding ${padding}px is below ${minPaddingPx}px`);
  }
  report.push({ file, padding: bounds });
}

assert.equal(imageHashes.size, files.length, 'player ship PNGs must not contain exact duplicate files');
assert.ok(alphaHashes.size >= 20, `player ship alpha silhouettes are too repetitive (${alphaHashes.size}/25 unique)`);
const sourceAudit = auditSourceSheet();

console.log(`[player-ship-padding] PASS ships=${files.length} minPadding=${minPaddingPx}px uniqueAlpha=${alphaHashes.size} sourceRows=${sourceAudit.rowCounts.join('/')}`);
