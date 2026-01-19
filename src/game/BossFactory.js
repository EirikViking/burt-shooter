/**
 * BossFactory - Creates varied boss visuals for each level
 * Cycles through: Big Beer Can, Icon-192, Boss Sprites, and Big Player Ships
 */

import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { AssetManifest } from '../assets/assetManifest.js';

const BOSS_TYPES = {
  BIG_BEER_CAN: 0,
  ICON_192: 1,
  BOSS_SPRITE: 2,
  BIG_PLAYER_SHIP: 3 // Will cycle through available ship variants
};

const BOSS_SPRITES = AssetManifest.sprites.bosses || [];
const LEVEL_BOSS_SPRITES = {
  1: '/sprites/boss/boss_battleship_no_bg2.png',
  2: '/sprites/boss/boss_turret_no_bg2.png',
  3: '/sprites/boss/boss_crystal_no_bg2.png'
};

/**
 * Selects boss type for a given level deterministically
 */
function selectBossType(level) {
  if (level === 4) {
    return { type: BOSS_TYPES.BIG_BEER_CAN };
  }
  if (level <= 3) {
    return { type: BOSS_TYPES.BOSS_SPRITE };
  }
  const cycle = (level - 1) % 15; // 15-level cycle

  if (cycle === 0) return { type: BOSS_TYPES.BIG_BEER_CAN };
  if (cycle === 1) return { type: BOSS_TYPES.BOSS_SPRITE };
  if (cycle === 2) return { type: BOSS_TYPES.ICON_192 };

  // Cycles 3-14: Player ships (12 variants)
  const shipIndex = cycle - 3;
  const shipTypes = ['ship1', 'ship2', 'ship3'];
  const shipColors = ['blue', 'green', 'orange', 'red'];
  const shipNum = shipTypes[Math.floor(shipIndex / 4)];
  const shipColor = shipColors[shipIndex % 4];

  return {
    type: BOSS_TYPES.BIG_PLAYER_SHIP,
    shipNum,
    shipColor
  };
}

// Ticker tracking for leak detection
let activeTickers = 0;

export function getActiveTickerCount() {
  return activeTickers;
}

function createBossTicker(fn) {
  const ticker = new PIXI.Ticker();
  ticker.add(fn);
  ticker.start();
  activeTickers++;
  console.log(`[BossTicker] create activeTickers=${activeTickers}`);
  return ticker;
}

function safeDestroyTicker(ticker) {
  if (ticker) {
    ticker.stop();
    ticker.destroy();
    activeTickers--;
    console.log(`[BossTicker] destroy activeTickers=${activeTickers}`);
  }
}

/**
 * Creates fallback boss visual (always visible)
 */
function createFallbackBoss() {
  const container = new PIXI.Container();

  const gfx = new PIXI.Graphics();
  // Big rectangle with thick outline
  gfx.rect(-60, -60, 120, 120);
  gfx.fill({ color: 0xff00ff });
  gfx.rect(-60, -60, 120, 120);
  gfx.stroke({ color: 0xffffff, width: 4 });

  // "BOSS" text
  const text = new PIXI.Text('BOSS', {
    fontFamily: 'Courier New',
    fontSize: 24,
    fill: '#ffffff',
    fontWeight: 'bold'
  });
  text.anchor.set(0.5);

  container.addChild(gfx);
  container.addChild(text);

  // Pulsing animation
  let pulseTime = 0;
  const ticker = createBossTicker(() => {
    pulseTime += 0.05;
    const scale = 1 + Math.sin(pulseTime) * 0.1;
    gfx.scale.set(scale);
  });

  return { container, hitboxRef: gfx, ticker }; // Return hitbox reference
}

/**
 * Creates big beer can boss visual
 */
