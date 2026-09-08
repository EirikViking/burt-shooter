import { readThreatDiscoveryState } from './ThreatDiscoveryState.js';
import { getThreatCodexCatalog } from '../config/ThreatCodexCatalog.js';

export function coreRunState(scene) {
  return scene.bonusCoreRun ||= { chain: 0, fragments: [], lastHitWave: 0, waveKey: '', waveKills: 0 };
}
export function recordCoreWaveKill(scene) {
  const state = coreRunState(scene), key = `${scene.game.level}:${scene.enemyManager?.currentWaveIndex}`;
  if (state.waveKey !== key) { state.waveKey = key; state.waveKills = 0; }
  state.waveKills++;
}
export function getCoreReward(core, scene, player = scene.player) {
  const state = coreRunState(scene);
  const age = Math.max(0, core.ageSeconds || 0);
  let score = 300;
  switch (core.coreProfile.reward) {
    case 'treasure': score = 600; break;
    case 'pursuit': score = 200 + Math.round(800 * Math.max(0, 1 - age / 12)); break;
    case 'daredevil': {
      const radius = Math.max(100, core.game?.getWidth?.() * .1 || scene.game.getWidth() * .1);
      const close = (scene.enemyManager?.enemies || []).filter(e => e.active && Math.hypot(e.x - player.x, e.y - player.y) <= radius).length;
      score = 250 + Math.min(3, close) * 250; break;
    }
    case 'survivor': score = 250 + Math.min(8, Math.max(0, (scene.wavesCleared || 0) - state.lastHitWave)) * 100; break;
    case 'hunter': score = 200 + Math.min(30, state.waveKey === `${scene.game.level}:${scene.enemyManager?.currentWaveIndex}` ? state.waveKills : 0) * 25; break;
    case 'collector': score = 200 + Math.min(8, state.chain) * 100; break;
    case 'constellation': score = !state.fragments.includes(core.fragment) && state.fragments.length === 2 ? 1800 : 200; break;
    case 'jackpot': score = [200, 400, 700, 1400, 700, 400][Math.floor(age * 1.5) % 6]; break;
    case 'archive': score = 400; break;
    case 'relic': score = 400; break;
  }
  return score;
}
export function grantCoreReward(core, scene, player) {
  const state = coreRunState(scene), profile = core.coreProfile;
  const score = getCoreReward(core, scene, player);
  const previous = readThreatDiscoveryState().items.bonusCores?.[profile.id];
  const collected = Math.min(1000000, Math.max(0, Number(previous?.metadata?.collected) || 0) + 1);
  state.chain++;
  if (profile.reward === 'constellation' && !state.fragments.includes(core.fragment)) {
    state.fragments.push(core.fragment);
    if (state.fragments.length === 3) state.fragments = [];
  }
  // The existing discovery session owns persistence and respects isolated or
  // reward-suppressed runs. No new save key or Cloud path is introduced.
  scene.recordThreatDiscovery?.(profile.id, 'bonusCores', { collected, sector: scene.game.level }, { scoreBonus: false, silent: true });
  let archiveName = null;
  if (profile.reward === 'archive') {
    const seen = readThreatDiscoveryState().items.cabinetLogs || {};
    const entry = getThreatCodexCatalog().cabinetLogs.find(e => !seen[e.id]);
    if (entry) {
      const result = scene.recordThreatDiscovery?.(entry.id, 'cabinetLogs', { name: entry.name, source: 'bonus_core_archive' }, { scoreBonus: false, silent: true });
      if (result?.isNew) archiveName = entry.name;
    }
  }
  const applied = scene.game.addBonusScore(score);
  scene.scorePopupManager?.addScorePopup?.(core.x, core.y - 25, applied, { color: profile.color });
  return { score: applied, collected, archiveName, relicUnlocked: profile.reward === 'relic' && collected === 3 };
}
export function getRelicCollectionCount() {
  return Math.max(0, Number(readThreatDiscoveryState().items.bonusCores?.bonus_core_relic?.metadata?.collected) || 0);
}
