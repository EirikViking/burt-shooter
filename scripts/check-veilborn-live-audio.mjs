import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';

const out = process.env.CHECK_OUTPUT_DIR;
assert(out?.startsWith('E:'));
mkdirSync(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required']});
const errors = [];
try {
 const page = await browser.newPage();
 page.on('pageerror', e => errors.push(e.message));
 await page.addInitScript(() => { window.__novaEncounterTest = {getPreset: async () => 'mystery:all'}; });
 await page.goto(`${process.env.CHECK_URL}/?skipIntro=1&offlineLeaderboard=1`, {timeout: 120000});
 await launchEncounterTestFromHangar(page);
 const result = await page.evaluate(async () => {
  const g = window.__game, s = g.scenes.play;
  g.app.ticker.stop();
  if (!g.runPolicy.prototype || Object.entries(g.runPolicy).some(([k,v]) => k.startsWith('allow') && v)) throw Error('Unsafe audio fixture');
  s.clearPendingEnemyStart(); s.enemyManager.clearEnemies();
  const {AudioManager: audio} = await import('/src/audio/AudioManager.js');
  const {MysteryAudio: bus} = await import('/src/audio/MysteryAudio.js');
  const {MYSTERIES} = await import('/src/config/Mysteries.js');
  audio.stopMusic(); audio.stopAllVoices(); audio.inMenu = false; audio.enabled = true; audio.masterVolume = .8; audio.sfxVolume = .7;
  await audio.context.resume(); bus.stopAll({unload: true});
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const families = [...new Set(MYSTERIES.map(d => d.family))], rows = [];
  for (const family of families) {
   const definition = MYSTERIES.find(d => d.family === family), owner = {};
   const buffer = await bus.prepare(definition);
   if (!buffer?.length) throw Error(`No real decoded recording: ${definition.id}`);
   if (!bus.play(owner, definition, 'death', {x: .3})) throw Error('Sound request refused');
   await wait(30);
   if (!bus.mix || bus.voices.size !== 1) throw Error('Real voice did not start');
   const analyser = audio.context.createAnalyser(); analyser.fftSize = 2048; bus.mix.master.connect(analyser);
   const samples = new Float32Array(analyser.fftSize); let peak = 0;
   for (let i = 0; i < 12; i++) { await wait(20); analyser.getFloatTimeDomainData(samples); for (const x of samples) peak = Math.max(peak, Math.abs(x)); }
   const live = bus.diagnostics(); audio.sfxVolume = 0; bus.refresh(); await wait(100);
   analyser.getFloatTimeDomainData(samples); const mutedPeak = Math.max(...samples.map(Math.abs));
   bus.stopOwner(owner); const stopped = bus.diagnostics(); analyser.disconnect(); audio.sfxVolume = .7;
   rows.push({family, id: definition.id, sampleRate: buffer.sampleRate, duration: buffer.duration, peak, mutedPeak, live, stopped});
  }
  bus.stopAll({unload: true});
  return {context: audio.context.state, rows, retired: bus.diagnostics()};
 });
 for (const row of result.rows) {
  assert(row.peak > .0001 && row.peak < 1, JSON.stringify(row));
  assert(row.mutedPeak < .00001, `Muted tail is not silent: ${JSON.stringify(row)}`);
  assert(row.live.voices > 0 && row.live.sources > 0 && row.live.voices <= 4 && row.live.nodes <= 42);
  assert.equal(row.stopped.voices, 0); assert.equal(row.stopped.nodes, 0);
 }
 assert.equal(result.context, 'running'); assert.equal(result.retired.cached, 0); assert.deepEqual(errors, []);
 writeFileSync(path.join(out, 'report.json'), JSON.stringify({status: 'pass', ...result, errors, scope: 'Real AudioContext/decode and post-master signal for one actual identity recording in each family, active death tails, actual SFX mute and owner cleanup. Not a subjective listening verdict.'}, null, 2));
 console.log('[veilborn-live-audio] PASS eight real families, audible signal, muted tails and zero owned nodes after cancellation');
} finally { await browser.close(); }
