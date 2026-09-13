import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [baselineArg, proposedArg, outputArg] = process.argv.slice(2);
if (!baselineArg || !proposedArg || !outputArg) {
  throw new Error('Usage: node scripts/compose-nova-command-hud-comparisons.mjs <baseline> <proposed> <output>');
}

const baselineDir = path.resolve(baselineArg);
const proposedDir = path.resolve(proposedArg);
const outputDir = path.resolve(outputArg);
const profiles = ['dense-1920x1080-en', 'dense-1280x720-en'];
const components = [
  ['mission', 'MISSION STATUS'],
  ['flawless', 'SIDE TOAST'],
  ['reinforcements', 'INCOMING REINFORCEMENTS'],
  ['wave_clear', 'WAVE CLEARED'],
  ['boss_defeated', 'BOSS DEFEATED']
];

function label(width, text) {
  return Buffer.from(`<svg width="${width}" height="42">
    <rect width="100%" height="100%" fill="#03111e"/>
    <line x1="0" y1="1" x2="${width}" y2="1" stroke="#57eaff" stroke-width="2"/>
    <text x="16" y="27" fill="#ecfbff" font-family="Segoe UI" font-size="17" font-weight="700">${text}</text>
  </svg>`);
}

mkdirSync(outputDir, { recursive: true });
for (const profile of profiles) {
  const [width, height] = profile.includes('1920x1080') ? [1920, 1080] : [1280, 720];
  const rowWidth = width * 2;
  const labelHeight = 42;
  const rows = [];
  for (const [id, title] of components) {
    const baseline = path.join(baselineDir, `${profile}-${id}.png`);
    const proposed = path.join(proposedDir, `${profile}-${id}.png`);
    if (!existsSync(baseline) || !existsSync(proposed)) {
      throw new Error(`Missing comparison source for ${profile}/${id}`);
    }
    const target = path.join(outputDir, `${profile}-${id}-baseline-vs-pilot.png`);
    await sharp({
      create: {
        width: rowWidth,
        height: height + labelHeight,
        channels: 4,
        background: '#020711'
      }
    }).composite([
      { input: baseline, left: 0, top: 0 },
      { input: proposed, left: width, top: 0 },
      { input: label(width, `BASELINE · ${title}`), left: 0, top: height },
      { input: label(width, `PILOT · ${title}`), left: width, top: height }
    ]).png().toFile(target);
    rows.push(target);
  }

  const previewWidth = profile.includes('1920x1080') ? 720 : 640;
  const previewHeight = Math.round(previewWidth * (height + labelHeight) / rowWidth);
  await sharp({
    create: {
      width: previewWidth,
      height: previewHeight * rows.length,
      channels: 4,
      background: '#020711'
    }
  }).composite(await Promise.all(rows.map(async (source, index) => ({
    input: await sharp(source).resize(previewWidth, previewHeight).png().toBuffer(),
    left: 0,
    top: index * previewHeight
  })))).png().toFile(path.join(outputDir, `contact-sheet-${profile}-baseline-vs-pilot.png`));
}

console.log(`[nova-command-hud-comparisons] PASS output=${outputDir}`);
