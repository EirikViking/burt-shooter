import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

const require = createRequire(import.meta.url);
const {
  CLOUD_SAVE_FILE,
  CLOUD_SUBDIR,
  PROFILE_INDEX_FILE,
  PROFILE_SUBDIR,
  getPaths,
  normalizeProfileContext,
  sanitizeAchievements,
  sanitizeHangarProgress,
  sanitizeScores,
  sanitizeThreatDiscovery
} = require('../electron/steamCloudSave.cjs');

const DEFAULT_SOURCE = 'steam-76561198692310517';
const DEFAULT_TARGET = 'steam-76561198953993508';

function nowIso() {
  return new Date().toISOString();
}

function stampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(...lists) {
  return [...new Set(lists.flat().map((value) => String(value || '').trim()).filter(Boolean))];
}

function maxNumber(...values) {
  return Math.max(0, ...values.map((value) => Number(value) || 0));
}

function earliestIso(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return Date.parse(a) <= Date.parse(b) ? a : b;
}

function latestIso(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tempPath, JSON.stringify(payload, null, 2));
  copyFileSync(tempPath, filePath);
  try {
    awaitableUnlink(tempPath);
  } catch {
    // Best effort cleanup only.
  }
}

function awaitableUnlink(filePath) {
  require('node:fs').unlinkSync(filePath);
}

function profileFromKey(profileKey) {
  const key = String(profileKey || '').trim();
  if (key.startsWith('steam-')) {
    return normalizeProfileContext({ steamId: key.slice('steam-'.length) });
  }
  return normalizeProfileContext({ id: key || 'local-offline' });
}

function getUserDataPath(explicitPath) {
  if (explicitPath) return resolve(explicitPath);
  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error('APPDATA is not set. Pass --user-data <path> explicitly.');
  }
  return join(appData, 'nova-swarm');
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    source: DEFAULT_SOURCE,
    target: DEFAULT_TARGET,
    apply: false,
    userData: null,
    auditRoot: join(process.cwd(), 'test-results'),
    backupRoot: null,
    list: false,
    allowLowerSource: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === '--source') options.source = next();
    else if (arg === '--target') options.target = next();
    else if (arg === '--user-data') options.userData = next();
    else if (arg === '--audit-root') options.auditRoot = next();
    else if (arg === '--backup-root') options.backupRoot = next();
    else if (arg === '--apply') options.apply = true;
    else if (arg === '--dry-run') options.apply = false;
    else if (arg === '--list') options.list = true;
    else if (arg === '--allow-lower-source') options.allowLowerSource = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function helpText() {
  return [
    'Usage: node scripts/rescue-profile-progress.mjs --source <profile-key-or-save-path> --target <profile-key-or-save-path> [--apply]',
    '',
    'Defaults are the P0 rescue pair:',
    `  --source ${DEFAULT_SOURCE}`,
    `  --target ${DEFAULT_TARGET}`,
    '',
    'Dry-run is the default. Pass --apply only after reviewing the audit output.',
    'Use --user-data <path> to point at a copied AppData\\nova-swarm folder for testing.',
    'Use --list to print local profile summaries without merging.'
  ].join('\n');
}

function saveProfileKey(save, fallback = null) {
  const profile = object(save.profile);
  if (profile.storageId) return String(profile.storageId);
  if (profile.steamId) return `steam-${String(profile.steamId)}`;
  if (profile.type === 'local' && profile.id) return String(profile.id);
  return fallback;
}

function resolveSaveRef(userDataPath, ref, role) {
  const text = String(ref || '').trim();
  if (!text) throw new Error(`Missing ${role} profile key or save path`);
  const candidate = isAbsolute(text) ? text : resolve(text);
  if (existsSync(candidate)) {
    const stats = statSync(candidate);
    const savePath = stats.isDirectory() ? join(candidate, CLOUD_SAVE_FILE) : candidate;
    const save = readJson(savePath);
    return {
      ref: text,
      role,
      profileKey: saveProfileKey(save, text),
      savePath,
      save
    };
  }

  const profile = profileFromKey(text);
  const savePath = getPaths(userDataPath, profile).cloudSavePath;
  if (!existsSync(savePath)) {
    throw new Error(`${role} profile save not found for ${text}: ${savePath}`);
  }
  return {
    ref: text,
    role,
    profileKey: profile.storageId,
    profile,
    savePath,
    save: readJson(savePath)
  };
}

