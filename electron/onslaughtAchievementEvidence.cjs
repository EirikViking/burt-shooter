const { validOnslaughtStartAugments, ONSLAUGHT_RULESET_V2 } = require('./onslaughtContract.cjs');

const bounded = (value) => Math.max(0, Math.floor(Number(value) || 0));
const ids = (value) => [...new Set((Array.isArray(value) ? value : []).map(item => String(item || '').trim()).filter(Boolean))];
const triple = (value) => validOnslaughtStartAugments(value) ? [...value].sort().join('+') : null;
const normalizeSnakeDefeats = (value) => Array.isArray(value) ? value.filter(item => (
  item && typeof item.type === 'string' && item.type.length > 0
  && Number.isInteger(item.lifeLosses) && item.lifeLosses >= 0
)).slice(0, 100).map(item => ({ type: item.type.slice(0, 60), lifeLosses: item.lifeLosses, sector: bounded(item.sector) })) : null;

function normalizeOnslaughtEvidence(raw = []) {
  if (!Array.isArray(raw)) return [];
  const byRun = new Map();
  for (const item of raw) {
    if (!item || typeof item !== 'object' || String(item.runId || '').length < 8) continue;
    if (!['overrun_tactical', 'overrun_pure'].includes(item.mode)) continue;
    if (item.mode === 'overrun_tactical' && item.rulesetVersion !== ONSLAUGHT_RULESET_V2) continue;
    if (item.mode === 'overrun_tactical' && !triple(String(item.startingTriple || '').split('+'))) continue;
    const normalized = {
      runId: String(item.runId).slice(0, 100),
      completedAt: Number.isFinite(Date.parse(item.completedAt)) ? String(item.completedAt) : '1970-01-01T00:00:00.000Z',
      mode: item.mode, rulesetVersion: item.rulesetVersion,
      hullId: String(item.hullId || '').slice(0, 60),
      startingTriple: item.mode === 'overrun_tactical' ? triple(String(item.startingTriple).split('+')) : null,
      sectorsCleared: bounded(item.sectorsCleared), bossesKilled: bounded(item.bossesKilled),
      wavesCleared: bounded(item.wavesCleared), elapsedSeconds: bounded(item.elapsedSeconds),
      noHitWaves: bounded(item.noHitWaves), lifeLosses: bounded(item.lifeLosses),
      snakeTypes: ids(item.snakeTypes).slice(0, 20),
      snakeDefeats: normalizeSnakeDefeats(item.snakeDefeats),
      earnedAugments: ids(item.earnedAugments).slice(0, 30),
      earnedFusions: ids(item.earnedFusions).slice(0, 20)
    };
    if (normalized.hullId) byRun.set(normalized.runId, normalized);
  }
  return [...byRun.values()].sort((a, b) => a.completedAt.localeCompare(b.completedAt) || a.runId.localeCompare(b.runId));
}

module.exports = { normalizeOnslaughtEvidence, normalizeSnakeDefeats };
