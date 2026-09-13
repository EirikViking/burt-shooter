import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const sourceDir = path.resolve('public/art/generated/nova-swarm/menu/icons');
const outputDir = path.join(sourceDir, 'derived');
const sources = {
  achievements: 'approved-menu-icon-achievements.png',
  exit: 'approved-menu-icon-exit.png',
  howToPlay: 'approved-menu-icon-how-to-play.png',
  launch: 'approved-menu-icon-launch-run.png',
  leaderboard: 'approved-menu-icon-leaderboard.png',
  music: 'approved-menu-icon-music.png',
  sectorChallenge: 'approved-menu-icon-sector-challenge.png',
  settings: 'approved-menu-icon-settings.png',
  shipHangar: 'approved-menu-icon-ship-hangar.png',
  threatCodex: 'approved-menu-icon-threat-codex.png'
};
const slugs = {
  achievements: 'achievements',
  exit: 'exit',
  howToPlay: 'how-to-play',
  launch: 'launch-run',
  leaderboard: 'leaderboard',
  music: 'music',
  sectorChallenge: 'sector-challenge',
  settings: 'settings',
  shipHangar: 'ship-hangar',
  threatCodex: 'threat-codex'
};

mkdirSync(outputDir, { recursive: true });

for (const [key, filename] of Object.entries(sources)) {
  const source = path.join(sourceDir, filename);
  if (!existsSync(source)) throw new Error(`Missing approved source icon: ${source}`);
  const metadata = await sharp(source).metadata();
  const cropSize = Math.round(Math.min(metadata.width, metadata.height) * 0.62);
  const left = Math.round((metadata.width - cropSize) / 2);
  const top = Math.round((metadata.height - cropSize) / 2);
  const { data, info } = await sharp(source)
    .extract({ left, top, width: cropSize, height: cropSize })
    .resize(256, 256, { fit: 'contain' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cx = info.width / 2;
  const cy = info.height / 2;
  const maxRadius = Math.min(cx, cy) * 0.95;
  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4;
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const a = data[index + 3];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const hot = max > 132 || (max > 92 && chroma > 38);
    const inCore = dist <= maxRadius;
    const verticalGlow = key === 'launch' && Math.abs(dx) < info.width * 0.075 && max > 72;
    if (!inCore || a < 16 || (!hot && !verticalGlow)) {
      data[index + 3] = 0;
      continue;
    }
    const edgeFade = Math.max(0, Math.min(1, (maxRadius - dist) / 18));
    data[index + 3] = Math.min(255, Math.round(a * (0.72 + Math.min(1, (max - 72) / 160) * 0.4) * edgeFade));
  }
  const output = path.join(outputDir, `derived-menu-glyph-${slugs[key]}.png`);
  await sharp(data, { raw: info }).png().toFile(output);
  console.log(output);
}
