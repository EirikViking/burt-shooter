import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const forbiddenUiStrings = [
  'NOVA SWARM: WEB3 ARCADE',
  'EIRIK THE VIKING VAULT RUN',
  'CLAIM YOUR FREE ENJIN NFT',
  'OPEN ENJIN CLAIM',
  'MOCK ENJIN CLAIM'
];

async function filesUnder(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(absolute));
    else files.push(absolute);
  }
  return files;
}

const files = await filesUnder(distDir);
const matches = [];
for (const file of files) {
  const text = await fs.readFile(file, 'utf8').catch(() => '');
  for (const needle of forbiddenUiStrings) {
    if (text.includes(needle)) matches.push(`${path.relative(distDir, file)}:${needle}`);
  }
}

assert.deepEqual(matches, [], `standard dist contains Enjin UI strings: ${matches.join(', ')}`);
console.log(`[standard-enjin-isolation] PASS scanned ${files.length} dist files; Enjin UI absent.`);
