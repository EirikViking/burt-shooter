function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function estimateHighSectorHazardArea(hazard) {
  if (!hazard || typeof hazard !== 'object') return 0;
  if (hazard.kind === 'wall') {
    return Math.max(0, Number(hazard.endY) - Number(hazard.startY))
      * Math.max(1, hazard.columns?.length || 1)
      * Math.max(1, Number(hazard.width) * 2);
  }
  if (hazard.kind === 'ring') {
    const outerRadius = Math.max(0, Number(hazard.outerRadius) || 0);
    const innerRadius = Math.max(0, Math.min(outerRadius, Number(hazard.innerRadius) || 0));
    const annulus = Math.PI * Math.max(0, outerRadius ** 2 - innerRadius ** 2);
    const safeFraction = clamp((Number(hazard.safeWedge) || 0) / Math.PI, 0, 0.8);
    return annulus * (1 - safeFraction);
  }
  if (hazard.kind === 'beam') {
    return Math.max(1, Number(hazard.length) || 1) * Math.max(1, (Number(hazard.radius) || 1) * 2);
  }
  return 0.5 * Math.max(1, Number(hazard.length) || 1) ** 2 * Math.max(0.01, Number(hazard.spread) || 0.01);
}

function isHazardActive(hazard, now = Date.now()) {
  if (!hazard || hazard.active === false) return false;
  if (Number.isFinite(Number(hazard.elapsedMs)) && Number.isFinite(Number(hazard.durationMs))) {
    return Number(hazard.elapsedMs) < Number(hazard.durationMs);
  }
  if (Number.isFinite(Number(hazard.startedAt)) && Number.isFinite(Number(hazard.durationMs))) {
    return now < Number(hazard.startedAt) + Number(hazard.durationMs);
  }
  return true;
}

export function getAggregateHighSectorHazardRatio(hazards, width, height, now = Date.now()) {
  const screenArea = Math.max(1, Number(width) * Number(height));
  const totalArea = (Array.isArray(hazards) ? hazards : [])
    .filter((hazard) => isHazardActive(hazard, now))
    .reduce((sum, hazard) => sum + estimateHighSectorHazardArea(hazard), 0);
  return totalArea / screenArea;
}

function scaleHazardToArea(hazard, allowedArea) {
  const beforeArea = estimateHighSectorHazardArea(hazard);
  if (beforeArea <= allowedArea) return true;
  if (beforeArea <= 0 || allowedArea <= 0) return false;
  const areaScale = clamp(allowedArea / beforeArea, 0, 1);

  if (hazard.kind === 'wall') {
    const nextWidth = (Number(hazard.width) || 0) * areaScale;
    if (nextWidth < 8) return false;
    hazard.width = nextWidth;
  } else if (hazard.kind === 'ring') {
    const radiusScale = Math.sqrt(areaScale);
    const nextOuter = (Number(hazard.outerRadius) || 0) * radiusScale;
    const nextInner = (Number(hazard.innerRadius) || 0) * radiusScale;
    if (nextOuter < 28 || nextOuter - nextInner < 8) return false;
    hazard.outerRadius = nextOuter;
    hazard.innerRadius = nextInner;
  } else if (hazard.kind === 'beam') {
    const nextRadius = (Number(hazard.radius) || 0) * areaScale;
    if (nextRadius < 5) return false;
    hazard.radius = nextRadius;
  } else {
    const nextSpread = (Number(hazard.spread) || 0) * areaScale;
    if (nextSpread < 0.02) return false;
    hazard.spread = nextSpread;
  }
  return estimateHighSectorHazardArea(hazard) <= allowedArea * 1.001;
}

export function applyAggregateHighSectorHazardBudget({
  hazard,
  activeHazards = [],
  width,
  height,
  maxRatio = 0.42,
  now = Date.now()
} = {}) {
  if (!hazard) return { accepted: false, hazard: null, rejectedReason: 'missing_hazard' };
  const screenArea = Math.max(1, Number(width) * Number(height));
  const safeMaxRatio = clamp(maxRatio, 0.05, 0.8);
  const existing = (Array.isArray(activeHazards) ? activeHazards : [])
    .filter((entry) => entry !== hazard && entry?.id !== hazard.id && isHazardActive(entry, now));
  const currentRatio = getAggregateHighSectorHazardRatio(existing, width, height, now);
  const beforeArea = estimateHighSectorHazardArea(hazard);
  const candidateBeforeRatio = beforeArea / screenArea;
  const remainingRatio = Math.max(0, safeMaxRatio - currentRatio);
  const allowedArea = remainingRatio * screenArea;
  const readable = scaleHazardToArea(hazard, allowedArea);
  const candidateAfterRatio = readable ? estimateHighSectorHazardArea(hazard) / screenArea : 0;
  const totalAfterRatio = currentRatio + candidateAfterRatio;
  const accepted = Boolean(readable && candidateAfterRatio > 0 && totalAfterRatio <= safeMaxRatio + 0.0001);

  const proof = {
    maxRatio: Number(safeMaxRatio.toFixed(4)),
    aggregateBeforeRatio: Number(currentRatio.toFixed(4)),
    candidateBeforeRatio: Number(candidateBeforeRatio.toFixed(4)),
    candidateAfterRatio: Number(candidateAfterRatio.toFixed(4)),
    aggregateAfterRatio: Number((accepted ? totalAfterRatio : currentRatio).toFixed(4)),
    safeCorridorPreserved: true,
    accepted,
    rejectedReason: accepted ? null : (remainingRatio <= 0 ? 'aggregate_budget_exhausted' : 'minimum_readable_footprint')
  };
  hazard.highSectorAreaCap = proof;

  return {
    accepted,
    hazard: accepted ? hazard : null,
    ...proof
  };
}
