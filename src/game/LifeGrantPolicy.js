import { BalanceConfig } from '../config/BalanceConfig.js';

export function canGrantRunLife({ sector = 1, source = 'extra_life', spawnedSector = null, allowEnduranceLife = false } = {}) {
  if (allowEnduranceLife || String(source).startsWith('debug') || String(source).startsWith('tactical_draft_')) return true;
  // Honor a pickup legitimately created before the cutoff and carried over.
  const grantedAt = Number.isFinite(spawnedSector) && spawnedSector >= 1 ? spawnedSector : sector;
  return grantedAt <= (Number(BalanceConfig.powerups.extraLifeFinalSector) || 100);
}
