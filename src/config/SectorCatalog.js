const SECTOR_PREFIXES = Object.freeze([
  'Astra', 'Vela', 'Nyx', 'Kairo', 'Orin', 'Lyra', 'Vega', 'Riven',
  'Solun', 'Mira', 'Nadir', 'Eos', 'Auron', 'Vanta', 'Kestis', 'Sable',
  'Ionis', 'Lumen', 'Rook', 'Helix', 'Novae', 'Cobalt', 'Quasar', 'Zephyr'
]);

const SECTOR_SUFFIXES = Object.freeze([
  'Vey', 'Kor', 'Nox', 'Ruun', 'Aster', 'Vale', 'Kyte', 'Orr',
  'Morrow', 'Synn', 'Dax', 'Omen', 'Lazur', 'Voss', 'Rift', 'Krell',
  'Axiom', 'Drift', 'Halo', 'Rune', 'Zenith', 'Maw', 'Fane', 'Arc'
]);

const SECTOR_CODES = Object.freeze([
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Iota', 'Kappa', 'Lambda', 'Sigma', 'Tau', 'Omega'
]);

function clampLevel(level) {
  return Math.max(1, Math.floor(Number(level) || 1));
}

export function getSectorNameForLevel(level = 1) {
  const safeLevel = clampLevel(level);
  const index = safeLevel - 1;
  const prefix = SECTOR_PREFIXES[index % SECTOR_PREFIXES.length];
  const suffix = SECTOR_SUFFIXES[Math.floor(index / SECTOR_PREFIXES.length) % SECTOR_SUFFIXES.length];
  const codeCycle = Math.floor(index / (SECTOR_PREFIXES.length * SECTOR_SUFFIXES.length));
  if (codeCycle <= 0) return `${prefix} ${suffix}`;
  const code = SECTOR_CODES[(codeCycle - 1) % SECTOR_CODES.length];
  const band = Math.floor((codeCycle - 1) / SECTOR_CODES.length) + 2;
  return `${prefix} ${suffix} ${code}-${band}`;
}

export function getSectorInfo(level = 1) {
  const safeLevel = clampLevel(level);
  return {
    number: safeLevel,
    name: getSectorNameForLevel(safeLevel),
    act: Math.ceil(safeLevel / 5),
    bossCheckpoint: safeLevel % 5 === 0
  };
}

export function formatSectorLabel(level = 1, { sectorWord = 'SECTOR', compact = false } = {}) {
  const sector = getSectorInfo(level);
  const number = compact ? String(sector.number).padStart(2, '0') : String(sector.number);
  return `${sectorWord} ${number}: ${sector.name}`;
}

export function validateSectorCatalog(levelCount = 240) {
  const safeCount = Math.max(1, Math.floor(Number(levelCount) || 1));
  const names = Array.from({ length: safeCount }, (_, index) => getSectorNameForLevel(index + 1));
  return {
    count: safeCount,
    uniqueNames: new Set(names).size,
    hasRepeats: new Set(names).size !== names.length,
    names
  };
}
