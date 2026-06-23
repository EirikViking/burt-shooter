import { getBossSupportShipProfile } from '../config/BossSupportShips.js';

export const BOSS_FUEL_SHIP_CODEX_ID = 'boss_fuel_ship';

function resolveSupportProfile(enemy) {
  if (!enemy || enemy.kind !== BOSS_FUEL_SHIP_CODEX_ID) return null;
  const profile = enemy.bossSupportShipProfile || getBossSupportShipProfile(enemy.bossFuelProfile?.id);
  return profile?.id ? profile : null;
}

export function getBossSupportCodexDefeatEntries(enemy, sector = 1) {
  if (!enemy || enemy.kind !== BOSS_FUEL_SHIP_CODEX_ID) return [];
  const safeSector = Math.max(1, Math.floor(Number(sector) || 1));
  const profile = resolveSupportProfile(enemy);
  const entries = [{
    threatId: BOSS_FUEL_SHIP_CODEX_ID,
    category: 'enemies',
    metadata: {
      name: 'Boss Fuel Ship',
      role: 'Boss healer',
      movementStyle: 'intercept run',
      fireStyle: 'unarmed',
      rarity: 'Boss Support',
      sector: safeSector
    }
  }];

  if (profile?.id && profile.id !== BOSS_FUEL_SHIP_CODEX_ID) {
    entries.push({
      threatId: profile.id,
      category: 'enemies',
      metadata: {
        name: profile.displayName || profile.id,
        role: 'Boss support',
        movementStyle: 'intercept run',
        fireStyle: 'unarmed',
        rarity: 'Boss Support',
        sector: safeSector
      }
    });
  }

  return entries;
}
