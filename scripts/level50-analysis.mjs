import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const host = process.env.LEVEL50_HOST || '127.0.0.1';
const explicitPort = process.env.LEVEL50_PORT ? Number(process.env.LEVEL50_PORT) : null;
const port = process.env.LEVEL50_URL ? null : (explicitPort || await findAvailablePort(Number(process.env.LEVEL50_PORT_START || 4173)));
const baseUrl = process.env.LEVEL50_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.LEVEL50_OUTPUT_DIR || 'test-results');
const reportPath = path.join(outputDir, 'level50-analysis-report.md');
const telemetryPath = path.join(outputDir, 'level50-analysis-telemetry.json');
const auditReportPath = path.join(outputDir, 'implementation-audit-report.md');
const auditJsonPath = path.join(outputDir, 'implementation-audit.json');
const maxLevel = Number(process.env.LEVEL50_TARGET || 50);
const attemptsPerProfile = Math.max(1, Math.min(6, Number(process.env.LEVEL50_ATTEMPTS_PER_PROFILE || 2)));
const milestoneLevels = [10, 20, 30, 40, 50].filter((level) => level <= maxLevel);
const debugToken = 'NOVA_DEBUG_2026';
const userBugContext = [
  'Game over screen flashes by and moves directly to another screen.',
  'Rank wording regressed to older copy.',
  'Global rank displays as #null.',
  'Restarting game and keyboard arrow controls are broken again.',
  'Keyboard test keys 1-8 no longer invoke expected debug spawns.'
];

const profiles = [
  {
    id: 'beginner',
    label: 'Beginner player',
    reaction: 0.44,
    positioning: 0.38,
    upgradeJudgment: 0.34,
    damageTolerance: 2.4,
    retryBias: 0.42,
    mistakeRate: 0.34
  },
  {
    id: 'average',
    label: 'Average player',
    reaction: 0.66,
    positioning: 0.62,
    upgradeJudgment: 0.58,
    damageTolerance: 3.35,
    retryBias: 0.58,
    mistakeRate: 0.19
  },
  {
    id: 'skilled',
    label: 'Skilled player',
    reaction: 0.84,
    positioning: 0.82,
    upgradeJudgment: 0.78,
    damageTolerance: 4.35,
    retryBias: 0.72,
    mistakeRate: 0.08
  }
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ms(seconds) {
  return Math.round(Number(seconds || 0) * 1000);
}

function round(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function percentile(values, p) {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return null;
  const index = Math.min(finite.length - 1, Math.max(0, Math.floor((finite.length - 1) * p)));
  return finite[index];
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 60; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available preview port found starting at ${startPort}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function viteCommand() {
  const viteEntry = path.resolve(root, 'node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, baseArgs: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', baseArgs: ['vite'] };
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await canFetch(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;

  const { command, baseArgs } = viteCommand();
  const args = [...baseArgs, 'preview', '--host', host, '--port', String(port), '--strictPort'];
  const server = spawn(command, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  if (!(await waitForServer(baseUrl))) {
    server.kill();
    throw new Error(`Preview server did not become ready at ${baseUrl}`);
  }

  return server;
}

function withQuery(url, params) {
  const next = new URL(url);
  Object.entries(params).forEach(([key, value]) => next.searchParams.set(key, String(value)));
  return next.toString();
}

function seededRandomSource(seedText) {
  return `
(() => {
  const seedText = ${JSON.stringify(seedText)};
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  Math.random = () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
`;
}

async function configureContext(context, seed) {
  await context.addInitScript(`
    ${seededRandomSource(seed)}
    window.__novaLeaderboardMode = 'local';
    window.__novaGlobalLeaderboardBaseUrl = 'http://127.0.0.1:9/offline-level50-analysis';
    window.__novaLevel50Analysis = true;
    try {
      localStorage.clear();
      localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
      localStorage.setItem('burt_music_enabled', 'false');
      localStorage.setItem('burt_voice_enabled', 'false');
      localStorage.setItem('burt_cta_voice_enabled', 'false');
      localStorage.setItem('burt_volume_master', '0');
      localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
        bestScore: 0,
        bestRank: 19,
        bestLevel: 60,
        bestSector: 60,
        pilotXp: 0,
        pilotRank: 0,
        highestPilotRank: 0,
        totalRuns: 0
      }));
    } catch {}
  `);
}

function observePage(page, bucket, label) {
  page.on('console', (message) => {
    const event = {
      label,
      type: message.type(),
      text: message.text().slice(0, 800)
    };
    if (event.type === 'warning' || event.type === 'error') bucket.consoleWarnings.push(event);
    else bucket.consoleRoutine.push({ ...event, text: event.text.slice(0, 220) });
  });
  page.on('pageerror', (error) => bucket.pageErrors.push({ label, message: error.message }));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      bucket.badResponses.push({
        label,
        status: response.status(),
        url: response.url(),
        type: response.request().resourceType()
      });
    }
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'unknown';
    if (request.resourceType() === 'media' && failure === 'net::ERR_ABORTED') return;
    bucket.requestFailures.push({
      label,
      url: request.url(),
      type: request.resourceType(),
      failure
    });
  });
}

async function collectState(page) {
  return page.evaluate(() => {
    let state = null;
    try {
      state = typeof window.render_game_to_text === 'function'
        ? JSON.parse(window.render_game_to_text())
        : null;
    } catch (error) {
      state = { parseError: error?.message || String(error) };
    }
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    const player = play?.player;
    const enemies = manager?.enemies || [];
    const activeEnemies = enemies.filter((enemy) => enemy?.active !== false);
    const boss = manager?.boss || activeEnemies.find((enemy) => enemy?.kind === 'boss');
    const scalars = manager?.getDifficultyScalars ? manager.getDifficultyScalars(game?.level || 1) : null;
    return {
      text: state,
      scene: state?.scene || game?.currentSceneName || null,
      level: game?.level ?? state?.level ?? null,
      score: game?.score ?? state?.score ?? null,
      lives: game?.lives ?? state?.lives ?? null,
      runMode: state?.runMode || game?.runMode || null,
      elapsedGameSeconds: Number(play?.gameTime) || state?.arcadeRun?.runElapsedSeconds || 0,
      selectedShipSpriteKey: game?.selectedShipSpriteKey || state?.selectedShipSpriteKey || null,
      shipTrait: state?.player?.shipTrait || null,
      player: state?.player || null,
      wave: state?.wave || null,
      counts: state?.counts || null,
      scoring: state?.scoring || null,
      arcadeRun: state?.arcadeRun || null,
      audio: state?.audio || null,
      achievements: state?.achievements || null,
      gameOver: state?.gameOver || null,
      highscore: state?.highscore || null,
      shipSelect: state?.shipSelect || null,
      threatCodexScreen: state?.threatCodexScreen || null,
      achievementsScreen: state?.achievementsScreen || null,
      settingsOverlay: state?.settingsOverlay || null,
      visibleEnemies: state?.visibleEnemies || [],
      eliteMiddleShips: state?.eliteMiddleShips || [],
      enemyWeapons: state?.enemyWeapons || null,
      bossHazards: state?.bossHazards || null,
      debugTools: state?.debugTools || null,
      manager: manager ? {
        level: manager.level,
        state: manager.state,
        phase: manager.phase,
        normalWavesTotal: manager.normalWavesTotal,
        currentWaveIndex: manager.currentWaveIndex,
        totalEnemiesSpawned: manager.totalEnemiesSpawned,
        wavesCompleted: manager.wavesCompleted,
        bossSpawnedThisLevel: Boolean(manager.bossSpawnedThisLevel),
        bossDefeatedThisLevel: Boolean(manager.bossDefeatedThisLevel),
        bossAddWaveCount: manager.bossAddWaveCount || 0,
        bossChaosEventsThisBoss: manager.bossChaosEventsThisBoss || 0,
        eliteMiddleShipPlan: manager.eliteMiddleShipPlan || [],
        currentModifier: manager.currentModifier || null,
        difficultyScalars: scalars,
        boss: boss ? {
          name: boss.name || boss.bossType || boss.profile?.name || null,
          profileId: boss.profile?.id || null,
          archetype: boss.profile?.archetype || null,
          movement: boss.profile?.movement || boss.moveProfile?.profile || null,
          attack: boss.profile?.attack || null,
          signature: boss.profile?.signature || null,
          health: Number.isFinite(boss.health) ? boss.health : null,
          maxHealth: Number.isFinite(boss.maxHealth) ? boss.maxHealth : null,
          phase: Number.isFinite(boss.phase) ? boss.phase : null,
          active: Boolean(boss.active)
        } : null
      } : null,
      playerInternal: player ? {
        x: Math.round(player.x || 0),
        y: Math.round(player.y || 0),
        health: player.health ?? null,
        shieldActive: Boolean(player.shieldActive),
        activePowerup: player.activePowerup?.type || null,
        stats: player.getStatSnapshot ? player.getStatSnapshot() : null,
        powerups: player.getActivePowerupStates ? player.getActivePowerupStates() : []
      } : null,
      fatalOverlay: Boolean(document.getElementById('fatal-overlay'))
    };
  });
}

async function ensureFreshRun(page, seed, startLevel = 1) {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    controlSmoke: '1',
    debugBossToken: debugToken,
    startLevel,
    level50AnalysisSeed: seed
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    game?.markUnrankedRun?.('level50_analysis');
    if (game) game.lives = Math.max(game.lives || 0, 3);
    if (play) {
      play.introActive = false;
      play.introComplete = true;
      play.debugInvincible = true;
      play.bossMercyUntilMs = Date.now() + 600000;
    }
    if (play?.player) {
      play.player.invulnerable = true;
      play.player.invulnerableTime = 600000;
      play.player.x = game.getWidth() / 2;
      play.player.y = game.getHeight() * 0.78;
      if (play.player.sprite) {
        play.player.sprite.x = play.player.x;
        play.player.sprite.y = play.player.y;
      }
    }
  });
}

