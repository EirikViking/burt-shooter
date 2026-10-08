import assert from 'node:assert/strict';
import { installRuntimeRecovery } from '../src/utils/RuntimeRecovery.js';
const listeners = new Map();
const elements = [];
const canvas = { addEventListener: (name, fn) => listeners.set(name, fn) };
const doc = { createElement: () => {
  const el = { style: {}, append() {}, setAttribute() {}, focus() {}, remove() { this.removed = true; } };
  elements.push(el); return el;
}, body: { append() {} }, getElementById: id => elements.findLast(e => e.id === id && !e.removed) };
let started = 0, stopped = 0, reloaded = 0;
const game = { currentSceneName: 'play', runMode: 'ranked', level: 46, score: 899255, runFinalized: false,
  currentScene: { setPaused: value => assert.equal(value, true) }, scenes: {} };
const recovery = installRuntimeRecovery({ app: { canvas, ticker: { start: () => started++, stop: () => stopped++ } }, game,
  buildId: 'fixture', gitSha: 'fixture', document: doc,
  window: { addEventListener: (name, fn) => listeners.set(name, fn), location: { reload: () => reloaded++ } } });
listeners.get('webglcontextlost')({ preventDefault() {} });
assert.equal(stopped, 1); assert.equal(recovery.stopped, true); assert.equal(game.runFinalized, false);
assert.equal(doc.getElementById('runtime-recovery-resume').disabled, true);
listeners.get('webglcontextrestored')();
doc.getElementById('runtime-recovery-resume').onclick();
assert.equal(started, 1); assert.equal(recovery.stopped, false); assert.equal(game.score, 899255);
recovery.fail(Error('frame failed'));
assert.equal(recovery.stopped, true); assert.equal(game.runFinalized, false);
assert.equal(doc.getElementById('runtime-recovery-resume').disabled, true);
assert.equal(reloaded, 0, 'recovery must never silently reload a live run');
assert.equal(recovery.record('test').events.at(-1).completed, false);
console.log('PASS: context recovery pauses, requires explicit return, and never finalizes interrupted scores');