async function createBigBeerCanBoss() {
  const container = new PIXI.Container();

  try {
    const beerTexture = GameAssets.getBeerTexture();

    if (!beerTexture || beerTexture.width === 0) {
      console.warn('[BossFactory] Beer texture not loaded, using fallback');
      return createFallbackBoss();
    }

    // Main beer can sprite (scaled to 30% of previous size)
    const beerSprite = new PIXI.Sprite(beerTexture);
    beerSprite.anchor.set(0.5);
    beerSprite.scale.set(1.05); // Reduced from 3.5 (30% of original)

    // Glowing aura ring (scaled proportionally)
    const aura = new PIXI.Graphics();
    aura.circle(0, 0, 24); // Reduced from 80 to match new scale
    aura.stroke({ color: 0x00ff00, width: 2, alpha: 0.6 });

    container.addChild(aura);
    container.addChild(beerSprite);

    // Pulse animation
    let pulseTime = 0;
    const ticker = createBossTicker(() => {
      pulseTime += 0.05;
      const pulse = 1 + Math.sin(pulseTime) * 0.08;
      beerSprite.scale.set(1.05 * pulse); // Updated to new base scale
      aura.scale.set(pulse);
    });

    return { container, hitboxRef: beerSprite, ticker }; // Return hitbox reference
  } catch (e) {
    console.error('[BossFactory] Failed to create beer can boss:', e);
    return createFallbackBoss();
  }
}

/**
 * Creates icon-192 boss visual
 */
async function createIcon192Boss() {
  const container = new PIXI.Container();

  try {
    const texture = await PIXI.Assets.load({
      alias: 'boss_icon_192',
      src: '/icons/icon-192.png'
    });

    // TASK 2: Better texture validation
    const textureValid = texture && texture.width > 0 && texture.height > 0;

    if (!textureValid) {
      console.warn(`[BossFactory] Icon-192 texture invalid: exists=${!!texture} w=${texture?.width || 0} h=${texture?.height || 0}`);
      return createFallbackBoss();
    }

    // Glow ring behind
    const glow = new PIXI.Graphics();
    glow.circle(0, 0, 70);
    glow.fill({ color: 0xffaa00, alpha: 0.3 });

    const iconSprite = new PIXI.Sprite(texture);
    iconSprite.anchor.set(0.5);
    iconSprite.scale.set(0.8);

    container.addChild(glow);
    container.addChild(iconSprite);

    // Rotation animation
    const ticker = createBossTicker((delta) => {
      iconSprite.rotation += 0.01 * delta;
    });

    console.log(`[BossFactory] Icon-192 created successfully w=${texture.width} h=${texture.height}`);
    return { container, hitboxRef: iconSprite, ticker }; // Return hitbox reference
  } catch (e) {
    console.error('[BossFactory] Failed to create icon-192 boss:', e);
    return createFallbackBoss();
  }
}

function getBossSpriteForLevel(level) {
  if (LEVEL_BOSS_SPRITES[level]) return LEVEL_BOSS_SPRITES[level];
  if (!BOSS_SPRITES.length) return null;
  const idx = (level - 1) % BOSS_SPRITES.length;
  return BOSS_SPRITES[idx];
}

function computeBossSpriteScale(textureWidth, baseScale, maxWidth) {
  if (!textureWidth || !maxWidth) return baseScale;
  const capScale = maxWidth / textureWidth;
  return Math.min(baseScale, capScale);
}

async function createBossSpriteVisual(level, maxWidth) {
  const container = new PIXI.Container();
  const tried = [];

  const primary = getBossSpriteForLevel(level);
  const candidates = primary ? [primary, ...BOSS_SPRITES.filter(p => p !== primary)] : [...BOSS_SPRITES];

  for (const url of candidates) {
    tried.push(url);
    try {
      const texture = await PIXI.Assets.load({
        alias: `boss_sprite_${url.split('/').pop()}`,
        src: url
      });

      const textureValid = texture && texture.width > 0 && texture.height > 0;
      if (!textureValid) {
        console.warn(`[BossFactory] Boss sprite invalid: url=${url} exists=${!!texture} w=${texture?.width || 0} h=${texture?.height || 0}`);
        continue;
      }

      const bossSprite = new PIXI.Sprite(texture);
      bossSprite.anchor.set(0.5);
      const scale = computeBossSpriteScale(texture.width, 1.5, maxWidth);
      bossSprite.scale.set(scale);

      container.addChild(bossSprite);

      // Hover animation
      let hoverTime = 0;
      const ticker = createBossTicker(() => {
        hoverTime += 0.05;
        bossSprite.y = Math.sin(hoverTime) * 5;
        bossSprite.rotation += 0.002;
      });

      if (level === 3) {
        console.log(`[BossSelect] level=3 url=${url}`);
      }
      console.log(`[BossFactory] Boss sprite created url=${url} w=${texture.width} h=${texture.height} scale=${scale.toFixed(2)}`);
      return { container, hitboxRef: bossSprite, url, ticker };
    } catch (e) {
      console.warn(`[BossFactory] Boss sprite load failed url=${url}:`, e);
    }
  }

  console.error('[BossSprite] FATAL no boss sprites could be loaded', { level, tried });
  throw new Error('Boss sprite load failed');
}

