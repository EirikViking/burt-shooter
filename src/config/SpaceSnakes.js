export const SPACE_SNAKES = Object.freeze([
  { id: 'space_snake_cinder', index: 0, segments: 8, color: 0xff783a, period: 7.6, amplitude: .33, coils: 1, fireDelay: 190 },
  { id: 'space_snake_thorn', index: 1, segments: 10, color: 0xb2f64d, period: 9.2, amplitude: .35, coils: 2, fireDelay: 220 },
  { id: 'space_snake_widow', index: 2, segments: 9, color: 0xbb76ff, period: 8.4, amplitude: .30, coils: 3, fireDelay: 200 },
  { id: 'space_snake_abyss', index: 3, segments: 11, color: 0x59caff, period: 10, amplitude: .34, coils: 4, fireDelay: 245 }
].map(p => Object.freeze({ ...p, art: `/art/core-serpent/snake-${p.index + 1}-head-imagegen.png`, voice: `serpent_${p.index + 1}` })));

export function getSpaceSnakeProfile(id) { return SPACE_SNAKES.find(p => p.id === id) || null; }

// Twenty percent is an average, not a guaranteed cadence. Use the run's
// seeded roll; never stack with authored special encounters.
export function isSpaceSnakeEligible(config, level, game) {
  return level >= 6 && !config.isChallenge && config.type !== 'BOSS'
    && !config.isMayhemReinforcement && !config.isBossMayhemReinforcement
    && !config.allowConcurrentSpawn && !config.highSectorAuthoredEncounter
    && !game?.lateGameExperiment?.active && game?.runMode !== 'daily_signal';
}
export function isSpaceSnakeWave(roll) {
  return Number.isFinite(roll) && roll >= 0 && roll < .2;
}
export function sampleSpaceSnake(profile, seconds, width, height) {
  const t = seconds * Math.PI * 2 / profile.period;
  const entry = Math.min(1, Math.max(0, seconds / 2.6));
  const x = width * (.5 + profile.amplitude * Math.sin(t) * (.88 + .12 * Math.cos(t * profile.coils)));
  const targetY = height * (.43 + .13 * Math.sin(t * (profile.index % 2 ? 2 : 1) + profile.index) + .035 * Math.sin(t * 3));
  return { x, y: -140 + (targetY + 140) * entry };
}
