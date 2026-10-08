import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { MYSTERY_SOUND_JOBS } from './mystery-audio-design.mjs';

const root = 'docs/mysteries/audio'; fs.mkdirSync(`${root}/originals`, { recursive: true });
const batch = Number(process.env.MYSTERY_AUDIO_BATCH || 1);
const jobs = MYSTERY_SOUND_JOBS.filter((job, index) => Math.floor(index / 42) + 1 === batch);
if (!jobs.length) throw Error('Choose an authored batch 1 through 9');
fs.writeFileSync(`${root}/requests.json`, JSON.stringify(MYSTERY_SOUND_JOBS, null, 2));
const estimate = jobs.reduce((sum, job) => sum + job.duration_seconds * 40, 0);
if (!process.argv.includes('--generate')) { console.log({ batch, jobs: jobs.length, estimate }); process.exit(0); }
const ceiling = 45000; // Reserved within the user's existing 200k authorization; no purchases.
const key = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
if (!key) throw Error('ElevenLabs credential unavailable');
async function allowance() {
  const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key } });
  if (!response.ok) throw Error(`Plan HTTP ${response.status}`);
  const state = await response.json();
  if (state.status !== 'active' || state.tier === 'free') throw Error('Active commercial plan required');
  return { tier: state.tier, remaining: state.character_limit - state.character_count };
}
const before = await allowance(), path = `${root}/generation.json`;
const receipt = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : { provider: 'ElevenLabs', model: 'eleven_text_to_sound_v2',
  license: 'Original nonverbal sound effects generated on the user commercial paid plan.', createdAt: new Date().toISOString(),
  creditCeiling: ceiling, before, cues: [], batches: [] };
const pending = receipt.cues.filter(cue => cue.status === 'pending');
if (pending.length) throw Error('Uncertain prior provider request; reconcile receipt before any retry');
const remainingJobs = jobs.filter(job => !receipt.cues.some(cue => cue.name === `${job.id}-${job.event}` && cue.status === 'complete'));
const needed = remainingJobs.reduce((sum, job) => sum + job.duration_seconds * 40, 0);
if (before.remaining < needed + 1000) throw Error('Insufficient included credits; no overages');
if (receipt.cues.reduce((sum, cue) => sum + cue.estimatedCredits, 0) + needed > ceiling) throw Error('Reserved authorization would be exceeded');
let cursor = 0, failed = false;
const persist = () => fs.writeFileSync(path, JSON.stringify(receipt, null, 2));
async function worker() {
  while (cursor < remainingJobs.length && !failed) {
    const job = remainingJobs[cursor++], name = `${job.id}-${job.event}`, file = `${root}/originals/${name}.mp3`;
    if (fs.existsSync(file)) throw Error(`Unreceipted audio exists: ${name}`);
    const request = { text: job.text, duration_seconds: job.duration_seconds, model_id: receipt.model, prompt_influence: .85 };
    const row = { name, file, request, estimatedCredits: job.duration_seconds * 40, status: 'pending' };
    receipt.cues.push(row); persist();
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192', {
        method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(120000) });
      if (!response.ok) {
        row.status = 'rejected'; row.httpStatus = response.status;
        row.error = (await response.text()).replaceAll(key, '[redacted]').slice(0, 800);
        persist(); throw Error(`${name}: HTTP ${response.status}: ${row.error}, no automatic retry`);
      }
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length < 3000) throw Error(`${name}: invalid audio response, reconcile request`);
      fs.writeFileSync(file, data);
      Object.assign(row, { status: 'complete', requestId: response.headers.get('request-id'),
        billedCredits: Number(response.headers.get('character-cost')) || null, sha256: createHash('sha256').update(data).digest('hex') });
      persist(); console.log(`Generated ${name}`);
    } catch (error) { failed = true; throw error; }
  }
}
const results = await Promise.allSettled([worker(), worker()]);
const after = await allowance(); receipt.after = after;
receipt.batches.push({ batch, before, after, at: new Date().toISOString() }); persist();
for (const result of results) if (result.status === 'rejected') throw result.reason;
console.log(JSON.stringify({ batch, generated: remainingJobs.length, remaining: after.remaining,
  reservedUsed: receipt.cues.reduce((sum, cue) => sum + cue.estimatedCredits, 0) }));
