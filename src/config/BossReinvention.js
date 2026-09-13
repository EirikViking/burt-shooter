import { BOSS_ARSENAL_ENABLED } from './BossArsenal.js';

// A launch-time rollback, never a mid-fight rules change.
export const BOSS_REINVENTION_ENABLED = BOSS_ARSENAL_ENABLED && (() => {
  try { return new URLSearchParams(globalThis.location?.search || '').get('bossEncounter') !== 'previous'; }
  catch { return true; }
})();
export const BOSS_REINVENTION_VERSION = 'colossus-20260906';
export const COLOSSUS_FAMILIES = {
  conductor: { color:0xff6478,opening:.52,twist:.34,pulse:'rake',coreHeight:1,coreScale:2.6 },
  forge: { color:0xff9b42,opening:.32,twist:.08,pulse:'crush' },
  mirror: { color:0xe285ff,opening:.62,twist:.48,pulse:'braid',coreHeight:1,coreScale:2.6 },
  needle: { color: 0xffb148, opening: .40, twist: .16, pulse: 'spear' },
  vortex: {color:0xff8462,opening:.44,twist:.34,pulse:'spiral',layout:'rotor',arms:6},
  jester: {color:0xff738d,opening:.58,twist:.38,pulse:'feint',coreHeight:1,coreScale:2.6},
  carrier: {color:0xffad65,opening:.45,twist:.10,pulse:'barrage',coreHeight:1,coreScale:2.6},
  monolith: {color:0xff764c,opening:.36,twist:.04,pulse:'guillotine',coreHeight:1,coreScale:2.6},
  choir: {color:0xffb963,opening:.52,twist:.28,pulse:'chords',coreHeight:1,coreScale:2.6},
  clock: {color:0xffce73,opening:.34,twist:.18,pulse:'ratchet',layout:'rotor',arms:8}
};
export const hasColossus = archetype => BOSS_REINVENTION_ENABLED && Boolean(COLOSSUS_FAMILIES[archetype]);
