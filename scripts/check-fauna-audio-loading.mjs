import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
import {COSMIC_FAUNA} from '../src/config/CosmicFaunaCatalog.js';

const out = process.env.CHECK_OUTPUT_DIR, url = process.env.CHECK_URL;
assert(out?.startsWith('E:') && url);
mkdirSync(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const rows = [];
try {
 const page = await browser.newPage();
 await page.goto(`${url}/version.json`);
 await page.click('body');
 for (const definition of COSMIC_FAUNA) {
  const result = await page.evaluate(async definition => {
   const response = await fetch(definition.sound), bytes = await response.arrayBuffer();
   const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
   const audio = new Audio(), events = [], started = performance.now(); audio.preload = 'auto';
   for (const type of ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'stalled', 'suspend', 'error']) audio.addEventListener(type, () => events.push({type, ms: performance.now() - started}));
   try {
    await new Promise((resolve, reject) => {
     const timer = setTimeout(() => reject(Error(JSON.stringify({id: definition.id, events, ready: audio.readyState, network: audio.networkState, error: audio.error?.message}))), 12000);
     audio.addEventListener('canplaythrough', () => {clearTimeout(timer); resolve();}, {once: true});
     audio.addEventListener('error', () => {clearTimeout(timer); reject(Error(audio.error?.message || 'Media error'));}, {once: true});
     audio.src = definition.sound; audio.load();
    });
    let advanced = null;
    if (definition.id === 'dawn_koi') { audio.volume = .15; await audio.play(); await new Promise(resolve => setTimeout(resolve, 250)); advanced = audio.currentTime; }
    return {id: definition.id, status: response.status, bytes: bytes.byteLength, sha256: digest, duration: audio.duration, ready: audio.readyState, advanced, events};
   } finally { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  }, definition);
  assert.equal(result.status, 200);
  assert.equal(result.sha256, createHash('sha256').update(readFileSync(path.join('public', definition.sound))).digest('hex'));
  assert(result.duration >= 3 && result.duration <= 6 && result.ready >= 3);
  if (definition.id === 'dawn_koi') assert(result.advanced > .05, 'Real media playback must advance');
  rows.push(result);
 }
 writeFileSync(path.join(out, 'report.json'), JSON.stringify({status: 'pass', rows, scope: '42 current compiled media responses match source bytes and reach canplaythrough within the production deadline; dawn_koi actual media clock advances. Isolated diagnostic, not proof of the earlier intermittent warning cause or human listening.'}, null, 2));
 console.log('[fauna-audio-loading] PASS 42 exact compiled recordings, media readiness and dawn_koi real playback');
} finally { await browser.close(); }
