import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { AssetManifest } from '../src/assets/assetManifest.js';

const HISTORICAL_COMMIT = '4eed7c6d156a5be821b0af90ee9442c238ad12c4';
const RELEASED_COMMIT = '103f397a751a49863370a775d98a6416d5fd4326';
const POWERUPS = Object.freeze([
  'prism_splitter', 'rail_surge', 'chrono_anchor', 'blink_drive', 'nano_patch',
  'score_fever', 'gravity_well', 'drone_carousel', 'plasma_lance', 'stasis_net',
  'aegis_burst', 'jackpot_lens', 'ion_dash', 'saw_matrix', 'mirror_shots',
  'mercy_protocol', 'target_paint', 'void_crown', 'swarm_contract', 'pulse_refund'
]);

const outputDir = path.resolve(
  process.env.FORUM_129_POWERUP_EVIDENCE_DIR
    || `test-results/forum-129-powerup-evidence-${new Date().toISOString().replace(/[:.]/g, '-')}`
);
mkdirSync(outputDir, { recursive: true });

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  })[character]);
}

function title(type) {
  return type.replace(/_/g, ' ').toUpperCase();
}

function svgText(width, height, lines, { fontSize = 16, color = '#d8fbff', align = 'middle' } = {}) {
  const anchor = align === 'start' ? 'start' : 'middle';
  const x = align === 'start' ? 0 : width / 2;
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>text { font-family: Arial, sans-serif; font-weight: 700; letter-spacing: 0.7px; }</style>
      ${lines.map((line, index) => `<text x="${x}" y="${fontSize + index * (fontSize + 4)}" text-anchor="${anchor}" font-size="${fontSize}" fill="${color}">${escapeXml(line)}</text>`).join('')}
    </svg>
  `);
}

function currentPath(type) {
  const url = AssetManifest.generated?.powerups?.[type];
  if (!url) throw new Error(`Missing asset mapping for ${type}`);
  return path.join(process.cwd(), 'public', url.replace(/^\//, ''));
}

function gitAsset(commit, type) {
  const relativePath = path.relative(process.cwd(), currentPath(type)).replace(/\\/g, '/');
  return execFileSync('git', ['show', `${commit}:${relativePath}`], {
    cwd: process.cwd(),
    encoding: 'buffer',
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true
  });
}

async function makeNativeTile(type) {
  const icon = readFileSync(currentPath(type));
  return sharp({ create: { width: 240, height: 236, channels: 4, background: '#020812' } })
    .composite([
      { input: icon, left: 24, top: 8 },
      { input: svgText(220, 28, [title(type)], { fontSize: 13 }), left: 10, top: 202 }
    ])
    .png()
    .toBuffer();
}

async function makeSmallTile(type) {
  const icon = await sharp(currentPath(type)).resize(48, 48).png().toBuffer();
  return sharp({ create: { width: 260, height: 76, channels: 4, background: '#020812' } })
    .composite([
      { input: icon, left: 14, top: 14 },
      { input: svgText(184, 42, [title(type), 'ACTUAL PICKUP SIZE: 48 PX'], { fontSize: 11, align: 'start', color: '#d8fbff' }), left: 72, top: 17 }
    ])
    .png()
    .toBuffer();
}

async function makeComparisonTile(type) {
  const historical = await sharp(gitAsset(HISTORICAL_COMMIT, type)).resize(128, 128).png().toBuffer();
  const released = await sharp(gitAsset(RELEASED_COMMIT, type)).resize(128, 128).png().toBuffer();
  return sharp({ create: { width: 360, height: 210, channels: 4, background: '#020812' } })
    .composite([
      { input: svgText(340, 25, [title(type)], { fontSize: 14 }), left: 10, top: 6 },
      { input: historical, left: 28, top: 36 },
      { input: released, left: 204, top: 36 },
      { input: svgText(150, 24, ['HISTORICAL 4EED7C6'], { fontSize: 10, color: '#78ffe0' }), left: 17, top: 172 },
      { input: svgText(150, 24, ['RELEASED 24861184'], { fontSize: 10, color: '#ffbf70' }), left: 193, top: 172 }
    ])
    .png()
    .toBuffer();
}

async function makeSheet({ filename, columns, tileWidth, tileHeight, tiles, heading }) {
  const rows = Math.ceil(tiles.length / columns);
  const headingHeight = 58;
  const width = columns * tileWidth;
  const height = headingHeight + rows * tileHeight;
  const composites = [
    { input: svgText(width, 42, [heading], { fontSize: 22 }), left: 0, top: 8 }
  ];
  tiles.forEach((tile, index) => {
    composites.push({
      input: tile,
      left: (index % columns) * tileWidth,
      top: headingHeight + Math.floor(index / columns) * tileHeight
    });
  });
  const outputPath = path.join(outputDir, filename);
  await sharp({ create: { width, height, channels: 4, background: '#01050c' } })
    .composite(composites)
    .png()
    .toFile(outputPath);
  return outputPath;
}

const nativeTiles = await Promise.all(POWERUPS.map(makeNativeTile));
const smallTiles = await Promise.all(POWERUPS.map(makeSmallTile));
const comparisonTiles = await Promise.all(POWERUPS.map(makeComparisonTile));

const outputs = {
  finalNative: await makeSheet({
    filename: 'powerups-final-native-192.png',
    columns: 5,
    tileWidth: 240,
    tileHeight: 236,
    tiles: nativeTiles,
    heading: 'FORUM 129 // FINAL DISTINCT POWERUPS // NATIVE 192 x 192'
  }),
  finalGameplay: await makeSheet({
    filename: 'powerups-final-gameplay-48.png',
    columns: 4,
    tileWidth: 260,
    tileHeight: 76,
    tiles: smallTiles,
    heading: 'FORUM 129 // FINAL DISTINCT POWERUPS // ACTUAL 48 PX PICKUP SIZE'
  }),
  historicalVsReleased: await makeSheet({
    filename: 'powerups-historical-vs-released-24861184.png',
    columns: 4,
    tileWidth: 360,
    tileHeight: 210,
    tiles: comparisonTiles,
    heading: 'FORUM 129 // 4EED7C6 HISTORICAL ART VS RELEASED BUILDID 24861184 ART'
  })
};

writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({
  status: 'passed',
  historicalCommit: HISTORICAL_COMMIT,
  releasedCommit: RELEASED_COMMIT,
  powerups: POWERUPS,
  outputs
}, null, 2)}\n`);

console.log(`[forum-129-powerup-evidence] PASS outputDir=${outputDir}`);
