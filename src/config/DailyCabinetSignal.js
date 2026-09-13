import { getShipMetadata } from './ShipMetadata.js';

export const DAILY_CABINET_SIGNAL_RULES_VERSION = 1;
export const DAILY_CABINET_SIGNAL_FINISH_SECTOR = 10;

// Keep this roster versioned and explicit. Changing selectable roster order must not
// silently rewrite a historical daily contract.
export const DAILY_CABINET_SIGNAL_LOANER_SHIPS_V1 = Object.freeze([
  'nova-player-ship-01.png',
  'nova-player-ship-02.png',
  'nova-player-ship-03.png',
  'nova-player-ship-04.png',
  'nova-player-ship-05.png',
  'nova-player-ship-06.png',
  'nova-player-ship-07.png',
  'nova-player-ship-08.png',
  'nova-player-ship-09.png',
  'nova-player-ship-10.png',
  'nova-player-ship-11.png',
  'nova-player-ship-12.png',
  'nova-player-ship-13.png',
  'nova-player-ship-14.png',
  'nova-player-ship-15.png',
  'nova-player-ship-16.png',
  'nova-player-ship-17.png',
  'nova-player-ship-18.png',
  'nova-player-ship-19.png',
  'nova-player-ship-20.png',
  'nova-player-ship-21.png',
  'nova-player-ship-22.png',
  'nova-player-ship-23.png',
  'nova-player-ship-24.png',
  'nova-player-ship-25.png',
  'nova-player-ship-26.png',
  'nova-player-ship-27.png',
  'nova-player-ship-28.png',
  'nova-player-ship-29.png',
  'nova-player-ship-30.png'
]);

export const DAILY_CABINET_SIGNAL_TEMPLATES_V1 = Object.freeze([
  Object.freeze({
    id: 'reinforcement_siege',
    label: 'REINFORCEMENT SIEGE',
    shortLabel: 'REINFORCEMENT SIEGE',
    description: 'Extra reinforcement breaches are fixed into today\'s route. Sector 8 carries a Super Storm.',
    runThemeId: 'swarm_lattice',
    reinforcementSectors: Object.freeze([3, 6, 9]),
    superStormSectors: Object.freeze([8])
  }),
  Object.freeze({
    id: 'crossfire_blackout',
    label: 'CROSSFIRE BLACKOUT',
    shortLabel: 'CROSSFIRE BLACKOUT',
    description: 'Crossfire formations and flanking pressure own today\'s shared route.',
    runThemeId: 'crossfire_doctrine',
    reinforcementSectors: Object.freeze([]),
    superStormSectors: Object.freeze([])
  }),
  Object.freeze({
    id: 'minefield_audit',
    label: 'MINEFIELD AUDIT',
    shortLabel: 'MINEFIELD AUDIT',
    description: 'Mine and hazard formations take priority in today\'s shared route.',
    runThemeId: 'minefield_protocol',
    reinforcementSectors: Object.freeze([]),
    superStormSectors: Object.freeze([])
  })
]);

