import { validOnslaughtRun, ONSLAUGHT_RULESET, ONSLAUGHT_RULESET_V2 } from '../../electron/onslaughtContract.cjs';
import { getProfileScopedStorageKey } from '../profile/ProfileStorageNamespace.js';

const RECORD_KEYS = Object.freeze({
  [ONSLAUGHT_RULESET]: 'novaSwarm.onslaughtRanked.v1',
  [ONSLAUGHT_RULESET_V2]: 'novaSwarm.onslaughtRanked.v2'
});
const INVITE_KEY = 'novaSwarm.onslaughtInvitation.v1';
const invitedSessions = new Set();
const targets = Object.freeze([
  { id: 'first_sector', metric: 'sectorsCleared', value: 1, text: 'Clear 1 sector after launch' },
  { id: 'five_sectors', metric: 'sectorsCleared', value: 5, text: 'Clear 5 sectors after launch' },
  { id: 'first_boss', metric: 'bossKills', value: 1, text: 'Defeat your first Onslaught boss' },
  { id: 'ten_sectors', metric: 'sectorsCleared', value: 10, text: 'Clear 10 sectors after launch' },
  { id: 'three_bosses', metric: 'bossKills', value: 3, text: 'Defeat 3 bosses in one run' }
]);
function storageOf(options) { try { return options.storage || globalThis.localStorage; } catch { return null; } }
function read(key, options = {}) { try { return JSON.parse(storageOf(options)?.getItem(getProfileScopedStorageKey(key)) || 'null'); } catch { return null; } }
function write(key, value, options = {}) { try { const storage = storageOf(options); if (!storage) return false; storage.setItem(getProfileScopedStorageKey(key), JSON.stringify(value)); return true; } catch { return false; } }
export function getOnslaughtBest(options = {}) {
  const rulesetVersion = options.rulesetVersion || ONSLAUGHT_RULESET_V2;
  const record = RECORD_KEYS[rulesetVersion] ? read(RECORD_KEYS[rulesetVersion], options) : null;
  return record?.rulesetVersion === rulesetVersion ? record : null;
}
export function getVisibleOnslaughtBest(localBest, entries = []) {
  const steamScore = Array.isArray(entries)
    ? entries.filter(entry => entry?.isCurrentPlayer === true && !entry?.isCpuRival)
      .reduce((score, entry) => Math.max(score, Math.max(0, Math.floor(Number(entry.score) || 0))), 0)
    : 0;
  const localScore = Math.max(0, Math.floor(Number(localBest?.score) || 0));
  return steamScore > localScore ? { ...(localBest || {}), score: steamScore } : localBest;
}
export function isConfirmedOnslaughtPersonalBest({ localNewBest, steamStatus, steamBestUnchanged, score, previousSteamBestScore } = {}) {
  return localNewBest === true && steamStatus === 'submitted' && steamBestUnchanged !== true
    && Number(score) > Math.max(0, Number(previousSteamBestScore) || 0);
}
export function recordOnslaughtRun(run, options = {}) {
  const rulesetVersion = run?.rulesetVersion;
  const previous = getOnslaughtBest({ ...options, rulesetVersion });
  if (!validOnslaughtRun(run) || !Number.isFinite(run.score) || run.score < 0) return { stored: false, best: previous, isNewBest: false };
  const isNewBest = run.score > (previous?.score || 0);
  const best = {
    ...(isNewBest || !previous ? { ...run, competitionStart: { ...run.competitionStart } } : previous),
    rulesetVersion,
    bestWavesCleared: Math.max(previous?.bestWavesCleared || 0, run.wavesCleared || 0),
    bestSectorsCleared: Math.max(previous?.bestSectorsCleared || 0,
      Number.isFinite(Number(run.sectorsCleared))
        ? Math.max(0, Math.floor(Number(run.sectorsCleared)))
        : Math.max(0, Math.floor(Number(run.endSector) || 0) - Math.floor(Number(run.startSector) || 51))),
    bestBossKills: Math.max(previous?.bestBossKills || 0, run.bossKills || 0)
  };
  return { stored: write(RECORD_KEYS[rulesetVersion], best, options), best, previous, isNewBest };
}
export function getRecoverableOnslaughtSubmission(options = {}) {
  const record = getOnslaughtBest(options);
  if (!record || !validOnslaughtRun(record) || !Number.isFinite(record.score) || record.score < 0) return null;
  if (record.steamAccepted?.runId === record.runId && Number(record.steamAccepted?.score) >= Number(record.score)) return null;
  return { ...record, competitionStart: { ...record.competitionStart } };
}
export function getRecoverableOnslaughtSubmissions(options = {}) {
  return [ONSLAUGHT_RULESET, ONSLAUGHT_RULESET_V2]
    .map(rulesetVersion => getRecoverableOnslaughtSubmission({ ...options, rulesetVersion }))
    .filter(Boolean);
}
export function markOnslaughtSteamAccepted(run = {}, steam = {}, options = {}) {
  const rulesetVersion = run.rulesetVersion;
  const record = getOnslaughtBest({ ...options, rulesetVersion });
  if (!record || record.runId !== run.runId || Number(record.score) !== Number(run.score)) return false;
  return write(RECORD_KEYS[rulesetVersion], {
    ...record,
    steamAccepted: {
      runId: record.runId,
      score: record.score,
      acceptedAt: new Date().toISOString(),
      bestUnchanged: steam.bestUnchanged === true
    }
  }, options);
}
export function getFlightTargets(record = null) {
  return targets.map(target => {
    const progress = Number(target.metric === 'sectorsCleared' ? record?.bestSectorsCleared : record?.bestBossKills) || 0;
    return { ...target, progress, earned: progress >= target.value };
  });
}
export function chooseOnslaughtTarget(entries = [], personal = null) {
  const score = Number(personal?.score) || 0;
  const next = entries.filter(e => !e.isCpuRival && !e.presentationOnly && !e.excludedFromCompetition && !e.isCurrentPlayer && Number(e.rank) > 0 && Number(e.score) > score)
    .sort((a,b) => a.score - b.score)[0];
  if (next) return { kind: 'record', score: next.score, rank: next.rank, name: next.playerName || next.name };
  if (score > 0) return { kind: 'personal', score };
  return { kind: 'flight', target: getFlightTargets(personal).find(t => !t.earned) || getFlightTargets(personal).at(-1) };
}
export function isOnslaughtInvitationReady(progress = {}, options = {}) {
  const saved = read(INVITE_KEY, options);
  const history = read('novaSwarm.overrunRunRecords.v1', options);
  return Math.max(Number(progress.bestSector)||0, Number(progress.bestLevel)||0) >= 11
    && !saved?.dismissed && !saved?.tried
    && !history?.byMode?.overrun_tactical && !history?.byMode?.overrun_pure;
}
export function claimOnslaughtInvitation(progress, options = {}) {
  const session = options.sessionId || getProfileScopedStorageKey(INVITE_KEY);
  if (invitedSessions.has(session) || !isOnslaughtInvitationReady(progress, options)) return false;
  invitedSessions.add(session); return true;
}
export function dismissOnslaughtInvitation(options = {}) { return write(INVITE_KEY, { ...read(INVITE_KEY, options), dismissed: true }, options); }
export function markOnslaughtTried(options = {}) { return write(INVITE_KEY, { ...read(INVITE_KEY, options), tried: true }, options); }
