export const ACHIEVEMENT_ATTENTION_STORAGE_KEY = 'nova.achievementAttention.v1';

function getStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function readAchievementAttentionState(storage = getStorage()) {
  if (!storage) return { version: 1, unreadIds: [], updatedAt: null };
  try {
    const raw = storage.getItem(ACHIEVEMENT_ATTENTION_STORAGE_KEY);
    if (!raw) return { version: 1, unreadIds: [], updatedAt: null };
    const parsed = JSON.parse(raw);
    const unreadIds = Array.isArray(parsed?.unreadIds)
      ? parsed.unreadIds.map(String).filter(Boolean)
      : [];
    return {
      version: 1,
      unreadIds: [...new Set(unreadIds)],
      updatedAt: parsed?.updatedAt || null
    };
  } catch {
    return { version: 1, unreadIds: [], updatedAt: null };
  }
}

export function recordAchievementAttention(id, storage = getStorage()) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId || !storage) return readAchievementAttentionState(storage);
  const current = readAchievementAttentionState(storage);
  const next = {
    version: 1,
    unreadIds: [...new Set([...current.unreadIds, normalizedId])],
    updatedAt: new Date().toISOString()
  };
  try {
    storage.setItem(ACHIEVEMENT_ATTENTION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Menu attention is cosmetic; achievement unlock persistence owns the source of truth.
  }
  return next;
}

export function clearAchievementAttention(storage = getStorage()) {
  const next = { version: 1, unreadIds: [], updatedAt: new Date().toISOString() };
  if (!storage) return next;
  try {
    storage.setItem(ACHIEVEMENT_ATTENTION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best effort only.
  }
  return next;
}

export function getAchievementAttentionDebugState(storage = getStorage()) {
  const state = readAchievementAttentionState(storage);
  return {
    unreadCount: state.unreadIds.length,
    unreadIds: state.unreadIds,
    glowVisible: state.unreadIds.length > 0,
    updatedAt: state.updatedAt
  };
}
