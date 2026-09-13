import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { MYSTERY_SOUND_JOBS } from './mystery-audio-design.mjs';
const root = 'docs/mysteries/audio', out = 'public/audio/sfx/mysteries';
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(`${root}/masters`, { recursive: true });
const receipts = JSON.parse(fs.readFileSync(`${root}/generation.json`));
const ids = [...new Set(receipts.cues.filter(row => row.status === 'complete').map(row => row.name.replace(/-[^-]+$/, '')))];
const selected = process.env.MYSTERY_AUDIO_ID;
const banks = selected ? JSON.parse(fs.readFileSync('src/audio/MysterySoundBanks.json')) : {};
const rows = selected ? JSON.parse(fs.readFileSync(`${root}/mastering.json`)).rows.filter(row => row.id !== selected) : [];
function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw Error(result.stderr);
}
for (const id of ids) {
  if (selected && id !== selected) continue;
  const jobs = MYSTERY_SOUND_JOBS.filter(job => job.id === id);
  if (!jobs.every(job => receipts.cues.some(row => row.name === `${id}-${job.event}` && row.status === 'complete'))) continue;
  const inputs = [], cues = {}; let offset = 0;
  for (const job of jobs) {
    const name = `${id}-${job.event}`, source = `${root}/originals/${name}.mp3`, master = `${root}/masters/${name}.wav`;
    const receipt = receipts.cues.find(row => row.name === name && row.status === 'complete');
    if (createHash('sha256').update(fs.readFileSync(source)).digest('hex') !== receipt.sha256) throw Error(`Original changed: ${name}`);
    const filter = `highpass=f=55,lowpass=f=14000,loudnorm=I=-17:TP=-2:LRA=7,aresample=44100,apad,atrim=duration=${job.duration_seconds},afade=t=in:d=0.008,afade=t=out:st=${job.duration_seconds - .12}:d=0.12`;
    ffmpeg(['-i', source, '-af', filter, '-ac', '2', '-ar', '44100', '-c:a', 'pcm_s16le', master]);
    inputs.push('-i', master); cues[job.event] = { offset, duration: job.duration_seconds }; offset += job.duration_seconds;
  }
  const file = `${out}/${id}.mp3`;
  ffmpeg([...inputs, '-filter_complex', `${jobs.map((_, i) => `[${i}:a]`).join('')}concat=n=${jobs.length}:v=0:a=1[a]`, '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '192k', file]);
  banks[id] = { url: `/${file.replace(/^public\//, '')}`, cues };
  rows.push({ id, file, duration: offset, bytes: fs.statSync(file).size, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') });
}
fs.writeFileSync('src/audio/MysterySoundBanks.json', JSON.stringify(banks, null, 2));
fs.writeFileSync(`${root}/mastering.json`, JSON.stringify({ process: '55 Hz high-pass, 14 kHz low-pass, -17 LUFS / -2 dBTP, native pitch, eight-millisecond onset and bounded tail. Six original cues per lazy bank; no local synthesis.', rows }, null, 2));
console.log(JSON.stringify({ banks: rows.length, bytes: rows.reduce((sum, row) => sum + row.bytes, 0) }));
