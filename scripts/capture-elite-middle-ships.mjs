import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4394));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.ELITE_CAPTURE_OUTPUT_DIR || path.join('test-results', 'elite-middle-ships', timestamp()));

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
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
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available check port found starting at ${startPort}`);
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
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
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
    startLevel: '40',
    audio: '0'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state?.scene === 'play' && window.__game?.scenes?.play?.player;
    } catch {
      return false;
    }
  }, { timeout: 30000 });

  await page.evaluate(async () => {
    const play = window.__game?.scenes?.play;
    if (!play) throw new Error('Missing play scene while waiting for ship catalog');
    await play.shipCatalogReady;
    if (!play.shipCatalogLoaded) throw new Error('Ship catalog promise resolved without loaded state');
  });

  await page.evaluate(() => {
    const assist = () => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const player = play?.player;
      if (!game || !play || !player) return;
      play.introActive = false;
      if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
      play.introOverlay = null;
      game.lives = Math.max(game.lives || 0, 3);
      player.invulnerable = true;
      player.invulnerableTime = 60000;
      player.x = game.getWidth() * 0.5;
      player.y = game.getHeight() * 0.78;
      if (player.sprite) {
        player.sprite.x = player.x;
        player.sprite.y = player.y;
        player.sprite.scale.set(1);
        player.sprite.alpha = 1;
      }
    };
    window.__eliteCaptureAssist ??= window.setInterval(assist, 120);
    assist();
  });

  await page.waitForTimeout(700);
}

async function clearArena(page) {
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (!play?.enemyManager) return;
    play.enemyManager.clearEnemies();
    play.enemyManager.hijacker = null;
    play.enemyManager.level = 40;
    play.isPaused = false;
    play.enemyManager.eliteMiddleShipsSpawnedThisLevel = 0;
    play.enemyManager.eliteMiddleShipPlan = [];
    window.__game.level = 40;
    play.bulletManager.enemyBullets.forEach((bullet) => { bullet.active = false; });
    play.bulletManager.enemyBullets = [];
    play.clearToastState?.();
    play.player?.clearStatusEffects?.('capture_reset');
  });
}

async function stageElites(page, ids, { activeAbility = true } = {}) {
  await clearArena(page);
  const staged = await page.evaluate(({ ids: stageIds, activeAbility: makeActive }) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) throw new Error('Missing play surface');
    const spacing = game.getWidth() / (stageIds.length + 1);
    stageIds.forEach((id, index) => {
      const elite = manager.spawnEliteMiddleShip(id, {
        formation: 'ELITE_CAPTURE',
        waveColor: index % 2 ? 'Blue' : 'Black',
        delayMs: 0
      });
      if (!elite) throw new Error(`Could not spawn elite ${id}`);
      elite.waitingForEntry = false;
      elite.active = true;
      elite.state = 'FORMATION';
      elite.x = spacing * (index + 1);
      elite.y = 170 + (index % 2) * 80;
      elite.formationX = elite.x;
      elite.formationY = elite.y;
      if (elite.sprite) {
        elite.sprite.visible = true;
        elite.sprite.x = elite.x;
        elite.sprite.y = elite.y;
      }
      if (makeActive && elite.eliteAbility) {
        elite.eliteAbility.state = 'active';
        elite.eliteAbility.startedAt = Date.now();
        elite.eliteAbility.activeUntil = Date.now() + 5000;
        elite.eliteAbility.triggered = false;
        elite.update?.(1, play.player.x, play.player.y);
      }
    });
    const staged = stageIds.map((id) => {
      const elite = manager.enemies.find((enemy) => enemy?.middleShipProfile?.id === id && enemy.active !== false);
      return elite ? {
        id,
        ability: elite.middleShipProfile?.specialAbility || null,
        activeSfx: elite.middleShipProfile?.sfx?.active || null,
        hasSprite: Boolean(elite.usingEliteMiddleShipTexture && !elite.usingFallbackGraphics),
        hasBody: Boolean(elite.body),
        usingEliteMiddleShipTexture: Boolean(elite.usingEliteMiddleShipTexture),
        usingFallbackGraphics: Boolean(elite.usingFallbackGraphics),
        textureFallbackIndex: elite.eliteMiddleShipTextureFallbackIndex,
        hasVfxLayer: Boolean(elite.eliteVfxLayer)
      } : null;
    });
    play.isPaused = true;
    return staged;
  }, { ids, activeAbility });
  if (staged.some((entry) => !entry?.hasSprite || entry?.textureFallbackIndex !== null || !entry?.hasVfxLayer || !entry?.activeSfx)) {
    throw new Error(`Incomplete staged elite runtime state: ${JSON.stringify(staged)}`);
  }
  await page.waitForTimeout(450);
  return staged;
}

async function stageTractorDebuff(page, debuffIndex) {
  await clearArena(page);
  await page.evaluate((index) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    const player = play?.player;
    if (!game || !play || !manager || !player) throw new Error('Missing tractor capture surface');

    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.72;
    player.clearStatusEffects?.('tractor_capture');
    player.tractorDebuffImmunityUntil = 0;

    manager.spawnHijacker();
    const hijacker = manager.hijacker;
    hijacker.x = player.x;
    hijacker.y = 116;
    hijacker.baseY = 116;
    hijacker.beamState = 'active';
    hijacker.beamStartedAt = Date.now();
    hijacker.beamActiveMs = 6000;
    hijacker.beamTarget = { x: player.x, y: player.y };
    if (hijacker.sprite) {
      hijacker.sprite.x = hijacker.x;
      hijacker.sprite.y = hijacker.y;
    }
    player.applyTractorDebuff?.({
      source: 'capture_script',
      x: hijacker.x,
      y: hijacker.y,
      random: () => (index + 0.01) / 10
    });
    hijacker.updateBeamVisual?.(0.7, true, player.x, player.y);
  }, debuffIndex);
  await page.waitForTimeout(360);
}

async function stageSplitterDeath(page) {
  await stageElites(page, ['nova_elite_splitter_clone'], { activeAbility: true });
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const elite = play?.enemyManager?.enemies?.find((enemy) => enemy.kind === 'elite_middle_ship');
    if (!elite) throw new Error('Missing splitter elite');
    elite.takeDamage?.(999);
    play.particleManager?.createExplosion?.(elite.x, elite.y, elite.color || 0xff66ff, 1.4);
  });
  await page.waitForTimeout(500);
}

async function capture(page, filename, label) {
  const target = path.join(outputDir, filename);
  await page.screenshot({ path: target, fullPage: true });
  const state = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  return {
    label,
    path: target,
    scene: state.scene,
    level: state.level,
    eliteMiddleShips: state.eliteMiddleShips || [],
    counts: state.counts || {},
    playerStatusEffects: state.player?.statusEffects || [],
    hijacker: state.hijacker || null
  };
}

mkdirSync(outputDir, { recursive: true });
const contactSheetSource = path.resolve('public/art/generated/nova-swarm/elites/nova-elite-middle-ships-contact-sheet-20260523.jpg');
const copiedContactSheet = path.join(outputDir, '01-elite-art-contact-sheet.jpg');
if (existsSync(contactSheetSource)) copyFileSync(contactSheetSource, copiedContactSheet);
const expansionContactSheetSource = path.resolve('artifacts/elite-expansion/elite-expansion-sprite-sheet.png');
const copiedExpansionContactSheet = path.join(outputDir, '01b-elite-expansion-art-contact-sheet.png');
if (existsSync(expansionContactSheetSource)) copyFileSync(expansionContactSheetSource, copiedExpansionContactSheet);

const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--mute-audio']
});

const report = {
  ok: false,
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  captures: [
    ...(existsSync(copiedContactSheet) ? [{ label: '20 original elite art contact sheet', path: copiedContactSheet }] : []),
    ...(existsSync(copiedExpansionContactSheet) ? [{ label: '30 elite expansion art contact sheet', path: copiedExpansionContactSheet }] : [])
  ]
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`[browser:${message.type()}] ${message.text()}`);
  });

  await waitForPlay(page);
  await stageElites(page, ['nova_elite_shield_projector', 'nova_elite_drone_carrier']);
  report.captures.push(await capture(page, '02-shield-and-drone-elites.png', 'shield projector and drone carrier active'));

  await stageElites(page, ['nova_elite_anchor_turret', 'nova_elite_hunter']);
  report.captures.push(await capture(page, '03-late-game-elites.png', 'late-game anchor turret and elite hunter'));

  await stageTractorDebuff(page, 0);
  report.captures.push(await capture(page, '04-tractor-engine-drag.png', 'tractor beam active with Engine Drag'));

  await stageTractorDebuff(page, 1);
  report.captures.push(await capture(page, '05-tractor-weapon-jam.png', 'tractor beam active with Weapon Jam'));

  await stageTractorDebuff(page, 9);
  report.captures.push(await capture(page, '06-tractor-sensor-glitch.png', 'tractor beam active with Sensor Glitch'));

  await stageSplitterDeath(page);
  report.captures.push(await capture(page, '07-splitter-death-special.png', 'splitter elite death releases weak escorts'));

  const expansionStages = [
    {
      ids: ['nova_elite_aurora_verdict', 'nova_elite_sunspike_howitzer'],
      filename: '08-prism-and-meteor-expansion.png',
      label: 'expansion prism barrage and meteor bloom active',
      abilities: ['prism_barrage', 'meteor_bloom'],
      expectProjectiles: true
    },
    {
      ids: ['nova_elite_voidtalon_executioner', 'nova_elite_crown_of_knives'],
      filename: '09-dash-and-satellite-expansion.png',
      label: 'expansion hunter dash and satellite ring active',
      abilities: ['hunter_dash', 'satellite_ring'],
      expectProjectiles: true
    },
    {
      ids: ['nova_elite_deadtime_magistrate', 'nova_elite_gravewell_reclaimer'],
      filename: '10-stasis-and-siphon-expansion.png',
      label: 'expansion stasis lattice and siphon tether active',
      abilities: ['stasis_lattice', 'siphon_tether'],
      expectProjectiles: false
    },
    {
      ids: ['nova_elite_cataclysm_cantor', 'nova_elite_afterimage_butcher'],
      filename: '11-command-and-warp-expansion.png',
      label: 'expansion resonance command and warp ambush active',
      abilities: ['resonance_command', 'warp_ambush'],
      expectProjectiles: true
    },
    {
      ids: ['nova_elite_blue_ruin_cleaver', 'nova_elite_last_warning_arsenal'],
      filename: '12-shear-and-siege-expansion.png',
      label: 'expansion ion shear and siege beacon active',
      abilities: ['ion_shear', 'siege_beacon'],
      expectProjectiles: true
    }
  ];
  for (const stage of expansionStages) {
    const staged = await stageElites(page, stage.ids);
    const stagedAbilities = staged.map((entry) => entry.ability);
    if (stagedAbilities.join(',') !== stage.abilities.join(',')) {
      throw new Error(`Expansion ability mismatch for ${stage.ids.join(',')}: ${stagedAbilities.join(',')}`);
    }
    const captured = await capture(page, stage.filename, stage.label);
    const capturedAbilities = captured.eliteMiddleShips.map((entry) => entry?.profile?.ability).filter(Boolean);
    if (!stage.abilities.every((ability) => capturedAbilities.includes(ability))) {
      throw new Error(`Missing active expansion ability in capture ${stage.filename}: ${capturedAbilities.join(',')}`);
    }
    if (stage.expectProjectiles && Number(captured.counts?.enemyBullets || 0) < 2) {
      throw new Error(`Expansion projectile pattern missing in ${stage.filename}: ${captured.counts?.enemyBullets || 0} bullets`);
    }
    report.captures.push(captured);
  }

  report.ok = true;
} finally {
  await browser.close();
  if (server) server.kill();
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

console.log(`[elite-capture] ${report.ok ? 'PASS' : 'FAIL'} output=${outputDir}`);