function profileMatchesKey(save, profileKey) {
  return saveProfileKey(save) === profileKey;
}

function countThreatDiscovery(discovery) {
  const items = object(discovery?.items);
  return Object.values(items).reduce((sum, bucket) => sum + Object.keys(object(bucket)).length, 0);
}

function checkpointKeys(records) {
  return Object.keys(object(records?.byCheckpoint))
    .map((key) => Number(key))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
}

function unlockedShipIds(save) {
  const hangar = object(save.hangarProgress);
  const ids = new Set(array(hangar.unlockedShipIds));
  for (const [id, value] of Object.entries(object(hangar.shipUnlocks))) {
    if (value) ids.add(id);
  }
  for (const id of Object.keys(object(hangar.shipSpecificMilestones))) ids.add(id);
  return [...ids].sort();
}

function threatItemIds(save) {
  const ids = [];
  for (const [category, bucket] of Object.entries(object(save.threatDiscovery?.items))) {
    for (const id of Object.keys(object(bucket))) ids.push(`${category}:${id}`);
  }
  return ids.sort();
}

function summarizeSave(save, filePath = null) {
  const hangar = object(save.hangarProgress);
  const progression = object(save.progression);
  const threatCount = countThreatDiscovery(save.threatDiscovery);
  const discoveredThreatIds = array(hangar.discoveredThreatIds).length;
  const codexDiscoveries = Math.max(threatCount, discoveredThreatIds, Number(hangar.totalCodexDiscoveries) || 0);
  const checkpoints = checkpointKeys(save.sectorStartChallengeRecords);
  const ships = unlockedShipIds(save);
  return {
    profileKey: saveProfileKey(save),
    steamId: object(save.profile).steamId || null,
    pilotRank: maxNumber(hangar.pilotRank, hangar.highestPilotRank, progression.bestRank),
    pilotXp: maxNumber(hangar.pilotXp),
    bestSector: maxNumber(hangar.bestSector, hangar.bestLevel, progression.bestLevel, ...checkpoints),
    bestScore: maxNumber(hangar.bestScore, progression.bestScore, ...array(save.localHighscores).map((entry) => entry?.score)),
    shipsUnlocked: ships.length,
    shipsReady: ships.length,
    codexDiscoveries,
    checkpointRecords: checkpoints,
    localHighscores: array(save.localHighscores).length,
    globalBest: maxNumber(progression.bestScore, hangar.bestScore),
    achievementsUnlocked: array(object(save.achievements).unlocked).length,
    updatedAt: save.updatedAt || null,
    filePath
  };
}

function progressScore(summary) {
  return (
    summary.pilotXp +
    summary.codexDiscoveries * 100 +
    summary.shipsUnlocked * 1000 +
    summary.bestSector * 2500 +
    summary.pilotRank * 5000 +
    summary.checkpointRecords.length * 750 +
    Math.floor(summary.bestScore / 10)
  );
}

function includesAll(targetValues, sourceValues) {
  const target = new Set(targetValues.map(String));
  return sourceValues.every((value) => target.has(String(value)));
}

function sourceAlreadyMergedIntoTarget(sourceSave, targetSave) {
  const source = summarizeSave(sourceSave);
  const target = summarizeSave(targetSave);
  return (
    target.pilotXp >= source.pilotXp &&
    target.pilotRank >= source.pilotRank &&
    target.bestSector >= source.bestSector &&
    target.bestScore >= source.bestScore &&
    target.shipsUnlocked >= source.shipsUnlocked &&
    target.codexDiscoveries >= source.codexDiscoveries &&
    includesAll(unlockedShipIds(targetSave), unlockedShipIds(sourceSave)) &&
    includesAll(checkpointKeys(targetSave.sectorStartChallengeRecords), checkpointKeys(sourceSave.sectorStartChallengeRecords)) &&
    includesAll(threatItemIds(targetSave), threatItemIds(sourceSave))
  );
}

