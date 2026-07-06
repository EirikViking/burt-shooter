import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { ENEMY_WEAPON_PROFILES } from '../src/config/EnemyWeaponProfiles.js';

const host = process.env.PROJECTILE_VISUAL_HOST || '127.0.0.1';
const port = process.env.PROJECTILE_VISUAL_URL ? null : (Number(process.env.PROJECTILE_VISUAL_PORT) || await findAvailablePort(4492));
const baseUrl = process.env.PROJECTILE_VISUAL_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.PROJECTILE_VISUAL_OUTPUT_DIR || `test-results/projectile-visuals-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

const scenarioOrder = [
  'basic_wave',
  'dense_missile_wave',
  'fireball_white_x',
  'boss_bullet_pattern',
  'boss_beam_tractor',
  'pickup_comparison'
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, String(value));
  return next.toString();
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
  for (let candidate = startPort; candidate < startPort + 50; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available projectile visual port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function waitForPlay(page) {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
    startLevel: '12'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state?.scene === 'play' &&
        window.__game?.scenes?.play?.bulletManager &&
        window.__game?.scenes?.play?.powerupManager;
    } catch {
      return false;
    }
  }, { timeout: 30000 });

  await page.evaluate(async () => {
    const play = window.__game?.scenes?.play;
    if (play?.powerupAssetsReady) await play.powerupAssetsReady;
    const { GameAssets } = await import('/src/utils/GameAssets.js');
    const start = performance.now();
    while (performance.now() - start < 8000) {
      if (
        GameAssets.getEnemyWeaponTexture(0)?.width > 0 &&
        GameAssets.getProjectileTexture('bossLaserCore')?.width > 0 &&
        GameAssets.getPowerupTexture('plasma_lance')?.width > 0
      ) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Projectile or pickup textures did not preload');
  });
}

async function stageScenario(page, scenario) {
  return page.evaluate(async (scenarioName) => {
    const { Bullet } = await import('/src/entities/Bullet.js');
    const { BonusDrone } = await import('/src/entities/BonusDrone.js');
    const {
      getEnemyWeaponProfileById,
      toBulletVisualConfig
    } = await import('/src/config/EnemyWeaponProfiles.js');
    const { GameAssets } = await import('/src/utils/GameAssets.js');

    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player || !play.bulletManager) throw new Error('Missing play surface');

    const removeSprite = (item) => {
      if (item?.sprite?.parent) item.sprite.parent.removeChild(item.sprite);
    };
    const bm = play.bulletManager;
    [...(bm.playerBullets || []), ...(bm.enemyBullets || []), ...(bm.pendingEnemyBullets || [])].forEach(removeSprite);
    bm.playerBullets = [];
    bm.enemyBullets = [];
    bm.pendingEnemyBullets = [];
    play.powerupManager?.powerups?.forEach(removeSprite);
    play.powerupManager.powerups = [];
    play.ambientBonusDrones?.forEach(removeSprite);
    play.ambientBonusDrones = [];
    play.bossHazards = [];
    play.lastBossHazardHit = null;
    play.bossHazardLayer?.clear?.();
    play.tractorHijackLayer?.clear?.();
    play.tractorHijack = null;
    play.lastTractorHijack = null;
    play.toastQueue = [];
    play.toastTopQueue = [];
    play.toastCornerQueue = [];
    const clearToastDisplay = (display) => {
      if (!display) return;
      if (display.__toastTicker && game.app?.ticker) game.app.ticker.remove(display.__toastTicker);
      if (display.parent) display.parent.removeChild(display);
      display.destroy?.({ children: true });
    };
    clearToastDisplay(play.activeCenterToast);
    clearToastDisplay(play.activeTopToast);
    clearToastDisplay(play.activeCornerToast);
    play.activeCenterToast = null;
    play.activeTopToast = null;
    play.activeCornerToast = null;
    play.centerToastLockUntil = 0;
    play.topToastLockUntil = 0;
    play.cornerToastLockUntil = 0;
    play.clearSectorArrivalStinger?.();
    if (play.uiOverlay) play.uiOverlay.visible = false;
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.enemyManager) {
      play.enemyManager.enemies?.forEach(removeSprite);
      play.enemyManager.enemies = [];
      play.enemyManager.hijacker = null;
      play.enemyManager.boss = null;
      play.enemyManager.state = 'PROJECTILE_VISUAL_CHECK';
    }
    player.invulnerable = true;
    player.invulnerableTime = 120000;
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.84;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
      player.sprite.visible = true;
      player.sprite.renderable = true;
    }

    const profileIds = [];
    const addProjectile = ({
      profileId,
      x,
      y,
      angle = Math.PI / 2,
      speed = 0.52,
      overrides = {}
    }) => {
      const profile = getEnemyWeaponProfileById(profileId);
      const config = toBulletVisualConfig(profile, overrides);
      const bullet = new Bullet(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        1,
        config.color || profile.color,
        false,
        config
      );
      bullet.weaponProfileId = profile.id;
      bullet.weaponLabel = profile.label;
      bm.addEnemyBullet(bullet);
      profileIds.push(profile.id);
      return bullet;
    };

    const width = game.getWidth();
    const height = game.getHeight();

    if (scenarioName === 'basic_wave') {
      const ids = ['crimson_shard', 'cyan_rail_needle', 'magenta_crescent'];
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 9; col += 1) {
          addProjectile({
            profileId: ids[(row + col) % ids.length],
            x: width * 0.18 + col * width * 0.075,
            y: height * 0.18 + row * 54,
            angle: Math.PI / 2 + (col - 4) * 0.018,
            speed: 0.32 + row * 0.04
          });
        }
      }
    } else if (scenarioName === 'dense_missile_wave') {
      const ids = ['orange_molten_slug', 'amber_plasma_orb', 'lime_saw_disc', 'purple_boss_spear'];
      for (let row = 0; row < 8; row += 1) {
        for (let col = 0; col < 12; col += 1) {
          addProjectile({
            profileId: ids[(row * 3 + col) % ids.length],
            x: width * 0.08 + col * width * 0.076,
            y: height * 0.12 + row * 44,
            angle: Math.PI / 2 + Math.sin(col * 0.7) * 0.18,
            speed: 0.2 + (row % 3) * 0.08
          });
        }
      }
    } else if (scenarioName === 'fireball_white_x') {
      const ids = ['orange_molten_slug', 'white_comet_lance', 'lime_saw_disc', 'toxic_splinter_seed'];
      for (let i = 0; i < 48; i += 1) {
        const row = Math.floor(i / 12);
        const col = i % 12;
        addProjectile({
          profileId: ids[i % ids.length],
          x: width * 0.1 + col * width * 0.07,
          y: height * 0.16 + row * 70,
          angle: Math.PI / 2 + ((col % 3) - 1) * 0.12,
          speed: 0.35
        });
      }
    } else if (scenarioName === 'boss_bullet_pattern') {
      const ids = ['purple_boss_spear', 'pink_spiral_disruptor', 'violet_star_mine', 'teal_fork_dart'];
      const centerX = width * 0.5;
      const centerY = height * 0.26;
      for (let ring = 0; ring < 3; ring += 1) {
        const count = 16 + ring * 6;
        for (let i = 0; i < count; i += 1) {
          const angle = (Math.PI * 2 * i) / count + ring * 0.11;
          addProjectile({
            profileId: ids[(i + ring) % ids.length],
            x: centerX + Math.cos(angle) * (46 + ring * 42),
            y: centerY + Math.sin(angle) * (26 + ring * 32),
            angle,
            speed: 0.26 + ring * 0.04,
            overrides: { sourceEnemyType: 'boss', sourceFireStyle: 'visual_check' }
          });
        }
      }
    } else if (scenarioName === 'boss_beam_tractor') {
      for (let i = 0; i < 24; i += 1) {
        addProjectile({
          profileId: i % 2 ? 'cyan_rail_needle' : 'purple_boss_spear',
          x: width * 0.18 + (i % 8) * width * 0.09,
          y: height * 0.22 + Math.floor(i / 8) * 66,
          angle: Math.PI / 2 + ((i % 5) - 2) * 0.08,
          speed: 0.28
        });
      }
      const now = Date.now();
      play.bossHazards = [
        {
          id: 'visual_beam',
          category: 'signature',
          type: 'lance',
          attack: 'sniper',
          kind: 'beam',
          sourceX: width * 0.5,
          sourceY: height * 0.1,
          angle: Math.PI / 2,
          spread: 0.12,
          length: height * 0.96,
          radius: 13,
          startedAt: now - 120,
          durationMs: 1800,
          armingMs: 0,
          color: 0xa663ff,
          hit: true
        },
        {
          id: 'visual_wall',
          category: 'regular',
          type: 'wall',
          attack: 'wall',
          kind: 'wall',
          columns: [width * 0.18, width * 0.82],
          startY: height * 0.12,
          endY: height * 0.92,
          width: 22,
          startedAt: now - 80,
          durationMs: 1800,
          armingMs: 0,
          color: 0xff55d9,
          hit: true
        }
      ];
      play.tractorHijack = {
        triggered: true,
        startedAt: now - 120,
        durationMs: 3200,
        sourceX: Math.round(width * 0.72),
        sourceY: Math.round(height * 0.18),
        playerX: Math.round(width * 0.32),
        playerY: Math.round(height * 0.78),
        capturedEnemies: 2,
        clearedBullets: 6,
        bonusScore: 900,
        captured: [
          { x: Math.round(width * 0.44), y: Math.round(height * 0.4), award: 360 },
          { x: Math.round(width * 0.62), y: Math.round(height * 0.48), award: 360 }
        ]
      };
      play.lastTractorHijack = { ...play.tractorHijack };
      play.updateBossHazards?.();
      play.updateTractorHijack?.();
    } else if (scenarioName === 'pickup_comparison') {
      for (let i = 0; i < 34; i += 1) {
        addProjectile({
          profileId: ['crimson_shard', 'orange_molten_slug', 'cyan_rail_needle', 'lime_saw_disc'][i % 4],
          x: width * 0.08 + (i % 17) * width * 0.052,
          y: height * 0.18 + Math.floor(i / 17) * 70,
          angle: Math.PI / 2,
          speed: 0.2
        });
      }
      ['plasma_lance', 'score_x2', 'shield', 'life'].forEach((type, index) => {
        play.powerupManager.spawnSpecific(width * (0.25 + index * 0.15), height * 0.58, type);
      });
      const hazardDrone = new BonusDrone(width * 0.72, height * 0.58, game, 'HAZARD');
      const bonusCore = new BonusDrone(width * 0.84, height * 0.58, game, 'POWERUP');
      play.gameContainer.addChild(hazardDrone.sprite);
      play.gameContainer.addChild(bonusCore.sprite);
      play.ambientBonusDrones.push(hazardDrone, bonusCore);
    }

    for (let frame = 0; frame < 8; frame += 1) {
      bm.update?.(1, 1);
      play.updateBossHazards?.();
      play.updateTractorHijack?.();
    }

    const activeBullets = bm.enemyBullets.filter((bullet) => bullet?.active !== false);
    const generatedSprites = activeBullets.filter((bullet) => bullet.core?.__novaProjectileSprite).length;
    const dangerGlints = activeBullets.filter((bullet) => bullet.dangerGlint?.__novaProjectileDangerGlint).length;
    const framedGeneratedSprites = activeBullets.filter((bullet) => (
      bullet.core?.__novaProjectileSprite &&
      (
        Boolean(bullet.warningRing) ||
        Boolean(bullet.halo) ||
        Boolean(bullet.sprite?.children?.some?.((child) => child?.__novaHazardReadabilityMark))
      )
    )).length;
    const spriteDetails = activeBullets.slice(0, 80).map((bullet) => ({
      profile: bullet.weaponProfileId || null,
      art: bullet.visualConfig?.projectileArt || null,
      animation: bullet.visualConfig?.animationStyle || null,
      coreSprite: Boolean(bullet.core?.__novaProjectileSprite),
      framed: Boolean(
        bullet.core?.__novaProjectileSprite &&
        (
          Boolean(bullet.warningRing) ||
          Boolean(bullet.halo) ||
          Boolean(bullet.sprite?.children?.some?.((child) => child?.__novaHazardReadabilityMark))
        )
      ),
      radius: bullet.radius,
      dangerGlint: Boolean(bullet.dangerGlint?.__novaProjectileDangerGlint),
      width: Math.round((bullet.core?.width || 0) * 10) / 10,
      height: Math.round((bullet.core?.height || 0) * 10) / 10
    }));

    return {
      scenario: scenarioName,
      bulletCount: activeBullets.length,
      generatedSprites,
      dangerGlints,
      framedGeneratedSprites,
      activeProfiles: [...new Set(activeBullets.map((bullet) => bullet.weaponProfileId).filter(Boolean))],
      arts: [...new Set(activeBullets.map((bullet) => bullet.visualConfig?.projectileArt).filter(Boolean))],
      animations: [...new Set(activeBullets.map((bullet) => bullet.visualConfig?.animationStyle).filter(Boolean))],
      spriteDetails,
      projectileTextureCount: Object.keys(GameAssets.projectileTextures || {}).length,
      enemyWeaponTextureCount: (GameAssets.enemyWeaponTextures || []).filter(Boolean).length,
      powerups: play.powerupManager?.powerups?.map((powerup) => powerup.type) || [],
      bonusDrones: play.ambientBonusDrones?.map((drone) => drone.type) || [],
      bossHazards: play.bossHazards?.map((hazard) => hazard.kind) || [],
      tractorActive: Boolean(play.tractorHijack || play.lastTractorHijack)
    };
  }, scenario);
}

async function measureAnimation(page) {
  return page.evaluate(async () => {
    const bullets = window.__game?.scenes?.play?.bulletManager?.enemyBullets?.filter((bullet) => bullet?.active !== false) || [];
    const sample = () => bullets.slice(0, 30).map((bullet) => ({
      sx: Number(bullet.core?.scale?.x || 0),
      sy: Number(bullet.core?.scale?.y || 0),
      alpha: Number(bullet.core?.alpha || 0),
      rotation: Number(bullet.core?.rotation || 0)
    }));
    const before = sample();
    await new Promise((resolve) => setTimeout(resolve, 280));
    const after = sample();
    let changed = 0;
    for (let i = 0; i < Math.min(before.length, after.length); i += 1) {
      const a = before[i];
      const b = after[i];
      if (
        Math.abs(a.sx - b.sx) > 0.0005 ||
        Math.abs(a.sy - b.sy) > 0.0005 ||
        Math.abs(a.alpha - b.alpha) > 0.0005 ||
        Math.abs(a.rotation - b.rotation) > 0.0005
      ) {
        changed += 1;
      }
    }
    return { sampled: before.length, changed };
  });
}

async function measureDensePerformance(page) {
  return page.evaluate(async () => {
    const renderer = window.__game?.app?.renderer;
    const originalGenerateTexture = renderer?.generateTexture?.bind(renderer);
    let generateTextureCalls = 0;
    if (renderer && originalGenerateTexture) {
      renderer.generateTexture = (...args) => {
        generateTextureCalls += 1;
        return originalGenerateTexture(...args);
      };
    }

    const intervals = [];
    for (let i = 0; i < 30; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    let last = performance.now();
    for (let i = 0; i < 180; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const now = performance.now();
      intervals.push(now - last);
      last = now;
    }

    if (renderer && originalGenerateTexture) renderer.generateTexture = originalGenerateTexture;
    const sorted = [...intervals].sort((a, b) => a - b);
    const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] || 0;
    return {
      frames: intervals.length,
      meanMs: intervals.reduce((sum, value) => sum + value, 0) / Math.max(1, intervals.length),
      p95Ms: at(0.95),
      p99Ms: at(0.99),
      maxMs: Math.max(...intervals),
      longFramesOver50: intervals.filter((value) => value > 50).length,
      generateTextureCalls
    };
  });
}

async function screenshotStats(screenshot) {
  try {
    const { default: sharp } = await import('sharp');
    const { data, info } = await sharp(screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let coloredSamples = 0;
    let brightSamples = 0;
    let chromaKeyGreenSamples = 0;
    const stride = Math.max(4, Math.floor(data.length / 6000 / info.channels) * info.channels);
    for (let i = 0; i < data.length; i += stride) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r + g + b > 140) brightSamples += 1;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 40) coloredSamples += 1;
      if (g > 220 && r < 45 && b < 45) chromaKeyGreenSamples += 1;
    }
    return { width: info.width, height: info.height, coloredSamples, brightSamples, chromaKeyGreenSamples };
  } catch (error) {
    return { skipped: true, reason: error.message };
  }
}

const manifestErrors = [];
const expectedProjectileNames = [
  'basicEnemyBolt',
  'fastEnemyNeedle',
  'heavyEnemyOrb',
  'enemyFireball',
  'bossPlasmaBolt',
  'bossShard',
  'bossLaserCore',
  'bossLaserEdge',
  'tractorBeamEnergy',
  'warningHazardMarker'
];
for (const name of expectedProjectileNames) {
  const asset = AssetManifest.generated?.projectiles?.[name];
  if (!asset) manifestErrors.push(`missing AssetManifest.generated.projectiles.${name}`);
  else if (!existsSync(path.resolve('public', asset.replace(/^\//, '')))) manifestErrors.push(`missing projectile file ${asset}`);
}
for (const profile of ENEMY_WEAPON_PROFILES) {
  if (!profile.projectileArt) manifestErrors.push(`${profile.id} missing projectileArt`);
  if (!profile.animationStyle) manifestErrors.push(`${profile.id} missing animationStyle`);
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleEvents = [];
const pageErrors = [];
const badResponses = [];
const ignoredConsolePatterns = [
  /requestFullscreen.*user gesture/i
];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    const text = message.text().slice(0, 1000);
    if (!ignoredConsolePatterns.some((pattern) => pattern.test(text))) {
      consoleEvents.push({ type: message.type(), text });
    }
  }
});
page.on('response', (response) => {
  if (response.status() >= 400) {
    badResponses.push({ status: response.status(), url: response.url(), method: response.request().method() });
  }
});

const captures = [];
let densePerformance = null;
let denseAnimation = null;

try {
  await waitForPlay(page);
  for (const scenario of scenarioOrder) {
    const state = await stageScenario(page, scenario);
    await page.waitForTimeout(240);
    const screenshot = path.join(outputDir, `${scenario}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    const stats = await screenshotStats(screenshot);
    const animation = await measureAnimation(page);
    captures.push({ scenario, screenshot, state, animation, stats });
    if (scenario === 'dense_missile_wave') {
      denseAnimation = animation;
      densePerformance = await measureDensePerformance(page);
    }
  }
} finally {
  await browser.close();
  if (server) server.kill();
}

