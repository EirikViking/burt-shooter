const RUN_REPORT_VERSION = 1;

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toWholeNumber(value, fallback = 0) {
  return Math.max(0, Math.round(toNumber(value, fallback)));
}

function formatDuration(seconds) {
  const totalSeconds = toWholeNumber(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  if (minutes <= 0) return `${remainder}s`;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function normalizeRunModeLabel(value) {
  const mode = String(value || 'ranked').trim().toLowerCase();
  if (mode === 'scout') return 'Scout Run';
  if (mode === 'sector_start') return 'Sector Run';
  if (mode === 'unranked') return 'Practice Run';
  return 'Mayhem Run';
}

function normalizeDeathSource(value) {
  const source = String(value || '').trim();
  if (!source) return 'unknown';
  return source
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function buildRows(entries) {
  return entries
    .filter((entry) => entry && entry.value !== null && entry.value !== undefined && entry.value !== '')
    .map((entry) => ({
      id: entry.id,
      value: entry.value,
      rawValue: entry.rawValue ?? entry.value
    }));
}

export function createRunReport(summary = {}) {
  const runtimeSeconds = toWholeNumber(summary.runElapsedSeconds);
  const score = toWholeNumber(summary.finalScore ?? summary.score);
  const sectorReached = Math.max(1, toWholeNumber(summary.sectorReached ?? summary.levelReached, 1));
  const runMode = String(summary.runMode || 'ranked');
  const shipId = summary.shipId || summary.selectedShipSpriteKey || null;
  const shipName = summary.shipName || shipId || 'Unknown Ship';
  const extraLivesEarned = toWholeNumber(summary.extraLivesEarned);
  const lifeLosses = toWholeNumber(summary.lifeLosses);
  const respawns = toWholeNumber(summary.respawns);
  const finalDeathSource = normalizeDeathSource(summary.finalDeathSource || summary.lastLifeLossSource);

  const report = {
    version: RUN_REPORT_VERSION,
    localOnly: true,
    createdAt: new Date().toISOString(),
    summary: {
      runMode,
      runModeLabel: normalizeRunModeLabel(runMode),
      shipId,
      shipName,
      score,
      sectorReached,
      runtimeSeconds,
      runtimeLabel: formatDuration(runtimeSeconds),
      runCleared: Boolean(summary.runCleared)
    },
    sections: [
      {
        id: 'run',
        rows: buildRows([
          { id: 'mode', value: normalizeRunModeLabel(runMode), rawValue: runMode },
          { id: 'ship', value: shipName, rawValue: shipId || shipName },
          { id: 'score', value: score },
          { id: 'sector', value: sectorReached },
          { id: 'time', value: formatDuration(runtimeSeconds), rawValue: runtimeSeconds }
        ])
      },
      {
        id: 'combat',
        rows: buildRows([
          { id: 'kills', value: toWholeNumber(summary.totalKills) },
          { id: 'bossKills', value: toWholeNumber(summary.bossesKilled) },
          { id: 'waves', value: toWholeNumber(summary.wavesCleared) },
          { id: 'nearMissSurges', value: toWholeNumber(summary.nearMissSurges) },
          { id: 'grazeBreaks', value: toWholeNumber(summary.grazeBreaks) }
        ])
      },
      {
        id: 'survival',
        rows: buildRows([
          { id: 'livesLost', value: lifeLosses },
          { id: 'respawns', value: respawns },
          { id: 'extraLives', value: extraLivesEarned },
          { id: 'finalHit', value: finalDeathSource, rawValue: summary.finalDeathSource || summary.lastLifeLossSource || null }
        ])
      },
      {
        id: 'rewards',
        rows: buildRows([
          { id: 'powerups', value: toWholeNumber(summary.powerupsCollected) },
          { id: 'careerXp', value: toWholeNumber(summary.pilotXpGained) },
          { id: 'newRanks', value: Array.isArray(summary.newRanksThisRun) ? summary.newRanksThisRun.length : 0 },
          { id: 'codex', value: toWholeNumber(summary.codexDiscoveries) }
        ])
      }
    ]
  };

  return report;
}

export function summarizeRunReport(report = null) {
  if (!report) return null;
  return {
    localOnly: Boolean(report.localOnly),
    runMode: report.summary?.runMode || null,
    shipName: report.summary?.shipName || null,
    score: report.summary?.score || 0,
    sectorReached: report.summary?.sectorReached || 0,
    runtimeSeconds: report.summary?.runtimeSeconds || 0,
    sectionIds: Array.isArray(report.sections) ? report.sections.map((section) => section.id) : []
  };
}
