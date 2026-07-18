import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';

const DEFAULT_ACCENT = 0x37f5ff;
const DEFAULT_SECONDARY = 0xff55d9;
const DEFAULT_GOLD = 0xffd15c;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function seededUnit(seed) {
  const x = Math.sin(seed * 9301.91 + 49297.23) * 233280.17;
  return x - Math.floor(x);
}

function drawCorner(graphics, x, y, width, height, color, alpha = 0.72) {
  const size = Math.min(78, Math.max(32, Math.min(width, height) * 0.07));
  const gap = Math.max(8, size * 0.22);
  const points = [
    [x + gap, y, x, y, x, y + gap],
    [x + width - gap, y, x + width, y, x + width, y + gap],
    [x + width, y + height - gap, x + width, y + height, x + width - gap, y + height],
    [x + gap, y + height, x, y + height, x, y + height - gap]
  ];
  for (const [x1, y1, x2, y2, x3, y3] of points) {
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.lineTo(x3, y3);
  }
  graphics.stroke({ color, width: 2, alpha });
}

export class MenuFxLayer {
  constructor({
    game,
    label = 'ui_menuFxLayer',
    zIndex = 0,
    accent = DEFAULT_ACCENT,
    secondary = DEFAULT_SECONDARY,
    gold = DEFAULT_GOLD,
    intensity = 1,
    alpha = 1,
    density = 1
  } = {}) {
    this.game = game;
    this.accent = accent;
    this.secondary = secondary;
    this.gold = gold;
    this.intensity = clamp(Number(intensity) || 1, 0.15, 1.8);
    this.density = clamp(Number(density) || 1, 0.25, 1.5);
    this.time = 0;
    this.width = 0;
    this.height = 0;
    this.sweeps = [];
    this.darts = [];
    this.rings = [];
    this.pulses = [];
    this.container = new PIXI.Container();
    this.container.label = label;
    this.container.zIndex = zIndex;
    this.container.alpha = alpha;
    this.container.eventMode = 'none';
    this.container.interactiveChildren = false;
    this.container.sortableChildren = true;
  }

  resize(width = this.game?.getWidth?.() || this.game?.app?.screen?.width || 1280, height = this.game?.getHeight?.() || this.game?.app?.screen?.height || 720) {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    if (nextWidth === this.width && nextHeight === this.height && this.container.children.length) return;
    this.width = nextWidth;
    this.height = nextHeight;
    this.build();
  }