const coverage = {
  basic: captures.some((capture) => capture.scenario === 'basic_wave' && capture.state.activeProfiles.includes('crimson_shard')),
  fast: captures.some((capture) => capture.state.activeProfiles.includes('cyan_rail_needle')),
  whiteX: captures.some((capture) => capture.state.activeProfiles.includes('white_comet_lance')),
  fireball: captures.some((capture) => capture.state.activeProfiles.includes('orange_molten_slug')),
  missileWave: captures.some((capture) => capture.scenario === 'dense_missile_wave' && capture.state.activeProfiles.includes('orange_molten_slug')),
  bossBullets: captures.some((capture) => capture.scenario === 'boss_bullet_pattern' && capture.state.activeProfiles.includes('purple_boss_spear')),
  bossBeam: captures.some((capture) => capture.state.bossHazards.includes('beam')),
  bossHazards: captures.some((capture) => capture.state.bossHazards.length >= 2),
  tractor: captures.some((capture) => capture.state.tractorActive),
  warningTelegraphMarker: captures.some((capture) => capture.state.arts.includes('warning_hazard_marker')),
  pickupComparison: captures.some((capture) => capture.state.powerups.length >= 4 && capture.state.bonusDrones.includes('HAZARD') && capture.state.bonusDrones.includes('POWERUP'))
};

