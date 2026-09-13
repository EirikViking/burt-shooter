export const CHALLENGE_FLIGHT_TARGET_WINDOW_MS = 4800;

export const CHALLENGE_FLIGHT_PATTERNS = Object.freeze([
  Object.freeze({ id: 'star_parade', label: 'STAR PARADE', formation: 'TUTORIAL_ARC', tactic: 'strafe_sweep', entry: 'alternating', cadence: 1.32 }),
  Object.freeze({ id: 'crosscut', label: 'CROSSCUT', formation: 'CROSS_STREAM', tactic: 'split_sweep', entry: 'split', cadence: 1.38 }),
  Object.freeze({ id: 'needle_dance', label: 'NEEDLE DANCE', formation: 'DIAGONAL_RAID', tactic: 'needle_stagger', entry: 'alternating', cadence: 1.42 }),
  Object.freeze({ id: 'orbit_waltz', label: 'ORBIT WALTZ', formation: 'ORBIT_RING', tactic: 'orbit_snare', entry: 'single', cadence: 1.3 }),
  Object.freeze({ id: 'pincer_polka', label: 'PINCER POLKA', formation: 'PINCER', tactic: 'crossfire_pincer', entry: 'split', cadence: 1.36 })
]);

export function getChallengeFlightPattern(level = 1, waveIndex = 0) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const safeWave = Math.max(0, Math.floor(Number(waveIndex) || 0));
  return CHALLENGE_FLIGHT_PATTERNS[(safeLevel * 7 + safeWave * 3) % CHALLENGE_FLIGHT_PATTERNS.length];
}

export function gradeChallengeFlight(kills = 0, targets = 1) {
  const safeTargets = Math.max(1, Math.floor(Number(targets) || 1));
  const safeKills = Math.max(0, Math.min(safeTargets, Math.floor(Number(kills) || 0)));
  const ratio = safeKills / safeTargets;
  if (safeKills === safeTargets) return { grade: 'PERFECT', label: 'PERFECT FLIGHT!', bonus: 5000, ratio };
  if (ratio >= 0.75) return { grade: 'A', label: 'FLIGHT GRADE A', bonus: 2400, ratio };
  if (ratio >= 0.5) return { grade: 'B', label: 'FLIGHT GRADE B', bonus: 1400, ratio };
  if (safeKills > 0) return { grade: 'C', label: 'FLIGHT GRADE C', bonus: 700, ratio };
  return { grade: 'MISS', label: 'FLIGHT MISSED', bonus: 0, ratio };
}
