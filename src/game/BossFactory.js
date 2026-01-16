/**
 * BossFactory - Creates varied boss visuals for each level
 * Cycles through: Big Beer Can, Icon-192, Boss_01, and Big Player Ships
 */

import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';

const BOSS_TYPES = {
  BIG_BEER_CAN: 0,
  ICON_192: 1,
  BOSS_01: 2,
  BIG_PLAYER_SHIP: 3  // Will cycle through available ship variants
};

/**
 * Selects boss type for a given level deterministically
 */
function selectBossType(level) {
  const cycle = (level - 1) % 15; // 15-level cycle

  if (cycle === 0) return { type: BOSS_TYPES.BIG_BEER_CAN };
  // PART A: Changed level 2 from ICON_192 to BOSS_01 for reliable sprite loading
  if (cycle === 1) return { type: BOSS_TYPES.BOSS_01 };
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
  const ticker = new PIXI.Ticker();
  ticker.add(() => {
    pulseTime += 0.05;
    const scale = 1 + Math.sin(pulseTime) * 0.1;
    gfx.scale.set(scale);
  });
  ticker.start();

  return { container, hitboxRef: gfx }; // Return hitbox reference
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
    const ticker = new PIXI.Ticker();
    ticker.add(() => {
      pulseTime += 0.05;
      const pulse = 1 + Math.sin(pulseTime) * 0.08;
      beerSprite.scale.set(1.05 * pulse); // Updated to new base scale
      aura.scale.set(pulse);
    });
    ticker.start();

    return { container, hitboxRef: beerSprite }; // Return hitbox reference
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
    const ticker = new PIXI.Ticker();
    ticker.add((delta) => {
      iconSprite.rotation += 0.01 * delta;
    });
    ticker.start();

    console.log(`[BossFactory] Icon-192 created successfully w=${texture.width} h=${texture.height}`);
    return { container, hitboxRef: iconSprite }; // Return hitbox reference
  } catch (e) {
    console.error('[BossFactory] Failed to create icon-192 boss:', e);
    return createFallbackBoss();
  }
}

/**
 * Creates boss_01 sprite boss visual
 */
async function createBoss01Visual() {
  const container = new PIXI.Container();
  const url = '/sprites/boss/boss_01.png';

  try {
    const texture = await PIXI.Assets.load({
      alias: 'boss_sprite_01',
      src: url
    });

    // PART A: Better texture validation
    const textureValid = texture && texture.width > 0 && texture.height > 0;

    if (!textureValid) {
      console.warn(`[BossFactory] Boss_01 texture invalid: url=${url} exists=${!!texture} w=${texture?.width || 0} h=${texture?.height || 0}`);
      return createFallbackBoss();
    }

    const bossSprite = new PIXI.Sprite(texture);
    bossSprite.anchor.set(0.5);
    bossSprite.scale.set(1.5);

    container.addChild(bossSprite);

    // Hover animation
    let hoverTime = 0;
    const ticker = new PIXI.Ticker();
    ticker.add(() => {
      hoverTime += 0.05;
      bossSprite.y = Math.sin(hoverTime) * 5;
      bossSprite.rotation += 0.002;
    });
    ticker.start();

    console.log(`[BossFactory] Boss_01 created successfully url=${url} w=${texture.width} h=${texture.height}`);
    return { container, hitboxRef: bossSprite }; // Return hitbox reference
  } catch (e) {
    console.error(`[BossFactory] Failed to create boss_01 visual from ${url}:`, e);
    return createFallbackBoss();
  }
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
    const ticker = new PIXI.Ticker();
    ticker.add(() => {
      pulseTime += 0.05;
      const pulse = 1 + Math.sin(pulseTime) * 0.05;
      shipSprite.scale.set(2.5 * pulse);
    });
    ticker.start();

    return { container, hitboxRef: shipSprite }; // Return hitbox reference
  } catch (e) {
    console.error('[BossFactory] Failed to create player ship boss:', e);
    return createFallbackBoss();
  }
}

/**
 * Main factory function - creates boss visual for a given level
 * @returns {Promise<{container: PIXI.Container, hitboxRef: PIXI.DisplayObject, textureOk: boolean, kind: string}>}
 */
export async function createBossVisual(level) {
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

    case BOSS_TYPES.BOSS_01:
      result = await createBoss01Visual();
      kind = 'BOSS_01';
      url = '/sprites/boss/boss_01.png';
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
    kind
  };
}