function hashString(value) {
  const text = String(value || 'nova-swarm-daily');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeNow(value = new Date()) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

export function getUtcDailyKey(value = new Date()) {
  return normalizeNow(value).toISOString().slice(0, 10);
}

export function getUtcDailyWindow(dailyKey) {
  const key = /^\d{4}-\d{2}-\d{2}$/.test(String(dailyKey || ''))
    ? String(dailyKey)
    : getUtcDailyKey();
  const validFrom = `${key}T00:00:00.000Z`;
  const startMs = Date.parse(validFrom);
  const validUntil = new Date(startMs + 24 * 60 * 60 * 1000).toISOString();
  return { validFrom, validUntil };
}

export function canonicalRulesHash(rules = {}) {
  const reinforcementSectors = Array.isArray(rules.reinforcementSectors)
    ? rules.reinforcementSectors.map((value) => Math.floor(Number(value) || 0)).join(',')
    : '';
  const superStormSectors = Array.isArray(rules.superStormSectors)
    ? rules.superStormSectors.map((value) => Math.floor(Number(value) || 0)).join(',')
    : '';
  const canonical = [
    `v=${Number(rules.rulesVersion) || DAILY_CABINET_SIGNAL_RULES_VERSION}`,
    `day=${String(rules.dailyKey || '')}`,
    `seed=${String(rules.seed || '')}`,
    `ship=${String(rules.loanerShipKey || '')}`,
    `shipName=${String(rules.loanerShipName || '')}`,
    `template=${String(rules.templateId || '')}`,
    `templateLabel=${String(rules.templateLabel || '')}`,
    `templateDescription=${String(rules.templateDescription || '')}`,
    `theme=${String(rules.runThemeId || '')}`,
    `reinforcements=${reinforcementSectors}`,
    `superStorms=${superStormSectors}`,
    `finish=${Number(rules.finishSector) || DAILY_CABINET_SIGNAL_FINISH_SECTOR}`,
    `difficulty=${String(rules.difficultyProfileId || '')}`,
    `draft=${Number(rules.tacticalDraftVersion) || 1}`,
    `score=${Number(rules.scoringVersion) || 1}`,
    `source=${String(rules.source || '')}`,
    `online=${rules.onlineCompetitive === true ? 1 : 0}`,
    `from=${String(rules.validFrom || '')}`,
    `until=${String(rules.validUntil || '')}`
  ].join('|');
  return `DCS${DAILY_CABINET_SIGNAL_RULES_VERSION}-${hashString(canonical).toString(16).padStart(8, '0').toUpperCase()}`;
}

export function deriveDailySignalContract(dailyKeyOrNow = new Date()) {
  const dailyKey = /^\d{4}-\d{2}-\d{2}$/.test(String(dailyKeyOrNow || ''))
    ? String(dailyKeyOrNow)
    : getUtcDailyKey(dailyKeyOrNow);
  const dayHash = hashString(`nova-swarm:daily:v${DAILY_CABINET_SIGNAL_RULES_VERSION}:${dailyKey}`);
  const loanerShipKey = DAILY_CABINET_SIGNAL_LOANER_SHIPS_V1[dayHash % DAILY_CABINET_SIGNAL_LOANER_SHIPS_V1.length];
  const template = DAILY_CABINET_SIGNAL_TEMPLATES_V1[(dayHash >>> 8) % DAILY_CABINET_SIGNAL_TEMPLATES_V1.length];
  const window = getUtcDailyWindow(dailyKey);
  const base = {
    dailyKey,
    rulesVersion: DAILY_CABINET_SIGNAL_RULES_VERSION,
    seed: `nova-swarm:daily:v${DAILY_CABINET_SIGNAL_RULES_VERSION}:${dailyKey}`,
    loanerShipKey,
    loanerShipName: getShipMetadata(loanerShipKey)?.name || loanerShipKey,
    templateId: template.id,
    templateLabel: template.label,
    templateDescription: template.description,
    runThemeId: template.runThemeId,
    reinforcementSectors: [...template.reinforcementSectors],
    superStormSectors: [...template.superStormSectors],
    finishSector: DAILY_CABINET_SIGNAL_FINISH_SECTOR,
    difficultyProfileId: 'accepted_harder_ranked',
    tacticalDraftVersion: 2,
    scoringVersion: 1,
    source: 'local_utc',
    onlineCompetitive: false,
    ...window
  };
  return Object.freeze({
    ...base,
    rulesHash: canonicalRulesHash(base),
    reinforcementSectors: Object.freeze(base.reinforcementSectors),
    superStormSectors: Object.freeze(base.superStormSectors)
  });
}

export function validateDailySignalContract(contract, { now = new Date(), allowExpired = false } = {}) {
  const errors = [];
  if (!contract || typeof contract !== 'object') errors.push('missing_contract');
  const rulesVersion = Math.floor(Number(contract?.rulesVersion) || 0);
  const dailyKey = String(contract?.dailyKey || '');
  const shipKey = String(contract?.loanerShipKey || '');
  const template = DAILY_CABINET_SIGNAL_TEMPLATES_V1.find((entry) => entry.id === contract?.templateId) || null;
  if (rulesVersion !== DAILY_CABINET_SIGNAL_RULES_VERSION) errors.push('rules_version_mismatch');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dailyKey)) errors.push('invalid_daily_key');
  if (!DAILY_CABINET_SIGNAL_LOANER_SHIPS_V1.includes(shipKey) || !getShipMetadata(shipKey)) errors.push('invalid_loaner_ship');
  if (!template || template.runThemeId !== contract?.runThemeId) errors.push('invalid_template');
  if (Math.floor(Number(contract?.finishSector) || 0) !== DAILY_CABINET_SIGNAL_FINISH_SECTOR) errors.push('invalid_finish_sector');
  if (contract?.rulesHash !== canonicalRulesHash(contract || {})) errors.push('rules_hash_mismatch');
  if (/^\d{4}-\d{2}-\d{2}$/.test(dailyKey)) {
    const expected = deriveDailySignalContract(dailyKey);
    const scalarFields = [
      'rulesVersion',
      'seed',
      'loanerShipKey',
      'loanerShipName',
      'templateId',
      'templateLabel',
      'templateDescription',
      'runThemeId',
      'finishSector',
      'difficultyProfileId',
      'tacticalDraftVersion',
      'scoringVersion',
      'source',
      'onlineCompetitive',
      'validFrom',
      'validUntil',
      'rulesHash'
    ];
    for (const field of scalarFields) {
      if (contract?.[field] !== expected[field]) errors.push(`contract_mismatch_${field}`);
    }
    for (const field of ['reinforcementSectors', 'superStormSectors']) {
      const actualValues = Array.isArray(contract?.[field]) ? contract[field] : [];
      const expectedValues = expected[field];
      if (actualValues.length !== expectedValues.length || actualValues.some((value, index) => value !== expectedValues[index])) {
        errors.push(`contract_mismatch_${field}`);
      }
    }
  }
  const nowMs = normalizeNow(now).getTime();
  const validFromMs = Date.parse(contract?.validFrom || '');
  const validUntilMs = Date.parse(contract?.validUntil || '');
  const active = Number.isFinite(validFromMs) && Number.isFinite(validUntilMs) && nowMs >= validFromMs && nowMs < validUntilMs;
  if (!allowExpired && !active) errors.push(nowMs < validFromMs ? 'not_started' : 'expired');
  return {
    valid: errors.length === 0,
    active,
    errors: [...new Set(errors)],
    contract
  };
}

export function getDailySignalResetSeconds(contract, now = new Date()) {
  const validUntilMs = Date.parse(contract?.validUntil || '');
  if (!Number.isFinite(validUntilMs)) return 0;
  return Math.max(0, Math.ceil((validUntilMs - normalizeNow(now).getTime()) / 1000));
}

export function isDailySignalReinforcementSector(contract, sector) {
  const level = Math.max(1, Math.floor(Number(sector) || 1));
  return Array.isArray(contract?.reinforcementSectors) && contract.reinforcementSectors.includes(level);
}

export function isDailySignalSuperStormSector(contract, sector) {
  const level = Math.max(1, Math.floor(Number(sector) || 1));
  return Array.isArray(contract?.superStormSectors) && contract.superStormSectors.includes(level);
}
