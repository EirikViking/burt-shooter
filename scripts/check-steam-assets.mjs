import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const assetDir = path.resolve(process.env.STEAM_ASSET_DIR || 'release/steam-assets/draft-2026-05-17-nova-swarm');
const reviewDir = path.join(assetDir, 'review');

const expected = [
  ['store_header_capsule_920x430.jpg', 920, 430, false],
  ['store_small_capsule_462x174.jpg', 462, 174, false],
  ['store_main_capsule_1232x706.jpg', 1232, 706, false],
  ['store_vertical_capsule_748x896.jpg', 748, 896, false],
  ['store_page_background_1438x810.jpg', 1438, 810, false],
  ['library_capsule_600x900.png', 600, 900, false],
  ['library_header_capsule_920x430.png', 920, 430, false],
  ['library_hero_3840x1240.png', 3840, 1240, false],
  ['library_logo_1280x720.png', 1280, 720, true]
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    windowsHide: true,
    ...options
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function identify(file) {
  const output = run('magick', [
    'identify',
    '-format',
    '%w %h %[channels] %[opaque]',
    file
  ]);
  const [width, height, channels, opaque] = output.split(/\s+/);
  return {
    width: Number(width),
    height: Number(height),
    channels,
    opaque: opaque === 'True'
  };
}

function makeReviewSheets() {
  mkdirSync(reviewDir, { recursive: true });
  const contactSheet = path.join(reviewDir, 'steam_asset_contact_sheet.png');
  run('magick', [
    'montage',
    ...expected.map(([filename]) => path.join(assetDir, filename)),
    '-label', '%f\n%wx%h',
    '-thumbnail', '420x240',
    '-background', '#080b18',
    '-fill', 'white',
    '-pointsize', '16',
    '-geometry', '+18+36',
    contactSheet
  ]);

  const small = path.join(assetDir, 'store_small_capsule_462x174.jpg');
  const smallOutputs = [
    ['small_capsule_231x87.jpg', '231x87'],
    ['small_capsule_154x58.jpg', '154x58'],
    ['small_capsule_120x45.jpg', '120x45']
  ];
  for (const [filename, size] of smallOutputs) {
    run('magick', [small, '-resize', size, path.join(reviewDir, filename)]);
  }
  run('magick', [
    'montage',
    ...smallOutputs.map(([filename]) => path.join(reviewDir, filename)),
    '-label', '%f\n%wx%h',
    '-background', '#080b18',
    '-fill', 'white',
    '-pointsize', '14',
    '-geometry', '+16+30',
    path.join(reviewDir, 'small_capsule_thumbnail_sheet.png')
  ]);
}

function main() {
  if (!existsSync(assetDir)) throw new Error(`Steam asset directory does not exist: ${assetDir}`);

  const assets = [];
  const failures = [];
  for (const [filename, width, height, needsAlpha] of expected) {
    const file = path.join(assetDir, filename);
    if (!existsSync(file)) {
      failures.push(`${filename} is missing`);
      continue;
    }
    const info = identify(file);
    const dimensionsOk = info.width === width && info.height === height;
    const alphaOk = !needsAlpha || (info.channels.includes('a') && !info.opaque);
    assets.push({ filename, expected: `${width}x${height}`, ...info, dimensionsOk, alphaOk });
    if (!dimensionsOk) failures.push(`${filename} expected ${width}x${height}, got ${info.width}x${info.height}`);
    if (!alphaOk) failures.push(`${filename} must preserve transparency`);
  }

  makeReviewSheets();
  const report = {
    generatedAt: new Date().toISOString(),
    assetDir,
    reviewDir,
    notes: [
      'Dimension and transparency checks are objective gates.',
      'Contact sheets still require human visual review for title readability, Steam rules, and brand fit.'
    ],
    assets,
    failures
  };
  writeFileSync(path.join(reviewDir, 'steam_asset_review_report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (failures.length) {
    console.error('[steam-assets] failed');
    console.error(failures.join('\n'));
    process.exit(1);
  }
  console.log(`[steam-assets] ok: ${assets.length} assets checked`);
  console.log(`[steam-assets] review: ${reviewDir}`);
}

main();
