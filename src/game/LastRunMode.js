import { RUN_MODES } from './RunMode.js';

const KEY = 'nova_swarm_last_launched_mode_v1';
const MODES = new Set([RUN_MODES.RANKED, RUN_MODES.MAYHEM_TACTICAL, RUN_MODES.SCOUT,
  RUN_MODES.DAILY_SIGNAL, RUN_MODES.SECTOR_START, RUN_MODES.OVERRUN_PURE, RUN_MODES.OVERRUN_TACTICAL]);

export function readLastRunMode() {
  try { const mode = localStorage.getItem(KEY); if (MODES.has(mode)) return mode; } catch { /* Optional local preference. */ }
  return RUN_MODES.MAYHEM_TACTICAL;
}

export function rememberLastRunMode(mode) {
  if (!MODES.has(mode)) return false;
  try { localStorage.setItem(KEY, mode); return true; } catch { return false; }
}