  build() {
    const oldChildren = this.container.removeChildren();
    oldChildren.forEach((child) => child?.destroy?.({ children: true }));
    this.sweeps = [];
    this.darts = [];
    this.rings = [];
    this.pulses = [];
    const width = this.width;
    const height = this.height;
    const minSide = Math.min(width, height);

    const grid = new PIXI.Graphics();
    grid.label = 'ui_menuFxGrid';
    grid.zIndex = -4;
    const step = Math.max(54, Math.round(minSide * 0.075));
    for (let x = -step; x < width + step * 2; x += step) {
      grid.moveTo(x, 0);
      grid.lineTo(x + height * 0.16, height);
    }
    for (let y = 0; y < height + step; y += step) {
      grid.moveTo(0, y);
      grid.lineTo(width, y + width * 0.028);
    }
    grid.stroke({ color: 0x1b5c73, width: 1, alpha: 0.09 * this.intensity });
    this.container.addChild(grid);

    const rails = new PIXI.Graphics();
    rails.label = 'ui_menuFxRails';
    rails.zIndex = -3;
    const marginX = Math.max(24, width * 0.025);
    const marginY = Math.max(20, height * 0.035);
    rails.roundRect(marginX, marginY, width - marginX * 2, height - marginY * 2, 10);
    rails.stroke({ color: this.accent, width: 1.5, alpha: 0.18 * this.intensity });
    rails.roundRect(marginX + 10, marginY + 10, width - marginX * 2 - 20, height - marginY * 2 - 20, 8);
    rails.stroke({ color: this.secondary, width: 1, alpha: 0.1 * this.intensity });
    rails.rect(marginX + 24, marginY + 14, Math.max(120, width * 0.18), 2);
    rails.fill({ color: this.gold, alpha: 0.28 * this.intensity });
    rails.rect(width - marginX - Math.max(150, width * 0.22), height - marginY - 18, Math.max(130, width * 0.18), 2);
    rails.fill({ color: this.accent, alpha: 0.22 * this.intensity });
    drawCorner(rails, marginX, marginY, width - marginX * 2, height - marginY * 2, this.accent, 0.55 * this.intensity);
    this.container.addChild(rails);

    const ringSpecs = [
      { x: width * 0.17, y: height * 0.22, r: minSide * 0.13, color: this.accent, speed: 0.16, phase: 0 },
      { x: width * 0.86, y: height * 0.2, r: minSide * 0.11, color: this.secondary, speed: -0.12, phase: 1.6 },
      { x: width * 0.72, y: height * 0.78, r: minSide * 0.16, color: this.gold, speed: 0.09, phase: 2.7 }
    ];
    ringSpecs.forEach((spec, index) => {
      const ring = new PIXI.Container();
      ring.label = `ui_menuFxRing_${index}`;
      ring.zIndex = -2;
      ring.position.set(spec.x, spec.y);
      ring.alpha = 0.24 * this.intensity;
      const g = new PIXI.Graphics();
      for (let i = 0; i < 4; i += 1) {
        g.circle(0, 0, spec.r * (0.42 + i * 0.21));
        g.stroke({ color: i % 2 ? spec.color : this.accent, width: i === 0 ? 2 : 1, alpha: 0.22 - i * 0.035 });
      }
      for (let i = 0; i < 14; i += 1) {
        const a = (Math.PI * 2 * i) / 14;
        g.moveTo(Math.cos(a) * spec.r * 0.18, Math.sin(a) * spec.r * 0.18);
        g.lineTo(Math.cos(a) * spec.r * 0.9, Math.sin(a) * spec.r * 0.9);
      }
      g.stroke({ color: spec.color, width: 1, alpha: 0.08 });
      ring.addChild(g);
      this.container.addChild(ring);
      this.rings.push({ node: ring, ...spec });
    });

    const sweepCount = Math.round(4 * this.density);
    for (let i = 0; i < sweepCount; i += 1) {
      const sweep = new PIXI.Graphics();
      sweep.label = `ui_menuFxSweep_${i}`;
      sweep.zIndex = 3;
      const sweepWidth = width * (0.16 + seededUnit(i + 4) * 0.22);
      const color = i % 2 ? this.secondary : this.accent;
      sweep.rect(-sweepWidth / 2, -2, sweepWidth, 4);
      sweep.fill({ color, alpha: 0.16 * this.intensity });
      sweep.rect(-sweepWidth / 2, 3, sweepWidth * 0.72, 1);
      sweep.fill({ color: 0xffffff, alpha: 0.16 * this.intensity });
      sweep.x = width * seededUnit(i + 19);
      sweep.y = height * seededUnit(i + 37);
      sweep.rotation = -0.08 + seededUnit(i + 73) * 0.16;
      this.container.addChild(sweep);
      this.sweeps.push({
        node: sweep,
        speed: 42 + seededUnit(i + 91) * 70,
        offset: seededUnit(i + 111) * height,
        span: height + 90,
        sideDrift: -18 + seededUnit(i + 130) * 36
      });
    }

    const dartCount = Math.round(22 * this.density);
    for (let i = 0; i < dartCount; i += 1) {
      const dart = new PIXI.Graphics();
      dart.label = `ui_menuFxDart_${i}`;
      dart.zIndex = 2;
      const color = i % 3 === 0 ? this.gold : (i % 2 ? this.secondary : this.accent);
      const len = 16 + seededUnit(i + 211) * 34;
      dart.moveTo(-len * 0.5, 0);
      dart.lineTo(len * 0.5, 0);
      dart.stroke({ color, width: 1.5, alpha: 0.32 * this.intensity });
      dart.circle(len * 0.5, 0, 1.7);
      dart.fill({ color: 0xffffff, alpha: 0.5 * this.intensity });
      dart.x = width * seededUnit(i + 307);
      dart.y = height * seededUnit(i + 401);
      dart.rotation = -0.18 + seededUnit(i + 503) * 0.36;
      this.container.addChild(dart);
      this.darts.push({
        node: dart,
        baseX: dart.x,
        baseY: dart.y,
        phase: seededUnit(i + 601) * Math.PI * 2,
        speed: 0.45 + seededUnit(i + 701) * 0.85,
        drift: 16 + seededUnit(i + 809) * 30
      });
    }

    this.pulseLayer = new PIXI.Container();
    this.pulseLayer.label = 'ui_menuFxPulseLayer';
    this.pulseLayer.zIndex = 9;
    this.container.addChild(this.pulseLayer);
  }

  burst(x = this.width * 0.5, y = this.height * 0.5, {
    color = this.gold,
    radius = 96,
    durationMs = 520
  } = {}) {
    if (!this.pulseLayer) return null;
    const pulse = new PIXI.Graphics();
    pulse.label = 'ui_menuFxBurst';
    pulse.position.set(x, y);
    this.pulseLayer.addChild(pulse);
    const entry = {
      node: pulse,
      ageMs: 0,
      durationMs: Math.max(120, durationMs),
      radius: Math.max(24, radius),
      color
    };
    this.pulses.push(entry);
    return entry;
  }

