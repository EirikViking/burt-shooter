const REPORT_KIND = 'late_game_pressure_experiment';
const REPORT_VERSION = 1;

export const LATE_GAME_EXPERIMENT_FEEDBACK_PROMPTS = Object.freeze([
  'Did the pacing feel too slow or too fast?',
  'Did the enemy groups feel repetitive?',
  'Did Tractor feel fair and readable?',
  'Did Phase Pulse feel useful or necessary?',
  'Did Pierce or Chain Lightning change crowd control?',
  'Where did performance feel unstable?'
]);

const PRESSURE_LABELS = Object.freeze({
  late_pressure: 'LATE PRESSURE',
  overrun_pressure: 'OVERRUN PRESSURE',
  deep_control: 'DEEP CONTROL',
  deep_endurance: 'DEEP ENDURANCE',
  frontier: 'FRONTIER'
});

const AUGMENT_LABELS = Object.freeze({
  damage_up: 'DAMAGE UP',
  rapid_fire: 'RAPID FIRE',
  blink_drive: 'BLINK DRIVE',
  focus_lens: 'FOCUS LENS',
  double_shot: 'DOUBLE SHOT',
  chain_lightning: 'CHAIN LIGHTNING',
  pierce: 'PIERCE'
});

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toWholeNumber(value, fallback = 0) {
  return Math.max(0, Math.round(toNumber(value, fallback)));
}

function toRatio(value) {
  return Math.max(0, Math.min(1, toNumber(value)));
}

function interpolate(source, params = {}) {
  return String(source ?? '').replace(/\{([^}]+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
  ));
}

