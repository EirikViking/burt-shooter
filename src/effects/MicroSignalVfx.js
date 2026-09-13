import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';

function getStore(host) {
  if (!host || host.destroyed) return null;
  if (!host.__novaMicroSignalSprites) host.__novaMicroSignalSprites = new Map();
  return host.__novaMicroSignalSprites;
}

function getMount(host) {
  if (!host || host.destroyed) return null;
  if (!(host instanceof PIXI.Graphics)) return host;

  const parent = host.parent;
  if (!parent || parent.destroyed) return null;
  let mount = host.__novaMicroSignalMount;
  if (mount?.destroyed || (mount && mount.parent !== parent)) {
    mount?.destroy?.({ children: true });
    mount = null;
  }
  if (!mount) {
    mount = new PIXI.Container();
    mount.label = `${host.label || 'graphics'}:microSignals`;
    mount.eventMode = 'none';
    parent.addChild(mount);
    host.__novaMicroSignalMount = mount;
  }

  mount.position.copyFrom(host.position);
  mount.pivot.copyFrom(host.pivot);
  mount.scale.copyFrom(host.scale);
  mount.skew.copyFrom(host.skew);
  mount.rotation = host.rotation;
  mount.alpha = host.alpha;
  mount.visible = host.visible;
  mount.renderable = host.renderable;
  mount.zIndex = (Number(host.zIndex) || 0) + 0.01;
  return mount;
}

export function ensureMicroSignalSprite(host, key, textureKey = 'direction') {
  const store = getStore(host);
  const mount = getMount(host);
  if (!store || !mount) return null;
  const id = String(key || textureKey);
  let sprite = store.get(id);
  if (sprite?.destroyed || (sprite && sprite.parent !== mount)) {
    store.delete(id);
    sprite = null;
  }
  const texture = GameAssets.getMicroSignalTexture(textureKey);
  if (!GameAssets.isValidTexture(texture)) {
    if (sprite) sprite.visible = false;
    return null;
  }
  if (!sprite) {
    sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.label = `microSignal:${id}`;
    sprite.eventMode = 'none';
    sprite.blendMode = 'add';
    mount.addChild(sprite);
    store.set(id, sprite);
  } else if (sprite.texture !== texture) {
    sprite.texture = texture;
  }
  return sprite;
}

export function presentDirectionalSignal(host, key, {
  x,
  y,
  directionX,
  directionY,
  color = 0xffffff,
  size = 34,
  alpha = 1,
  pulse = 0
} = {}) {
  const sprite = ensureMicroSignalSprite(host, key, 'direction');
  if (!sprite) return null;
  const dx = Number(directionX) || 0;
  const dy = Number(directionY) || -1;
  sprite.position.set(Number(x) || 0, Number(y) || 0);
  sprite.rotation = Math.atan2(dy, dx) + Math.PI / 2;
  sprite.tint = color;
  sprite.alpha = Math.max(0, Math.min(1, alpha));
  const displaySize = Math.max(8, Number(size) || 34) * (0.94 + Math.max(0, Number(pulse) || 0) * 0.12);
  sprite.width = displaySize;
  sprite.height = displaySize;
  sprite.visible = true;
  return sprite;
}

export function presentPhaseSignal(host, key, {
  x,
  y,
  color = 0xffffff,
  size = 16,
  alpha = 1,
  current = false,
  pulse = 0
} = {}) {
  const sprite = ensureMicroSignalSprite(host, key, 'phase');
  if (!sprite) return null;
  sprite.position.set(Number(x) || 0, Number(y) || 0);
  sprite.rotation = current ? Math.sin(Date.now() * 0.003) * 0.04 : 0;
  sprite.tint = color;
  sprite.alpha = Math.max(0, Math.min(1, alpha));
  const displaySize = Math.max(8, Number(size) || 16) * (current ? 1.08 + Math.max(0, Number(pulse) || 0) * 0.12 : 1);
  sprite.width = displaySize;
  sprite.height = displaySize;
  sprite.visible = true;
  return sprite;
}

export function presentAuthoredSignal(host, key, {
  textureKey = 'contact',
  x = 0,
  y = 0,
  width,
  height,
  size = 24,
  color = 0xffffff,
  alpha = 1,
  rotation = 0,
  pulse = 0,
  blendMode = 'add'
} = {}) {
  const sprite = ensureMicroSignalSprite(host, key, textureKey);
  if (!sprite) return null;
  const pulseScale = 1 + Math.max(0, Number(pulse) || 0) * 0.08;
  const baseWidth = Math.max(8, Number(width) || Number(size) || 24);
  const baseHeight = Math.max(8, Number(height) || Number(size) || 24);
  sprite.position.set(Number(x) || 0, Number(y) || 0);
  sprite.rotation = Number(rotation) || 0;
  sprite.tint = color;
  sprite.alpha = Math.max(0, Math.min(1, alpha));
  sprite.width = baseWidth * pulseScale;
  sprite.height = baseHeight * pulseScale;
  sprite.blendMode = blendMode;
  sprite.visible = true;
  return sprite;
}

export function hideMicroSignals(host, prefix = '') {
  const store = host?.__novaMicroSignalSprites;
  if (!store) return;
  const mount = host.__novaMicroSignalMount || host;
  for (const [key, sprite] of store.entries()) {
    if (sprite?.destroyed || sprite?.parent !== mount) {
      store.delete(key);
    } else if (!prefix || key.startsWith(prefix)) {
      sprite.visible = false;
    }
  }
  if (mount !== host) {
    mount.visible = host.visible !== false && [...store.values()].some((sprite) => (
      !sprite?.destroyed && sprite.parent === mount && sprite.visible
    ));
  }
}

export function destroyMicroSignals(host) {
  const store = host?.__novaMicroSignalSprites;
  if (store) {
    for (const sprite of store.values()) {
      sprite?.destroy?.();
    }
    store.clear();
    delete host.__novaMicroSignalSprites;
  }
  const mount = host?.__novaMicroSignalMount;
  if (mount && !mount.destroyed) mount.destroy({ children: true });
  if (host) delete host.__novaMicroSignalMount;
}
