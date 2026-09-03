const BLOCKED_PUBLIC_NAME_TERMS = Object.freeze([
  ['K', 'LAUS'].join(''),
  ['F', 'ITTE'].join(''),
  ['K', 'UKEN'].join(''),
  ['FAT', 'MAN'].join(''),
  ['MOR', 'DER'].join('')
]);

const PUBLIC_PILOT_NAME_MAX_LENGTH = 18;

function sanitizePilotName(rawName) {
  return String(rawName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .slice(0, PUBLIC_PILOT_NAME_MAX_LENGTH);
}

function getPilotNameValidation(rawName, { allowBlank = false } = {}) {
  const cleaned = sanitizePilotName(rawName);
  if (!cleaned) {
    return allowBlank
      ? { valid: true, publicName: '', reason: null }
      : { valid: false, publicName: '', reason: 'blank' };
  }
  const compact = cleaned.replace(/\s+/g, '');
  if (BLOCKED_PUBLIC_NAME_TERMS.some(term => compact.includes(term))) {
    return { valid: false, publicName: cleaned, reason: 'blocked' };
  }
  return { valid: true, publicName: cleaned, reason: null };
}

function toPublicPilotName(rawName, fallbackSeed = 0) {
  const validation = getPilotNameValidation(rawName, { allowBlank: false });
  const seed = Math.abs(Number(fallbackSeed) || 0).toString().slice(-2).padStart(2, '0');
  if (!validation.valid) return `PILOT${seed}`;
  return validation.publicName;
}

exports.BLOCKED_PUBLIC_NAME_TERMS = BLOCKED_PUBLIC_NAME_TERMS;
exports.PUBLIC_PILOT_NAME_MAX_LENGTH = PUBLIC_PILOT_NAME_MAX_LENGTH;
exports.getPilotNameValidation = getPilotNameValidation;
exports.sanitizePilotName = sanitizePilotName;
exports.toPublicPilotName = toPublicPilotName;
