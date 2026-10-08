import { t, translateText } from '../i18n/index.js';
import { getRunModeProfile, parseRunMode } from '../game/RunMode.js';

export function getRunHistoryPresentation(entry = {}) {
  const sector = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const mode = parseRunMode(entry.runMode);
  const start = sector(entry.startSector ?? entry.sectorStart);
  const end = sector(entry.endSector ?? entry.finalSector ?? entry.highestSectorReached
    ?? (entry.levelSource === 'score_estimate' ? null : entry.level));
  return {
    mode: mode ? translateText(getRunModeProfile(mode).label) : t('history.unknownMode'),
    range: start == null && end == null ? '—' : `${translateText('S')} ${start ?? '—'}–${end ?? '—'}`,
    start, end
  };
}

export function getSectorReachedLabel(entry = {}) {
  const { end } = getRunHistoryPresentation(entry);
  return end == null ? t('history.sectorUnrecorded') : translateText('REACHED SECTOR {sector}', { sector: end });
}