function mergeMissingSettings(target, source) {
  if (Array.isArray(target) || Array.isArray(source)) return target === undefined ? source : target;
  if (!isPlainObject(target) || !isPlainObject(source)) return target === undefined || target === null ? source : target;
  const next = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (next[key] === undefined || next[key] === null) {
      next[key] = value;
    } else if (object(next[key]) && object(value)) {
      next[key] = mergeMissingSettings(next[key], value);
    }
  }
  return next;
}

function mergeNumericObjectMax(target, source) {
  const next = { ...object(target) };
  for (const [key, value] of Object.entries(object(source))) {
    if (typeof value === 'number') {
      next[key] = maxNumber(next[key], value);
    } else if (typeof value === 'boolean') {
      next[key] = Boolean(next[key] || value);
    } else if (Array.isArray(value)) {
      next[key] = uniqueStrings(array(next[key]), value);
    } else if (object(value)) {
      next[key] = mergeNumericObjectMax(next[key], value);
    } else if (next[key] === undefined || next[key] === null || next[key] === '') {
      next[key] = value;
    }
  }
  return next;
}

function mergeHangarProgress(target, source, updatedAt) {
  const a = sanitizeHangarProgress(target);
  const b = sanitizeHangarProgress(source);
  const numericKeys = [
    'version', 'unlockTuningVersion', 'pilotXp', 'pilotRank', 'highestPilotRank', 'totalRuns', 'bestScore',
    'bestSector', 'bestLevel', 'bestRank', 'bestRunTimeSeconds', 'survivedSeconds', 'totalBossesDefeated',
    'totalWavesCleared', 'totalCodexDiscoveries', 'runClears', 'noHitWaves', 'noHitSectors',
    'clearWithLivesRemaining', 'highestScoreMultiplier'
  ];
  const next = { ...a };
  for (const key of numericKeys) next[key] = maxNumber(a[key], b[key]);
  const reachedSector = maxNumber(next.bestSector, next.bestLevel);
  next.bestSector = reachedSector;
  next.bestLevel = reachedSector;
  for (const key of [
    'discoveredThreatIds', 'defeatedBossIds', 'runThemesSurvived', 'secretShipUnlockIds', 'unlockedShipIds',
    'lastNewlyUnlockedShipIds', 'newRanksThisRun', 'rankAchievementsUnlocked'
  ]) {
    next[key] = uniqueStrings(array(a[key]), array(b[key]));
  }
  next.creditsEasterEggFound = Boolean(a.creditsEasterEggFound || b.creditsEasterEggFound);
  next.shipSpecificMilestones = mergeNumericObjectMax(a.shipSpecificMilestones, b.shipSpecificMilestones);
  next.rankProgress = mergeNumericObjectMax(a.rankProgress, b.rankProgress);
  next.updatedAt = updatedAt;
  return next;
}

function mergeThreatItem(target, source) {
  const next = { ...object(target), ...object(source) };
  next.firstSeenAt = earliestIso(target?.firstSeenAt, source?.firstSeenAt) || target?.firstSeenAt || source?.firstSeenAt || nowIso();
  next.lastSeenAt = latestIso(target?.lastSeenAt, source?.lastSeenAt) || target?.lastSeenAt || source?.lastSeenAt || nowIso();
  for (const key of ['timesSeen', 'timesDefeated', 'timesSurvived', 'timesKilledPlayer', 'highestScoreDuringEncounter']) {
    next[key] = maxNumber(target?.[key], source?.[key]);
  }
  if (target?.bestClearTimeAgainst == null) next.bestClearTimeAgainst = source?.bestClearTimeAgainst ?? null;
  else if (source?.bestClearTimeAgainst == null) next.bestClearTimeAgainst = target.bestClearTimeAgainst;
  else next.bestClearTimeAgainst = Math.min(Number(target.bestClearTimeAgainst), Number(source.bestClearTimeAgainst));
  next.metadata = { ...object(target?.metadata), ...object(source?.metadata) };
  return next;
}

