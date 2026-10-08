import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { NEW_ONSLAUGHT_ACHIEVEMENTS } from '../src/achievements/OnslaughtAchievementDefinitions.js';

const root = path.resolve('.');
const releaseDir = path.join(root, 'release/steamworks/achievement-icons');
const publicDir = path.join(root, 'public/art/generated/nova-swarm/achievements');
const sourceSheet = path.join(releaseDir, 'onslaught-v2-icon-sheet.png');
const manifestPath = path.join(releaseDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const byId = new Map(manifest.icons.map(entry => [entry.apiName, entry]));

// Image-generated sheet positions. The artwork intentionally uses varied panel widths.
// Keep the source sheet and these crops together so each Steam icon remains reproducible.
const crops = [
  [0, 0, 233], [233, 0, 233], [466, 0, 233], [699, 0, 233], [1165, 0, 237],
  [0, 280, 233], [412, 280, 176], [760, 280, 172], [932, 280, 233], [1165, 280, 237],
  [0, 560, 260], [260, 560, 260], [520, 560, 320], [840, 560, 325], [1165, 560, 237],
  [0, 840, 260], [260, 840, 260], [520, 840, 320], [840, 840, 325]
];

if (NEW_ONSLAUGHT_ACHIEVEMENTS.length !== crops.length) throw new Error('Onslaught icon crop count differs from catalog');
for (const [index, achievement] of NEW_ONSLAUGHT_ACHIEVEMENTS.entries()) {
  const entry = byId.get(achievement.id);
  if (!entry) throw new Error(`Missing icon manifest entry: ${achievement.id}`);
  entry.source = 'onslaught-v2-icon-sheet.png';
  const [left, top, width] = crops[index];
  const height = top === 840 ? 282 : 280;
  const achieved = await sharp(sourceSheet).extract({ left, top, width, height })
    .resize(256, 256, { fit: 'fill' }).flatten({ background: '#07111a' })
    .jpeg({ quality: 92 }).toBuffer();
  const locked = await sharp(achieved).grayscale().modulate({ brightness: 0.7 })
    .jpeg({ quality: 92 }).toBuffer();
  for (const dir of [releaseDir, publicDir]) {
    fs.writeFileSync(path.join(dir, entry.achievedIcon), achieved);
    fs.writeFileSync(path.join(dir, entry.lockedIcon), locked);
  }
}
manifest.sourceGenerator = 'Curated Nova Swarm icon set; Onslaught v2 motifs generated with Codex imagegen and cropped from onslaught-v2-icon-sheet.png into distinct 256x256 achieved/grayscale-locked JPG pairs.';
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('[generate-onslaught-achievement-icons] PASS 19 generated achieved/locked pairs');