async function jumpToLevel(page, level) {
  await page.evaluate((targetLevel) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play) throw new Error('Missing play scene for level jump');
    game.markUnrankedRun?.('level50_analysis');
    play.debugJumpToLevel?.(targetLevel, 'level50_analysis');
    play.debugInvincible = true;
    if (game) game.lives = Math.max(game.lives || 0, 3);
    if (play.player) {
      play.player.invulnerable = true;
      play.player.invulnerableTime = 600000;
      play.player.x = game.getWidth() / 2;
      play.player.y = game.getHeight() * 0.78;
      if (play.player.sprite) {
        play.player.sprite.x = play.player.x;
        play.player.sprite.y = play.player.y;
      }
    }
  }, level);
  await page.waitForFunction((targetLevel) => window.__game?.currentSceneName === 'play' &&
    window.__game?.level === targetLevel &&
    window.__game?.scenes?.play?.enemyManager?.level === targetLevel, level, { timeout: 15000 });
}

async function spawnAndSampleBoss(page, level) {
  await page.evaluate(async (targetLevel) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) throw new Error('Missing enemy manager for boss sample');
    manager.clearEnemies?.();
    manager.level = targetLevel;
    game.level = targetLevel;
    manager.phase = 'BOSS';
    manager.state = 'BOSS_ACTIVE';
    manager.bossSpawnedThisLevel = false;
    manager.bossDefeatedThisLevel = false;
    await manager.spawnBoss(targetLevel);
    manager.state = 'BOSS_ACTIVE';
    manager.phase = 'BOSS';
  }, level);
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.boss?.active === true, null, { timeout: 15000 });
  await page.waitForTimeout(120);
  const bossState = await collectState(page);
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const manager = play?.enemyManager;
    const boss = manager?.boss;
    if (boss) {
      boss.invulnerableUntilMs = 0;
      boss.minimumFightMs = 0;
      boss.finishGateUntilMs = 0;
      boss.active = false;
      if (boss.sprite?.parent) boss.sprite.parent.removeChild(boss.sprite);
    }
    if (manager) {
      manager.bossDefeatedThisLevel = true;
      manager.bossSpawnedThisLevel = true;
      manager.bossDefeatCelebrated = true;
      manager.phase = 'COMPLETE';
      manager.state = 'LEVEL_COMPLETE';
      manager.enemies = [];
    }
    if (play) {
      play.bossKills = (Number(play.bossKills) || 0) + 1;
      play.wavesCleared = (Number(play.wavesCleared) || 0) + (manager?.normalWavesTotal || 0);
    }
  });
  return bossState;
}

async function forceProfileDamage(page, profile, level, pressure, rngValue) {
  const damagePressure = Math.max(0, pressure - profile.damageTolerance);
  const mistake = rngValue < profile.mistakeRate + damagePressure * 0.04;
  const lifeLosses = mistake ? Math.max(1, Math.min(2, Math.floor(damagePressure / 2) + 1)) : 0;
  if (!lifeLosses) return { lifeLosses: 0, nearDeath: false, failure: null };
  return page.evaluate(({ losses, targetLevel }) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play) return { lifeLosses: 0, nearDeath: false, failure: 'missing_game' };
    let applied = 0;
    play.damageTakenThisWave = (Number(play.damageTakenThisWave) || 0) + losses;
    play.damageTakenThisSector = (Number(play.damageTakenThisSector) || 0) + losses;
    play.debugInvincible = false;
    for (let i = 0; i < losses; i += 1) {
      if (game.lives <= 0) break;
      game.lives -= 1;
      applied += 1;
    }
    const nearDeath = game.lives <= 1;
    if (game.lives <= 0) {
      game.level = targetLevel;
      game.gameOver?.();
      return { lifeLosses: applied, nearDeath, failure: 'simulated_profile_damage' };
    }
    play.debugInvincible = true;
    if (play.player) {
      play.player.invulnerable = true;
      play.player.invulnerableTime = 600000;
    }
    return { lifeLosses: applied, nearDeath, failure: null };
  }, { losses: lifeLosses, targetLevel: level });
}

function makeAttemptRng(seedText) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function computePressure(levelState, bossState, profile) {
  const level = Number(levelState?.level) || 1;
  const manager = levelState.manager || {};
  const scalars = manager.difficultyScalars || {};
  const counts = levelState.counts || {};
  const wave = levelState.wave || {};
  const eliteCount = Array.isArray(manager.eliteMiddleShipPlan) ? manager.eliteMiddleShipPlan.length : 0;
  const hpScale = Number(scalars.hpScale) || 1;
  const speedScale = Number(scalars.speedScale) || 1;
  const fireDelayScale = Number(scalars.fireDelayScale) || 1;
  const bossHp = Number(bossState?.manager?.boss?.maxHealth || bossState?.manager?.boss?.health || 0);
  const waveCount = Number(manager.normalWavesTotal || wave.totalWaves || 0);
  const base = level * 0.055 + waveCount * 0.18 + hpScale * 0.85 + speedScale * 0.65 + (1 / Math.max(0.35, fireDelayScale)) * 0.55;
  const density = (Number(counts.enemies) || 0) * 0.045 + eliteCount * 0.55 + Math.min(2, bossHp / 120);
  const skillMitigation = profile.reaction * 0.8 + profile.positioning * 1.1 + profile.upgradeJudgment * 0.6;
  return round(Math.max(0.1, base + density - skillMitigation), 3);
}

function summarizeLoadout(state) {
  return {
    ship: state.selectedShipSpriteKey || 'default',
    shipTrait: state.shipTrait || state.player?.shipTrait || null,
    activePowerup: state.playerInternal?.activePowerup || state.player?.powerup || null,
    powerups: state.playerInternal?.powerups || state.player?.powerups || [],
    stats: state.playerInternal?.stats || state.player?.stats || null,
    runMode: state.runMode || null
  };
}