function mergeThreatDiscovery(target, source, updatedAt) {
  const a = object(target);
  const b = object(source);
  const aItems = object(a.items);
  const bItems = object(b.items);
  const items = {};
  for (const [category, bucket] of Object.entries(aItems)) {
    items[category] = { ...object(bucket) };
  }
  for (const [category, bucket] of Object.entries(bItems)) {
    items[category] = { ...object(items[category]) };
    for (const [id, sourceItem] of Object.entries(bucket)) {
      items[category][id] = mergeThreatItem(items[category][id], sourceItem);
    }
  }
  return {
    version: Math.max(Number(a.version) || 1, Number(b.version) || 1),
    items,
    discoveriesThisRun: array(a.discoveriesThisRun).length ? a.discoveriesThisRun : array(b.discoveriesThisRun),
    recentRunThemes: uniqueStrings(array(a.recentRunThemes), array(b.recentRunThemes)).slice(-8),
    unreadIds: uniqueStrings(array(a.unreadIds), array(b.unreadIds)),
    updatedAt
  };
}

function betterSectorRecord(target, source) {
  if (!target) return source;
  if (!source) return target;
  const scoreDelta = maxNumber(source.scoreEarned, source.score, source.finalScore) -
    maxNumber(target.scoreEarned, target.score, target.finalScore);
  if (scoreDelta > 0) return source;
  if (scoreDelta < 0) return target;
  const reachedDelta = maxNumber(source.highestSectorReached, source.finalSector) -
    maxNumber(target.highestSectorReached, target.finalSector);
  if (reachedDelta > 0) return source;
  if (reachedDelta < 0) return target;
  return Date.parse(source.completedAt || source.timestamp || '') > Date.parse(target.completedAt || target.timestamp || '')
    ? source
    : target;
}

function mergeSectorRecords(target, source, updatedAt) {
  const byCheckpoint = { ...object(target?.byCheckpoint) };
  for (const [checkpoint, record] of Object.entries(object(source?.byCheckpoint))) {
    byCheckpoint[checkpoint] = betterSectorRecord(byCheckpoint[checkpoint], record);
  }
  return {
    version: Math.max(1, Number(target?.version) || 1, Number(source?.version) || 1),
    updatedAt,
    byCheckpoint
  };
}

function mergeShipUsage(target, source) {
  const next = { ...object(target) };
  for (const [shipId, count] of Object.entries(object(source))) {
    next[shipId] = maxNumber(next[shipId], count);
  }
  return next;
}

function mergeProfileProgress(targetSave, sourceSave, targetProfileKey, updatedAt = nowIso()) {
  const targetProfile = object(targetSave.profile);
  const fallbackProfile = profileFromKey(targetProfileKey);
  const profile = Object.keys(targetProfile).length ? targetProfile : {
    type: fallbackProfile.type,
    id: fallbackProfile.id,
    steamId: fallbackProfile.steamId,
    storageId: fallbackProfile.storageId,
    personaName: fallbackProfile.personaName || null
  };
  return {
    ...targetSave,
    version: Math.max(2, Number(targetSave.version) || 2, Number(sourceSave.version) || 2),
    profile,
    updatedAt,
    language: object(targetSave.language).preference ? targetSave.language : (sourceSave.language || targetSave.language),
    localHighscores: sanitizeScores([...array(targetSave.localHighscores), ...array(sourceSave.localHighscores)]),
    achievements: {
      version: Math.max(1, Number(targetSave.achievements?.version) || 1, Number(sourceSave.achievements?.version) || 1),
      unlocked: uniqueStrings(array(targetSave.achievements?.unlocked), array(sourceSave.achievements?.unlocked)),
      updatedAt
    },
    selectedShipKey: targetSave.selectedShipKey || sourceSave.selectedShipKey || null,
    progression: {
      bestScore: maxNumber(targetSave.progression?.bestScore, sourceSave.progression?.bestScore),
      bestRank: maxNumber(targetSave.progression?.bestRank, sourceSave.progression?.bestRank),
      bestLevel: Math.max(1, maxNumber(targetSave.progression?.bestLevel, sourceSave.progression?.bestLevel))
    },
    hangarProgress: mergeHangarProgress(targetSave.hangarProgress, sourceSave.hangarProgress, updatedAt),
    threatDiscovery: mergeThreatDiscovery(targetSave.threatDiscovery, sourceSave.threatDiscovery, updatedAt),
    sectorStartChallengeRecords: mergeSectorRecords(
      targetSave.sectorStartChallengeRecords,
      sourceSave.sectorStartChallengeRecords,
      updatedAt
    ),
    shipUsage: mergeShipUsage(targetSave.shipUsage, sourceSave.shipUsage),
    shipUsageTotal: maxNumber(targetSave.shipUsageTotal, sourceSave.shipUsageTotal),
    settings: mergeMissingSettings(targetSave.settings || {}, sourceSave.settings || {})
  };
}

