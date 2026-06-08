export const RUN_MODES = Object.freeze({
  RANKED: 'ranked',
  UNRANKED: 'unranked',
  SECTOR_START: 'sector_start'
});

export const SECTOR_START_CHECKPOINT_INTERVAL = 5;

export function normalizeRunMode(value) {
  const mode = String(value || '').trim();
  if (mode === RUN_MODES.UNRANKED || mode === RUN_MODES.SECTOR_START) return mode;
  return RUN_MODES.RANKED;
}

export function isRankedRunMode(mode, { isDebugRun = false } = {}) {
  return normalizeRunMode(mode) === RUN_MODES.RANKED && isDebugRun !== true;
}

function floorSector(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.floor(number)) : fallback;
}

export function getHighestReachedSector(progress = {}) {
  if (typeof progress === 'number') return floorSector(progress, 1);
  return Math.max(
    1,
    floorSector(progress.bestSector, 1),
    floorSector(progress.bestLevel, 1),
    floorSector(progress.sectorReached, 1),
    floorSector(progress.levelReached, 1)
  );
}

export function getSectorStartCheckpoints(progressOrHighest = {}, {
  interval = SECTOR_START_CHECKPOINT_INTERVAL
} = {}) {
  const highest = getHighestReachedSector(progressOrHighest);
  const step = Math.max(1, Math.floor(Number(interval) || SECTOR_START_CHECKPOINT_INTERVAL));
  const checkpoints = [];
  for (let sector = step; sector <= highest; sector += step) {
    checkpoints.push(sector);
  }
  return checkpoints;
}

export function resolveSectorStartCheckpoint(requestedSector, progressOrHighest = {}) {
  const checkpoints = getSectorStartCheckpoints(progressOrHighest);
  if (!checkpoints.length) return null;
  if (requestedSector == null) return checkpoints[checkpoints.length - 1];
  const requested = floorSector(requestedSector, 0);
  return checkpoints.includes(requested) ? requested : null;
}

export function getSectorStartPlaySector(checkpointSector) {
  const checkpoint = floorSector(checkpointSector, 0);
  if (checkpoint < 1) return null;
  return checkpoint % 10 === 0 ? checkpoint + 1 : checkpoint;
}

export function getSectorStartState(progress = {}, requestedSector = null) {
  const highestReachedSector = getHighestReachedSector(progress);
  const checkpoints = getSectorStartCheckpoints(highestReachedSector);
  const selectedCheckpoint = resolveSectorStartCheckpoint(requestedSector, highestReachedSector);
  return {
    available: checkpoints.length > 0,
    highestReachedSector,
    checkpoints,
    selectedCheckpoint
  };
}