function createSeedCode(value) {
  const source = String(value || 'unknown');
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function compactExperimentVersion(value) {
  return String(value || 'unknown').replace(/^late-game-pressure-/i, '');
}

function buildRows(entries) {
  return entries.map((entry) => ({
    id: entry.id,
    value: entry.value,
    rawValue: Object.prototype.hasOwnProperty.call(entry, 'rawValue') ? entry.rawValue : entry.value
  }));
}

function formatScenario(value) {
  return value === 'endurance' ? 'ENDURANCE TEST' : 'STANDARD TEST';
}

function formatRuleset(value) {
  return value === 'pure' ? 'PURE' : 'TACTICAL';
}

function formatLifeStock(value) {
  return value === 'mature_stock' ? 'MATURE LIFE STOCK' : '3 LIVES';
}

function formatPressure(value) {
  return PRESSURE_LABELS[value] || String(value || 'LATE PRESSURE').replace(/[_-]+/g, ' ').toUpperCase();
}

function formatAugment(value) {
  return AUGMENT_LABELS[value] || String(value || '').replace(/[_-]+/g, ' ').toUpperCase();
}

export function isLateGameExperimentReport(report) {
  return report?.kind === REPORT_KIND && report?.experimental === true;
}

export function createLateGameExperimentReport(experiment = {}, runSummary = {}) {
  if (experiment?.active !== true) return null;
  const metrics = experiment.metrics && typeof experiment.metrics === 'object'
    ? experiment.metrics
    : {};
  const waveSegments = Array.isArray(metrics.waveSegments) ? metrics.waveSegments : [];
  const breaks = toWholeNumber(metrics.tractorBreaks);
  const tractorBreakAverageMs = breaks > 0
    ? Math.round(toNumber(metrics.tractorBreakTimeMs) / breaks)
    : 0;
  const tractorRecoveryAverageMs = breaks > 0
    ? Math.round(toNumber(metrics.tractorRecoveryMs) / breaks)
    : 0;
  const baselineAugmentIds = Array.isArray(experiment.baselineAugmentIds)
    ? [...experiment.baselineAugmentIds]
    : [];
  const sectorsCompleted = toWholeNumber(metrics.sectorsCompleted);
  const deaths = Math.max(toWholeNumber(metrics.deaths), toWholeNumber(runSummary.lifeLosses));
  const summary = {
    experimentVersion: String(experiment.version || 'unknown'),
    scenario: String(experiment.scenario || 'standard'),
    scenarioLabel: formatScenario(experiment.scenario),
    seed: String(experiment.seed || 'unknown'),
    seedCode: createSeedCode(experiment.seed),
    ruleset: String(experiment.ruleset || 'tactical'),
    rulesetLabel: formatRuleset(experiment.ruleset),
    startSector: Math.max(1, toWholeNumber(experiment.startSector, 75)),
    pressureProfileId: String(experiment.pressureProfile?.id || 'unknown'),
    pressureProfileTier: String(experiment.pressureProfile?.tier || 'late_pressure'),
    pressureProfileLabel: formatPressure(experiment.pressureProfile?.tier),
    fixtureId: String(experiment.fixtureId || 'unknown'),
    fixtureLabel: String(experiment.fixtureLabel || experiment.fixtureId || 'unknown'),
    fixtureDescription: String(experiment.fixtureDescription || ''),
    baselineAugmentIds,
    baselineAugmentLabels: baselineAugmentIds.map(formatAugment),
    permanentPierceContract: String(experiment.permanentPierceContract || 'none'),
    lifeStock: String(experiment.lifeStock || 'three_lives'),
    lifeStockLabel: formatLifeStock(experiment.lifeStock),
    startingLives: Math.max(1, toWholeNumber(experiment.lives, 3)),
    phasePulseAvailable: experiment.phasePulseAvailable === true,
    sectorsCompleted,
    sectorReached: Math.max(1, toWholeNumber(runSummary.sectorReached ?? runSummary.levelReached, experiment.startSector || 75)),
    deaths,
    damageTaken: toWholeNumber(metrics.damageTaken),
    pierceHits: toWholeNumber(metrics.pierceHits),
    effectivePenetrationHits: toWholeNumber(metrics.effectivePenetrationHits),
    chainLightningOrigins: toWholeNumber(metrics.chainLightningOrigins),
    pulseActivations: toWholeNumber(metrics.pulseActivations),
    pulseClears: toWholeNumber(metrics.pulseClears),
    tractorPulls: toWholeNumber(metrics.tractorPulls),
    tractorBreaks: breaks,
    tractorBreakAverageMs,
    tractorRecoveryAverageMs,
    projectilePeak: toWholeNumber(metrics.projectilePeak),
    hazardPeak: toRatio(metrics.hazardPeak),
    significantStalls: toWholeNumber(metrics.significantStalls),
    waveSegmentCount: waveSegments.length,
    runElapsedSeconds: toWholeNumber(runSummary.runElapsedSeconds),
    completionReason: String(runSummary.clearReason || (deaths > 0 ? 'test_ended' : 'test_retired')),
    runCleared: runSummary.runCleared === true
  };

  return {
    version: REPORT_VERSION,
    kind: REPORT_KIND,
    experimental: true,
    localOnly: true,
    summary,
    feedbackPrompts: [...LATE_GAME_EXPERIMENT_FEEDBACK_PROMPTS],
    sections: [
      {
        id: 'experimentSetup',
        rows: buildRows([
          { id: 'experimentVersion', value: summary.experimentVersion },
          { id: 'scenarioSeed', value: summary.scenarioLabel, rawValue: { scenario: summary.scenario, seed: summary.seed, seedCode: summary.seedCode } },
          { id: 'ruleset', value: summary.rulesetLabel, rawValue: summary.ruleset },
          { id: 'startPressure', value: summary.pressureProfileLabel, rawValue: { sector: summary.startSector, profile: summary.pressureProfileTier } }
        ])
      },
      {
        id: 'experimentFixture',
        rows: buildRows([
          { id: 'fixtureLoadout', value: summary.fixtureLabel, rawValue: { label: summary.fixtureLabel, augments: summary.baselineAugmentLabels } },
          { id: 'lifeStock', value: summary.lifeStockLabel, rawValue: { lifeStock: summary.lifeStock, lives: summary.startingLives } },
          { id: 'pulseState', value: summary.phasePulseAvailable ? 'AVAILABLE' : 'UNAVAILABLE', rawValue: summary.phasePulseAvailable },
          { id: 'segmentCount', value: summary.waveSegmentCount }
        ])
      },
      {
        id: 'experimentOutcome',
        rows: buildRows([
          { id: 'sectorsCompleted', value: summary.sectorsCompleted, rawValue: { completed: summary.sectorsCompleted, reached: summary.sectorReached } },
          { id: 'deathsDamage', value: summary.deaths, rawValue: { deaths: summary.deaths, damage: summary.damageTaken } },
          { id: 'pierceChain', value: summary.pierceHits, rawValue: { pierce: summary.pierceHits, effective: summary.effectivePenetrationHits, chain: summary.chainLightningOrigins } },
          { id: 'pulseClears', value: summary.pulseClears, rawValue: { clears: summary.pulseClears, activations: summary.pulseActivations } }
        ])
      },
      {
        id: 'experimentSafety',
        rows: buildRows([
          { id: 'tractorRecovery', value: summary.tractorPulls, rawValue: { pulls: summary.tractorPulls, breaks: summary.tractorBreaks, breakMs: summary.tractorBreakAverageMs, recoveryMs: summary.tractorRecoveryAverageMs } },
          { id: 'projectilePeak', value: summary.projectilePeak },
          { id: 'hazardPeak', value: summary.hazardPeak, rawValue: summary.hazardPeak },
          { id: 'significantStalls', value: summary.significantStalls },
          { id: 'experimentFeedback', value: [...LATE_GAME_EXPERIMENT_FEEDBACK_PROMPTS] }
        ])
      }
    ]
  };
}

export function formatLateGameExperimentReportRow(row = {}, translate = interpolate) {
  const t = (source, params = {}) => translate(source, params);
  const raw = row.rawValue;
  switch (row.id) {
    case 'experimentVersion':
      return compactExperimentVersion(row.value);
    case 'scenarioSeed':
      return `${t(formatScenario(raw?.scenario))}\n${t('SEED')}: ${raw?.seedCode || createSeedCode(raw?.seed)}`;
    case 'ruleset':
      return t(formatRuleset(raw));
    case 'startPressure':
      return `${t('SECTOR {sector}', { sector: raw?.sector || 75 })} // ${t(formatPressure(raw?.profile))}`;
    case 'fixtureLoadout': {
      const augments = Array.isArray(raw?.augments) ? raw.augments : [];
      return augments.length > 0
        ? `${t(raw?.label || row.value)} // ${t('{count} FIXED AUGMENTS', { count: augments.length })}`
        : `${t(raw?.label || row.value)} // ${t('ZERO TACTICAL AUGMENTS')}`;
    }
    case 'lifeStock':
      return raw?.lifeStock === 'mature_stock'
        ? `${t(formatLifeStock(raw?.lifeStock))} // ${t('{count} LIVES', { count: raw?.lives || 0 })}`
        : t('3 LIVES');
    case 'pulseState':
      return t(raw === true ? 'AVAILABLE' : 'UNAVAILABLE');
    case 'sectorsCompleted':
      return `${toWholeNumber(raw?.completed)} // ${t('REACHED SECTOR {sector}', { sector: raw?.reached || 1 })}`;
    case 'deathsDamage':
      return `${t('{count} DEATHS', { count: toWholeNumber(raw?.deaths) })} // ${t('{count} DAMAGE', { count: toWholeNumber(raw?.damage) })}`;
    case 'pierceChain':
      return `${t('{count} PIERCE HITS', { count: toWholeNumber(raw?.pierce) })} // ${t('{count} CHAIN ORIGINS', { count: toWholeNumber(raw?.chain) })}`;
    case 'pulseClears':
      return `${t('{count} CLEARS', { count: toWholeNumber(raw?.clears) })} // ${t('{count} PULSES', { count: toWholeNumber(raw?.activations) })}`;
    case 'tractorRecovery':
      return `${t('{count} PULLS', { count: toWholeNumber(raw?.pulls) })} // ${t('{milliseconds}ms RECOVERY', { milliseconds: toWholeNumber(raw?.recoveryMs) })}`;
    case 'hazardPeak':
      return `${Math.round(toRatio(raw) * 100)}%`;
    case 'experimentFeedback':
      return (Array.isArray(row.value) ? row.value : []).map((value) => t(value)).join('\n');
    default:
      return typeof row.value === 'number' ? row.value.toLocaleString('en-US') : t(row.value ?? '');
  }
}

export function createLateGameExperimentCopyText(report, translate = interpolate) {
  if (!isLateGameExperimentReport(report)) return '';
  const t = (source, params = {}) => translate(source, params);
  const summary = report.summary || {};
  const loadout = summary.baselineAugmentLabels?.length
    ? summary.baselineAugmentLabels.map((label) => t(label)).join(', ')
    : t('ZERO TACTICAL AUGMENTS');
  const lines = [
    t('NOVA SWARM // LATE-GAME PRESSURE EXPERIMENT'),
    t('EXPERIMENTAL TEST // NO AWARDS'),
    '',
    `${t('Experiment version')}: ${summary.experimentVersion || 'unknown'}`,
    `${t('Scenario')}: ${t(formatScenario(summary.scenario))}`,
    `${t('Seed')}: ${summary.seed || 'unknown'}`,
    `${t('Ruleset')}: ${t(formatRuleset(summary.ruleset))}`,
    `${t('Starting pressure')}: ${t('SECTOR {sector}', { sector: summary.startSector || 75 })} // ${t(formatPressure(summary.pressureProfileTier))}`,
    `${t('Fixture / loadout')}: ${t(summary.fixtureLabel || 'unknown')} // ${loadout}`,
    `${t('Life stock')}: ${t(formatLifeStock(summary.lifeStock))} (${summary.startingLives || 0})`,
    `${t('Phase Pulse')}: ${t(summary.phasePulseAvailable ? 'AVAILABLE' : 'UNAVAILABLE')}`,
    '',
    `${t('Sectors completed')}: ${summary.sectorsCompleted || 0} // ${t('REACHED SECTOR {sector}', { sector: summary.sectorReached || 1 })}`,
    `${t('Deaths / damage')}: ${summary.deaths || 0} / ${summary.damageTaken || 0}`,
    `${t('Pierce hits / Chain origins')}: ${summary.pierceHits || 0} / ${summary.chainLightningOrigins || 0}`,
    `${t('Pulse clears')}: ${summary.pulseClears || 0} (${summary.pulseActivations || 0} ${t('ACTIVATIONS')})`,
    `${t('Tractor pulls / recovery')}: ${summary.tractorPulls || 0} / ${summary.tractorRecoveryAverageMs || 0}ms`,
    `${t('Projectile / hazard peaks')}: ${summary.projectilePeak || 0} / ${Math.round(toRatio(summary.hazardPeak) * 100)}%`,
    `${t('Significant stalls')}: ${summary.significantStalls || 0}`,
    '',
    t('FEEDBACK QUESTIONS'),
    ...(report.feedbackPrompts || []).map((prompt) => `- ${t(prompt)}`),
    '',
    t('LOCAL COPY ONLY // NOTHING SENT AUTOMATICALLY')
  ];
  return lines.join('\n');
}
