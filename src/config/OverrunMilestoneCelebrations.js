const FALLBACK_VISUALS = Object.freeze([
  {
    id: 'far_signal_cyan',
    motif: 'signal',
    primaryColor: 0x61f6ff,
    accentColor: 0xff55d9,
    secondaryColor: 0xfff2a6,
    frameColor: 0x61f6ff,
    flashColor: 0x61f6ff,
    backgroundColor: 0x030912,
    shardColors: [0x61f6ff, 0xff55d9, 0xffffff],
    ringCount: 4,
    rayCount: 24,
    shardSpeed: 1.06,
    sealScale: 0.98,
    pulseRate: 0.012
  },
  {
    id: 'far_signal_orbit',
    motif: 'orbit',
    primaryColor: 0xffd15c,
    accentColor: 0x7dffcc,
    secondaryColor: 0xffffff,
    frameColor: 0xffd15c,
    flashColor: 0xffd15c,
    backgroundColor: 0x050b12,
    shardColors: [0xffd15c, 0x7dffcc, 0xffffff],
    ringCount: 5,
    rayCount: 20,
    shardSpeed: 0.98,
    sealScale: 1,
    pulseRate: 0.010
  },
  {
    id: 'far_signal_deep',
    motif: 'deep_scan',
    primaryColor: 0xf6fbff,
    accentColor: 0xb7ff39,
    secondaryColor: 0x61f6ff,
    frameColor: 0xb7ff39,
    flashColor: 0xf6fbff,
    backgroundColor: 0x020812,
    shardColors: [0xf6fbff, 0xb7ff39, 0x61f6ff],
    ringCount: 3,
    rayCount: 28,
    shardSpeed: 0.9,
    sealScale: 0.94,
    pulseRate: 0.008
  }
]);

const CELEBRATIONS = Object.freeze({
  10: {
    id: 'clear_gate',
    milestoneSector: 10,
    title: 'RUN CLEAR! OVERRUN UNLOCKED',
    flavor: 'The clear gate opens. The swarm does not applaud; it reloads.',
    statusLine: 'STATUS: CLEAR GATE SECURED // SCORE {score} // HULLS {lives}',
    warning: 'SECTOR {nextSector} WILL NOT BE POLITE',
    continueText: "I'M READY - BRING THE SWARM",
    voiceCue: 'mission_control_overrun_clear_sector_10',
    visual: {
      id: 'clear_gate_coronation',
      motif: 'coronation',
      primaryColor: 0xffd15c,
      accentColor: 0x61f6ff,
      secondaryColor: 0xfff2a6,
      frameColor: 0xffd15c,
      flashColor: 0xfff2a6,
      backgroundColor: 0x030912,
      shardColors: [0xffd15c, 0x61f6ff, 0xffffff],
      ringCount: 4,
      rayCount: 24,
      shardSpeed: 1,
      sealScale: 1.08,
      pulseRate: 0.012
    }
  },
  20: {
    id: 'second_signal',
    milestoneSector: 20,
    title: 'OVERRUN 20: SECOND SIGNAL',
    flavor: 'The first victory echo just came back armed.',
    statusLine: 'STATUS: SECTOR {sector} CLEARED // RANK {rank} // HULLS {lives}',
    warning: 'THE SWARM DOUBLES BACK FROM HERE',
    continueText: 'PUSH INTO SECTOR {nextSector}',
    voiceCue: 'mission_control_overrun_clear_sector_20',
    visual: {
      id: 'second_signal_surge',
      motif: 'double_rail',
      primaryColor: 0x61f6ff,
      accentColor: 0xff55d9,
      secondaryColor: 0xffffff,
      frameColor: 0x61f6ff,
      flashColor: 0x61f6ff,
      backgroundColor: 0x030915,
      shardColors: [0x61f6ff, 0xff55d9, 0xffffff],
      ringCount: 4,
      rayCount: 26,
      shardSpeed: 1.24,
      sealScale: 0.96,
      pulseRate: 0.014
    }
  },
  30: {
    id: 'pattern_storm',
    milestoneSector: 30,
    title: 'OVERRUN 30: PATTERN STORM',
    flavor: 'The director stops hiding the edits and starts signing them.',
    statusLine: 'STATUS: THIRTY SECTORS LOGGED // SCORE {score} // RANK {rank}',
    warning: 'READ ONCE. MOVE TWICE. KEEP FIRING.',
    continueText: 'CUT THROUGH THE STORM',
    voiceCue: 'mission_control_overrun_clear_sector_30',
    visual: {
      id: 'pattern_storm_orbit',
      motif: 'orbit',
      primaryColor: 0xffb84f,
      accentColor: 0x7dffcc,
      secondaryColor: 0xffffff,
      frameColor: 0xffb84f,
      flashColor: 0xffd15c,
      backgroundColor: 0x04100f,
      shardColors: [0xffb84f, 0x7dffcc, 0xffffff],
      ringCount: 5,
      rayCount: 22,
      shardSpeed: 1.04,
      sealScale: 1,
      pulseRate: 0.010
    }
  },
  40: {
    id: 'deep_circuit',
    milestoneSector: 40,
    title: 'OVERRUN 40: DEEP CIRCUIT',
    flavor: 'Cabinet telemetry is mostly sparks now. Useful sparks, probably.',
    statusLine: 'STATUS: DEEP OVERRUN HOLDING // SECTOR {sector} // HULLS {lives}',
    warning: 'EVERY SAFE LANE IS TEMPORARY',
    continueText: 'TAKE THE DEEP ROUTE',
    voiceCue: 'mission_control_overrun_clear_sector_40',
    visual: {
      id: 'deep_circuit_scan',
      motif: 'deep_scan',
      primaryColor: 0xf6fbff,
      accentColor: 0xb7ff39,
      secondaryColor: 0x61f6ff,
      frameColor: 0xb7ff39,
      flashColor: 0xf6fbff,
      backgroundColor: 0x020812,
      shardColors: [0xf6fbff, 0xb7ff39, 0x61f6ff],
      ringCount: 3,
      rayCount: 30,
      shardSpeed: 0.86,
      sealScale: 0.92,
      pulseRate: 0.007
    }
  },
  50: {
    id: 'last_cabinet_call',
    milestoneSector: 50,
    title: 'OVERRUN 50: LAST CABINET CALL',
    flavor: 'Fifty boss signals answered. The machine is out of excuses.',
    statusLine: 'STATUS: FIFTY SECTORS SURVIVED // SCORE {score} // RANK {rank}',
    warning: 'THIS IS LEGEND TERRITORY. STAY HUMAN.',
    continueText: 'ANSWER THE CALL',
    voiceCue: 'mission_control_overrun_clear_sector_50',
    visual: {
      id: 'last_cabinet_call_finale',
      motif: 'finale',
      primaryColor: 0xffef7e,
      accentColor: 0xff4d6d,
      secondaryColor: 0xffffff,
      frameColor: 0xffef7e,
      flashColor: 0xffef7e,
      backgroundColor: 0x07060b,
      shardColors: [0xffef7e, 0xff4d6d, 0xffffff],
      ringCount: 6,
      rayCount: 28,
      shardSpeed: 0.94,
      sealScale: 1.16,
      pulseRate: 0.008
    }
  }
});

