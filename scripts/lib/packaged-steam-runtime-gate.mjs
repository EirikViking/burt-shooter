const DEFAULT_MODE = 'steam';
const SUPPORTED_MODES = new Set(['steam', 'local']);

export function resolvePackagedSmokeMode(env = process.env) {
  const mode = String(env.NOVA_SWARM_PACKAGED_SMOKE_MODE || DEFAULT_MODE).trim().toLowerCase();
  if (!SUPPORTED_MODES.has(mode)) {
    throw new Error(
      `Invalid NOVA_SWARM_PACKAGED_SMOKE_MODE=${JSON.stringify(mode)}; expected "steam" or "local"`
    );
  }
  return mode;
}

export function validatePackagedSteamRuntime(state, { mode = DEFAULT_MODE } = {}) {
  if (!SUPPORTED_MODES.has(mode)) {
    throw new Error(`Invalid packaged smoke mode ${JSON.stringify(mode)}`);
  }

  if (mode === 'local') {
    return {
      mode,
      required: false,
      passed: true,
      errors: []
    };
  }

  const errors = [];
  const status = state?.steamBridgeStatus;
  const reason = status?.reason || 'missing_status';

  if (status?.available !== true) {
    errors.push(`packaged Steam bridge unavailable (reason=${reason})`);
  }
  if (status?.nativeModuleLoaded !== true) {
    errors.push('packaged Steam native module not loaded');
  }
  if (state?.steamLeaderboardAvailable !== true) {
    errors.push('packaged Steam leaderboard unavailable');
  }

  return {
    mode,
    required: true,
    passed: errors.length === 0,
    errors
  };
}
