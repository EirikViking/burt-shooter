import fs from 'node:fs';
import path from 'node:path';
import { _electron as electron } from 'playwright';
import { getAchievementIds } from '../src/achievements/AchievementCatalog.js';
import { createDefaultHangarProgress, HANGAR_PROGRESS_KEY } from '../src/progression/HangarProgressState.js';
import { THREAT_DISCOVERY_KEY } from '../src/progression/ThreatDiscoveryState.js';

const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
const userDataCandidates = [
  path.join(appData, 'nova-swarm'),
  path.join(appData, 'Nova Swarm')
];

const STARTER_SHIP = 'nova-player-ship-01.png';
const STEAM_APP_ID = String(process.env.NOVA_SWARM_STEAM_APP_ID || process.env.STEAM_APP_ID || '4765070');
const ACHIEVEMENT_KEY = 'nova_swarm_achievements_v1';
const UNLOCK_PROGRESS_KEY = 'burt.shipUnlockProgress.v1';
const SELECTED_SHIP_KEY = 'burt.selectedShip.v1';
const ROTATION_KEY = 'bs_ship_rotation_index';

const resetProgress = { bestScore: 0, bestRank: 0, bestLevel: 1 };
const resetAchievements = {
  version: 1,
  unlocked: [],
  updatedAt: new Date().toISOString()
};
const resetHangarProgress = createDefaultHangarProgress();
const resetThreatDiscovery = {
  version: 1,
  items: {
    enemies: {},
    attackPatterns: {},
    waveTactics: {},
    elites: {},
    bosses: {},
    runThemes: {},
    rareModifiers: {}
  },
  discoveriesThisRun: [],
  recentRunThemes: [],
  unreadIds: [],
  updatedAt: new Date().toISOString()
};

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const backupPath = `${filePath}.reset-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function resetCloudSave(userDataPath) {
  const filePath = path.join(userDataPath, 'steam-cloud', 'nova-swarm-save.json');
  if (!fs.existsSync(filePath)) return { userDataPath, filePath, existed: false };
  const backupPath = backupFile(filePath);
  const current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const next = {
    ...current,
    updatedAt: new Date().toISOString(),
    achievements: resetAchievements,
    selectedShipKey: STARTER_SHIP,
    progression: resetProgress,
    hangarProgress: resetHangarProgress,
    threatDiscovery: resetThreatDiscovery
  };
  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`);
  return {
    userDataPath,
    filePath,
    existed: true,
    backupPath,
    previousAchievements: current?.achievements?.unlocked?.length || 0,
    previousProgression: current?.progression || null
  };
}

async function resetElectronLocalStorage() {
  const electronMain = path.resolve('electron/main.cjs');
  const app = await electron.launch({
    args: [electronMain, '--windowed'],
    cwd: process.cwd(),
    env: {
      ...process.env,
      NOVA_SWARM_STEAM_APP_ID: STEAM_APP_ID,
      STEAM_APP_ID: STEAM_APP_ID,
      NOVA_SWARM_RESET_LOCAL_UNLOCKS: '1'
    },
    timeout: 30000
  });
  try {
    const win = await app.firstWindow({ timeout: 30000 });
    await win.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await win.waitForFunction(() => Boolean(window.localStorage), null, { timeout: 15000 });
    return await win.evaluate(async ({ achievementKey, progressKey, hangarProgressKey, threatDiscoveryKey, selectedShipKey, rotationKey, starterShip, progress, hangarProgress, threatDiscovery, achievements, achievementIds }) => {
      localStorage.setItem(progressKey, JSON.stringify(progress));
      localStorage.setItem(hangarProgressKey, JSON.stringify(hangarProgress));
      localStorage.setItem(threatDiscoveryKey, JSON.stringify(threatDiscovery));
      localStorage.setItem(achievementKey, JSON.stringify(achievements));
      localStorage.setItem(selectedShipKey, starterShip);
      localStorage.removeItem(rotationKey);
      window.__game?.achievementManager?.resetForDebugOnly?.();
      const steamBefore = await window.__novaSteamAchievements?.getUnlockedAchievements?.({ ids: achievementIds }).catch((error) => ({
        ok: false,
        error: error?.message || String(error)
      }));
      const steamClear = await window.__novaSteamAchievements?.clearAchievements?.({ ids: achievementIds }).catch((error) => ({
        ok: false,
        reason: 'clear_failed',
        error: error?.message || String(error)
      }));
      const steamAfter = await window.__novaSteamAchievements?.getUnlockedAchievements?.({ ids: achievementIds }).catch((error) => ({
        ok: false,
        error: error?.message || String(error)
      }));
      await window.__novaSteamCloudDiagnostics?.sync?.();
      return {
        achievementCount: JSON.parse(localStorage.getItem(achievementKey) || '{}')?.unlocked?.length || 0,
        progression: JSON.parse(localStorage.getItem(progressKey) || '{}'),
        hangarProgress: JSON.parse(localStorage.getItem(hangarProgressKey) || '{}'),
        threatDiscovery: JSON.parse(localStorage.getItem(threatDiscoveryKey) || '{}'),
        selectedShipKey: localStorage.getItem(selectedShipKey),
        steamBefore,
        steamClear,
        steamAfter
      };
    }, {
      achievementKey: ACHIEVEMENT_KEY,
      progressKey: UNLOCK_PROGRESS_KEY,
      hangarProgressKey: HANGAR_PROGRESS_KEY,
      threatDiscoveryKey: THREAT_DISCOVERY_KEY,
      selectedShipKey: SELECTED_SHIP_KEY,
      rotationKey: ROTATION_KEY,
      starterShip: STARTER_SHIP,
      progress: resetProgress,
      hangarProgress: resetHangarProgress,
      threatDiscovery: resetThreatDiscovery,
      achievements: resetAchievements,
      achievementIds: getAchievementIds()
    });
  } finally {
    await app.close().catch(() => {});
  }
}

const cloudResults = userDataCandidates.map(resetCloudSave);
let electronResult = null;
let electronError = null;
try {
  electronResult = await resetElectronLocalStorage();
} catch (error) {
  electronError = error?.message || String(error);
}

const report = {
  resetAt: new Date().toISOString(),
  cloudResults,
  electronResult,
  electronError,
  note: 'This resets Nova Swarm legacy unlock progress, hangar progress, Threat Codex discovery, local achievement mirrors, Steam Cloud mirrors, and attempts to clear Steam backend achievements when Steam is available.'
};

console.log(JSON.stringify(report, null, 2));
if (electronError) process.exitCode = 2;
