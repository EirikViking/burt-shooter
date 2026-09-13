// Opening encounters retain their roster, score budget and short route to the
// first boss. Small wings arrive in distinct beats instead of feeding one gun.
// No random draws, reactive difficulty, extra enemies or entry invulnerability.
export function openingWaveEntry({config, sourceLevel, waveIndex, slot, count, runMode, width, height}) {
  if (!['ranked', 'ranked_tactical', 'unranked', 'scout'].includes(runMode)
    || sourceLevel < 1 || sourceLevel > 6 || !config || count < 4
    || config.isChallenge || config.isMayhemReinforcement || config.isBossMayhemReinforcement
    || config.highSectorAuthoredEncounter || config.allowConcurrentSpawn) return null;

  const firstEncounter = sourceLevel === 1 && waveIndex === 0;
  const wings = firstEncounter ? 2 : 3;
  const wingSize = Math.ceil(count / wings);
  const wing = Math.floor(slot / wingSize);
  const wingSlot = slot % wingSize;
  // A little more separation at the start; gradually rejoin normal cadence.
  const blend = sourceLevel <= 3 ? 1 : (7 - sourceLevel) / 4;
  const beatMs = firstEncounter ? 1250 : [1150, 1300, 1200][waveIndex % 3];
  const side = (wing + waveIndex + sourceLevel) % 2 === 0 ? -1 : 1;
  return {
    wing,
    delayMs: Math.round((wing * beatMs + wingSlot * 160) * blend),
    // Slightly different approach for each wing, safely above the playfield.
    x: width * (side < 0 ? 0.19 : 0.81),
    y: -Math.max(65, height * 0.09),
    route: firstEncounter ? 'crown' : ['hook', 'braid', 'scissor'][(waveIndex + wing) % 3],
    side,
    strength: firstEncounter ? 0.55 : 0.78
  };
}
