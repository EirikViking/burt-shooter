export function isReturningPilot(progress = {}) {
  return Math.max(0, Math.floor(Number(progress?.totalRuns) || 0)) > 0;
}

export function getShipIntroTiming({ compact = false, returningPilot = false, runbackRestart = false } = {}) {
  if (runbackRestart) {
    return {
      flightMs: 320,
      totalMs: 420,
      fadeInMs: 90,
      holdUntilMs: 270,
      impactStartMs: 220,
      impactEndMs: 300
    };
  }

  if (returningPilot) {
    return compact
      ? {
          flightMs: 900,
          totalMs: 1400,
          fadeInMs: 240,
          holdUntilMs: 950,
          impactStartMs: 700,
          impactEndMs: 820
        }
      : {
          flightMs: 1050,
          totalMs: 1600,
          fadeInMs: 280,
          holdUntilMs: 1100,
          impactStartMs: 820,
          impactEndMs: 950
        };
  }

  return compact
    ? {
        flightMs: 1500,
        totalMs: 2600,
        fadeInMs: 500,
        holdUntilMs: 2000,
        impactStartMs: 1160,
        impactEndMs: 1300
      }
    : {
        flightMs: 1800,
        totalMs: 3200,
        fadeInMs: 600,
        holdUntilMs: 2800,
        impactStartMs: 1400,
        impactEndMs: 1550
      };
}

export function isFloatingComboMilestone(value) {
  const count = Math.max(0, Math.floor(Number(value) || 0));
  if (count === 3 || count === 5) return true;
  if (count < 10) return false;
  if (count <= 30) return count % 5 === 0;
  return count % 10 === 0;
}

export function getRecoverySectorGoal({ currentSector = 1, bestSector = 1 } = {}) {
  const current = Math.max(1, Math.floor(Number(currentSector) || 1));
  const best = Math.max(current, Math.floor(Number(bestSector) || current));
  const gap = best - current;
  const distantBestThreshold = Math.max(5, Math.ceil(current * 0.5));
  if (gap < distantBestThreshold) return null;

  const step = current < 3 ? 1 : current < 10 ? 2 : 1;
  return Math.min(best, current + step);
}
