import {
  formatRunContractOrderSlotLabel,
  getRunContractReward,
  getRunContractRewardXp
} from '../progression/RunContracts.js';
import { TACTICAL_DIRECTIVE_RUN_COMPLETION_CAP } from '../config/TacticalDirectives.js';
import { RUN_MODES, getRunModeReportIdentity } from './RunMode.js';
import { getCombatDamageSourceLabel } from './CombatTelemetry.js';

const RUN_REPORT_VERSION = 15;

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

function normalizeDeathSource(value) {
  const source = String(value || '').trim();
  if (!source) return 'unknown';
  return source
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeDeathSourceKey(value) {
  return String(value || 'unknown').trim().toLowerCase().replace(/[\s-]+/g, '_') || 'unknown';
}

export function getDeathCoachAdvice(value) {
  const source = normalizeDeathSourceKey(value);
  const adviceBySource = {
    enemy_bullet: 'Watch bullet lanes first; dodge through the gap, then resume firing.',
    boss_bullet: 'During bosses, pick a safe lane before chasing damage again.',
    enemy_contact: 'Clear small ships before they cross your nose; drift sideways instead of chasing down.',
    boss_contact: 'Keep one ship length from the boss body; contact is never a safe damage race.',
    ambient_hazard_contact: 'Orange hazard drones are not pickups; shoot them or give them a wider lane.',
    hazard_contact: 'Orange hazard drones are not pickups; shoot them or give them a wider lane.',
    unknown: 'Run it back with one survival pickup in mind: Shield, Ghost, Slow Time, or repair.'
  };
  return {
    source,
    label: normalizeDeathSource(source),
    advice: adviceBySource[source] || adviceBySource.unknown
  };
}

function getPilotOrdersCompleted(runContracts = null) {
  const completed = Array.isArray(runContracts?.completedThisRun) ? runContracts.completedThisRun : [];
  const progressLabel = String(runContracts?.progressLabel || '').trim();
  const trackSummary = progressLabel ? {
    type: 'pilotOrderTrack',
    progressLabel
  } : null;
  const completedEntries = completed
    .map((entry) => ({
      type: 'pilotOrderDone',
      title: String(entry?.shortTitle || entry?.title || '').trim(),
      orderSlot: entry?.orderSlot || formatRunContractOrderSlotLabel(entry),
      reward: entry?.reward || getRunContractReward(entry?.id),
      rewardXp: getRunContractRewardXp(entry)
    }))
    .filter((entry) => entry.title)
    .slice(0, 3);
  const completedIds = new Set(completed.map((entry) => entry?.id).filter(Boolean));
  const progressEntries = (Array.isArray(runContracts?.progressThisRun) ? runContracts.progressThisRun : [])
    .filter((entry) => entry?.id && !completedIds.has(entry.id))
    .map((entry) => {
      const progress = toWholeNumber(entry.progress);
      const previousProgress = toWholeNumber(entry.previousProgress);
      const target = Math.max(1, toWholeNumber(entry.target, 1));
      if (progress <= previousProgress || progress >= target) return null;
      return {
        type: 'pilotOrderProgress',
        title: String(entry.shortTitle || entry.title || entry.id).trim(),
        orderSlot: entry.orderSlot || formatRunContractOrderSlotLabel(entry),
        progress,
        target
      };
    })
    .filter((entry) => entry && entry.title)
    .slice(0, Math.max(0, 3 - completedEntries.length));
  const nextEntries = (Array.isArray(runContracts?.next) ? runContracts.next : [])
    .filter((entry) => entry?.id && !completedIds.has(entry.id))
    .map((entry) => ({
      type: 'pilotOrderNext',
      title: String(entry.shortTitle || entry.title || entry.id).trim(),
      orderSlot: entry.orderSlot || formatRunContractOrderSlotLabel(entry),
      progress: toWholeNumber(entry.progress),
      target: Math.max(1, toWholeNumber(entry.target, 1))
    }))
    .filter((entry) => entry && entry.title);
  if (runContracts?.allCompleteThisRun) {
    return [
      { type: 'pilotOrderComplete' },
      ...(trackSummary ? [trackSummary] : []),
      ...completedEntries.filter((entry) => entry.title !== 'PILOT ORDERS COMPLETE')
    ].slice(0, 3);
  }
  if (nextEntries.length > 0 && completedEntries.length > 0) {
    const completedTitleLimit = trackSummary ? 1 : 2;
    return [
      ...(trackSummary ? [trackSummary] : []),
      ...completedEntries.slice(0, completedTitleLimit),
      nextEntries[0]
    ].slice(0, 3);
  }
  return [
    ...(trackSummary ? [trackSummary] : []),
    ...completedEntries,
    ...progressEntries,
    ...nextEntries
  ].slice(0, 3);
}

function buildRows(entries) {
  return entries
    .filter((entry) => entry && entry.value !== null && entry.value !== undefined && entry.value !== '' && (!Array.isArray(entry.value) || entry.value.length > 0))
    .map((entry) => ({
      id: entry.id,
      value: entry.value,
      rawValue: Object.prototype.hasOwnProperty.call(entry, 'rawValue') ? entry.rawValue : entry.value
    }));
}

export function createRunReport(summary = {}) {
  const runtimeSeconds = toWholeNumber(summary.runElapsedSeconds);
  const score = toWholeNumber(summary.finalScore ?? summary.score);
  const runModeIdentity = getRunModeReportIdentity(summary.runMode);
  const runMode = runModeIdentity.id || runModeIdentity.rawValue;
  const canonicalRunMode = runModeIdentity.id;
  const reportedSectorReached = Math.max(1, toWholeNumber(summary.sectorReached ?? summary.levelReached, 1));
  const sectorReached = canonicalRunMode === RUN_MODES.DAILY_SIGNAL && summary.runCleared === true
    ? Math.max(1, toWholeNumber(summary.dailySignalContract?.finishSector, reportedSectorReached))
    : reportedSectorReached;
  const shipId = summary.shipId || summary.selectedShipSpriteKey || null;
  const shipName = summary.shipName || shipId || 'Unknown Ship';
  const extraLivesEarned = toWholeNumber(summary.extraLivesEarned);
  const lifeLosses = toWholeNumber(summary.lifeLosses);
  const respawns = toWholeNumber(summary.respawns);
  const finalDeathSource = normalizeDeathSource(summary.finalDeathSource || summary.lastLifeLossSource);
  const deathCoach = getDeathCoachAdvice(summary.finalDeathSource || summary.lastLifeLossSource);
  const combatTelemetry = {
    totalDamage: toNumber(summary.combatTelemetry?.totalDamage),
    averageDps: toNumber(summary.combatTelemetry?.averageDps),
    recentDps: toNumber(summary.combatTelemetry?.recentDps),
    peakDps: toNumber(summary.combatTelemetry?.peakDps),
    accuracyPercent: Math.max(0, Math.min(100, toNumber(summary.combatTelemetry?.accuracyPercent))),
    projectilesHit: toWholeNumber(summary.combatTelemetry?.projectilesHit),
    projectilesFired: toWholeNumber(summary.combatTelemetry?.projectilesFired),
    topSourceId: String(summary.combatTelemetry?.topSourceId || 'primary').trim() || 'primary',
    topSourcePercent: Math.max(0, Math.min(100, toNumber(summary.combatTelemetry?.topSourcePercent))),
    topSourceDamage: toNumber(summary.combatTelemetry?.topSourceDamage)
  };
  const shipMastery = summary.shipMastery?.tier?.id
    ? {
        tierId: String(summary.shipMastery.tier.id),
        tierLabel: String(summary.shipMastery.tier.label || summary.shipMastery.tier.id),
        tierRank: toWholeNumber(summary.shipMastery.tier.rank),
        bestSector: Math.max(1, toWholeNumber(summary.shipMastery.bestSector, 1)),
        runs: toWholeNumber(summary.shipMastery.runs),
        clears: toWholeNumber(summary.shipMastery.clears),
        newTier: summary.newShipMasteryTier?.id
          ? {
              id: String(summary.newShipMasteryTier.id),
              label: String(summary.newShipMasteryTier.label || summary.newShipMasteryTier.id)
            }
          : null
      }
    : null;
  const scoutAnomaly = canonicalRunMode === RUN_MODES.SCOUT && summary.scoutAnomalyId
    ? {
        id: String(summary.scoutAnomalyId),
        name: String(summary.scoutAnomalyName || summary.scoutAnomalyId),
        ruleSummary: String(summary.scoutAnomalyRuleSummary || '')
      }
    : null;
  const pilotOrdersCompleted = getPilotOrdersCompleted(summary.runContracts);
  const tacticalDraftPicks = (Array.isArray(summary.tacticalDraftPicks) ? summary.tacticalDraftPicks : [])
    .map((entry) => ({
      id: String(entry?.id || '').trim(),
      name: String(entry?.name || entry?.id || '').trim(),
      category: String(entry?.category || 'utility').trim(),
      stacks: Math.max(1, toWholeNumber(entry?.stacks, 1)),
      consumed: entry?.consumed === true,
      sectorCleared: Math.max(1, toWholeNumber(entry?.sectorCleared, 1))
    }))
    .filter((entry) => entry.name);
  const tacticalDoctrine = summary.tacticalDoctrine?.name
    ? {
      id: String(summary.tacticalDoctrine.id || '').trim(),
      name: String(summary.tacticalDoctrine.name || '').trim(),
      stage: String(summary.tacticalDoctrine.stage || '').trim(),
      color: Number(summary.tacticalDoctrine.color) || 0x7dffcc,
      totalPicks: toWholeNumber(summary.tacticalDoctrine.totalPicks)
    }
    : null;
  const tacticalDirectiveHistory = (Array.isArray(summary.tacticalDirectives?.history)
    ? summary.tacticalDirectives.history
    : [])
    .map((entry) => ({
      directiveId: String(entry?.directiveId || '').trim(),
      objectiveId: String(entry?.objectiveId || '').trim(),
      objectiveLabel: String(entry?.objectiveLabel || '').trim(),
      target: Math.max(1, toWholeNumber(entry?.target, 1)),
      tier: Math.max(1, toWholeNumber(entry?.tier, 1)),
      rewardId: String(entry?.rewardId || '').trim(),
      rewardLabel: String(entry?.rewardLabel || '').trim(),
      sector: Math.max(1, toWholeNumber(entry?.sector, 1))
    }))
    .filter((entry) => entry.directiveId);
  const tacticalDirectives = {
    completedCount: tacticalDirectiveHistory.length,
    completionCap: Math.max(0, toWholeNumber(summary.tacticalDirectives?.completionCap, TACTICAL_DIRECTIVE_RUN_COMPLETION_CAP)),
    availableVariants: Math.max(0, toWholeNumber(summary.tacticalDirectives?.availableVariants, 1000)),
    history: tacticalDirectiveHistory
  };
  const aceBountyHistory = (Array.isArray(summary.aceBounties?.history)
    ? summary.aceBounties.history
    : [])
    .map((entry) => ({
      variantId: String(entry?.variantId || '').trim(),
      number: Math.max(1, toWholeNumber(entry?.number, 1)),
      chassisId: String(entry?.chassisId || '').trim(),
      flightId: String(entry?.flightId || '').trim(),
      weaponId: String(entry?.weaponId || '').trim(),
      rewardId: String(entry?.rewardId || '').trim(),
      rewardLabel: String(entry?.rewardLabel || '').trim(),
      protocolId: String(entry?.protocolId || '').trim(),
      protocolNumber: Math.max(0, toWholeNumber(entry?.protocolNumber, 0)),
      openingId: String(entry?.openingId || '').trim(),
      defenseId: String(entry?.defenseId || '').trim(),
      enrageId: String(entry?.enrageId || '').trim(),
      bonusId: String(entry?.bonusId || '').trim(),
      bonusLabel: String(entry?.bonusLabel || '').trim(),
      protocolEnraged: entry?.protocolEnraged === true,
      rivalWingId: String(entry?.rivalWingId || '').trim(),
      rivalWingNumber: Math.max(0, toWholeNumber(entry?.rivalWingNumber, 0)),
      rivalWingFormationId: String(entry?.rivalWingFormationId || '').trim(),
      rivalWingDisciplineId: String(entry?.rivalWingDisciplineId || '').trim(),
      rivalWingVolleyId: String(entry?.rivalWingVolleyId || '').trim(),
      rivalWingMoraleId: String(entry?.rivalWingMoraleId || '').trim(),
      sector: Math.max(1, toWholeNumber(entry?.sector, 1))
    }))
    .filter((entry) => entry.variantId);
  const aceBounties = {
    completedCount: aceBountyHistory.length,
    availableVariants: Math.max(0, toWholeNumber(summary.aceBounties?.availableVariants, 1000)),
    history: aceBountyHistory
  };
  const nemesisProtocolHistory = aceBountyHistory
    .filter((entry) => entry.protocolId)
    .map((entry) => ({
      protocolId: entry.protocolId,
      protocolNumber: entry.protocolNumber,
      openingId: entry.openingId,
      defenseId: entry.defenseId,
      enrageId: entry.enrageId,
      bonusId: entry.bonusId,
      bonusLabel: entry.bonusLabel,
      protocolEnraged: entry.protocolEnraged,
      sector: entry.sector
    }));
  const nemesisProtocols = {
    completedCount: nemesisProtocolHistory.length,
    availableVariants: Math.max(0, toWholeNumber(summary.aceBounties?.availableProtocolVariants, 10000)),
    history: nemesisProtocolHistory
  };
  const rivalWingHistory = aceBountyHistory.filter((entry) => entry.rivalWingId).map((entry) => ({ rivalWingId: entry.rivalWingId, rivalWingNumber: entry.rivalWingNumber, formationId: entry.rivalWingFormationId, disciplineId: entry.rivalWingDisciplineId, volleyId: entry.rivalWingVolleyId, moraleId: entry.rivalWingMoraleId, sector: entry.sector }));
  const rivalWings = { completedCount: rivalWingHistory.length, availableVariants: Math.max(0, toWholeNumber(summary.aceBounties?.availableRivalWingVariants, 10000)), history: rivalWingHistory };
  const dailyContract = canonicalRunMode === RUN_MODES.DAILY_SIGNAL && summary.dailySignalContract
    ? {
        dailyKey: String(summary.dailySignalContract.dailyKey || '').trim(),
        rulesVersion: Math.max(1, toWholeNumber(summary.dailySignalContract.rulesVersion, 1)),
        rulesHash: String(summary.dailySignalContract.rulesHash || '').trim(),
        templateId: String(summary.dailySignalContract.templateId || '').trim(),
        templateLabel: String(summary.dailySignalContract.templateLabel || '').trim(),
        loanerShipKey: String(summary.dailySignalContract.loanerShipKey || shipId || '').trim(),
        loanerShipName: String(summary.dailySignalContract.loanerShipName || shipName || '').trim(),
        finishSector: Math.max(1, toWholeNumber(summary.dailySignalContract.finishSector, 10)),
        attemptId: String(summary.dailySignalAttemptId || '').trim(),
        valid: summary.dailySignalContractValid === true,
        invalidReason: String(summary.dailySignalInvalidReason || '').trim() || null,
        newBest: summary.dailySignalNewBest === true,
        newAttemptBest: summary.dailySignalNewAttemptBest === true,
        newClearBest: summary.dailySignalNewClearBest === true,
        recordStored: summary.dailySignalStored === true,
        recordSaveFailed: summary.dailySignalRecordSaveFailed === true,
        bestScore: toWholeNumber(summary.dailySignalBest?.score ?? summary.dailySignalAttempt?.score),
        bestAttemptScore: summary.dailySignalBestAttempt ? toWholeNumber(summary.dailySignalBestAttempt.score) : null,
        bestAttemptSector: Math.max(0, toWholeNumber(summary.dailySignalBestAttempt?.sectorReached)),
        bestAttemptTime: toWholeNumber(summary.dailySignalBestAttempt?.runElapsedSeconds),
        bestClearScore: summary.dailySignalBestClear ? toWholeNumber(summary.dailySignalBestClear.score) : null,
        bestClearTime: toWholeNumber(summary.dailySignalBestClear?.runElapsedSeconds),
        attemptCount: toWholeNumber(summary.dailySignalAttemptCount),
        flightLog: summary.dailySignalFlightLog ? {
          days: toWholeNumber(summary.dailySignalFlightLog.days, 7),
          clears: toWholeNumber(summary.dailySignalFlightLog.clears),
          attemptedDays: toWholeNumber(summary.dailySignalFlightLog.attemptedDays),
          attempts: toWholeNumber(summary.dailySignalFlightLog.attempts),
          streak: toWholeNumber(summary.dailySignalFlightLog.streak),
          atRisk: summary.dailySignalFlightLog.atRisk === true,
          statuses: (Array.isArray(summary.dailySignalFlightLog.entries) ? summary.dailySignalFlightLog.entries : [])
            .map((entry) => String(entry?.status || 'unopened'))
        } : null
      }
    : null;

  const report = {
    version: RUN_REPORT_VERSION,
    localOnly: true,
    createdAt: new Date().toISOString(),
    summary: {
      runMode,
      runModeCanonical: canonicalRunMode,
      runModeSourceValue: runModeIdentity.rawValue,
      runModeCompatibility: runModeIdentity.compatibility,
      runModeLabel: runModeIdentity.label,
      shipId,
      shipName,
      score,
      sectorReached,
      runtimeSeconds,
      runtimeLabel: formatDuration(runtimeSeconds),
      pointDefenseIntercepts: toWholeNumber(summary.pointDefenseIntercepts),
      combatTelemetry,
      shipMastery,
      scoutAnomaly,
      runCleared: Boolean(summary.runCleared),
      clearLifeLosses: toWholeNumber(summary.clearLifeLosses ?? summary.lifeLosses),
      deathCoach,
      pilotOrdersCompleted,
      tacticalDraftPicks,
      tacticalDoctrine,
      tacticalDirectives,
      aceBounties,
      nemesisProtocols,
      rivalWings,
      dailySignal: dailyContract
    },
    sections: [
      {
        id: 'run',
        rows: buildRows([
          { id: 'mode', value: runModeIdentity.label, rawValue: runMode },
          { id: 'ship', value: shipName, rawValue: shipId || shipName },
          { id: 'score', value: score },
          { id: 'sector', value: sectorReached },
          { id: 'time', value: formatDuration(runtimeSeconds), rawValue: runtimeSeconds },
          ...(scoutAnomaly ? [{ id: 'scoutAnomaly', value: scoutAnomaly.name, rawValue: scoutAnomaly }] : [])
        ])
      },
      ...(dailyContract ? [{
        id: 'dailySignal',
        rows: buildRows([
          { id: 'dailyDate', value: dailyContract.dailyKey },
          { id: 'dailyRules', value: `${dailyContract.rulesHash} // V${dailyContract.rulesVersion}`, rawValue: dailyContract },
          { id: 'dailyTemplate', value: dailyContract.templateLabel, rawValue: dailyContract.templateId },
          { id: 'dailyFinish', value: dailyContract.finishSector },
          { id: 'dailyAttempts', value: dailyContract.attemptCount },
          { id: 'dailyBestAttempt', value: dailyContract.bestAttemptScore, rawValue: {
            newBest: dailyContract.newAttemptBest,
            score: dailyContract.bestAttemptScore,
            sector: dailyContract.bestAttemptSector,
            time: dailyContract.bestAttemptTime
          } },
          { id: 'dailyBestClear', value: dailyContract.bestClearScore, rawValue: {
            newBest: dailyContract.newClearBest,
            score: dailyContract.bestClearScore,
            time: dailyContract.bestClearTime
          } },
          { id: 'dailyFlightLog', value: dailyContract.flightLog?.clears, rawValue: dailyContract.flightLog }
        ])
      }] : []),
      {
        id: 'combat',
        rows: buildRows([
          { id: 'kills', value: toWholeNumber(summary.totalKills) },
          { id: 'bossKills', value: toWholeNumber(summary.bossesKilled) },
          { id: 'waves', value: toWholeNumber(summary.wavesCleared) },
          { id: 'nearMissSurges', value: toWholeNumber(summary.nearMissSurges) },
          { id: 'grazeBreaks', value: toWholeNumber(summary.grazeBreaks) },
          { id: 'pointDefenseIntercepts', value: toWholeNumber(summary.pointDefenseIntercepts) },
          { id: 'damage', value: toWholeNumber(combatTelemetry.totalDamage) },
          { id: 'dps', value: toWholeNumber(combatTelemetry.averageDps), rawValue: combatTelemetry },
          { id: 'accuracy', value: Math.round(combatTelemetry.accuracyPercent), rawValue: combatTelemetry },
          {
            id: 'topDamageSource',
            value: getCombatDamageSourceLabel(combatTelemetry.topSourceId),
            rawValue: combatTelemetry
          }
        ])
      },
      {
        id: 'survival',
        rows: buildRows([
          { id: 'livesLost', value: lifeLosses },
          { id: 'respawns', value: respawns },
          { id: 'extraLives', value: extraLivesEarned },
          { id: 'finalHit', value: finalDeathSource, rawValue: summary.finalDeathSource || summary.lastLifeLossSource || null },
          { id: 'deathCoach', value: deathCoach.advice, rawValue: deathCoach }
        ])
      },
      {
        id: 'rewards',
        rows: buildRows([
          { id: 'powerups', value: toWholeNumber(summary.powerupsCollected) },
          { id: 'careerXp', value: toWholeNumber(summary.pilotXpGained) },
          ...(shipMastery ? [{ id: 'shipMastery', value: shipMastery.tierLabel, rawValue: shipMastery }] : []),
          { id: 'tacticalDrafts', value: tacticalDraftPicks, rawValue: tacticalDraftPicks },
          { id: 'tacticalDirectives', value: tacticalDirectives.completedCount, rawValue: tacticalDirectives },
          { id: 'aceBounties', value: aceBounties.completedCount, rawValue: aceBounties },
          { id: 'nemesisProtocols', value: nemesisProtocols.completedCount, rawValue: nemesisProtocols },
          { id: 'newRanks', value: Array.isArray(summary.newRanksThisRun) ? summary.newRanksThisRun.length : 0 },
          { id: 'codex', value: toWholeNumber(summary.codexDiscoveries) },
          { id: 'pilotOrders', value: pilotOrdersCompleted, rawValue: pilotOrdersCompleted }
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
    runModeCanonical: report.summary?.runModeCanonical || null,
    runModeCompatibility: report.summary?.runModeCompatibility || null,
    runModeLabel: report.summary?.runModeLabel || null,
    shipName: report.summary?.shipName || null,
    score: report.summary?.score || 0,
    sectorReached: report.summary?.sectorReached || 0,
    runtimeSeconds: report.summary?.runtimeSeconds || 0,
    pointDefenseIntercepts: report.summary?.pointDefenseIntercepts || 0,
    combatTelemetry: report.summary?.combatTelemetry || null,
    shipMastery: report.summary?.shipMastery || null,
    scoutAnomaly: report.summary?.scoutAnomaly || null,
    pilotOrdersCompleted: Array.isArray(report.summary?.pilotOrdersCompleted) ? report.summary.pilotOrdersCompleted : [],
    tacticalDraftPicks: Array.isArray(report.summary?.tacticalDraftPicks) ? report.summary.tacticalDraftPicks : [],
    tacticalDirectives: report.summary?.tacticalDirectives || null,
    aceBounties: report.summary?.aceBounties || null,
    nemesisProtocols: report.summary?.nemesisProtocols || null,
    rivalWings: report.summary?.rivalWings || null,
    tacticalDoctrine: report.summary?.tacticalDoctrine || null,
    dailySignal: report.summary?.dailySignal || null,
    sectionIds: Array.isArray(report.sections) ? report.sections.map((section) => section.id) : []
  };
}