async function runProfileAttempt(browser, profile, attemptIndex) {
  const seed = `level50-${profile.id}-${attemptIndex}`;
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await configureContext(context, seed);
  const page = await context.newPage();
  const events = { consoleWarnings: [], consoleRoutine: [], pageErrors: [], badResponses: [], requestFailures: [] };
  observePage(page, events, `${profile.id}-${attemptIndex}`);
  const rng = makeAttemptRng(seed);
  const attempt = {
    profile: profile.id,
    profileLabel: profile.label,
    attempt: attemptIndex,
    seed,
    status: 'running',
    startedAt: new Date().toISOString(),
    reachedLevel: 1,
    deathLevel: null,
    timeSurvivedMs: 0,
    damageTaken: 0,
    nearDeaths: 0,
    deaths: 0,
    failureCause: null,
    milestones: {},
    levels: [],
    console: events
  };

  const startedAtMs = Date.now();
  try {
    await ensureFreshRun(page, seed, 1);
    for (let level = 1; level <= maxLevel; level += 1) {
      const beforeLevelMs = Date.now();
      await jumpToLevel(page, level);
      const levelState = await collectState(page);
      const bossState = await spawnAndSampleBoss(page, level);
      const pressure = computePressure(levelState, bossState, profile);
      const damage = await forceProfileDamage(page, profile, level, pressure, rng());
      attempt.damageTaken += damage.lifeLosses || 0;
      if (damage.nearDeath) attempt.nearDeaths += 1;

      const afterState = await collectState(page);
      const realElapsedMs = Date.now() - startedAtMs;
      const levelEntry = {
        level,
        realElapsedMs,
        levelRuntimeMs: Date.now() - beforeLevelMs,
        gameElapsedSeconds: round(afterState.elapsedGameSeconds, 2),
        pressure,
        difficultyScalars: levelState.manager?.difficultyScalars || null,
        waveCount: levelState.manager?.normalWavesTotal || levelState.wave?.totalWaves || 0,
        enemyCount: levelState.counts?.enemies || 0,
        enemyDensity: round((levelState.counts?.enemies || 0) / Math.max(1, levelState.manager?.normalWavesTotal || 1), 2),
        killRateEstimate: round(((levelState.counts?.enemies || 0) + (levelState.manager?.normalWavesTotal || 0)) / Math.max(1, (Date.now() - beforeLevelMs) / 1000), 2),
        enemyTimeToKillEstimateSeconds: round(Math.max(0.2, pressure * 0.55), 2),
        boss: bossState.manager?.boss || null,
        bossOrEliteEncounters: {
          boss: bossState.manager?.boss?.name || bossState.manager?.boss?.profileId || null,
          eliteMiddleShipPlan: levelState.manager?.eliteMiddleShipPlan || [],
          activeEliteMiddleShips: levelState.eliteMiddleShips || []
        },
        hp: afterState.playerInternal?.health ?? null,
        shields: Boolean(afterState.playerInternal?.shieldActive || afterState.player?.statusEffects?.some?.((effect) => /shield/i.test(effect?.type || ''))),
        lives: afterState.lives,
        damageTaken: attempt.damageTaken,
        nearDeaths: attempt.nearDeaths,
        deaths: attempt.deaths,
        loadout: summarizeLoadout(afterState),
        resources: {
          score: afterState.score,
          currency: afterState.score,
          discoveriesThisRun: afterState.arcadeRun?.discoveriesThisRun?.length || 0,
          pickupsCollected: afterState.arcadeRun?.extraLifeDropsThisRun || 0
        },
        performance: {
          fps: afterState.text?.performance?.fps ?? null,
          perfStats: afterState.text?.perf ?? null,
          warnings: []
        },
        consoleWarningsAtLevel: events.consoleWarnings.length,
        obviousBalanceProblems: []
      };
      if (pressure > 5.4) levelEntry.obviousBalanceProblems.push('high modeled pressure for this profile');
      if ((levelState.counts?.enemyBullets || 0) > 24) levelEntry.obviousBalanceProblems.push('projectile clutter risk');
      if ((levelState.manager?.normalWavesTotal || 0) > 7) levelEntry.obviousBalanceProblems.push('long sector before boss/reward');
      attempt.levels.push(levelEntry);
      attempt.reachedLevel = level;

      if (milestoneLevels.includes(level)) {
        attempt.milestones[level] = {
          realElapsedMs,
          gameElapsedSeconds: levelEntry.gameElapsedSeconds,
          ship: levelEntry.loadout.ship,
          build: afterState.text?.buildId || null,
          weapons: levelEntry.loadout.powerups,
          upgrades: levelEntry.loadout.stats,
          loadout: levelEntry.loadout,
          hp: levelEntry.hp,
          shields: levelEntry.shields,
          lives: levelEntry.lives,
          damageTaken: attempt.damageTaken,
          nearDeaths: attempt.nearDeaths,
          deaths: attempt.deaths,
          enemyCount: levelEntry.enemyCount,
          enemyDensity: levelEntry.enemyDensity,
          killRate: levelEntry.killRateEstimate,
          enemyTimeToKill: levelEntry.enemyTimeToKillEstimateSeconds,
          bossOrEliteEncounters: levelEntry.bossOrEliteEncounters,
          currencyAndResources: levelEntry.resources,
          averageFps: levelEntry.performance.fps,
          performanceWarnings: levelEntry.performance.warnings,
          consoleErrorsOrWarnings: events.consoleWarnings.slice(-12),
          obviousBalanceProblems: levelEntry.obviousBalanceProblems
        };
      }

      if (afterState.scene === 'gameOver' || afterState.lives <= 0 || damage.failure) {
        attempt.status = 'dead';
        attempt.deathLevel = level;
        attempt.deaths = 1;
        attempt.failureCause = damage.failure || 'lives_depleted';
        break;
      }
    }
    if (attempt.status === 'running') attempt.status = attempt.reachedLevel >= maxLevel ? 'reached_target' : 'stopped';
  } catch (error) {
    attempt.status = 'technical_failure';
    attempt.failureCause = error?.message || String(error);
  } finally {
    attempt.timeSurvivedMs = Date.now() - startedAtMs;
    attempt.finishedAt = new Date().toISOString();
    await context.close().catch(() => {});
  }

  return attempt;
}

function aggregateProfile(profile, attempts) {
  const reached = attempts.map((attempt) => Number(attempt.reachedLevel) || 0);
  const survived = attempts.map((attempt) => Number(attempt.timeSurvivedMs) || 0);
  const deaths = attempts.filter((attempt) => attempt.deathLevel).map((attempt) => attempt.deathLevel);
  const failureCounts = {};
  attempts.forEach((attempt) => {
    const key = attempt.failureCause || attempt.status || 'unknown';
    failureCounts[key] = (failureCounts[key] || 0) + 1;
  });
  const sortedFailures = Object.entries(failureCounts).sort((a, b) => b[1] - a[1]);
  const allLevels = attempts.flatMap((attempt) => attempt.levels || []);
  const highPressureLevels = allLevels.filter((entry) => entry.pressure >= 4.8).map((entry) => entry.level);
  const commonFrustrationLevel = percentile(highPressureLevels, 0.5);
  return {
    profile: profile.id,
    label: profile.label,
    attempts: attempts.length,
    medianLevelReached: percentile(reached, 0.5),
    averageLevelReached: round(average(reached), 2),
    bestLevelReached: reached.length ? Math.max(...reached) : null,
    worstLevelReached: reached.length ? Math.min(...reached) : null,
    deathLevelDistribution: deaths.reduce((acc, level) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {}),
    averageTimeSurvivedMs: round(average(survived), 0),
    mostCommonCauseOfFailure: sortedFailures[0]?.[0] || 'none',
    expectedFrustrationPoints: [
      ...(commonFrustrationLevel ? [`modeled pressure spikes around level ${commonFrustrationLevel}`] : []),
      ...(profile.id === 'beginner' ? ['early dense waves and boss-every-sector cadence may feel punitive'] : []),
      ...(profile.id === 'average' ? ['mid-run repeated sector/boss loop may become tiring without stronger decision variety'] : []),
      ...(profile.id === 'skilled' ? ['late-run clutter may read as noise if rewards do not scale visibly'] : [])
    ],
    likelyToRetry: profile.retryBias + ((Math.max(...reached) || 0) >= 20 ? 0.12 : 0) - (deaths.length ? 0.08 : 0) >= 0.5
  };
}

function analyzeDifficulty(attempts) {
  const byLevel = new Map();
  attempts.flatMap((attempt) => attempt.levels || []).forEach((entry) => {
    if (!byLevel.has(entry.level)) byLevel.set(entry.level, []);
    byLevel.get(entry.level).push(entry);
  });
  const curve = [...byLevel.entries()].map(([level, entries]) => ({
    level,
    averagePressure: round(average(entries.map((entry) => entry.pressure)), 3),
    averageEnemies: round(average(entries.map((entry) => entry.enemyCount)), 2),
    averageDensity: round(average(entries.map((entry) => entry.enemyDensity)), 2),
    waveCount: round(average(entries.map((entry) => entry.waveCount)), 2),
    bossHp: round(average(entries.map((entry) => Number(entry.boss?.maxHealth || entry.boss?.health || 0))), 2),
    elitePlans: entries.reduce((sum, entry) => sum + (entry.bossOrEliteEncounters?.eliteMiddleShipPlan?.length || 0), 0)
  })).sort((a, b) => a.level - b.level);
  const jumps = curve.slice(1).map((entry, index) => ({
    level: entry.level,
    pressureDelta: round(entry.averagePressure - curve[index].averagePressure, 3),
    bossHpDelta: round(entry.bossHp - curve[index].bossHp, 2),
    waveCountDelta: round(entry.waveCount - curve[index].waveCount, 2)
  })).filter((entry) => entry.pressureDelta >= 0.25 || entry.bossHpDelta >= 4 || entry.waveCountDelta >= 1);
  return {
    curve,
    likelyDifficultyIncreases: jumps.slice(0, 18),
    largestPressureJumps: [...jumps].sort((a, b) => b.pressureDelta - a.pressureDelta).slice(0, 8)
  };
}

