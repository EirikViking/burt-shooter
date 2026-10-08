import fs from 'node:fs/promises';
import path from 'node:path';

const receiptPath = 'docs/mysteries/image-receipts.json';
const roster = JSON.parse(await fs.readFile('docs/mysteries/production-roster.json', 'utf8')).entries;
const rows = JSON.parse(await fs.readFile(receiptPath, 'utf8'));
for (const arg of process.argv.slice(2)) {
  const split = arg.indexOf('=');
  const id = arg.slice(0, split), source = arg.slice(split + 1).replaceAll('\\', '/');
  if (split < 1 || !roster.some(entry => entry.id === id) || !path.isAbsolute(source)) throw new Error(`Invalid art admission: ${id}`);
  const runtime = `public/art/mysteries/${id}.png`;
  const previous = rows.find(entry => entry.id === id);
  await fs.copyFile(source, runtime);
  const row = { id, provider: 'OpenAI built-in ImageGen', source, runtime,
    status: 'source visually inspected; atlas validation and runtime verification pending',
    provenance: 'Original generated art for this project, no external asset imports.' };
  if (previous) { row.supersededSources = [...(previous.supersededSources || []), previous.source]; rows[rows.indexOf(previous)] = row; }
  else rows.push(row);
}
await fs.writeFile(receiptPath, JSON.stringify(rows, null, 2) + '\n');
console.log(`Recorded ${rows.length} original atlases; run inspect-mystery-atlases.py before runtime use.`);
