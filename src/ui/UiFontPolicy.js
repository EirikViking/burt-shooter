const CRITICAL_UI_FACES = Object.freeze([
  Object.freeze({ family: 'Orbitron', weight: '700' }),
  Object.freeze({ family: 'Orbitron', weight: '800' }),
  Object.freeze({ family: 'Orbitron', weight: '900' }),
  Object.freeze({ family: 'Rajdhani', weight: '600' }),
  Object.freeze({ family: 'Rajdhani', weight: '700' })
]);

const CRITICAL_FAMILY_NAMES = new Set(['orbitron', 'rajdhani']);
const FONT_SAMPLE = 'NEW PILOT — START HERE 0123456789 ÄÖÜ ÉÈ Ç Ñ Ł Ж 新しいパイロット';
const DEFAULT_FALLBACK_STACK = Object.freeze([
  'Bahnschrift',
  'Segoe UI',
  'Arial',
  'sans-serif'
]);

let policyState = {
  mode: 'pending',
  reason: 'boot_pending',
  elapsedMs: 0,
  requiredFaces: CRITICAL_UI_FACES.map(face => ({ ...face, status: 'pending' }))
};
let pixiPolicyInstalled = false;
let textStyleFontDescriptor = null;
const pendingTextStyles = new Set();

function normalizeFamilyName(value) {
  return String(value ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim()
    .toLowerCase();
}

function splitFontFamilies(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  return String(value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function sanitizeUiFontFamily(value) {
  if (policyState.mode !== 'fallback_pinned') return value;

  const sourceWasArray = Array.isArray(value);
  const filtered = splitFontFamilies(value)
    .filter(family => !CRITICAL_FAMILY_NAMES.has(normalizeFamilyName(family)));
  const stableFamilies = filtered.length > 0 ? filtered : [...DEFAULT_FALLBACK_STACK];
  return sourceWasArray ? stableFamilies : stableFamilies.join(', ');
}

function findFontFamilyDescriptor(PIXI) {
  let proto = PIXI?.TextStyle?.prototype || null;
  while (proto) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'fontFamily');
    if (descriptor?.get && descriptor?.set) return { owner: proto, descriptor };
    proto = Object.getPrototypeOf(proto);
  }
  return null;
}

export function installPixiFontPolicy(PIXI) {
  if (pixiPolicyInstalled) return true;
  const match = findFontFamilyDescriptor(PIXI);
  if (!match) return false;

  const { owner, descriptor } = match;
  const originalGet = descriptor.get;
  const originalSet = descriptor.set;
  textStyleFontDescriptor = { originalGet, originalSet };

  Object.defineProperty(owner, 'fontFamily', {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
      return originalGet.call(this);
    },
    set(value) {
      if (policyState.mode === 'pending') pendingTextStyles.add(this);
      originalSet.call(this, sanitizeUiFontFamily(value));
    }
  });

  pixiPolicyInstalled = true;
  return true;
}

function settlePolicy(nextState) {
  if (policyState.mode !== 'pending') return getUiFontPolicyDebugState();
  policyState = nextState;

  if (policyState.mode === 'fallback_pinned' && textStyleFontDescriptor) {
    const { originalGet, originalSet } = textStyleFontDescriptor;
    for (const style of pendingTextStyles) {
      originalSet.call(style, sanitizeUiFontFamily(originalGet.call(style)));
    }
  }
  pendingTextStyles.clear();
  return getUiFontPolicyDebugState();
}

export function pinUiFontFallback(reason = 'font_preflight_failed', details = {}) {
  return settlePolicy({
    mode: 'fallback_pinned',
    reason,
    elapsedMs: Math.max(0, Number(details.elapsedMs) || 0),
    requiredFaces: Array.isArray(details.requiredFaces)
      ? details.requiredFaces.map(face => ({ ...face }))
      : policyState.requiredFaces.map(face => ({ ...face }))
  });
}

function createFaceDescriptor(face) {
  return `${face.weight} 32px "${face.family}"`;
}

async function loadCriticalFace(fontSet, face) {
  const descriptor = createFaceDescriptor(face);
  try {
    await fontSet.load(descriptor, FONT_SAMPLE);
    const ready = fontSet.check(descriptor, FONT_SAMPLE);
    return { ...face, descriptor, status: ready ? 'ready' : 'unverified' };
  } catch (error) {
    return {
      ...face,
      descriptor,
      status: 'failed',
      error: error?.message || String(error)
    };
  }
}

export async function preflightCriticalUiFonts({
  fontSet = typeof document !== 'undefined' ? document.fonts : null,
  timeoutMs = 1200,
  now = () => performance.now()
} = {}) {
  const startedAt = now();
  if (!fontSet?.load || !fontSet?.check) {
    return pinUiFontFallback('font_loading_api_unavailable', {
      elapsedMs: now() - startedAt
    });
  }

  const loadAttempt = Promise.all(CRITICAL_UI_FACES.map(face => loadCriticalFace(fontSet, face)))
    .then(requiredFaces => ({ type: 'loaded', requiredFaces }));
  const timeout = new Promise(resolve => {
    setTimeout(() => resolve({ type: 'timeout' }), Math.max(1, Number(timeoutMs) || 1));
  });
  const outcome = await Promise.race([loadAttempt, timeout]);
  const elapsedMs = now() - startedAt;

  if (outcome.type === 'timeout') {
    return pinUiFontFallback('font_preflight_timeout', { elapsedMs });
  }

  const allReady = outcome.requiredFaces.every(face => face.status === 'ready');
  if (!allReady) {
    return pinUiFontFallback('font_preflight_failed', {
      elapsedMs,
      requiredFaces: outcome.requiredFaces
    });
  }

  return settlePolicy({
    mode: 'bundled',
    reason: 'all_critical_faces_ready',
    elapsedMs,
    requiredFaces: outcome.requiredFaces
  });
}

export function getUiFontPolicyDebugState() {
  return {
    mode: policyState.mode,
    reason: policyState.reason,
    elapsedMs: policyState.elapsedMs,
    requiredFaces: policyState.requiredFaces.map(face => ({ ...face }))
  };
}

export const UI_FONT_PREFLIGHT_TIMEOUT_MS = 1200;