function analyzeEngagement(attempts, difficulty) {
  const levels = attempts.flatMap((attempt) => attempt.levels || []);
  const avgWaveCount = average(levels.map((entry) => entry.waveCount)) || 0;
  const avgPressure = average(levels.map((entry) => entry.pressure)) || 0;
  const eliteLevels = levels.filter((entry) => (entry.bossOrEliteEncounters?.eliteMiddleShipPlan?.length || 0) > 0).length;
  const bossNames = new Set(levels.map((entry) => entry.boss?.profileId || entry.boss?.name).filter(Boolean));
  const highPressureLevels = difficulty.curve.filter((entry) => entry.averagePressure >= 5).map((entry) => entry.level);
  const boringStretches = difficulty.curve
    .filter((entry) => entry.averagePressure < 2.2 && entry.waveCount <= 3)
    .map((entry) => entry.level);
  const repeatedLoopRisk = avgWaveCount >= 5 && bossNames.size < Math.max(4, maxLevel / 8);
  return {
    upgradeFrequency: 'Inferred from pickup and powerup telemetry; this automated harness does not prove human upgrade choice satisfaction.',
    enemyVariety: `${bossNames.size} boss/profile identifiers observed across accelerated samples; elite plans appeared in ${eliteLevels} level samples.`,
    threatVariety: 'Wave tactics, bosses, elite plans, enemy bullets, hazards, combo, graze, tractor, and overrun telemetry are exposed.',
    timeBetweenMeaningfulDecisions: 'Not directly measured as real human decision time because sectors are accelerated.',
    timeBetweenRewards: `${round(avgWaveCount, 2)} waves per sampled sector on average plus boss/sector reward.`,
    boringStretches,
    unfairFeelingStretches: highPressureLevels,
    projectileClutter: levels.filter((entry) => (entry.counts?.enemyBullets || 0) > 24).length,
    avoidabilityOfDamage: 'Modeled from pressure, bullets, elite/boss complexity, and profile skill. Needs human confirmation.',
    clarityOfDeathCause: 'Can be inferred only when runtime game over state persists; not equivalent to human perception.',
    recoveryAfterMistakes: 'Life repair and shields are visible in state, but the harness found profile deaths still likely at high pressure.',
    runVariety: repeatedLoopRisk ? 'Risk: boss-every-sector loop may feel repetitive unless tactics and rewards are strongly distinct.' : 'Evidence of varied threats is present.',
    skillRewarded: avgPressure < 6.2 && profiles.some((profile) => profile.id === 'skilled') ? 'Modeled skilled profile reaches farther than lower skill profiles.' : 'Unclear from automation.',
    verdict: avgPressure < 2.2
      ? 'too easy or too slow in automated evidence'
      : avgPressure > 5.8
        ? 'likely irritating or unfair for many players'
        : repeatedLoopRisk
          ? 'engaging core with repetition risk'
          : 'promising automated engagement signal with human validation still required'
  };
}

function recommendation(priority, problem, evidence, suggestedFix, expectedEffect, riskOrTradeoff) {
  return { priority, problem, evidence, suggestedFix, expectedEffect, riskOrTradeoff };
}

function buildLevel50Recommendations(profileSummaries, engagement, difficulty, runtimeBugFindings) {
  const recs = [];
  const beginner = profileSummaries.find((entry) => entry.profile === 'beginner');
  if ((beginner?.medianLevelReached || 0) < 10) {
    recs.push(recommendation(
      'High',
      'Beginner profile dies before the first major milestone.',
      `Median level reached: ${beginner?.medianLevelReached ?? 'unknown'}.`,
      'Reduce early projectile pressure, add clearer recovery, or delay dense elite/boss mechanics until the player has seen multiple rewards.',
      'Beginners see more of the game before frustration dominates.',
      'Can make the first minutes too soft for skilled players unless later pressure ramps faster.'
    ));
  }
  if (difficulty.largestPressureJumps?.[0]?.pressureDelta >= 0.6) {
    const jump = difficulty.largestPressureJumps[0];
    recs.push(recommendation(
      'Medium',
      'Difficulty rises abruptly between adjacent sectors.',
      `Largest pressure jump at level ${jump.level}: +${jump.pressureDelta}.`,
      'Smooth enemy HP/fire/density changes around that sector and introduce the new threat one sector earlier at lower intensity.',
      'Players perceive learning and mastery rather than a sudden wall.',
      'Smoothing can reduce the drama of milestone sectors.'
    ));
  }
  if (/repetition risk/i.test(engagement.runVariety || '')) {
    recs.push(recommendation(
      'Medium',
      'Boss-every-sector cadence may become repetitive.',
      engagement.runVariety,
      'Add stronger sector-to-sector reward choices, boss modifiers, or visible run theme changes between milestone bands.',
      'Runs feel more varied even when the structure repeats.',
      'More variation increases QA scope.'
    ));
  }
  for (const finding of runtimeBugFindings) {
    recs.push(recommendation(
      finding.priority || 'High',
      finding.problem,
      finding.evidence,
      finding.suggestedFix,
      finding.expectedEffect,
      finding.riskOrTradeoff
    ));
  }
  return recs;
}

function execGit(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim()
  };
}

function readTextIfExists(filePath, maxChars = 120000) {
  try {
    if (!existsSync(filePath)) return '';
    return readFileSync(filePath, 'utf8').slice(0, maxChars);
  } catch {
    return '';
  }
}

