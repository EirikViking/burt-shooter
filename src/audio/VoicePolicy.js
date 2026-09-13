export const CHATTER_FREQUENCY_KEY = 'nova_audio_chatter_frequency';
export const CHATTER_FREQUENCY_OPTIONS = Object.freeze(['full', 'reduced', 'minimal']);

const CHATTER_EXACT_EVENTS = new Set([
  'game_over_taunt',
  'level_clear_flirt',
  'mission_control_powerup'
]);

const CHATTER_PREFIXES = Object.freeze([
  'boss_menu_bark_',
  'boss_tactical_inspect_',
  'one_more_run_'
]);

export function normalizeChatterFrequency(value, fallback = 'full') {
  const normalized = String(value || '').trim().toLowerCase();
  return CHATTER_FREQUENCY_OPTIONS.includes(normalized)
    ? normalized
    : (CHATTER_FREQUENCY_OPTIONS.includes(fallback) ? fallback : 'full');
}

export function getChatterFrequencyLabel(value) {
  const normalized = normalizeChatterFrequency(value);
  return normalized === 'minimal' ? 'Minimal' : normalized === 'reduced' ? 'Reduced' : 'Full';
}

export function classifyVoiceEvent(eventName) {
  const id = String(eventName || '').trim();
  const chatter = CHATTER_EXACT_EVENTS.has(id) || CHATTER_PREFIXES.some((prefix) => id.startsWith(prefix));
  return {
    eventName: id,
    category: chatter ? 'chatter' : 'critical',
    critical: !chatter,
    chatter,
    reason: chatter ? 'explicit_chatter_allowlist' : 'critical_by_default'
  };
}

export function shouldPlayChatterRequest(frequency, sequence = 0) {
  const normalized = normalizeChatterFrequency(frequency);
  const safeSequence = Math.max(0, Math.floor(Number(sequence) || 0));
  if (normalized === 'full') return true;
  const stride = normalized === 'minimal' ? 4 : 2;
  return safeSequence % stride === 0;
}
