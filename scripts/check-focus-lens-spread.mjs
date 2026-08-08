import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = Number(process.env.CHECK_PORT) || await findAvailablePort(4870);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/focus-lens-spread-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error('No Focus Lens check port available');
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const vite = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [vite, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error('Focus Lens dev server did not start');
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 60000 });
  const samples = await page.evaluate(async () => {
    const [{ ShipData }, { buildSelectableShipVariants }] = await Promise.all([
      import('/src/config/ShipData.js'),
      import('/src/config/VisualVariantCatalog.js')
    ]);
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player) throw new Error('Missing PlayScene player for Focus Lens spread check');
    play.isPaused = true;
    play.introActive = false;
    play.introComplete = true;

    const selectable = buildSelectableShipVariants(ShipData);
    const requested = [
      { name: 'COBALT GUARD', lane: 'NARROW' },
      { name: 'NOVA SPARROW', lane: 'STANDARD' },
      { name: 'ARC STRIKER', lane: 'WIDE' }
    ];
    const profiles = requested.map((entry) => {
      const ship = selectable.find((candidate) => candidate.name === entry.name);
      if (!ship) throw new Error(`Missing representative ${entry.name}`);
      return { ...entry, ship };
    });

    const saved = {
      weaponProfile: player.weaponProfile,
      runAugmentIds: [...(player.runAugmentIds || [])],
      consumedRunAugmentIds: [...(player.consumedRunAugmentIds || [])],
      rankBoost: { ...(player.rankBoost || {}) },
      synergyState: { ...(player.synergyState || {}) },
      statusEffects: new Map(player.statusEffects || []),
      activePowerup: { ...(player.activePowerup || {}) },
      powerupEffect: player.powerupEffect,
      focusDriftActive: player.focusDriftActive
    };

    const captureVolley = (profile, focused) => {
      player.weaponProfile = { ...profile.ship.weapon };
      player.runAugmentIds = ['focus_lens'];
      player.consumedRunAugmentIds = [];
      player.rankBoost = { type: null, expiresAt: 0 };
      player.synergyState = { type: null, expiresAt: 0, label: '' };
      player.statusEffects = new Map();
      player.activePowerup = { type: null, expiresAt: 0, remainingMs: 0, durationMode: 'wall_clock' };
      player.powerupEffect = null;
      player.focusDriftActive = focused;
      player.traitShotCounter = 0;
      player.traitVolleyCounter = 0;
      player.recalculateStats();
      player.shootCooldown = 0;
      const cadence = player.shootDelay;
      const bullets = player.shoot();
      const data = {
        focused,
        projectileCount: bullets.length,
        multiShot: player.multiShot,
        rankBoostExtraShots: player.rankBoostExtraShots,
        cadence,
        adaptiveSpreadMult: player.getAdaptiveFocusSpreadMultiplier(),
        damage: bullets.reduce((sum, bullet) => sum + Number(bullet.damage || 0), 0) / Math.max(1, bullets.length),
        angles: bullets.map((bullet) => Math.atan2(Number(bullet.vx) || 0, -(Number(bullet.vy) || -1))),
        velocities: bullets.map((bullet) => ({ vx: bullet.vx, vy: bullet.vy }))
      };
      bullets.forEach((bullet) => bullet.destroy?.());
      return data;
    };

    const result = profiles.map((profile) => {
      const unfocused = captureVolley(profile, false);
      const focused = captureVolley(profile, true);
      const outer = (angles) => Math.max(...angles.map((angle) => Math.abs(angle)));
      const travel = 600;
      const unfocusedOuter = outer(unfocused.angles);
      const focusedOuter = outer(focused.angles);
      return {
        lane: profile.lane,
        shipId: profile.ship.id,
        shipName: profile.ship.name,
        weaponSpread: profile.ship.weapon.spread,
        weaponBullets: profile.ship.weapon.bullets,
        focusSpreadMult: player.runAugmentModifiers.focusSpreadMult,
        unfocused,
        focused,
        outerAngleRatio: unfocusedOuter > 0 ? focusedOuter / unfocusedOuter : 1,
        envelopeAt600: {
          unfocused: Math.tan(unfocusedOuter) * travel * 2,
          focused: Math.tan(focusedOuter) * travel * 2
        }
      };
    });

    player.weaponProfile = saved.weaponProfile;
    player.runAugmentIds = saved.runAugmentIds;
    player.consumedRunAugmentIds = saved.consumedRunAugmentIds;
    player.rankBoost = saved.rankBoost;
    player.synergyState = saved.synergyState;
    player.statusEffects = saved.statusEffects;
    player.activePowerup = saved.activePowerup;
    player.powerupEffect = saved.powerupEffect;
    player.focusDriftActive = saved.focusDriftActive;
    player.recalculateStats();
    return result;
  });

  const clarity = await page.evaluate(async () => {
    const { Bullet } = await import('/src/entities/Bullet.js');
    const manager = window.__game?.scenes?.play?.bulletManager;
    if (!manager) throw new Error('Missing BulletManager for Focus clarity check');

    const friendly = new Bullet(320, 700, 0, -12, 1, 0x66f7ff, true);
    const bomb = new Bullet(360, 700, 0, -8, 5, 0xffa84d, true);
    const hostile = new Bullet(340, 220, 0, 6, 1, 0xff6174, false);
    bomb.isBomb = true;

    const savedPlayerBullets = manager.playerBullets;
    manager.playerBullets = [friendly, bomb];
    manager.setFocusCombatClarity(true);
    const focused = {
      friendlyAlpha: friendly.sprite.alpha,
      bombAlpha: bomb.sprite.alpha,
      hostileAlpha: hostile.sprite.alpha,
      friendlyZ: friendly.sprite.zIndex,
      hostileZ: hostile.sprite.zIndex
    };
    manager.setFocusCombatClarity(false);
    const restoredFriendlyAlpha = friendly.sprite.alpha;
    manager.playerBullets = savedPlayerBullets;
    friendly.destroy?.();
    bomb.destroy?.();
    hostile.destroy?.();
    return { focused, restoredFriendlyAlpha };
  });

  assert(clarity.focused.friendlyAlpha <= 0.45,
    `Focus left friendly projectile alpha at ${clarity.focused.friendlyAlpha}`);
  assert(clarity.focused.bombAlpha === 1,
    `Focus dimmed the tactical bomb to ${clarity.focused.bombAlpha}`);
  assert(clarity.focused.hostileAlpha === 1,
    `Focus dimmed hostile fire to ${clarity.focused.hostileAlpha}`);
  assert(clarity.focused.hostileZ > clarity.focused.friendlyZ,
    `Hostile projectile zIndex ${clarity.focused.hostileZ} was not above friendly ${clarity.focused.friendlyZ}`);
  assert(clarity.restoredFriendlyAlpha === 1,
    `Friendly projectile alpha restored to ${clarity.restoredFriendlyAlpha}`);

  for (const sample of samples) {
    assert(sample.focusSpreadMult === 0.6, `${sample.shipName}: Focus Lens multiplier was ${sample.focusSpreadMult}`);
    assert(sample.focused.projectileCount === sample.unfocused.projectileCount,
      `${sample.shipName}: Focus changed projectile count`);
    assert(sample.focused.multiShot === sample.unfocused.multiShot,
      `${sample.shipName}: Focus changed multiShot`);
    assert(sample.focused.cadence === sample.unfocused.cadence,
      `${sample.shipName}: Focus changed firing cadence`);
    assert(sample.focused.damage > sample.unfocused.damage * 1.17,
      `${sample.shipName}: existing Focus Lens damage identity was lost`);
    assert(sample.focused.adaptiveSpreadMult >= 0.6 && sample.focused.adaptiveSpreadMult <= 0.86,
      `${sample.shipName}: adaptive spread ${sample.focused.adaptiveSpreadMult} escaped the safe bounds`);
    assert(Math.abs(sample.outerAngleRatio - sample.focused.adaptiveSpreadMult) < 0.02,
      `${sample.shipName}: focused spread ratio ${sample.outerAngleRatio} did not match adaptive ${sample.focused.adaptiveSpreadMult}`);
    assert(sample.envelopeAt600.focused < sample.envelopeAt600.unfocused,
      `${sample.shipName}: focused envelope did not tighten`);
  }
  const adaptiveRatios = samples.map((sample) => Number(sample.focused.adaptiveSpreadMult.toFixed(3)));
  assert(new Set(adaptiveRatios).size >= 2, `Focus correction did not adapt across hulls: ${adaptiveRatios.join(', ')}`);
  assert(samples.find((sample) => sample.lane === 'WIDE').focused.adaptiveSpreadMult
    <= samples.find((sample) => sample.lane === 'NARROW').focused.adaptiveSpreadMult,
  'wide battery did not receive at least as much Focus correction as the narrow battery');

  const continuity = await page.evaluate(() => {
    const player = window.__game.scenes.play.player;
    const saved = {
      focus: player.focusDriftActive,
      dodge: player.isDodging,
      activePowerup: { ...player.activePowerup },
      powerupEffect: player.powerupEffect,
      runAugmentIds: [...player.runAugmentIds]
    };
    player.runAugmentIds = ['focus_lens'];
    player.recalculateStats();
    player.focusDriftActive = true;
    player.isDodging = true;
    player.shootCooldown = 0;
    const phaseShots = player.shoot();
    const phaseDamage = phaseShots[0]?.damage || 0;
    phaseShots.forEach((bullet) => bullet.destroy?.());
    player.isDodging = false;
    player.activePowerup = { type: 'ghost', expiresAt: player.getGameplayClockMs() + 1000, remainingMs: 1000, durationMode: 'wall_clock' };
    player.powerupEffect = { durationMs: 1000, ghost: true };
    player.recalculateStats();
    player.focusDriftActive = true;
    player.shootCooldown = 0;
    const ghostShots = player.shoot();
    const ghostDamage = ghostShots[0]?.damage || 0;
    ghostShots.forEach((bullet) => bullet.destroy?.());
    player.focusDriftActive = saved.focus;
    player.isDodging = saved.dodge;
    player.activePowerup = saved.activePowerup;
    player.powerupEffect = saved.powerupEffect;
    player.runAugmentIds = saved.runAugmentIds;
    player.recalculateStats();
    return { phaseDamage, ghostDamage };
  });
  assert(continuity.phaseDamage > 0 && continuity.ghostDamage > 0,
    `Focus did not remain armed through Phase/Ghost: ${JSON.stringify(continuity)}`);

  const priorityContract = await page.evaluate(async () => {
    const { Bullet } = await import('/src/entities/Bullet.js');
    const classify = (overrides = {}) => Bullet.prototype.isPriorityPlayerProjectile.call({
      isPlayer: true,
      isBomb: false,
      isPlasmaLance: false,
      isGrazeBreaker: false,
      isTraitCriticalShot: false,
      isTraitPiercingShot: false,
      isTraitWingShot: false,
      isTraitBonusShot: false,
      piercing: false,
      tacticalFusionId: null,
      powerupType: null,
      ...overrides
    });
    return {
      ordinary: classify(),
      genericPiercing: classify({ piercing: true }),
      traitPiercing: classify({ isTraitPiercingShot: true, piercing: true }),
      critical: classify({ isTraitCriticalShot: true }),
      wing: classify({ isTraitWingShot: true }),
      bomb: classify({ isBomb: true })
    };
  });
  assert(priorityContract.ordinary === false, `ordinary player shot must be dimmable: ${JSON.stringify(priorityContract)}`);
  assert(priorityContract.genericPiercing === false, `generic piercing shot must be dimmable: ${JSON.stringify(priorityContract)}`);
  assert(priorityContract.traitPiercing === false, `trait piercing shot must be dimmable: ${JSON.stringify(priorityContract)}`);
  assert(priorityContract.critical && priorityContract.wing && priorityContract.bomb,
    `authored priority projectiles must remain exempt: ${JSON.stringify(priorityContract)}`);

  await page.evaluate((samplesForCanvas) => {
    const canvas = document.createElement('canvas');
    canvas.id = 'focus-lens-evidence';
    canvas.width = 1920;
    canvas.height = 1080;
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      width: '1920px',
      height: '1080px'
    });
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 1920, 1080);
    bg.addColorStop(0, '#020711');
    bg.addColorStop(0.5, '#071226');
    bg.addColorStop(1, '#12061f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f7fcff';
    ctx.font = '900 42px Rajdhani, Arial';
    ctx.fillText('FOCUS LENS // LIVE VOLLEY SPREAD EVIDENCE', 960, 58);
    ctx.fillStyle = '#9cfbff';
    ctx.font = '700 22px Rajdhani, Arial';
    ctx.fillText('Focus adapts by hull • friendly fire dims • bombs and hostile fire stay fully visible', 960, 94);

    const colors = { unfocused: '#ff55d9', focused: '#66f7ff' };
    const panelWidth = 590;
    const panelHeight = 880;
    const panelY = 130;
    const travel = 600;
    samplesForCanvas.forEach((sample, index) => {
      const panelX = 35 + index * 625;
      const originX = panelX + panelWidth / 2;
      const originY = panelY + panelHeight - 90;
      ctx.fillStyle = 'rgba(2, 13, 28, 0.92)';
      ctx.strokeStyle = index === 0 ? '#ffef7e' : index === 1 ? '#66f7ff' : '#ff55d9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f7fcff';
      ctx.font = '900 30px Rajdhani, Arial';
      ctx.fillText(`${sample.lane} // ${sample.shipName}`, originX, panelY + 46);
      ctx.fillStyle = '#9cb8cb';
      ctx.font = '700 18px Rajdhani, Arial';
      ctx.fillText(`${sample.weaponBullets} lanes • base spread ${sample.weaponSpread.toFixed(3)} rad`, originX, panelY + 76);

      for (let step = 0; step <= 6; step += 1) {
        const y = originY - step * 100;
        ctx.strokeStyle = step === 0 ? 'rgba(255,255,255,0.34)' : 'rgba(126,233,255,0.12)';
        ctx.lineWidth = step === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 30, y);
        ctx.lineTo(panelX + panelWidth - 30, y);
        ctx.stroke();
        if (step > 0) {
          ctx.fillStyle = '#66859b';
          ctx.font = '600 13px Rajdhani, Arial';
          ctx.textAlign = 'left';
          ctx.fillText(`${step * 100}px`, panelX + 36, y - 5);
          ctx.textAlign = 'center';
        }
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.setLineDash([7, 8]);
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX, originY - travel);
      ctx.stroke();
      ctx.setLineDash([]);

      const drawVolley = (angles, color, width) => {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;
        for (const angle of angles) {
          const endX = originX + Math.tan(angle) * travel;
          const endY = originY - travel;
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(endX, endY, width + 2, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      drawVolley(sample.unfocused.angles, colors.unfocused, 4);
      drawVolley(sample.focused.angles, colors.focused, 3);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(originX, originY - 22);
      ctx.lineTo(originX - 18, originY + 14);
      ctx.lineTo(originX + 18, originY + 14);
      ctx.closePath();
      ctx.fill();

      const unfocusedWidth = sample.envelopeAt600.unfocused;
      const focusedWidth = sample.envelopeAt600.focused;
      ctx.fillStyle = '#ffb7ed';
      ctx.font = '800 17px Rajdhani, Arial';
      ctx.fillText(`UNFOCUSED  ${unfocusedWidth.toFixed(1)}px envelope`, originX, panelY + panelHeight - 54);
      ctx.fillStyle = '#9cfbff';
      ctx.fillText(`FOCUSED  ${focusedWidth.toFixed(1)}px envelope`, originX, panelY + panelHeight - 30);
      ctx.fillStyle = '#d7e8ef';
      ctx.font = '700 15px Rajdhani, Arial';
      ctx.fillText(`Shots ${sample.unfocused.projectileCount} → ${sample.focused.projectileCount}  •  cadence ${sample.focused.cadence.toFixed(0)}ms`, originX, panelY + 106);
    });

    ctx.textAlign = 'left';
    ctx.fillStyle = colors.unfocused;
    ctx.fillRect(730, 1032, 34, 5);
    ctx.fillStyle = '#f7fcff';
    ctx.font = '800 17px Rajdhani, Arial';
    ctx.fillText('Unfocused', 775, 1039);
    ctx.fillStyle = colors.focused;
    ctx.fillRect(955, 1032, 34, 5);
    ctx.fillStyle = '#f7fcff';
    ctx.fillText('Focus held', 1000, 1039);
  }, samples);

  const composite = path.join(outputDir, 'focus-lens-spread-comparison.png');
  await page.screenshot({ path: composite });
  const profileScreenshots = {};
  for (let index = 0; index < samples.length; index += 1) {
    const key = samples[index].lane.toLowerCase();
    const file = path.join(outputDir, `focus-lens-${key}.png`);
    await page.screenshot({
      path: file,
      clip: { x: 35 + index * 625, y: 130, width: 590, height: 880 }
    });
    profileScreenshots[key] = file;
  }

  const report = {
    status: 'passed',
    baseUrl,
    composite,
    profileScreenshots,
    samples,
    priorityContract,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(pageErrors.length === 0, `Focus Lens page errors: ${pageErrors.join('; ')}`);
  assert(consoleErrors.length === 0, `Focus Lens console errors: ${consoleErrors.join('; ')}`);
  console.log(`[focus-lens-spread] PASS composite=${composite}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