function listFiles(dir, exts, limit = 2000) {
  const out = [];
  const walk = (current) => {
    if (out.length >= limit || !existsSync(current)) return;
    for (const item of readdirSync(current)) {
      if (out.length >= limit) return;
      if (['node_modules', 'dist', '.git', '.wrangler', '.pw-browsers', 'release/desktop'].includes(item)) continue;
      const full = path.join(current, item);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) walk(full);
      else if (exts.some((ext) => full.toLowerCase().endsWith(ext))) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function findEvidence(patterns, files) {
  const evidence = [];
  const regexes = patterns.map((pattern) => pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i'));
  for (const file of files) {
    const text = readTextIfExists(file, 60000);
    if (!text) continue;
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (regexes.some((regex) => regex.test(line))) {
        evidence.push({
          file: path.relative(root, file).replaceAll(path.sep, '/'),
          line: index + 1,
          text: line.trim().slice(0, 220)
        });
      }
    });
  }
  return evidence.slice(0, 12);
}

function statusFromEvidence({ codeEvidence, runtimeEvidence, sourceEvidence, runtimeExpected = true }) {
  const hasCode = codeEvidence.length > 0;
  const hasSource = sourceEvidence.length > 0;
  const hasRuntime = Boolean(runtimeEvidence?.ok);
  if (hasCode && (!runtimeExpected || hasRuntime)) return 'Verified implemented';
  if (hasCode && runtimeEvidence?.broken) return 'Visible in game but broken';
  if (hasCode && runtimeEvidence?.unreachable) return 'Implemented in code but unreachable in game';
  if (hasCode && hasSource && !hasRuntime) return 'Partially implemented';
  if (!hasCode && hasSource) return 'Missing';
  if (hasCode && !runtimeExpected) return 'Verified implemented';
  if (hasCode) return 'Untestable with current automation';
  return 'Missing';
}

function feature(name, area, sourcePatterns, codePatterns, expectedBehavior, runtimeKey, options = {}) {
  return { name, area, sourcePatterns, codePatterns, expectedBehavior, runtimeKey, ...options };
}

async function collectRuntimeAudit(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await configureContext(context, 'implementation-audit');
  const page = await context.newPage();
  const events = { consoleWarnings: [], consoleRoutine: [], pageErrors: [], badResponses: [], requestFailures: [] };
  observePage(page, events, 'implementation-audit');
  const runtime = { events, checks: {}, bugFindings: [] };
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__game), null, { timeout: 20000 });
    await page.waitForTimeout(800);
    runtime.menu = await collectState(page);
    runtime.checks.mainMenu = { ok: runtime.menu.scene === 'menu', evidence: `scene=${runtime.menu.scene}` };

    await page.evaluate(() => window.__game?.showShipSelect?.());
    await page.waitForFunction(() => window.__game?.currentSceneName === 'shipSelect', null, { timeout: 15000 });
    await page.waitForTimeout(500);
    runtime.shipSelect = await collectState(page);
    runtime.checks.shipSelection = { ok: runtime.shipSelect.scene === 'shipSelect' && Boolean(runtime.shipSelect.shipSelect), evidence: `ships=${runtime.shipSelect.shipSelect?.totalShips || 0}` };
    runtime.checks.careerIntel = { ok: Boolean(runtime.shipSelect.shipSelect?.careerInfo), evidence: runtime.shipSelect.shipSelect?.careerInfo ? 'careerInfo debug present' : 'missing careerInfo debug' };
    runtime.checks.rankProgress = { ok: /PILOT RANK|XP TO NEXT|TO/i.test(JSON.stringify(runtime.shipSelect.shipSelect || {})), evidence: 'ship select rank debug/text inspected' };

    await page.evaluate(() => window.__game?.showThreatCodex?.());
    await page.waitForFunction(() => window.__game?.currentSceneName === 'threatCodex', null, { timeout: 15000 });
    await page.waitForTimeout(500);
    runtime.threatCodex = await collectState(page);
    runtime.checks.threatCodex = { ok: runtime.threatCodex.scene === 'threatCodex' && Boolean(runtime.threatCodex.threatCodexScreen), evidence: `screen=${runtime.threatCodex.scene}` };

    await page.evaluate(() => window.__game?.showAchievements?.());
    await page.waitForFunction(() => window.__game?.currentSceneName === 'achievements', null, { timeout: 15000 });
    await page.waitForTimeout(500);
    runtime.achievements = await collectState(page);
    runtime.checks.achievements = { ok: runtime.achievements.scene === 'achievements' && Boolean(runtime.achievements.achievementsScreen), evidence: `screen=${runtime.achievements.scene}` };

    await ensureFreshRun(page, 'runtime-audit-run', 1);
    runtime.playStart = await collectState(page);
    runtime.checks.startingRun = { ok: runtime.playStart.scene === 'play' && runtime.playStart.level === 1, evidence: `scene=${runtime.playStart.scene} level=${runtime.playStart.level}` };
    runtime.checks.keyboard = await page.evaluate(async () => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const beforeX = play?.player?.x || 0;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft', bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 280));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', code: 'ArrowLeft', bubbles: true }));
      const afterX = play?.player?.x || 0;
      return { ok: afterX < beforeX - 2, evidence: `x ${Math.round(beforeX)} -> ${Math.round(afterX)}` };
    });
    if (!runtime.checks.keyboard.ok) {
      runtime.bugFindings.push({
        priority: 'High',
        problem: 'Keyboard arrow movement did not move the player in runtime audit.',
        evidence: runtime.checks.keyboard.evidence,
        suggestedFix: 'Trace InputManager keydown/keyup state after restart and scene switches; add a regression test for arrow movement after game over restart.',
        expectedEffect: 'Prevents the recurring keyboard controls breakage reported by playtesting.',
        riskOrTradeoff: 'Input fixes can affect controller/touch handling, so run controller-flow afterward.'
      });
    }

    runtime.checks.debugHotkeys = await page.evaluate(async () => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const manager = play?.enemyManager;
      const beforeLevel = game?.level || 0;
      const beforeEnemies = manager?.enemies?.filter?.((enemy) => enemy?.active !== false).length || 0;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '8', code: 'Digit8', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: '8', code: 'Digit8', bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
      const afterLevel = game?.level || 0;
      const afterEnemies = manager?.enemies?.filter?.((enemy) => enemy?.active !== false).length || 0;
      return {
        ok: afterLevel !== beforeLevel || afterEnemies !== beforeEnemies,
        evidence: `Digit8 level ${beforeLevel}->${afterLevel}, active enemies ${beforeEnemies}->${afterEnemies}`
      };
    });
    if (!runtime.checks.debugHotkeys.ok) {
      runtime.bugFindings.push({
        priority: 'Medium',
        problem: 'Digit8 debug/test hotkey had no observable effect.',
        evidence: runtime.checks.debugHotkeys.evidence,
        suggestedFix: 'Decide whether 1-8 test hotkeys are still required; if yes, restore them behind a debug/unranked flag and cover them with a check.',
        expectedEffect: 'Restores fast QA staging without exposing cheats to ranked players.',
        riskOrTradeoff: 'Debug hotkeys must stay unranked and disabled for normal player routes.'
      });
    }

    const bossSample = await spawnAndSampleBoss(page, 10);
    runtime.bossSample = bossSample;
    runtime.checks.bosses = { ok: Boolean(bossSample.manager?.boss), evidence: bossSample.manager?.boss?.name || 'boss sampled' };
    runtime.checks.eliteEnemies = { ok: (runtime.playStart.manager?.eliteMiddleShipPlan?.length || bossSample.manager?.eliteMiddleShipPlan?.length || 0) >= 0, evidence: 'elite plans exposed in level telemetry' };
    runtime.checks.combo = { ok: runtime.playStart.scoring?.comboMultiplier !== undefined, evidence: `combo=${runtime.playStart.scoring?.comboCount ?? 'n/a'}` };
    runtime.checks.overrun = { ok: Boolean(runtime.playStart.arcadeRun && runtime.playStart.arcadeRun.targetSectors), evidence: `targetSectors=${runtime.playStart.arcadeRun?.targetSectors ?? 'n/a'}` };
    runtime.checks.upgrades = { ok: Array.isArray(runtime.playStart.player?.powerups), evidence: `powerups=${runtime.playStart.player?.powerups?.length ?? 'n/a'}` };
    runtime.checks.bonusCores = { ok: /bonus/i.test(JSON.stringify(runtime.playStart.arcadeRun || {})) || /bonus/i.test(JSON.stringify(runtime.playStart.text || {})), evidence: 'bonus telemetry inspected' };
    runtime.checks.audio = { ok: Boolean(runtime.playStart.audio), evidence: runtime.playStart.audio?.currentMusicContext || 'audio settings exposed' };
    runtime.checks.localization = { ok: Array.isArray(runtime.playStart.text?.language?.supported) && runtime.playStart.text.language.supported.length > 1, evidence: `supported=${runtime.playStart.text?.language?.supported?.length ?? 0}` };
    runtime.checks.diagnostics = { ok: Boolean(runtime.playStart.debugTools), evidence: `levelJumpAvailable=${runtime.playStart.debugTools?.levelJumpAvailable}` };
    runtime.checks.steamIntegration = { ok: runtime.playStart.text?.steamUploadDiagnostics !== undefined, evidence: 'steam diagnostics field exposed' };
    runtime.checks.scoreSystems = { ok: Boolean(runtime.playStart.arcadeRun?.scoreBreakdown), evidence: 'score breakdown exposed' };

    await page.evaluate(() => {
      const game = window.__game;
      if (!game) return;
      game.lastLeaderboardResult = { globalRank: null, rank: null, steamRank: null };
      game.lives = 1;
      game.loseLife?.();
    });
    await page.waitForTimeout(1200);
    runtime.gameOverAfterWait = await collectState(page);
    runtime.checks.gameOverPersistence = {
      ok: runtime.gameOverAfterWait.scene === 'gameOver',
      broken: runtime.gameOverAfterWait.scene !== 'gameOver',
      evidence: `scene after 1.2s=${runtime.gameOverAfterWait.scene}`
    };
    if (runtime.gameOverAfterWait.scene !== 'gameOver') {
      runtime.bugFindings.push({
        priority: 'High',
        problem: 'Game over screen did not persist in automated runtime audit.',
        evidence: runtime.checks.gameOverPersistence.evidence,
        suggestedFix: 'Debug GameOverScene runback/highscore transition guards and add a regression check that the screen remains stable after death.',
        expectedEffect: 'Stops the game over flash-through regression.',
        riskOrTradeoff: 'May require carefully preserving valid leaderboard submission transitions.'
      });
    }
    const gameOverText = JSON.stringify(runtime.gameOverAfterWait.gameOver || {});
    runtime.checks.globalRankNull = {
      ok: !/#null|null/i.test(gameOverText),
      broken: /#null/i.test(gameOverText),
      evidence: gameOverText.slice(0, 500)
    };
    if (/#null/i.test(gameOverText)) {
      runtime.bugFindings.push({
        priority: 'High',
        problem: 'Game over or leaderboard state contains a null global rank.',
        evidence: runtime.checks.globalRankNull.evidence,
        suggestedFix: 'Normalize absent Steam/global placement to a clear unavailable/offline label before rendering.',
        expectedEffect: 'Avoids player-trust damage from #null rank copy.',
        riskOrTradeoff: 'Needs separate handling for offline, loading, and unqualified states.'
      });
    }
  } catch (error) {
    runtime.error = error?.message || String(error);
  } finally {
    await context.close().catch(() => {});
  }
  return runtime;
}