function normalizeSector(sector) {
  return Math.max(1, Math.floor(Number(sector) || 1));
}

export function isOverrunMilestoneSector(sector, targetSectors = 10) {
  const safeSector = normalizeSector(sector);
  const target = Math.max(1, Math.floor(Number(targetSectors) || 10));
  return safeSector >= target && safeSector % 10 === 0;
}

export function getOverrunMilestoneCelebration({
  milestoneSector = 10,
  eventKind = 'overrun_milestone'
} = {}) {
  const sector = normalizeSector(milestoneSector);
  if (eventKind === 'run_clear') return CELEBRATIONS[10];
  if (CELEBRATIONS[sector]) return CELEBRATIONS[sector];

  const visual = FALLBACK_VISUALS[Math.floor(sector / 10) % FALLBACK_VISUALS.length];
  return {
    id: `far_signal_${sector}`,
    milestoneSector: sector,
    title: 'OVERRUN {sector}: FAR SIGNAL',
    flavor: 'The swarm keeps finding new ways to say you are still here.',
    statusLine: 'STATUS: SECTOR {sector} CLEARED // SCORE {score} // RANK {rank}',
    warning: 'THE RUN IS OFF THE MAP. KEEP THE LINE.',
    continueText: 'PUSH INTO SECTOR {nextSector}',
    voiceCue: 'mission_control_overrun_clear_far_signal',
    visual
  };
}

export function resolveOverrunMilestoneVoiceCue({
  milestoneSector = 10,
  eventKind = 'overrun_milestone',
  celebration = null
} = {}) {
  const sector = normalizeSector(milestoneSector);
  const cue = String(celebration?.voiceCue || '').trim();
  if (eventKind === 'run_clear' || sector <= 10) {
    return cue || 'mission_control_overrun_clear_sector_10';
  }
  if (cue && cue !== 'mission_control_overrun_clear' && !/_sector_10\b/.test(cue)) {
    return cue;
  }
  return 'mission_control_overrun_clear_far_signal';
}
