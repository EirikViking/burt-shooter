// Display policy only. Never owns attack timing, rewards, or random selection.
export function usesOpeningCombatReadability(game) {
  const sector = Number(game?.level);
  return sector >= 1 && sector <= 3;
}

const SECONDARY_NOTICES = new Set([
  'rank_up', 'rank_boost', 'score_boost', 'codex', 'codex_discovery',
  'discovery', 'pilot_order', 'pilot_order_progress', 'pilot_order_complete',
  'run_contract', 'run_contract_progress', 'run_contract_complete',
  'runContractProgress', 'runContractComplete', 'runContractStart', 'runContract'
]);

export function isSecondaryCombatNotice(type) {
  return SECONDARY_NOTICES.has(type);
}

// Preserve warm faction variations, but reserve cyan/green for friendly tools.
export function getHostileProjectileInk(color = 0xff6655) {
  const r = (color >>> 16) & 255, g = (color >>> 8) & 255, b = color & 255;
  if (b > r * 1.1 || g > r * 1.1) return 0xffb34f;
  if (b > g * 1.25) return 0xff78bd;
  return g > b * 1.25 ? 0xff854a : 0xff5d6a;
}