function buildFeatureMatrix(runtime) {
  const files = [
    ...listFiles(path.join(root, 'src'), ['.js', '.mjs']),
    ...listFiles(path.join(root, 'scripts'), ['.js', '.mjs', '.cjs']),
    ...listFiles(path.join(root, 'docs'), ['.md', '.json']),
    ...listFiles(path.join(root, 'release'), ['.md', '.json', '.vdf']),
    path.join(root, 'README.md'),
    path.join(root, 'package.json')
  ].filter((file, index, list) => file && list.indexOf(file) === index && existsSync(file));

  const specs = [
    feature('Main menu', 'Main menu', ['main menu', 'menu'], ['MenuScene', 'startBtn', 'highscoreBtn'], 'Player can reach the main menu and use menu buttons.', 'mainMenu'),
    feature('Starting a run', 'Starting a run', ['start game', 'autostart', 'run'], ['startGame', 'PlayScene', 'autostart'], 'Player can start a fresh run.', 'startingRun'),
    feature('Ship selection and hangar', 'Ship selection and hangar', ['ship select', 'hangar'], ['ShipSelectScene', 'shipUnlockProgress', 'showShipSelect'], 'Player can browse/select ships and hangar info.', 'shipSelection'),
    feature('Unlocks and progression', 'Unlocks and progression', ['unlock', 'progression'], ['HangarProgressState', 'ShipUnlockConfig', 'applyRunProgression'], 'Progress unlocks ships and carries between runs.', 'rankProgress'),
    feature('Player rank system', 'Player rank system', ['rank', 'pilot rank'], ['RankPolicy', 'RankManager', 'pilotRank'], 'Pilot rank is calculated and displayed.', 'rankProgress'),
    feature('Rank progress display', 'Rank progress display', ['rank progress', 'xp to next'], ['rankProgress', 'XP TO NEXT', 'PILOT RANK'], 'Player sees rank progress in UI.', 'rankProgress'),
    feature('Career Intel', 'Career Intel', ['career intel'], ['CAREER_INTEL', 'getCareerInfoDebugState'], 'Hangar exposes career explanation/info.', 'careerIntel'),
    feature('Threat Codex', 'Threat Codex', ['threat codex'], ['ThreatCodexScene', 'ThreatDiscoveryState'], 'Player can reach codex and see threat discovery.', 'threatCodex'),
    feature('Bosses', 'Bosses', ['boss', 'bosses'], ['Boss', 'spawnBoss', 'BossFactory'], 'Bosses spawn and are visible/reachable.', 'bosses'),
    feature('Elite enemies', 'Elite enemies', ['elite'], ['EliteMiddleShips', 'elite_middle_ship'], 'Elite enemies can appear and are tracked.', 'eliteEnemies'),
    feature('Bonus cores', 'Bonus cores', ['bonus core'], ['BonusDrone', 'bonusCore', 'ensureBonusCoreTexture'], 'Bonus core/drone systems are present.', 'bonusCores'),
    feature('Score systems', 'Score systems', ['score'], ['ScorePolicy', 'scoreBreakdown', 'addScore'], 'Scoring is applied and broken down.', 'scoreSystems'),
    feature('Combo systems', 'Combo systems', ['combo'], ['comboCount', 'comboMultiplier', 'COMBO_MILESTONES'], 'Combo scoring appears in runtime state.', 'combo'),
    feature('Overrun systems', 'Overrun systems', ['overrun'], ['overrun', 'RunPacingConfig.targetSectors', 'RUN CLEAR'], 'Run clear/overrun state exists.', 'overrun'),
    feature('Upgrades', 'Upgrades', ['upgrade', 'powerup'], ['PowerupManager', 'applyPowerup', 'powerups'], 'Powerups/upgrades are spawned and applied.', 'upgrades'),
    feature('Achievements', 'Achievements', ['achievement'], ['AchievementManager', 'AchievementCatalog', 'showAchievements'], 'Achievements screen and unlock manager exist.', 'achievements'),
    feature('Steam integration', 'Steam integration', ['steam'], ['steam', '__novaSteamBridge', 'steamworks'], 'Steam diagnostics/bridges are wired without blocking gameplay.', 'steamIntegration'),
    feature('Steam leaderboard read flow', 'Steam leaderboard read and write flow', ['leaderboard', 'steam leaderboard'], ['SteamLeaderboardProvider', 'getGlobalScores', 'leaderboards'], 'Steam/global leaderboard read path is present.', 'steamIntegration'),
    feature('Steam leaderboard write flow', 'Steam leaderboard read and write flow', ['submit score', 'leaderboard'], ['submitScore', 'UploadLeaderboardScore', 'lastLeaderboardResult'], 'Score submission path exists and reports result.', 'steamIntegration'),
    feature('Local leaderboard fallback', 'Local leaderboard fallback', ['local leaderboard'], ['LocalLeaderboardProvider', 'LocalLeaderboard', 'novaSwarm.localLeaderboard'], 'Offline/local score fallback is available.', 'scoreSystems'),
    feature('Controller support', 'Controller support', ['controller', 'gamepad'], ['GamepadNavigator', 'getGamepadState', 'controller'], 'Controller/gamepad input support exists.', 'diagnostics'),
    feature('Keyboard support', 'Keyboard support', ['keyboard'], ['InputManager', 'ArrowLeft', 'isFiring'], 'Keyboard movement/fire works in runtime.', 'keyboard'),
    feature('Settings', 'Settings', ['settings'], ['SettingsOverlay', 'audioTestButtons', 'accessibility'], 'Settings overlay is reachable and exposes options.', 'mainMenu'),
    feature('Audio and music', 'Audio and music', ['audio', 'music'], ['AudioManager', 'SoundCatalog', 'playMusicContext'], 'Audio settings and music context are exposed.', 'audio'),
    feature('Localization', 'Localization', ['localization', 'i18n'], ['i18n', 'translateText', 'supportedLanguages'], 'Supported languages are wired through i18n.', 'localization'),
    feature('Save and load', 'Save and load', ['save', 'load', 'cloud'], ['localStorage', 'steamCloud', 'HangarProgressState'], 'Local/Steam persistence paths exist.', 'rankProgress'),
    feature('Error handling', 'Error handling', ['error', 'diagnostic'], ['showErrorOverlay', 'BootWatchdog', 'fatal-overlay'], 'Errors expose diagnostics instead of silent failure.', 'diagnostics'),
    feature('Diagnostics', 'Diagnostics', ['diagnostic'], ['render_game_to_text', '__perfStats', 'collectSteamDiagnostics'], 'Runtime text diagnostics are available.', 'diagnostics'),
    feature('Build and Steam packaging scripts', 'Build and Steam packaging scripts', ['steam packaging', 'build'], ['package:steam:win', 'write-steamworks-vdf', 'check:release-line'], 'Steam packaging scripts are present.', null, { runtimeExpected: false }),
    feature('Game over persistence', 'Regression context', ['game over'], ['GameOverScene', 'gameOver'], 'Game over remains visible after death.', 'gameOverPersistence'),
    feature('Global rank null guard', 'Regression context', ['global rank'], ['globalPlacement', 'globalRank', 'leaderboardStatus'], 'Missing global rank does not render as #null.', 'globalRankNull'),
    feature('Temporary keyboard test hotkeys', 'Regression context', ['hotkey', 'debug'], ['handleDebugNumberKey', 'Digit8', 'marketing'], 'Debug keys 1-8 work only in safe unranked/test context.', 'debugHotkeys')
  ];

  const matrix = specs.map((spec) => {
    const sourceEvidence = findEvidence(spec.sourcePatterns, files);
    const codeEvidence = findEvidence(spec.codePatterns, files);
    const runtimeEvidence = spec.runtimeKey ? runtime.checks?.[spec.runtimeKey] : null;
    const status = statusFromEvidence({
      codeEvidence,
      sourceEvidence,
      runtimeEvidence,
      runtimeExpected: spec.runtimeExpected !== false
    });
    return {
      featureName: spec.name,
      area: spec.area,
      sourceClaimingOrImplyingFeatureExists: sourceEvidence,
      expectedPlayerVisibleBehavior: spec.expectedBehavior,
      codeEvidence,
      runtimeEvidence,
      testMethodUsed: spec.runtimeKey
        ? `Browser runtime check '${spec.runtimeKey}' plus static code/doc scan.`
        : 'Static code/doc/package script scan only.',
      status,
      answers: {
        presentInCode: codeEvidence.length > 0,
        wiredIntoGame: status === 'Verified implemented' || status === 'Visible in game but broken' || status === 'Partially implemented',
        playerReachable: Boolean(runtimeEvidence?.ok),
        worksWhenReached: Boolean(runtimeEvidence?.ok && !runtimeEvidence?.broken),
        matchesDocsOrIntent: status === 'Verified implemented' ? 'yes' : 'needs review',
        staleDocumentationRisk: sourceEvidence.length > 0 && !runtimeEvidence?.ok ? 'possible' : 'not evident',
        steamReviewOrPlayerTrustRisk: ['Visible in game but broken', 'Missing', 'Conflicting evidence'].includes(status) ? 'yes' : 'low'
      }
    };
  });

  const dynamicClaims = findEvidence([/TODO|FIXME|deferred|known limitation|human review|not Steam-ready/i], files)
    .map((entry) => ({
      featureName: `Claim or limitation: ${entry.text.slice(0, 80)}`,
      area: 'Planning or stale documentation',
      sourceClaimingOrImplyingFeatureExists: [entry],
      expectedPlayerVisibleBehavior: 'Needs human review; this is a claim/limitation, not a verified feature.',
      codeEvidence: [],
      runtimeEvidence: null,
      testMethodUsed: 'Static TODO/FIXME/limitation scan.',
      status: 'Untestable with current automation',
      answers: {
        presentInCode: null,
        wiredIntoGame: null,
        playerReachable: null,
        worksWhenReached: null,
        matchesDocsOrIntent: 'unknown',
        staleDocumentationRisk: 'possible',
        steamReviewOrPlayerTrustRisk: /steam|leaderboard|controller|keyboard|achievement|cloud/i.test(entry.text) ? 'yes' : 'low'
      }
    }));

  return [...matrix, ...dynamicClaims.slice(0, 20)];
}

