// One-switch rollback. No save migration or rules change. URL override is read
// once at boot so a running encounter cannot change presentation halfway through.
export const BOSS_ARSENAL_VERSION = 'arsenal-20260906';
export const BOSS_ARSENAL_ENABLED = (() => {
  try { return new URLSearchParams(globalThis.location?.search || '').get('bossArsenal') !== 'classic'; }
  catch { return true; }
})();

export const BOSS_ARSENALS = Object.freeze({
  conductor: { module: 'blade', count: 6, formation: 'fan', material: 'plasma', beat: 0 },
  forge: { module: 'hammer', count: 2, formation: 'jaws', material: 'magma', beat: 1 },
  mirror: { module: 'prism', count: 4, formation: 'diamond', material: 'crystal', beat: 2 },
  needle: { module: 'rail', count: 2, formation: 'rail', material: 'rail', beat: 3 },
  vortex: { module: 'scythe', count: 5, formation: 'rotor', material: 'vortex', beat: 4 },
  jester: { module: 'blade', count: 3, formation: 'shuffle', material: 'crystal', beat: 5 },
  carrier: { module: 'bay', count: 4, formation: 'bays', material: 'missile', beat: 6 },
  monolith: { module: 'hammer', count: 6, formation: 'battery', material: 'magma', beat: 7 },
  choir: { module: 'rail', count: 6, formation: 'organ', material: 'plasma', beat: 8 },
  clock: { module: 'scythe', count: 8, formation: 'escapement', material: 'rail', beat: 9 }
});
export function getBossArsenal(archetype) { return BOSS_ARSENALS[archetype] || BOSS_ARSENALS.conductor; }
export function getBossArsenalDangerColor(archetype) {
  if (['mirror','choir','jester'].includes(archetype)) return 0xff739e;
  if (['vortex','monolith'].includes(archetype)) return 0xff6556;
  return 0xffa84f;
}