function findProfiles(userDataPath) {
  const cloudDir = join(userDataPath, CLOUD_SUBDIR);
  const saves = [];
  const sharedSavePath = join(cloudDir, CLOUD_SAVE_FILE);
  if (existsSync(sharedSavePath)) {
    const save = readJson(sharedSavePath);
    saves.push({ kind: 'shared', profileKey: saveProfileKey(save), savePath: sharedSavePath, save });
  }
  const profilesDir = join(cloudDir, PROFILE_SUBDIR);
  if (existsSync(profilesDir)) {
    for (const entry of readdirSync(profilesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const savePath = join(profilesDir, entry.name, CLOUD_SAVE_FILE);
      if (!existsSync(savePath)) continue;
      const save = readJson(savePath);
      saves.push({ kind: 'profile', profileKey: saveProfileKey(save, entry.name), savePath, save });
    }
  }
  return saves;
}

function ensureBackup(filePaths, backupDir) {
  mkdirSync(backupDir, { recursive: true });
  const backedUp = [];
  for (const filePath of filePaths.filter(Boolean)) {
    if (!existsSync(filePath)) continue;
    const name = relative(resolve('.'), filePath).replace(/[:\\/]+/g, '__');
    const backupPath = join(backupDir, name);
    copyFileSync(filePath, backupPath);
    backedUp.push({ from: filePath, to: backupPath });
  }
  return backedUp;
}

function planWrites(userDataPath, targetRef, mergedSave) {
  const targetProfile = profileFromKey(targetRef.profileKey);
  const paths = getPaths(userDataPath, targetProfile);
  const writes = new Map();
  writes.set(resolve(paths.cloudSavePath), mergedSave);

  const sharedPath = resolve(paths.legacyCloudSavePath);
  if (existsSync(sharedPath)) {
    const sharedSave = readJson(sharedPath);
    if (profileMatchesKey(sharedSave, targetRef.profileKey)) {
      writes.set(sharedPath, mergedSave);
    }
  }

  return {
    paths,
    writes: [...writes.entries()].map(([filePath, payload]) => ({ filePath, payload })),
    profileIndexPath: paths.profileIndexPath
  };
}

function updateProfileIndex(profileIndexPath, profileKey, sourceProfileKey, savePath, appliedAt) {
  const existing = existsSync(profileIndexPath) ? readJson(profileIndexPath) : { version: 1, profiles: {} };
  const profile = profileFromKey(profileKey);
  const profiles = object(existing.profiles);
  profiles[profileKey] = {
    ...object(profiles[profileKey]),
    type: profile.type,
    steamId: profile.steamId,
    storageId: profile.storageId,
    personaName: object(profiles[profileKey]).personaName || null,
    savePath,
    rescuedFromProfile: sourceProfileKey,
    rescuedAt: appliedAt,
    updatedAt: appliedAt
  };
  return {
    ...existing,
    version: Math.max(1, Number(existing.version) || 1),
    profiles,
    updatedAt: appliedAt
  };
}

export function runProfileRescue(rawOptions = {}) {
  const options = {
    ...rawOptions,
    userData: getUserDataPath(rawOptions.userData),
    auditRoot: resolve(rawOptions.auditRoot || join(process.cwd(), 'test-results'))
  };
  const auditDir = resolve(options.auditRoot, `profile-rescue-import-${stampForFile()}`);
  mkdirSync(auditDir, { recursive: true });

  if (options.list) {
    const profiles = findProfiles(options.userData)
      .map((entry) => ({
        kind: entry.kind,
        savePath: entry.savePath,
        summary: summarizeSave(entry.save, entry.savePath)
      }))
      .sort((a, b) => progressScore(b.summary) - progressScore(a.summary));
    const audit = { mode: 'list', userData: options.userData, profiles };
    writeFileSync(join(auditDir, 'rescue-audit.json'), JSON.stringify(audit, null, 2));
    return audit;
  }

  const source = resolveSaveRef(options.userData, options.source, 'source');
  const target = resolveSaveRef(options.userData, options.target, 'target');
  if (source.profileKey === target.profileKey) {
    throw new Error(`Source and target are the same profile (${source.profileKey}); refusing no-op rescue.`);
  }

  const sourceBefore = summarizeSave(source.save, source.savePath);
  const targetBefore = summarizeSave(target.save, target.savePath);
  const sourceScore = progressScore(sourceBefore);
  const targetScore = progressScore(targetBefore);
  if (!options.allowLowerSource && sourceScore <= targetScore) {
    if (sourceAlreadyMergedIntoTarget(source.save, target.save)) {
      const audit = {
        mode: options.apply ? 'apply-idempotent' : 'dry-run-idempotent',
        applied: false,
        idempotent: true,
        userData: options.userData,
        source: { ref: options.source, profileKey: source.profileKey, savePath: source.savePath, summary: sourceBefore },
        target: { ref: options.target, profileKey: target.profileKey, savePath: target.savePath, before: targetBefore, after: targetBefore },
        progressScores: { source: sourceScore, target: targetScore, merged: targetScore },
        writesPlanned: [],
        backupDir: null,
        notes: ['Target already contains the source profile progress. No save files were written.']
      };
      writeFileSync(join(auditDir, 'rescue-audit.json'), JSON.stringify(audit, null, 2));
      return { ...audit, auditDir };
    }
    throw new Error(
      `Refusing rescue: source ${source.profileKey} is not ahead of target ${target.profileKey} ` +
      `(sourceScore=${sourceScore}, targetScore=${targetScore}).`
    );
  }

  const appliedAt = nowIso();
  const merged = mergeProfileProgress(target.save, source.save, target.profileKey, appliedAt);
  const targetAfter = summarizeSave(merged);
  const plan = planWrites(options.userData, target, merged);
  const backupDir = resolve(options.backupRoot || join(auditDir, 'backup-before-apply'));
  const profileIndexAfter = updateProfileIndex(
    plan.profileIndexPath,
    target.profileKey,
    source.profileKey,
    plan.paths.cloudSavePath,
    appliedAt
  );
  const writeTargets = [...plan.writes.map((entry) => entry.filePath), plan.profileIndexPath];
  const audit = {
    mode: options.apply ? 'apply' : 'dry-run',
    applied: Boolean(options.apply),
    userData: options.userData,
    source: { ref: options.source, profileKey: source.profileKey, savePath: source.savePath, summary: sourceBefore },
    target: { ref: options.target, profileKey: target.profileKey, savePath: target.savePath, before: targetBefore, after: targetAfter },
    progressScores: { source: sourceScore, target: targetScore, merged: progressScore(targetAfter) },
    writesPlanned: writeTargets,
    backupDir,
    notes: [
      'Explicit profile rescue only. No unrelated Steam profile is deleted or modified.',
      'Settings are preserved from the target unless missing.',
      'Sets are unioned and numeric progress uses max values.'
    ]
  };

  if (options.apply) {
    audit.backedUp = ensureBackup(writeTargets, backupDir);
    for (const { filePath, payload } of plan.writes) {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(payload, null, 2));
    }
    mkdirSync(dirname(plan.profileIndexPath), { recursive: true });
    writeFileSync(plan.profileIndexPath, JSON.stringify(profileIndexAfter, null, 2));
  }

  writeFileSync(join(auditDir, 'rescue-audit.json'), JSON.stringify(audit, null, 2));
  return { ...audit, auditDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArgs();
    if (options.help) {
      console.log(helpText());
      process.exit(0);
    }
    const result = runProfileRescue(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`[profile-rescue] ${error?.message || error}`);
    process.exit(1);
  }
}

export {
  countThreatDiscovery,
  mergeProfileProgress,
  parseArgs,
  progressScore,
  summarizeSave
};
