import { OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS } from '../game/RunMode.js';
import mysteryIds from '../../electron/mysteryTestIds.json' with { type: 'json' };

let activePreset = null;

// Only the desktop preload can supply a launch preset. A URL parameter cannot
// turn an ordinary browser/Steam profile into a test run.
export async function initializeBossEncounterTest() {
  const preset = await globalThis.window?.__novaEncounterTest?.getPreset?.();
  if (preset === 'mystery:all') {
    activePreset = Object.freeze({ id: preset, mysteryId: mysteryIds[0],
      mysteryIds: Object.freeze([...mysteryIds]), sector: 30,
      baselineAugmentIds: OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS });
    return activePreset;
  }
  if (typeof preset === 'string' && preset.startsWith('mystery:') && mysteryIds.includes(preset.slice(8))) {
    const mysteryId = preset.slice(8);
    activePreset = Object.freeze({ id: preset, mysteryId,
      sector: 30,
      baselineAugmentIds: OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS });
    return activePreset;
  }
  activePreset = ['dual-boss', 'boss-snake'].includes(preset)
    ? Object.freeze({
        id: preset,
        sector: 30,
        roll: preset === 'dual-boss' ? .15 : .05,
        baselineAugmentIds: OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS
      })
    : null;
  return activePreset;
}

export function getBossEncounterTest() { return activePreset; }
