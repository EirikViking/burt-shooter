function isVisibleTarget(target) {
  return target?.visible !== false
    && target?.renderable !== false
    && target?.sprite?.visible !== false
    && target?.sprite?.renderable !== false
    && (!Number.isFinite(Number(target?.sprite?.alpha)) || Number(target.sprite.alpha) > 0);
}

export function isSkyVerdictTargetEligible(target) {
  if (!target || target.active === false || target.destroyed === true || target.waitingForEntry === true) {
    return false;
  }
  if (!isVisibleTarget(target)) return false;
  return Number.isFinite(Number(target.x)) && Number.isFinite(Number(target.y));
}

export function compareSkyVerdictThreatPriority(a, b, boss = null) {
  const aBoss = a === boss || a?.kind === 'boss' || a?.isBoss ? 1 : 0;
  const bBoss = b === boss || b?.kind === 'boss' || b?.isBoss ? 1 : 0;
  if (aBoss !== bBoss) return bBoss - aBoss;

  const yDelta = (Number(b?.y) || 0) - (Number(a?.y) || 0);
  if (Math.abs(yDelta) > 0.001) return yDelta;

  const xDelta = (Number(a?.x) || 0) - (Number(b?.x) || 0);
  if (Math.abs(xDelta) > 0.001) return xDelta;

  const idDelta = String(a?.id || a?.type || a?.kind || '')
    .localeCompare(String(b?.id || b?.type || b?.kind || ''));
  if (idDelta !== 0) return idDelta;

  const aOrdinal = Number(a?.spawnOrdinal ?? a?.spawnIndex ?? a?.spawnOrder);
  const bOrdinal = Number(b?.spawnOrdinal ?? b?.spawnIndex ?? b?.spawnOrder);
  if (Number.isFinite(aOrdinal) && Number.isFinite(bOrdinal)) return aOrdinal - bOrdinal;
  if (Number.isFinite(aOrdinal)) return -1;
  if (Number.isFinite(bOrdinal)) return 1;
  return 0;
}

export function selectSkyVerdictSurvivor({
  enemies = [],
  boss = null,
  hijacker = null,
  exclude = null
} = {}) {
  const excluded = exclude instanceof Set
    ? exclude
    : new Set(Array.isArray(exclude) ? exclude : exclude ? [exclude] : []);
  const candidates = [];
  const seen = new Set();

  const addCandidate = (target) => {
    if (seen.has(target) || excluded.has(target) || !isSkyVerdictTargetEligible(target)) return;
    seen.add(target);
    candidates.push(target);
  };

  for (const enemy of Array.isArray(enemies) ? enemies : []) addCandidate(enemy);
  addCandidate(boss);
  addCandidate(hijacker);

  candidates.sort((a, b) => compareSkyVerdictThreatPriority(a, b, boss));
  return candidates[0] || null;
}

export function getSkyVerdictTargetDebugId(target) {
  if (!target) return null;
  return String(target.id || target.type || target.kind || target.profile?.id || 'unknown');
}
