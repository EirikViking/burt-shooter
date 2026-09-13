export const HANGAR_RECOMMENDATION_ACK_KEY = 'nova.hangarRecommendationAcknowledgement.v1';

function getStorage(storage) {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getHangarRecommendationKey(ship) {
  if (!ship) return null;
  const shipKey = String(ship.id || ship.spriteKey || '').trim();
  if (!shipKey) return null;
  const unlockLevel = Math.max(1, Math.floor(Number(ship.unlock?.level ?? ship.unlockLevel) || 1));
  return `${shipKey}:level-${unlockLevel}`;
}

export function readHangarRecommendationAcknowledgement(storage = null) {
  try {
    const raw = getStorage(storage)?.getItem?.(HANGAR_RECOMMENDATION_ACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const recommendationKey = String(parsed?.recommendationKey || '').trim().slice(0, 120);
    if (!recommendationKey) return null;
    return {
      version: 1,
      recommendationKey,
      acknowledgedAt: String(parsed?.acknowledgedAt || '').slice(0, 40) || null
    };
  } catch {
    return null;
  }
}

export function isHangarRecommendationAcknowledged(ship, storage = null) {
  const recommendationKey = getHangarRecommendationKey(ship);
  if (!recommendationKey) return false;
  return readHangarRecommendationAcknowledgement(storage)?.recommendationKey === recommendationKey;
}

export function acknowledgeHangarRecommendation(ship, storage = null) {
  const recommendationKey = getHangarRecommendationKey(ship);
  const target = getStorage(storage);
  if (!recommendationKey || !target?.setItem) return false;
  try {
    target.setItem(HANGAR_RECOMMENDATION_ACK_KEY, JSON.stringify({
      version: 1,
      recommendationKey,
      acknowledgedAt: new Date().toISOString()
    }));
    return true;
  } catch {
    return false;
  }
}