  update(delta = 1) {
    const dt = clamp(Number(delta) || 1, 0.1, 4);
    this.time += dt * 0.016;
    const width = this.width || 1;
    const height = this.height || 1;
    const time = this.time;

    this.sweeps.forEach((entry, index) => {
      const y = (entry.offset + time * entry.speed) % entry.span;
      entry.node.y = y - 45;
      entry.node.x += Math.sin(time * 0.7 + index) * 0.02 * entry.sideDrift * dt;
      if (entry.node.x < -100) entry.node.x = width + 80;
      if (entry.node.x > width + 100) entry.node.x = -80;
      entry.node.alpha = 0.48 + Math.sin(time * 2.6 + index) * 0.18;
    });

    this.darts.forEach((entry) => {
      const phase = time * entry.speed + entry.phase;
      entry.node.x = entry.baseX + Math.cos(phase) * entry.drift;
      entry.node.y = entry.baseY + Math.sin(phase * 0.82) * entry.drift * 0.45;
      entry.node.alpha = 0.52 + Math.sin(phase * 2.1) * 0.22;
    });

    this.rings.forEach((entry) => {
      entry.node.rotation += entry.speed * dt * 0.016;
      const pulse = 1 + Math.sin(time * 1.7 + entry.phase) * 0.025;
      entry.node.scale.set(pulse);
      entry.node.alpha = 0.18 + (0.08 + Math.sin(time * 2 + entry.phase) * 0.035) * this.intensity;
    });

    this.pulses = this.pulses.filter((entry) => {
      if (!entry.node?.parent) return false;
      entry.ageMs += dt * 16.67;
      const t = clamp(entry.ageMs / entry.durationMs, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const radius = entry.radius * (0.24 + eased);
      entry.node.clear();
      entry.node.circle(0, 0, radius);
      entry.node.stroke({ color: entry.color, width: 3, alpha: (1 - t) * 0.62 });
      entry.node.circle(0, 0, radius * 0.62);
      entry.node.stroke({ color: this.accent, width: 1.5, alpha: (1 - t) * 0.36 });
      entry.node.alpha = 1 - t;
      if (t >= 1) {
        entry.node.destroy();
        return false;
      }
      return true;
    });
  }

  getDebugState() {
    return {
      width: this.width,
      height: this.height,
      sweeps: this.sweeps.length,
      darts: this.darts.length,
      rings: this.rings.length,
      pulses: this.pulses.length,
      alpha: this.container.alpha
    };
  }

  destroy() {
    this.pulses.forEach((entry) => entry.node?.destroy?.());
    this.pulses = [];
    this.container.destroy({ children: true });
  }
}

export function installMenuFx(scene, options = {}) {
  if (!scene?.container) return null;
  destroyMenuFx(scene);
  const fx = new MenuFxLayer({
    game: scene.game,
    ...options
  });
  scene.menuFx = fx;
  scene.container.addChild(fx.container);
  fx.resize(scene.game?.getWidth?.(), scene.game?.getHeight?.());
  if (scene.container.sortChildren) scene.container.sortChildren();
  if (options.playOpen !== false) playMenuOpenSfx(options.openVolume ?? 0.34);
  return fx;
}

export function updateMenuFx(scene, delta) {
  scene?.menuFx?.update?.(delta);
}

export function resizeMenuFx(scene, width, height) {
  scene?.menuFx?.resize?.(width, height);
}

export function destroyMenuFx(scene) {
  if (!scene?.menuFx) return;
  if (scene.menuFx.container?.parent) {
    scene.menuFx.container.parent.removeChild(scene.menuFx.container);
  }
  scene.menuFx.destroy();
  scene.menuFx = null;
}

export function playMenuOpenSfx(volume = 0.34) {
  AudioManager.playSfx('intro_panel_whoosh', { volume, minIntervalMs: 220 });
  AudioManager.playSfx('computerNoise', { volume: volume * 0.32, minIntervalMs: 260 });
}

export function playMenuFocusSfx(volume = 0.12) {
  void volume;
}

export function playMenuConfirmSfx(volume = 0.28) {
  AudioManager.playSfx('ui_open', { volume, minIntervalMs: 80 });
}

export function playMenuBackSfx(volume = 0.22) {
  AudioManager.playSfx('ui_close', { volume, minIntervalMs: 90 });
}