/**
 * Creates big player ship boss visual
 */
async function createBigPlayerShipBoss(shipNum, shipColor) {
  const container = new PIXI.Container();

  try {
    const shipTexture = GameAssets.getXtraShip(shipNum.replace('ship', ''), shipColor);

    if (!shipTexture || shipTexture.width === 0) {
      console.warn(`[BossFactory] Ship ${shipNum} ${shipColor} not loaded, using fallback`);
      return createFallbackBoss();
    }

    // Hexagon frame behind ship
    const frame = new PIXI.Graphics();
    frame.poly([
      -50, -30,
      -30, -50,
      30, -50,
      50, -30,
      50, 30,
      30, 50,
      -30, 50,
      -50, 30
    ]);
    frame.fill({ color: 0x333333, alpha: 0.7 });
    frame.poly([
      -50, -30,
      -30, -50,
      30, -50,
      50, -30,
      50, 30,
      30, 50,
      -30, 50,
      -50, 30
    ]);
    frame.stroke({ color: 0x00ffff, width: 3 });

    const shipSprite = new PIXI.Sprite(shipTexture);
    shipSprite.anchor.set(0.5);
    shipSprite.scale.set(2.5); // Scale up player ship

    container.addChild(frame);
    container.addChild(shipSprite);

    // Pulse animation
    let pulseTime = 0;
    const ticker = createBossTicker(() => {
      pulseTime += 0.05;
      const pulse = 1 + Math.sin(pulseTime) * 0.05;
      shipSprite.scale.set(2.5 * pulse);
    });

    return { container, hitboxRef: shipSprite, ticker }; // Return hitbox reference
  } catch (e) {
    console.error('[BossFactory] Failed to create player ship boss:', e);
    return createFallbackBoss();
  }
}

/**
 * Main factory function - creates boss visual for a given level
 * @returns {Promise<{container: PIXI.Container, hitboxRef: PIXI.DisplayObject, textureOk: boolean, kind: string, cleanup: Function}>}
 */
export async function createBossVisual(level, maxWidth) {
  const selection = selectBossType(level);
  let result;
  let kind;
  let url = '';

  switch (selection.type) {
    case BOSS_TYPES.BIG_BEER_CAN:
      result = await createBigBeerCanBoss();
      kind = 'BIG_BEER_CAN';
      url = 'beer_texture';
      break;

    case BOSS_TYPES.ICON_192:
      result = await createIcon192Boss();
      kind = 'ICON_192';
      url = '/icons/icon-192.png';
      break;

    case BOSS_TYPES.BOSS_SPRITE:
      result = await createBossSpriteVisual(level, maxWidth);
      kind = 'BOSS_SPRITE';
      url = result.url || 'boss_sprite';
      break;

    case BOSS_TYPES.BIG_PLAYER_SHIP:
      result = await createBigPlayerShipBoss(selection.shipNum, selection.shipColor);
      kind = `BIG_SHIP_${selection.shipNum}_${selection.shipColor}`;
      url = `xtra_ship_${selection.shipNum}_${selection.shipColor}`;
      break;

    default:
      result = createFallbackBoss();
      kind = 'FALLBACK';
      url = 'none';
  }

  const textureOk = result.container.children.length > 0;
  const usedFallback = kind === 'FALLBACK' || !textureOk;

  // PART A: Comprehensive logging with URL and fallback status
  const bounds = result.hitboxRef ? result.hitboxRef.getBounds() : { width: 0, height: 0 };
  console.log(`[BossVisual] level=${level} type=${kind} url=${url} textureOk=${textureOk} w=${Math.round(bounds.width)} h=${Math.round(bounds.height)} usedFallback=${usedFallback}`);

  return {
    container: result.container,
    hitboxRef: result.hitboxRef,
    textureOk,
    kind,
    cleanup: () => safeDestroyTicker(result.ticker)
  };
}
