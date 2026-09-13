import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  GAME_OVER_FINAL_TRANSMISSION_STORAGE_KEY,
  GAME_OVER_FINAL_TRANSMISSION_VARIANTS,
  commitGameOverFinalTransmissionVariant,
  getGameOverFinalTransmissionAnimationSignature,
  reserveNextGameOverFinalTransmissionVariant,
  selectNextGameOverFinalTransmissionVariant
} from '../src/config/GameOverFinalTransmissionVariants.js';

function assert(condition, message, details) {
  if (condition) return;
  throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
}

function pngDimensions(buffer) {
  const pngSignature = '89504e470d0a1a0a';
  assert(buffer.subarray(0, 8).toString('hex') === pngSignature, 'final-transmission asset is not a PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const variants = GAME_OVER_FINAL_TRANSMISSION_VARIANTS;
assert(variants.length === 30, 'final-transmission deck must contain exactly 30 variants', { count: variants.length });
assert(new Set(variants.map((variant) => variant.id)).size === 30, 'final-transmission IDs must be unique');
assert(new Set(variants.map((variant) => variant.src)).size === 30, 'final-transmission asset paths must be unique');
assert(new Set(variants.map((variant) => variant.signalSrc)).size === 30, 'final-signal asset paths must be unique');

const signatures = variants.map(getGameOverFinalTransmissionAnimationSignature);
assert(new Set(signatures).size === 30, 'all 30 final transmissions must have distinct animation signatures');
assert(new Set(variants.map((variant) => variant.animation.path)).size >= 6, 'hero motion needs six distinct path families');
assert(new Set(variants.map((variant) => variant.animation.scanMode)).size >= 6, 'scan motion needs six distinct directions');
assert(new Set(variants.map((variant) => variant.animation.shardMode)).size >= 5, 'fragment motion needs five distinct families');
assert(new Set(variants.map((variant) => variant.animation.coreMode)).size >= 5, 'core motion needs five distinct families');
assert(new Set(variants.map((variant) => variant.animation.titleEntry)).size >= 5, 'title motion needs five distinct entries');
assert(new Set(variants.map((variant) => variant.animation.signalMode)).size >= 10, 'signal motion needs ten distinct families');

const assetResults = variants.map((variant) => {
  const assetPath = path.resolve('public', variant.src.replace(/^\/+/, ''));
  assert(existsSync(assetPath), 'final-transmission asset is missing', { id: variant.id, assetPath });
  const buffer = readFileSync(assetPath);
  const dimensions = pngDimensions(buffer);
  assert(dimensions.width === 1672 && dimensions.height === 941, 'final-transmission asset has unexpected dimensions', {
    id: variant.id,
    ...dimensions
  });
  return {
    id: variant.id,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    ...dimensions
  };
});
assert(new Set(assetResults.map((asset) => asset.sha256)).size === 30, 'final-transmission artwork must be visually unique at the file level');

const signalResults = variants.map((variant) => {
  const assetPath = path.resolve('public', variant.signalSrc.replace(/^\/+/, ''));
  assert(existsSync(assetPath), 'final-signal asset is missing', { id: variant.id, assetPath });
  const buffer = readFileSync(assetPath);
  const dimensions = pngDimensions(buffer);
  assert(dimensions.width >= 229 && dimensions.width <= 230, 'final-signal asset has unexpected width', {
    id: variant.id,
    ...dimensions
  });
  assert(dimensions.height >= 228 && dimensions.height <= 229, 'final-signal asset has unexpected height', {
    id: variant.id,
    ...dimensions
  });
  return {
    id: variant.id,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    ...dimensions
  };
});
assert(new Set(signalResults.map((asset) => asset.sha256)).size === 30, 'final-signal artwork must be visually unique at the file level');

const values = new Map();
const storage = {
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) { values.set(key, String(value)); }
};
let seed = 0x6e6f7661;
const random = () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 0x100000000;
};
const selected = Array.from({ length: 60 }, () => selectNextGameOverFinalTransmissionVariant({ storage, random }).id);
assert(new Set(selected.slice(0, 30)).size === 30, 'first deck cycle repeated before all 30 variants were seen', selected.slice(0, 30));
assert(new Set(selected.slice(30, 60)).size === 30, 'second deck cycle repeated before all 30 variants were seen', selected.slice(30, 60));
assert(selected[29] !== selected[30], 'deck boundary repeated the most recently viewed variant', selected.slice(28, 32));
assert(Boolean(storage.getItem(GAME_OVER_FINAL_TRANSMISSION_STORAGE_KEY)), 'shuffle-bag state was not persisted');

const leaseValues = new Map();
const leaseStorage = {
  getItem(key) { return leaseValues.get(key) ?? null; },
  setItem(key, value) { leaseValues.set(key, String(value)); }
};
const reservedOnce = reserveNextGameOverFinalTransmissionVariant({ storage: leaseStorage, random });
const reservedAfterAbandonedRun = reserveNextGameOverFinalTransmissionVariant({ storage: leaseStorage, random });
assert(reservedAfterAbandonedRun.id === reservedOnce.id, 'an unseen reserved variant was incorrectly consumed');
assert(commitGameOverFinalTransmissionVariant(reservedOnce, { storage: leaseStorage }), 'visible reserved variant could not be committed');
const reservedAfterCommit = reserveNextGameOverFinalTransmissionVariant({ storage: leaseStorage, random });
assert(reservedAfterCommit.id !== reservedOnce.id, 'visible committed variant repeated immediately');

const playSource = readFileSync(path.resolve('src/scenes/PlayScene.js'), 'utf8');
assert(playSource.includes("handoffShade.label = 'game_over_direct_handoff_shade'"), 'direct handoff blackout layer is missing');
assert(playSource.includes('handoffShade.alpha = handoff;'), 'direct handoff blackout is not animated');
assert(playSource.includes('onComplete?.();'), 'ticker does not synchronously hand off to the result scene');
assert(playSource.includes('layer.alpha = intro;'), 'celebration layer is not held through scene transition');
assert(!playSource.includes('layer.alpha = intro * (1 - exit)'), 'old playing-field-revealing fade returned');
assert(playSource.includes("coreSignal = createSignalSprite('game_over_final_signal_core')"), 'generated final-signal core is missing');
assert(!playSource.includes("coreSignal.label = 'game_over_angular_core_signal'"), 'old geometric diamond core returned');

console.log('[gameover-final-transmissions] PASS variants=30 uniqueArt=30 uniqueSignals=30 uniqueAnimations=30 cycles=2 directHandoff=true');
