import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { launchEncounterTestFromHangar } from './encounter-test-hangar.mjs';
const out = process.env.CHECK_OUTPUT_DIR;
assert.ok(out?.startsWith('E:'), 'Use an owned E: output directory'); mkdirSync(out, { recursive: true });
const file = `${out}/veilborn-performance.webm`; assert.ok(!existsSync(file), 'Do not replace unreviewed footage');
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'], ignoreDefaultArgs: ['--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }), errors = [], chapters = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('**/*', r => /^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(r.request().url()) ? r.continue() : r.abort());
await page.exposeFunction('saveVeilbornChunk', bytes => appendFileSync(file, Buffer.from(bytes, 'base64')));
try {
  await page.addInitScript(() => {
    window.__novaEncounterTest = { getPreset: async () => 'mystery:all' };
    const mix = new AudioContext(), destination = mix.createMediaStreamDestination();
    const connect = AudioNode.prototype.connect, disconnect = AudioNode.prototype.disconnect;
    const taps = new WeakMap(), edges = new WeakMap();
    window.__veilbornAudio = { mix, destination };
    AudioNode.prototype.connect = function(target, ...args) {
      const result = connect.call(this, target, ...args);
      if (target === this.context.destination && this.context !== mix) {
        let tap = taps.get(this.context);
        if (!tap) { tap = this.context.createMediaStreamDestination(); taps.set(this.context, tap); connect.call(mix.createMediaStreamSource(tap.stream), destination); }
        connect.call(this, tap, ...args); edges.set(this, tap);
      }
      return result;
    };
    AudioNode.prototype.disconnect = function(target, ...args) {
      if (target === this.context.destination && edges.has(this)) { disconnect.call(this, edges.get(this), ...args); edges.delete(this); }
      return arguments.length ? disconnect.call(this, target, ...args) : disconnect.call(this);
    };
  });
  await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:5013'}/?skipIntro=1&offlineLeaderboard=1`, { timeout: 120000 });
  await launchEncounterTestFromHangar(page);
  await page.waitForFunction(() => {
    const p = window.__game?.scenes.play;
    return p?.enemyManager?.waves?.length && !p.pendingEnemyStartTimeout && p.enemyManager.enemies.some(e => e.active);
  }, null, { timeout: 120000 });
  await page.evaluate(async () => {
    const g = window.__game, p = g.scenes.play, m = p.enemyManager; g.app.ticker.stop();
    if (!g.encounterTest) throw Error('Recording requires isolated encounter test mode');
    const { AudioManager: audio } = await import('/src/audio/AudioManager.js');
    audio.stopMusic(); audio.stopAllVoices(); audio.voiceEnabled = false; audio.inMenu = false;
    audio.enabled = true; audio.masterVolume = .8; audio.sfxVolume = .7; await audio.context.resume();
    p.setPaused(false); p.introActive = false; p.introComplete = true; if (p.introOverlay) p.introOverlay.visible = false;
    p.isDebugInvincibleActive = () => true; p.inputManager.isFiring = () => false;
    p.clearPendingEnemyStart(); p.clearToastState(); m.clearEnemies(); p.clearEnemyBullets(); p.clearBossHazards();
    m.state = 'MYSTERY_QA'; m.boss = null; m.discoveryEncounter = null; g.level = m.level = 40;
    const a = window.__veilbornAudio; await a.mix.resume();
    const stream = new MediaStream([...g.app.canvas.captureStream(30).getVideoTracks(), ...a.destination.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 7000000, audioBitsPerSecond: 192000 });
    const f = window.__veilbornFilm = { recorder, stream, pending: [], actor: null, running: true, startedAt: performance.now(), last: performance.now(), peaks: { voices: 0, sources: 0, nodes: 0 }, frames: 0 };
    const { MysteryAudio } = await import('/src/audio/MysteryAudio.js');
    recorder.ondataavailable = e => { if (e.data.size) f.pending.push(e.data.arrayBuffer().then(b => {
      const bytes = new Uint8Array(b); let text = '';
      for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768));
      return window.saveVeilbornChunk(btoa(text));
    })); };
    recorder.start(1000);
    const tick = now => {
      if (!f.running) return;
      const delta = Math.min(3, Math.max(0, (now - f.last) * .06)); f.last = now;
      p.player.x = g.getWidth() * (.5 + Math.sin(now * .0008) * .22); p.player.y = g.getHeight() * .84;
      p.player.sprite.position.set(p.player.x, p.player.y);
      m.updateEnemies(delta); p.bulletManager.update(delta); p.particleManager.update(delta); p.updateStarfield(delta);
      const d = MysteryAudio.diagnostics(); for (const key of ['voices', 'sources', 'nodes']) f.peaks[key] = Math.max(f.peaks[key], d[key]);
      g.app.renderer.render(g.app.stage); f.frames++; f.raf = requestAnimationFrame(tick);
    };
    f.raf = requestAnimationFrame(tick);
  });
  for (const id of ['glass_widow', 'cinder_manta', 'rail_cathedral', 'chrysalis_hunter', 'foldship', 'choir_unbound']) {
    chapters.push(await page.evaluate(async id => {
      const g = window.__game, p = g.scenes.play, m = p.enemyManager, f = window.__veilbornFilm;
      const { MysteryAudio } = await import('/src/audio/MysteryAudio.js'); MysteryAudio.stopAll();
      m.clearEnemies(); p.clearEnemyBullets(); p.clearBossHazards(); p.clearToastState();
      const { createMysteryEncounter } = await import('/src/entities/mysteries/createMysteryEncounter.js');
      const { getMystery } = await import('/src/config/Mysteries.js');
      await MysteryAudio.prepare(getMystery(id));
      f.actor = await createMysteryEncounter(m, id);
      return { id, startsAtSeconds: (performance.now() - f.startedAt) / 1000 };
    }, id));
    await page.waitForTimeout(6800);
    const observed = await page.evaluate(() => {
      const f = window.__veilbornFilm, a = f.actor, m = window.__game.scenes.play.enemyManager;
      return { active: a.active, attached: m.enemies.includes(a), age: a.age, attacks: a.stats.attacks };
    });
    assert.ok(observed.active && observed.attached && observed.attacks > 0, `${id}: capture must show its live encounter`);
    Object.assign(chapters.at(-1), observed);
    await page.screenshot({ path: `${out}/${id}.png` });
    await page.evaluate(() => {
      const a = window.__veilbornFilm.actor, part = a.parts.find(p => p.structural && p.active);
      if (part) part.takeDamage(part.maxHealth + 1);
    });
    await page.waitForTimeout(1100);
    await page.evaluate(() => window.__veilbornFilm.actor.takeDamage(1e9));
    await page.waitForTimeout(1600);
  }
  const result = await page.evaluate(() => new Promise(resolve => {
    const f = window.__veilbornFilm; f.running = false; cancelAnimationFrame(f.raf);
    f.recorder.onstop = async () => { await Promise.all(f.pending); f.stream.getTracks().forEach(t => t.stop()); resolve({ frames: f.frames, peaks: f.peaks }); };
    f.recorder.stop();
  }));
  writeFileSync(`${out}/capture.json`, JSON.stringify({ file, scope: 'Controlled encounter preview: actual actors and live Veilborn game audio, QA invulnerability and scripted component/death demonstrations, no production progression. Music/announcer excluded to expose SFX.', chapters, result, errors }, null, 2));
  assert.deepEqual(errors, []); assert.ok(result.peaks.voices <= 4 && result.peaks.sources <= 8 && result.peaks.nodes <= 42);
  console.log(JSON.stringify({ file, ...result }));
} finally { await browser.close(); }
