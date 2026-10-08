export const CHALLENGE_FLIGHT_TARGET_WINDOW_MS = 4800;

// Offsets begin at zero so the existing entry curve joins the route smoothly.
export function sampleChallengeFlightOffset(pattern, seconds, slot, width, height) {
  const t = Math.max(0, Number(seconds) || 0), phase = (slot || 0) * 0.72;
  const side = (slot || 0) % 2 ? -1 : 1;
  const ease = Math.min(1, t / 0.6) ** 2 * (3 - 2 * Math.min(1, t / 0.6));
  let x = 0, y = 0;
  switch (pattern) {
    case 'crosscut': x = side * Math.sin(t * .72) * width * .22; y = Math.sin(t * 1.3 + phase) * height * .06; break;
    case 'needle_dance': x = Math.sin(t * 2.1 + phase) * width * .10; y = Math.sin(t * .8 + phase) * height * .10; break;
    case 'orbit_waltz': x = (Math.cos(t * 1.4 + phase) - Math.cos(phase)) * width * .10; y = Math.sin(t * 1.4 + phase) * height * .10; break;
    case 'pincer_polka': x = side * Math.sin(t * .9) * width * .16; y = Math.sin(t * 1.8 + phase) * height * .07; break;
    default: x = Math.sin(t * 1.5 + phase) * width * .13; y = Math.sin(t * .75 + phase) * height * .04;
  }
  return { x: x * ease || 0, y: y * ease || 0 };
}

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
