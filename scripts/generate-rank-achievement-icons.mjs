import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('.');
const rankBadgeDir = path.join(root, 'public', 'art', 'generated', 'nova-swarm', 'ranks');
const publicIconDir = path.join(root, 'public', 'art', 'generated', 'nova-swarm', 'achievements');
const releaseIconDir = path.join(root, 'release', 'steamworks', 'achievement-icons');
const manifestPath = path.join(releaseIconDir, 'manifest.json');

function apiNameForRankIndex(rankIndex) {
  return `ACH_RANK_${String(rankIndex).padStart(2, '0')}`;
}

function badgeFileForDisplayRank(displayRank) {
  const generatedDate = displayRank === 40 ? '20260724' : '20260612';
  return `nova-rank-badge-${String(displayRank).padStart(2, '0')}-${generatedDate}.png`;
}

async function writeFileWithRetry(filePath, buffer) {
  let lastError = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await fs.promises.writeFile(filePath, buffer);
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'UNKNOWN'].includes(error?.code) || attempt === 6) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 75));
    }
  }
  throw lastError;
}

async function writeBoth(fileName, buffer) {
  await Promise.all([
    writeFileWithRetry(path.join(publicIconDir, fileName), buffer),
    writeFileWithRetry(path.join(releaseIconDir, fileName), buffer)
  ]);
}

for (let rankIndex = 1; rankIndex < 40; rankIndex += 1) {
  const apiName = apiNameForRankIndex(rankIndex);
  const displayRank = rankIndex + 1;
  const sourceBadge = badgeFileForDisplayRank(displayRank);
  const sourcePath = path.join(rankBadgeDir, sourceBadge);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing player-facing Rank ${displayRank} badge: ${sourcePath}`);
  }

  const achieved = await sharp(sourcePath)
    .flatten({ background: '#000000' })
    .jpeg({ quality: 92, chromaSubsampling: '4:2:0' })
    .toBuffer();
  const locked = await sharp(sourcePath)
    .flatten({ background: '#000000' })
    .grayscale()
    .modulate({ brightness: 0.46 })
    .jpeg({ quality: 92, chromaSubsampling: '4:2:0' })
    .toBuffer();

  await Promise.all([
    writeBoth(`${apiName}-achieved.jpg`, achieved),
    writeBoth(`${apiName}-locked.jpg`, locked)
  ]);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
for (const entry of manifest.icons || []) {
  const match = /^ACH_RANK_(\d{2})$/.exec(entry.apiName || '');
  if (!match) continue;
  const displayRank = Number(match[1]) + 1;
  entry.displayRankNumber = displayRank;
  entry.sourceRankBadge = badgeFileForDisplayRank(displayRank);
}
manifest.generatedAt = new Date().toISOString();
manifest.sourceGenerator = `${manifest.sourceGenerator} 2026-07-24 rank-number correction remaps stable zero-based API ids to player-facing badge index + 1.`;
manifest.rankNumbering = 'Steam API rank index is stable and zero-based; icon numerals are player-facing index + 1.';
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log('[generate-rank-achievement-icons] PASS 39 stable API icons mapped to player-facing Ranks 2-40.');
