import { getProfileScopedStorageKey } from '../profile/ProfileStorageNamespace.js';

const KEY = 'nova.careerIntelViewed.v1';
const sessionViewed = new Map();
function storageOf(storage) { try { return storage || globalThis.localStorage; } catch { return null; } }
export function careerInfoSignature(progress = {}) {
  return JSON.stringify([
    'missions',
    [...(progress.runContracts?.activeIds || [])].sort(),
    [...(progress.runContracts?.completedIds || [])].sort()
  ]);
}
export function acknowledgeCareerInfo(progress, storage) {
  const key = getProfileScopedStorageKey(KEY), signature = careerInfoSignature(progress);
  sessionViewed.set(key, signature);
  try { storageOf(storage)?.setItem(key, signature); } catch { /* Session acknowledgement survives unavailable storage. */ }
  return signature;
}
export function hasUnseenCareerInfo(progress, storage) {
  const key = getProfileScopedStorageKey(KEY);
  let viewed = sessionViewed.get(key);
  try { if (!viewed) viewed = storageOf(storage)?.getItem(key); } catch { /* Session fallback. */ }
  // Existing careers are the baseline, not a backlog of unread notifications.
  if (!viewed || !viewed.startsWith('["missions",')) { acknowledgeCareerInfo(progress, storage); return false; }
  return viewed !== careerInfoSignature(progress);
}