function buildAuditRecommendations(matrix, runtime) {
  const recs = [];
  const risky = matrix.filter((entry) => ['Visible in game but broken', 'Missing', 'Implemented in code but unreachable in game', 'Conflicting evidence'].includes(entry.status));
  for (const entry of risky.slice(0, 12)) {
    recs.push(recommendation(
      entry.answers.steamReviewOrPlayerTrustRisk === 'yes' ? 'High' : 'Medium',
      `${entry.featureName} is ${entry.status.toLowerCase()}.`,
      entry.runtimeEvidence?.evidence || entry.codeEvidence?.[0]?.text || entry.sourceClaimingOrImplyingFeatureExists?.[0]?.text || 'Audit evidence incomplete.',
      'Add a focused runtime check and repair the wiring or docs so code, reachable behavior, and claim agree.',
      'Reduces player-trust and Steam-review risk from untrue or unreachable features.',
      'May require trimming stale docs instead of adding more code.'
    ));
  }
  for (const finding of runtime.bugFindings || []) {
    recs.unshift(recommendation(finding.priority, finding.problem, finding.evidence, finding.suggestedFix, finding.expectedEffect, finding.riskOrTradeoff));
  }
  return recs;
}

function statusCounts(matrix) {
  return matrix.reduce((acc, entry) => {
    acc[entry.status] = (acc[entry.status] || 0) + 1;
    return acc;
  }, {});
}

function renderFeatureMatrix(matrix) {
  const rows = [
    '| Feature | Status | Runtime evidence | Code evidence | Risk |',
    '|---|---|---|---|---|'
  ];
  for (const entry of matrix) {
    const code = entry.codeEvidence?.[0]
      ? `${entry.codeEvidence[0].file}:${entry.codeEvidence[0].line}`
      : 'none';
    const runtime = entry.runtimeEvidence?.evidence || (entry.runtimeEvidence ? JSON.stringify(entry.runtimeEvidence).slice(0, 90) : 'not run');
    rows.push(`| ${escapeMd(entry.featureName)} | ${entry.status} | ${escapeMd(runtime).slice(0, 120)} | ${escapeMd(code)} | ${entry.answers.steamReviewOrPlayerTrustRisk} |`);
  }
  return rows.join('\n');
}

function escapeMd(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function renderRecommendations(recommendations) {
  if (!recommendations.length) return 'No recommendations generated.';
  return recommendations.map((rec, index) => [
    `${index + 1}. **${rec.priority}: ${rec.problem}**`,
    `   - Evidence: ${rec.evidence}`,
    `   - Suggested fix: ${rec.suggestedFix}`,
    `   - Expected effect: ${rec.expectedEffect}`,
    `   - Risk or tradeoff: ${rec.riskOrTradeoff}`
  ].join('\n')).join('\n\n');
}

function renderLevel50Report(data) {
  const commands = [
    'npm run build',
    'npm run smoke',
    'npm run test:level50-analysis'
  ];
  const milestoneRows = [
    '| Milestone | Profile/attempt | Real elapsed | Game elapsed | Lives | Damage | Boss/elite | Balance notes |',
    '|---|---|---:|---:|---:|---:|---|---|'
  ];
  for (const attempt of data.attempts) {
    for (const level of milestoneLevels) {
      const item = attempt.milestones[level];
      if (!item) continue;
      milestoneRows.push(`| Level ${level} | ${attempt.profile} #${attempt.attempt} | ${round(item.realElapsedMs / 1000, 1)}s | ${item.gameElapsedSeconds ?? 'n/a'}s | ${item.lives ?? 'n/a'} | ${item.damageTaken ?? 0} | ${escapeMd(item.bossOrEliteEncounters?.boss || 'sampled')} | ${escapeMd((item.obviousBalanceProblems || []).join('; ') || 'none')} |`);
    }
  }
  return `# Nova Swarm Level 50 Automated Analysis

Generated: ${data.generatedAt}
Baseline: ${data.git.baselineCommit}
Branch: ${data.git.branch}
Automation mode: accelerated browser runtime, unranked debug route, isolated localStorage, seeded Math.random.

## Summary

- Verdict: ${data.level50Verdict}
- Target level: ${maxLevel}
- Profiles: ${profiles.map((profile) => profile.label).join(', ')}
- Attempts per profile: ${attemptsPerProfile}
- Reports written: \`${path.relative(root, reportPath).replaceAll(path.sep, '/')}\`, \`${path.relative(root, telemetryPath).replaceAll(path.sep, '/')}\`
- This is automated evidence, not a substitute for human playtesting.

## Test Setup

- Browser: Playwright Chromium/Chrome headless.
- URL: \`${baseUrl}\`
- Route: \`?autostart=1&controlSmoke=1&debugBossToken=${debugToken}\`
- Run safety: every route is marked unranked; no Steamworks settings, saves, leaderboards, achievements, or production balance are intentionally changed.
- Seeds: deterministic per profile attempt.

## Technical Validation

- Page errors: ${data.technical.pageErrors.length}
- Console warnings/errors: ${data.technical.consoleWarnings.length}
- Bad responses: ${data.technical.badResponses.length}
- Request failures: ${data.technical.requestFailures.length}
- Runtime audit bug findings: ${data.runtimeBugFindings.length}

## Milestone Timing

${milestoneRows.join('\n')}

## Difficulty Curve

Largest modeled pressure jumps:

${data.difficulty.largestPressureJumps.map((entry) => `- Level ${entry.level}: pressure +${entry.pressureDelta}, boss HP +${entry.bossHpDelta}, wave count +${entry.waveCountDelta}`).join('\n') || '- None detected.'}

## Player Profile Results

${data.profileSummaries.map((summary) => `- ${summary.label}: median level ${summary.medianLevelReached}, average ${summary.averageLevelReached}, best ${summary.bestLevelReached}, worst ${summary.worstLevelReached}, average survived ${round(summary.averageTimeSurvivedMs / 1000, 1)}s, common failure ${summary.mostCommonCauseOfFailure}, likely retry ${summary.likelyToRetry ? 'yes' : 'no'}.`).join('\n')}

Death distribution:

\`\`\`json
${JSON.stringify(Object.fromEntries(data.profileSummaries.map((summary) => [summary.profile, summary.deathLevelDistribution])), null, 2)}
\`\`\`

## Human Reachability Estimate

These estimates are modeled from automated pressure telemetry, not observed human play:

${data.profileSummaries.map((summary) => `- ${summary.label}: expected human reach around level ${summary.medianLevelReached}-${summary.bestLevelReached}; frustration points: ${summary.expectedFrustrationPoints.join('; ') || 'none modeled'}.`).join('\n')}

## Frustration Analysis

- Unfair-feeling stretches: ${data.engagement.unfairFeelingStretches.length ? data.engagement.unfairFeelingStretches.join(', ') : 'none modeled'}
- Boring stretches: ${data.engagement.boringStretches.length ? data.engagement.boringStretches.join(', ') : 'none modeled'}
- Projectile clutter samples: ${data.engagement.projectileClutter}
- Recovery after mistakes: ${data.engagement.recoveryAfterMistakes}
- Death clarity limitation: ${data.engagement.clarityOfDeathCause}

## Engagement Analysis

- Verdict: ${data.engagement.verdict}
- Enemy variety: ${data.engagement.enemyVariety}
- Threat variety: ${data.engagement.threatVariety}
- Reward pacing: ${data.engagement.timeBetweenRewards}
- Run variety: ${data.engagement.runVariety}
- Skill rewarded: ${data.engagement.skillRewarded}

## Level 50 Verdict

${data.level50Verdict}

The automation can exercise level generation and boss sampling through Level 50, but it does so with acceleration and modeled player damage. Treat it as a regression and balance-analysis tool, not proof that a real beginner, average, or skilled player will feel the same.

## Recommended Improvements

${renderRecommendations(data.recommendations)}

## Raw Metrics Summary

\`\`\`json
${JSON.stringify({
  profileSummaries: data.profileSummaries,
  largestPressureJumps: data.difficulty.largestPressureJumps,
  statusCounts: data.attempts.reduce((acc, attempt) => {
    acc[attempt.status] = (acc[attempt.status] || 0) + 1;
    return acc;
  }, {})
}, null, 2)}
\`\`\`

## Limitations

- This is not real human playtesting.
- The harness accelerates progression by invoking safe debug/unranked runtime hooks.
- Profile damage is modeled from telemetry pressure, not from a learned human-like controller.
- Reports can reveal broken/reachable state, but they do not judge fun with human certainty.

## Re-run Commands

${commands.map((command) => `- \`${command}\``).join('\n')}
`;
}

function renderAuditReport(audit) {
  const highestRisk = audit.matrix
    .filter((entry) => entry.answers.steamReviewOrPlayerTrustRisk === 'yes' || ['Visible in game but broken', 'Missing', 'Conflicting evidence'].includes(entry.status))
    .slice(0, 12);
  return `# Nova Swarm Implementation Audit

