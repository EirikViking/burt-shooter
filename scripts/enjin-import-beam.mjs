import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const CAMPAIGN_ID = 'eirik-viking-vault-1';
const COLLECTION_NAME = 'Eirik The Viking';
const OUTPUT_DIR = path.resolve('.enjin');

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function encrypt(value, secret) {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${Buffer.concat([ciphertext, tag]).toString('base64url')}`;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const split = (line) => line.match(/(?:^|,)\s*("(?:[^"]|"")*"|[^,]*)/g)?.map((part) => {
    const value = part.replace(/^,\s*/, '').trim();
    return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value;
  }) || [];
  const headers = split(lines[0]).map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  return lines.slice(1).map((line) => {
    const values = split(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function parseInput(filePath, text) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.json') {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : (parsed.claims || parsed.items || []);
  }
  if (extension === '.csv') return parseCsv(text);
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((claimUrl) => ({ claimUrl }));
}

function valueOf(item, keys) {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null && String(item[key]).trim()) return String(item[key]).trim();
  }
  return '';
}

function sqlQuote(value) {
  return `'${String(value ?? '').replaceAll("'", "''")}'`;
}

async function main() {
  const filePath = argument('--file');
  const campaignId = argument('--campaign', CAMPAIGN_ID);
  const dryRun = hasFlag('--dry-run');
  if (!filePath) throw new Error('Missing required --file <path>');
  const raw = await fs.readFile(path.resolve(filePath), 'utf8');
  const sourceItems = parseInput(filePath, raw);
  const secret = process.env.ENJIN_CLAIM_ENCRYPTION_SECRET || '';
  if (!dryRun && !secret) throw new Error('ENJIN_CLAIM_ENCRYPTION_SECRET is required for an import; use --dry-run to validate only.');

  const accepted = [];
  const rejected = [];
  const seen = new Set();
  for (const item of sourceItems) {
    const claimUrl = valueOf(item, ['claimUrl', 'claim_url', 'claim_link', 'url', 'claim', 'link']);
    const id = claimUrl ? fingerprint(claimUrl) : `row-${accepted.length + rejected.length + 1}`;
    if (!claimUrl) {
      rejected.push({ id, reason: 'missing_claim_url' });
      continue;
    }
    let parsedUrl;
    try { parsedUrl = new URL(claimUrl); } catch {
      rejected.push({ id, reason: 'invalid_url' });
      continue;
    }
    if (parsedUrl.protocol !== 'https:') {
      rejected.push({ id, reason: 'https_required' });
      continue;
    }
    if (seen.has(claimUrl)) {
      rejected.push({ id, reason: 'duplicate_claim' });
      continue;
    }
    seen.add(claimUrl);
    const collectionName = valueOf(item, ['collectionName', 'collection_name', 'collection']) || COLLECTION_NAME;
    if (collectionName.toLowerCase() !== COLLECTION_NAME.toLowerCase()) {
      rejected.push({ id, reason: 'collection_mismatch' });
      continue;
    }
    const imageUrl = valueOf(item, ['imageUrl', 'image_url', 'image']);
    if (imageUrl) {
      try {
        if (new URL(imageUrl).protocol !== 'https:') throw new Error('https');
      } catch {
        rejected.push({ id, reason: 'invalid_image_url' });
        continue;
      }
    }
    accepted.push({
      campaignId,
      claimFingerprint: id,
      claimCiphertext: dryRun ? null : encrypt(claimUrl, secret),
      tokenName: valueOf(item, ['tokenName', 'token_name', 'name']) || 'Eirik The Viking Mystery Pilot',
      imageUrl: imageUrl || null,
      collectionName: COLLECTION_NAME,
      status: 'available'
    });
  }

  if (!dryRun) {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const manifestPath = path.join(OUTPUT_DIR, 'beam-inventory.enc.json');
    await fs.writeFile(manifestPath, JSON.stringify({ version: 1, campaignId, generatedAt: new Date().toISOString(), claims: accepted }, null, 2), 'utf8');
    const sql = accepted.map((claim) => `INSERT OR IGNORE INTO enjin_claim_inventory (campaign_id, claim_ciphertext, claim_fingerprint, token_name, image_url, collection_name, status, created_at) VALUES (${sqlQuote(campaignId)}, ${sqlQuote(claim.claimCiphertext)}, ${sqlQuote(claim.claimFingerprint)}, ${sqlQuote(claim.tokenName)}, ${claim.imageUrl ? sqlQuote(claim.imageUrl) : 'NULL'}, ${sqlQuote(COLLECTION_NAME)}, 'available', ${sqlQuote(new Date().toISOString())});`).join('\n');
    await fs.writeFile(path.join(OUTPUT_DIR, 'beam-inventory.sql'), `${sql}\n`, 'utf8');
  }

  console.log(`${dryRun ? 'Validated' : 'Encrypted'} ${accepted.length} Beam claim record(s); rejected ${rejected.length}.`);
  console.log('Full claim URLs were not printed or included in the generated manifest.');
  if (accepted.length) console.log(`Claim fingerprints: ${accepted.map((claim) => claim.claimFingerprint).join(', ')}`);
  if (rejected.length) console.log(`Rejected: ${rejected.map((entry) => `${entry.id}:${entry.reason}`).join(', ')}`);
  if (!dryRun) console.log('Generated .enjin/beam-inventory.enc.json and .enjin/beam-inventory.sql.');
}

main().catch((error) => {
  console.error(error.message || 'Beam import failed.');
  process.exitCode = 1;
});