const errors = [...manifestErrors];
for (const capture of captures) {
  if (capture.state.bulletCount > 0 && capture.state.generatedSprites < capture.state.bulletCount) {
    errors.push(`${capture.scenario} has non-generated enemy bullet sprites ${capture.state.generatedSprites}/${capture.state.bulletCount}`);
  }
  if (capture.state.framedGeneratedSprites > 0) {
    errors.push(`${capture.scenario} still frames generated enemy projectile sprites ${capture.state.framedGeneratedSprites}/${capture.state.generatedSprites}`);
  }
  if (capture.state.bulletCount > 0 && capture.state.dangerGlints < capture.state.bulletCount) {
    errors.push(`${capture.scenario} is missing enemy projectile danger glints ${capture.state.dangerGlints}/${capture.state.bulletCount}`);
  }
  const tinyGeneratedSprites = capture.state.spriteDetails.filter((detail) => detail.coreSprite && detail.width < 28);
  if (tinyGeneratedSprites.length > 0) {
    errors.push(`${capture.scenario} has generated enemy projectile sprites that are too small after unframing: ${tinyGeneratedSprites.map((detail) => `${detail.profile}:${detail.width}x${detail.height}`).join(', ')}`);
  }
  if (capture.state.bulletCount > 0 && capture.animation.changed < Math.min(5, capture.animation.sampled)) {
    errors.push(`${capture.scenario} did not animate enough projectile samples`);
  }
  if (capture.state.projectileTextureCount < 10) errors.push(`${capture.scenario} did not preload all projectile textures`);
  if (capture.state.enemyWeaponTextureCount < 12) errors.push(`${capture.scenario} did not preload all enemy weapon textures`);
  if (capture.stats?.chromaKeyGreenSamples > 8) errors.push(`${capture.scenario} has possible chroma-key green fringe`);
}
for (const [name, ok] of Object.entries(coverage)) {
  if (!ok) errors.push(`missing projectile visual coverage: ${name}`);
}
if (!densePerformance) {
  errors.push('missing dense projectile performance sample');
} else {
  if (densePerformance.longFramesOver50 > 0) errors.push(`dense projectile field had ${densePerformance.longFramesOver50} frames over 50ms`);
  if (densePerformance.generateTextureCalls !== 0) errors.push(`dense projectile field generated textures during active play: ${densePerformance.generateTextureCalls}`);
}
if (!denseAnimation || denseAnimation.changed < Math.min(12, denseAnimation.sampled)) {
  errors.push('dense projectile animation sample did not change enough bullets');
}
if (pageErrors.length > 0) errors.push(`page errors: ${pageErrors.join('; ')}`);
if (badResponses.length > 0) errors.push(`bad responses: ${badResponses.map((item) => `${item.status} ${item.url}`).join('; ')}`);
if (consoleEvents.length > 0) errors.push(`console warnings/errors: ${consoleEvents.map((item) => item.text).slice(0, 5).join('; ')}`);

const report = {
  status: errors.length ? 'failed' : 'passed',
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  imagegenUsed: true,
  assets: AssetManifest.generated?.projectiles || {},
  sourceSheet: AssetManifest.generated?.projectileSourceSheet || [],
  coverage,
  captures,
  densePerformance,
  denseAnimation,
  manifestErrors,
  consoleEvents,
  pageErrors,
  badResponses,
  errors
};
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`[projectile-visuals] PASS captures=${captures.length} p95=${densePerformance.p95Ms.toFixed(2)}ms p99=${densePerformance.p99Ms.toFixed(2)}ms max=${densePerformance.maxMs.toFixed(2)}ms outputDir=${outputDir}`);