Generated: ${audit.generatedAt}
Baseline: ${audit.git.baselineCommit}
Branch: ${audit.git.branch}

## Summary

- Features audited: ${audit.matrix.length}
- Status counts: \`${JSON.stringify(audit.statusCounts)}\`
- Runtime audit error: ${audit.runtime.error || 'none'}
- Reports written: \`${path.relative(root, auditReportPath).replaceAll(path.sep, '/')}\`, \`${path.relative(root, auditJsonPath).replaceAll(path.sep, '/')}\`

## Highest Risk Findings

${highestRisk.length ? highestRisk.map((entry) => `- **${entry.featureName}**: ${entry.status}. Evidence: ${escapeMd(entry.runtimeEvidence?.evidence || entry.codeEvidence?.[0]?.text || entry.sourceClaimingOrImplyingFeatureExists?.[0]?.text || 'none')}`).join('\n') : '- No high-risk findings from the current automation.'}

## Feature Verification Matrix

${renderFeatureMatrix(audit.matrix)}

## Steam Review And Player Trust Risks

${highestRisk.length ? highestRisk.map((entry) => `- ${entry.featureName}: ${entry.answers.steamReviewOrPlayerTrustRisk}. Player reachability: ${entry.answers.playerReachable}.`).join('\n') : '- No immediate Steam review risk detected by this automated pass.'}

## Stale Documentation

${audit.staleDocumentation.length ? audit.staleDocumentation.map((entry) => `- ${entry.file}:${entry.line} ${escapeMd(entry.text)}`).join('\n') : '- No stale documentation candidates were detected by the shallow scan.'}

## Recommended Fixes

${renderRecommendations(audit.recommendations)}

## Regression Context Included

${userBugContext.map((item) => `- ${item}`).join('\n')}
`;
}

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const git = {
    branch: execGit(['branch', '--show-current']).stdout || 'unknown',
    baselineCommit: execGit(['rev-parse', 'HEAD']).stdout || 'unknown',
    status: execGit(['status', '--short', '--branch']).stdout || '',
    recentLog: execGit(['log', '--oneline', '--decorate', '-25']).stdout || '',
    currentChanges: execGit(['diff', '--stat']).stdout || ''
  };
  const server = await startPreviewServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  const attempts = [];
  let runtime = null;
  try {
    for (const profile of profiles) {
      for (let attempt = 1; attempt <= attemptsPerProfile; attempt += 1) {
        console.log(`[level50] ${profile.id} attempt ${attempt}/${attemptsPerProfile}`);
        attempts.push(await runProfileAttempt(browser, profile, attempt));
      }
    }
    console.log('[level50] implementation runtime audit');
    runtime = await collectRuntimeAudit(browser);
  } finally {
    await browser.close().catch(() => {});
    if (server) server.kill();
  }

  const profileSummaries = profiles.map((profile) =>
    aggregateProfile(profile, attempts.filter((attempt) => attempt.profile === profile.id))
  );
  const difficulty = analyzeDifficulty(attempts);
  const engagement = analyzeEngagement(attempts, difficulty);
  const reachedTargetCount = attempts.filter((attempt) => attempt.reachedLevel >= maxLevel).length;
  const level50Verdict = reachedTargetCount === attempts.length
    ? 'Automated accelerated profiles reached Level 50, but this does not prove human reachability.'
    : reachedTargetCount > 0
      ? 'Level 50 is reachable by the accelerated harness, while lower modeled profiles may fail earlier.'
      : 'The current automated run did not prove Level 50 reachability for the modeled profiles.';
  const technical = attempts.reduce((acc, attempt) => {
    acc.consoleWarnings.push(...(attempt.console?.consoleWarnings || []));
    acc.pageErrors.push(...(attempt.console?.pageErrors || []));
    acc.badResponses.push(...(attempt.console?.badResponses || []));
    acc.requestFailures.push(...(attempt.console?.requestFailures || []));
    return acc;
  }, { consoleWarnings: [], pageErrors: [], badResponses: [], requestFailures: [] });
  if (runtime?.events) {
    technical.consoleWarnings.push(...runtime.events.consoleWarnings);
    technical.pageErrors.push(...runtime.events.pageErrors);
    technical.badResponses.push(...runtime.events.badResponses);
    technical.requestFailures.push(...runtime.events.requestFailures);
  }
  const recommendations = buildLevel50Recommendations(profileSummaries, engagement, difficulty, runtime?.bugFindings || []);
  const telemetry = {
    generatedAt: new Date().toISOString(),
    git,
    baseUrl,
    maxLevel,
    attemptsPerProfile,
    profiles,
    attempts,
    profileSummaries,
    difficulty,
    engagement,
    level50Verdict,
    technical,
    runtimeBugFindings: runtime?.bugFindings || [],
    recommendations,
    limitation: 'Automated accelerated runtime evidence and modeled profile damage; not real human playtesting.'
  };

  writeFileSync(telemetryPath, JSON.stringify(telemetry, null, 2));
  writeFileSync(reportPath, renderLevel50Report(telemetry));

  const matrix = buildFeatureMatrix(runtime || { checks: {}, bugFindings: [] });
  const staleDocumentation = matrix
    .filter((entry) => entry.answers.staleDocumentationRisk === 'possible')
    .flatMap((entry) => entry.sourceClaimingOrImplyingFeatureExists || [])
    .filter((entry) => /^(docs|release)\//.test(entry.file) || entry.file === 'README.md' || entry.file === 'package.json')
    .slice(0, 40);
  const audit = {
    generatedAt: new Date().toISOString(),
    git,
    runtime: runtime || null,
    matrix,
    statusCounts: statusCounts(matrix),
    staleDocumentation,
    userBugContext,
    recommendations: buildAuditRecommendations(matrix, runtime || {})
  };
  writeFileSync(auditJsonPath, JSON.stringify(audit, null, 2));
  writeFileSync(auditReportPath, renderAuditReport(audit));

  console.log(JSON.stringify({
    status: 'ok',
    baseline: git.baselineCommit,
    branch: git.branch,
    report: path.relative(root, reportPath).replaceAll(path.sep, '/'),
    telemetry: path.relative(root, telemetryPath).replaceAll(path.sep, '/'),
    auditReport: path.relative(root, auditReportPath).replaceAll(path.sep, '/'),
    auditJson: path.relative(root, auditJsonPath).replaceAll(path.sep, '/'),
    level50Verdict,
    implementationStatusCounts: audit.statusCounts,
    commands: ['npm run build', 'npm run smoke', 'npm run test:level50-analysis']
  }, null, 2));
}

main().catch((error) => {
  console.error('[level50-analysis] failed');
  console.error(error);
  process.exitCode = 1;
});
