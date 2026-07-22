import * as PIXI from 'pixi.js';

const DEFAULT_COLOR = 0x43efff;
const DEFAULT_ACCENT = 0xff5df7;
const MAX_ACTIVE_PULSES = 10;

const SPECTACLE_PROFILES = Object.freeze({
  kill: Object.freeze({
    durationMs: 520,
    minIntervalMs: 90,
    rings: 2,
    rays: 7,
    satellites: 3,
    shards: 3,
    radius: 54,
    screenWash: 0.018,
    motion: 0.72
  }),
  elite: Object.freeze({
    durationMs: 820,
    minIntervalMs: 130,
    rings: 4,
    rays: 14,
    satellites: 7,
    shards: 9,
    radius: 92,
    screenWash: 0.035,
    motion: 1,
    edgeBloom: true
  }),
  combo: Object.freeze({
    durationMs: 940,
    minIntervalMs: 160,
    rings: 4,
    rays: 18,
    satellites: 9,
    shards: 12,
    radius: 118,
    screenWash: 0.042,
    motion: 1.08,
    horizontalSweep: true
  }),
  pickup: Object.freeze({
    durationMs: 860,
    minIntervalMs: 140,
    rings: 4,
    rays: 12,
    satellites: 8,
    shards: 10,
    radius: 88,
    screenWash: 0.03,
    motion: 0.94,
    horizontalSweep: true
  }),
  wave: Object.freeze({
    durationMs: 1180,
    minIntervalMs: 500,
    rings: 5,
    rays: 22,
    satellites: 10,
    shards: 14,
    radius: 150,
    screenWash: 0.055,
    motion: 1.1,
    horizontalSweep: true,
    edgeBloom: true
  }),
  reinforcement: Object.freeze({
    durationMs: 980,
    minIntervalMs: 260,
    rings: 4,
    rays: 16,
    satellites: 6,
    shards: 12,
    radius: 116,
    screenWash: 0.045,
    motion: 1.16,
    verticalCurtain: true,
    edgeBloom: true
  }),
  boss_phase: Object.freeze({
    durationMs: 1160,
    minIntervalMs: 520,
    rings: 5,
    rays: 24,
    satellites: 12,
    shards: 18,
    radius: 170,
    screenWash: 0.065,
    motion: 1.18,
    horizontalSweep: true,
    edgeBloom: true
  }),
  boss_death: Object.freeze({
    durationMs: 1680,
    minIntervalMs: 1200,
    rings: 7,
    rays: 30,
    satellites: 14,
    shards: 24,
    radius: 230,
    screenWash: 0.085,
    motion: 1.26,
    horizontalSweep: true,
    verticalCurtain: true,
    edgeBloom: true
  }),
  miracle: Object.freeze({
    durationMs: 1560,
    minIntervalMs: 5000,
    rings: 7,
    rays: 32,
    satellites: 16,
    shards: 28,
    radius: 250,
    screenWash: 0.09,
    motion: 1.3,
    horizontalSweep: true,
    verticalCurtain: true,
    edgeBloom: true
  })
});

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function resolveDeltaMs(delta) {
  const deltaMs = Number(delta?.deltaMS);
  if (Number.isFinite(deltaMs) && deltaMs > 0) return Math.min(50, deltaMs);
  const deltaTime = Number(delta?.deltaTime ?? delta);
  return Math.min(50, (Number.isFinite(deltaTime) && deltaTime > 0 ? deltaTime : 1) * 16.67);
}

export class SpectacleDirector {
  constructor({
    container,
    ticker,
    getWidth,
    getHeight,
    getAccessibilitySettings
  } = {}) {
    this.container = container || null;
    this.ticker = ticker || null;
    this.getWidth = typeof getWidth === 'function' ? getWidth : () => 1280;
    this.getHeight = typeof getHeight === 'function' ? getHeight : () => 720;
    this.getAccessibilitySettings = typeof getAccessibilitySettings === 'function'
      ? getAccessibilitySettings
      : () => ({ prefersReducedMotion: false });
    this.pulses = [];
    this.cooldowns = new Map();
    this.sequence = 0;
    this.totalEmitted = 0;
    this.totalDropped = 0;
    this.peakActivePulses = 0;
    this.lastEvent = null;
    this.destroyed = false;

    this.layer = new PIXI.Graphics();
    this.layer.label = 'spectacleDirectorLayer';
    this.layer.eventMode = 'none';
    this.layer.blendMode = 'add';
    this.layer.zIndex = 9400;
    this.layer.visible = false;
    this.container?.addChild?.(this.layer);
    this.container?.sortChildren?.();

    this.boundUpdate = (delta) => this.update(delta);
    this.ticker?.add?.(this.boundUpdate);
  }

  emit({
    kind = 'kill',
    x,
    y,
    color = DEFAULT_COLOR,
    accent = DEFAULT_ACCENT,
    intensity = 1,
    durationMs,
    force = false,
    performanceLite = false,
    seed
  } = {}) {
    if (this.destroyed || !this.layer || !this.ticker) return false;
    const profile = SPECTACLE_PROFILES[kind] || SPECTACLE_PROFILES.kill;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const cooldownUntil = Number(this.cooldowns.get(kind)) || 0;
    if (!force && now < cooldownUntil) {
      this.totalDropped += 1;
      return false;
    }
    this.cooldowns.set(kind, now + profile.minIntervalMs);

    const accessibility = this.getAccessibilitySettings() || {};
    const reducedMotion = Boolean(accessibility.prefersReducedMotion);
    const width = Math.max(1, Number(this.getWidth()) || 1);
    const height = Math.max(1, Number(this.getHeight()) || 1);
    const resolvedIntensity = clamp(intensity, 0.25, 1.65) * (performanceLite ? 0.74 : 1);
    const resolvedDuration = Math.max(
      240,
      (Number(durationMs) || profile.durationMs) * (reducedMotion ? 0.72 : 1)
    );
    const pulse = {
      id: ++this.sequence,
      kind,
      profile,
      x: clamp(x, -width * 0.2, width * 1.2),
      y: clamp(y, -height * 0.2, height * 1.2),
      color: Number.isFinite(color) ? color : DEFAULT_COLOR,
      accent: Number.isFinite(accent) ? accent : DEFAULT_ACCENT,
      intensity: resolvedIntensity,
      durationMs: resolvedDuration,
      elapsedMs: 0,
      reducedMotion,
      performanceLite: Boolean(performanceLite),
      seed: Number.isFinite(seed) ? seed : this.sequence * 0.731
    };

    const activeLimit = reducedMotion ? 5 : MAX_ACTIVE_PULSES;
    if (this.pulses.length >= activeLimit) {
      let removeIndex = 0;
      let removeWeight = Number.POSITIVE_INFINITY;
      for (let index = 0; index < this.pulses.length; index += 1) {
        const candidate = this.pulses[index];
        const remaining = Math.max(0, 1 - candidate.elapsedMs / candidate.durationMs);
        const weight = candidate.intensity * remaining;
        if (weight < removeWeight) {
          removeWeight = weight;
          removeIndex = index;
        }
      }
      this.pulses.splice(removeIndex, 1);
      this.totalDropped += 1;
    }

    this.pulses.push(pulse);
    this.totalEmitted += 1;
    this.peakActivePulses = Math.max(this.peakActivePulses, this.pulses.length);
    this.lastEvent = {
      id: pulse.id,
      kind,
      x: Math.round(pulse.x),
      y: Math.round(pulse.y),
      intensity: Number(pulse.intensity.toFixed(2)),
      reducedMotion,
      performanceLite: pulse.performanceLite,
      startedAt: Date.now(),
      durationMs: Math.round(resolvedDuration)
    };
    return { ...this.lastEvent };
  }

  update(delta) {
    if (this.destroyed || !this.layer) return;
    const deltaMs = resolveDeltaMs(delta);
    for (let index = this.pulses.length - 1; index >= 0; index -= 1) {
      const pulse = this.pulses[index];
      pulse.elapsedMs += deltaMs;
      if (pulse.elapsedMs >= pulse.durationMs) this.pulses.splice(index, 1);
    }

    if (this.pulses.length === 0) {
      if (this.layer.visible) {
        this.layer.clear();
        this.layer.visible = false;
      }
      this.layer._debugSpectacleDirector = this.getDebugState();
      return;
    }

    const width = Math.max(1, Number(this.getWidth()) || 1);
    const height = Math.max(1, Number(this.getHeight()) || 1);
    this.layer.visible = true;
    this.layer.clear();
    for (let index = 0; index < this.pulses.length; index += 1) {
      this.drawPulse(this.pulses[index], width, height);
    }
    this.layer._debugSpectacleDirector = this.getDebugState();
  }

  drawPulse(pulse, width, height) {
    const profile = pulse.profile;
    const t = clamp(pulse.elapsedMs / pulse.durationMs, 0, 1);
    const intro = Math.min(1, t / 0.1);
    const fade = Math.pow(Math.max(0, 1 - t), 0.92);
    const intensity = pulse.intensity;
    const motion = pulse.reducedMotion ? 0.2 : profile.motion;
    const alpha = intro * fade * intensity;
    const growth = 0.28 + intro * 0.38 + Math.pow(t, 0.7) * 0.82;
    const baseRadius = profile.radius * growth * (0.78 + intensity * 0.22);
    const rotation = pulse.seed + t * 0.46 * motion;
    const lite = pulse.performanceLite || pulse.reducedMotion;
    const tendrilCount = lite
      ? Math.max(4, Math.ceil(profile.rays * 0.25))
      : Math.max(6, Math.ceil(profile.rays * 0.45));
    const fragmentCount = lite
      ? Math.max(3, Math.ceil(profile.shards * 0.28))
      : Math.max(5, Math.ceil(profile.shards * 0.5));

    if (profile.screenWash > 0) {
      this.layer.rect(0, 0, width, height);
      this.layer.fill({
        color: pulse.color,
        alpha: profile.screenWash * Math.min(1, alpha) * Math.max(0, 1 - t * 2.2)
      });
    }

    // Irregular plasma tendrils replace the old radar rings and radial spokes.
    // Every path bends on a different axis so the burst reads as turbulent energy,
    // not a geometric emblem.
    for (let index = 0; index < tendrilCount; index += 1) {
      const variation = Math.sin((index + 1) * 17.31 + pulse.seed * 5.17);
      const angle = rotation + (Math.PI * 2 * index) / tendrilCount + variation * 0.34;
      const reach = baseRadius * (0.62 + ((index * 7) % 9) * 0.065);
      const inner = baseRadius * (0.08 + (index % 3) * 0.035);
      const bend = reach * (0.12 + Math.abs(variation) * 0.14) * (index % 2 ? 1 : -1);
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const tx = -ny;
      const ty = nx;
      const sx = pulse.x + nx * inner;
      const sy = pulse.y + ny * inner;
      const ex = pulse.x + nx * reach + tx * bend * 0.42;
      const ey = pulse.y + ny * reach + ty * bend * 0.42;
      this.layer.moveTo(sx, sy);
      this.layer.bezierCurveTo(
        pulse.x + nx * reach * 0.3 + tx * bend,
        pulse.y + ny * reach * 0.3 + ty * bend,
        pulse.x + nx * reach * 0.68 - tx * bend * 0.46,
        pulse.y + ny * reach * 0.68 - ty * bend * 0.46,
        ex,
        ey
      );
      this.layer.stroke({
        color: index % 3 === 0 ? pulse.accent : pulse.color,
        width: Math.max(2.2, (9 - index * 0.18) * (1 - t * 0.42)),
        alpha: 0.075 * alpha
      });
      this.layer.moveTo(sx, sy);
      this.layer.bezierCurveTo(
        pulse.x + nx * reach * 0.3 + tx * bend,
        pulse.y + ny * reach * 0.3 + ty * bend,
        pulse.x + nx * reach * 0.68 - tx * bend * 0.46,
        pulse.y + ny * reach * 0.68 - ty * bend * 0.46,
        ex,
        ey
      );
      this.layer.stroke({
        color: index % 4 === 0 ? 0xffffff : (index % 2 ? pulse.color : pulse.accent),
        width: Math.max(0.8, 2.4 - t * 1.2),
        alpha: 0.3 * alpha
      });
    }

    // Broken, off-axis wavefronts preserve impact scale without concentric circles.
    const wavefrontCount = lite ? 1 : (pulse.kind === 'boss_death' || pulse.kind === 'miracle' ? 3 : 2);
    for (let wave = 0; wave < wavefrontCount; wave += 1) {
      const axis = rotation * (wave % 2 ? -0.36 : 0.22) + wave * 2.08;
      const span = baseRadius * (0.74 + wave * 0.22);
      const nx = Math.cos(axis);
      const ny = Math.sin(axis);
      const tx = -ny;
      const ty = nx;
      const offset = baseRadius * (wave - (wavefrontCount - 1) * 0.5) * 0.13;
      this.layer.moveTo(
        pulse.x - tx * span + nx * offset,
        pulse.y - ty * span + ny * offset
      );
      this.layer.bezierCurveTo(
        pulse.x - tx * span * 0.32 + nx * span * 0.22,
        pulse.y - ty * span * 0.32 + ny * span * 0.22,
        pulse.x + tx * span * 0.36 + nx * span * 0.12,
        pulse.y + ty * span * 0.36 + ny * span * 0.12,
        pulse.x + tx * span + nx * offset * 0.35,
        pulse.y + ty * span + ny * offset * 0.35
      );
      this.layer.stroke({
        color: wave % 2 ? pulse.accent : pulse.color,
        width: Math.max(1, 3.4 - wave * 0.7),
        alpha: (0.22 - wave * 0.035) * alpha
      });
    }

    // Thin, tapered fragments are deliberately uneven and never form diamonds.
    for (let index = 0; index < fragmentCount; index += 1) {
      const angle = -rotation * 0.7 + index * 2.399 + Math.sin(index * 9.7 + pulse.seed) * 0.28;
      const distance = baseRadius * (0.4 + ((index * 5) % 8) * 0.07);
      const length = baseRadius * (0.055 + (index % 4) * 0.012);
      const widthScale = Math.max(0.8, length * 0.13);
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const tx = -ny;
      const ty = nx;
      const cx = pulse.x + nx * distance;
      const cy = pulse.y + ny * distance;
      this.layer.poly([
        cx + nx * length, cy + ny * length,
        cx - nx * length * 0.62 + tx * widthScale, cy - ny * length * 0.62 + ty * widthScale,
        cx - nx * length * 0.3 - tx * widthScale * 0.34, cy - ny * length * 0.3 - ty * widthScale * 0.34
      ]);
      this.layer.fill({
        color: index % 4 === 0 ? 0xffffff : (index % 2 ? pulse.color : pulse.accent),
        alpha: 0.2 * alpha
      });
    }

    if (profile.horizontalSweep) {
      const sweep = width * (0.1 + Math.min(1, t * 1.7) * 0.42);
      const y = clamp(pulse.y, height * 0.12, height * 0.88);
      this.layer.moveTo(Math.max(0, pulse.x - sweep), y - 5);
      this.layer.bezierCurveTo(pulse.x - sweep * 0.3, y + 4, pulse.x + sweep * 0.25, y - 4, Math.min(width, pulse.x + sweep), y + 3);
      this.layer.stroke({ color: pulse.accent, width: 1.5, alpha: 0.12 * alpha });
    }

    if (profile.edgeBloom) {
      const edgeAlpha = 0.1 * alpha * Math.max(0, 1 - t * 0.76);
      const inset = 8 + t * 24;
      const corner = Math.min(width, height) * (0.08 + intensity * 0.018);
      this.layer.moveTo(inset, corner);
      this.layer.lineTo(inset, inset);
      this.layer.lineTo(corner, inset);
      this.layer.moveTo(width - corner, inset);
      this.layer.lineTo(width - inset, inset);
      this.layer.lineTo(width - inset, corner);
      this.layer.moveTo(inset, height - corner);
      this.layer.lineTo(inset, height - inset);
      this.layer.lineTo(corner, height - inset);
      this.layer.moveTo(width - corner, height - inset);
      this.layer.lineTo(width - inset, height - inset);
      this.layer.lineTo(width - inset, height - corner);
      this.layer.stroke({ color: pulse.accent, width: 2.6, alpha: edgeAlpha });
    }

    const core = Math.max(4, baseRadius * (0.08 + (1 - t) * 0.055));
    this.layer.moveTo(pulse.x - core * 1.15, pulse.y + core * 0.08);
    this.layer.bezierCurveTo(
      pulse.x - core * 0.48, pulse.y - core * 0.92,
      pulse.x + core * 0.52, pulse.y - core * 0.66,
      pulse.x + core * 1.08, pulse.y - core * 0.12
    );
    this.layer.bezierCurveTo(
      pulse.x + core * 0.42, pulse.y + core * 0.88,
      pulse.x - core * 0.54, pulse.y + core * 0.7,
      pulse.x - core * 1.15, pulse.y + core * 0.08
    );
    this.layer.fill({ color: 0xffffff, alpha: 0.34 * alpha });
  }

  drawLegacyPulse(pulse, width, height) {
    const profile = pulse.profile;
    const t = clamp(pulse.elapsedMs / pulse.durationMs, 0, 1);
    const intro = Math.min(1, t / 0.13);
    const fade = Math.pow(Math.max(0, 1 - t), 0.82);
    const motionScale = pulse.reducedMotion ? 0.24 : profile.motion;
    const intensity = pulse.intensity;
    const rotation = pulse.seed + t * 1.7 * motionScale;
    const baseRadius = profile.radius * (0.42 + intro * 0.38 + t * 0.76) * (0.78 + intensity * 0.22);
    const ringCount = pulse.performanceLite
      ? Math.max(2, Math.ceil(profile.rings * 0.58))
      : (pulse.reducedMotion ? Math.max(2, Math.ceil(profile.rings * 0.55)) : profile.rings);
    const rayCount = pulse.performanceLite
      ? Math.max(5, Math.ceil(profile.rays * 0.48))
      : (pulse.reducedMotion ? Math.max(6, Math.ceil(profile.rays * 0.42)) : profile.rays);
    const satelliteCount = pulse.performanceLite
      ? Math.max(2, Math.ceil(profile.satellites * 0.45))
      : (pulse.reducedMotion ? Math.max(2, Math.ceil(profile.satellites * 0.4)) : profile.satellites);
    const shardCount = pulse.performanceLite
      ? Math.max(2, Math.ceil(profile.shards * 0.42))
      : (pulse.reducedMotion ? Math.max(2, Math.ceil(profile.shards * 0.35)) : profile.shards);
    const alpha = fade * intro * intensity;

    if (profile.screenWash > 0) {
      this.layer.rect(0, 0, width, height);
      this.layer.fill({
        color: pulse.color,
        alpha: profile.screenWash * Math.min(1, alpha) * Math.max(0, 1 - t * 1.7)
      });
    }

    for (let ring = 0; ring < ringCount; ring += 1) {
      const phase = Math.max(0, Math.min(1, t * 1.36 - ring * 0.09));
      const radius = baseRadius * (0.56 + ring * 0.23 + phase * 0.72);
      const segmentCount = pulse.performanceLite || pulse.reducedMotion
        ? 4
        : (pulse.kind === 'boss_death' || pulse.kind === 'miracle' ? 8 : 6);
      const segmentSpan = Math.PI * 2 / segmentCount;
      for (let segment = 0; segment < segmentCount; segment += 1) {
        const start = rotation * (ring % 2 ? -0.18 : 0.14)
          + ring * 0.13
          + segment * segmentSpan;
        const fillRatio = 0.42 + ((ring + segment) % 3) * 0.1;
        this.layer.arc(pulse.x, pulse.y, radius, start, start + segmentSpan * fillRatio);
      }
      this.layer.stroke({
        color: ring % 2 ? pulse.accent : pulse.color,
        width: Math.max(0.8, (4.4 - ring * 0.48) * (1 - phase * 0.56)),
        alpha: Math.max(0, (0.34 - ring * 0.025) * alpha * (1 - phase * 0.46))
      });
    }

    const segmentedArcCount = pulse.performanceLite || pulse.reducedMotion ? 2 : 4;
    for (let arc = 0; arc < segmentedArcCount; arc += 1) {
      const arcRadius = baseRadius * (0.7 + arc * 0.15);
      const arcStart = -rotation * (0.34 + arc * 0.08) + arc * 1.37;
      const arcLength = Math.PI * (0.24 + (arc % 3) * 0.1);
      this.layer.moveTo(
        pulse.x + Math.cos(arcStart) * arcRadius,
        pulse.y + Math.sin(arcStart) * arcRadius
      );
      this.layer.arc(pulse.x, pulse.y, arcRadius, arcStart, arcStart + arcLength);
    }
    this.layer.stroke({
      color: pulse.accent,
      width: 2.2,
      alpha: 0.2 * alpha
    });

    const rayInner = baseRadius * 0.28;
    const rayTravel = baseRadius * (1.18 + t * 1.15);
    for (let ray = 0; ray < rayCount; ray += 1) {
      const angle = rotation + (Math.PI * 2 * ray) / rayCount;
      const alternate = ray % 3;
      const inner = rayInner * (0.72 + alternate * 0.16);
      const outer = rayTravel * (0.78 + (ray % 5) * 0.075);
      this.layer.moveTo(
        pulse.x + Math.cos(angle) * inner,
        pulse.y + Math.sin(angle) * inner
      );
      this.layer.lineTo(
        pulse.x + Math.cos(angle) * outer,
        pulse.y + Math.sin(angle) * outer
      );
    }
    this.layer.stroke({
      color: pulse.accent,
      width: pulse.kind === 'boss_death' || pulse.kind === 'miracle' ? 2.4 : 1.45,
      alpha: 0.22 * alpha
    });

    const orbitRadius = baseRadius * (0.72 + t * 0.56);
    for (let satellite = 0; satellite < satelliteCount; satellite += 1) {
      const angle = -rotation * 0.82 + (Math.PI * 2 * satellite) / satelliteCount;
      const radius = orbitRadius * (0.78 + (satellite % 3) * 0.1);
      const cx = pulse.x + Math.cos(angle) * radius;
      const cy = pulse.y + Math.sin(angle) * radius;
      const radialX = Math.cos(angle);
      const radialY = Math.sin(angle);
      const tangentX = -radialY;
      const tangentY = radialX;
      const size = (3.4 + (satellite % 2) * 1.8) * (0.74 + intensity * 0.26);
      this.layer.poly([
        cx + radialX * size, cy + radialY * size,
        cx + tangentX * size * 0.62, cy + tangentY * size * 0.62,
        cx - radialX * size, cy - radialY * size,
        cx - tangentX * size * 0.62, cy - tangentY * size * 0.62
      ]);
      this.layer.fill({
        color: satellite % 2 ? pulse.color : 0xffffff,
        alpha: 0.42 * alpha
      });
    }

    const shardOrbit = baseRadius * (0.5 + t * 0.42);
    for (let shard = 0; shard < shardCount; shard += 1) {
      const angle = rotation * -1.18 + (Math.PI * 2 * shard) / shardCount;
      const radialX = Math.cos(angle);
      const radialY = Math.sin(angle);
      const tangentX = -radialY;
      const tangentY = radialX;
      const orbit = shardOrbit * (0.78 + (shard % 4) * 0.1);
      const cx = pulse.x + radialX * orbit;
      const cy = pulse.y + radialY * orbit;
      const length = baseRadius * (0.09 + (shard % 3) * 0.025);
      const halfWidth = Math.max(1.8, length * 0.2);
      this.layer.poly([
        cx + radialX * length, cy + radialY * length,
        cx + tangentX * halfWidth, cy + tangentY * halfWidth,
        cx - radialX * length * 0.42, cy - radialY * length * 0.42,
        cx - tangentX * halfWidth, cy - tangentY * halfWidth
      ]);
      this.layer.fill({
        color: shard % 3 === 0 ? 0xffffff : (shard % 2 ? pulse.color : pulse.accent),
        alpha: 0.13 * alpha
      });
    }

    if (profile.horizontalSweep) {
      const sweepWidth = width * (0.18 + Math.min(1, t * 1.6) * 0.9);
      const bandY = clamp(pulse.y, height * 0.13, height * 0.86);
      const bandHeight = 2.5 + intensity * 2.5;
      this.layer.roundRect(
        pulse.x - sweepWidth * 0.5,
        bandY - bandHeight * 0.5,
        sweepWidth,
        bandHeight,
        bandHeight * 0.5
      );
      this.layer.fill({ color: pulse.accent, alpha: 0.16 * alpha });
      this.layer.moveTo(Math.max(0, pulse.x - sweepWidth * 0.62), bandY - 10);
      this.layer.lineTo(Math.min(width, pulse.x + sweepWidth * 0.62), bandY - 10);
      this.layer.moveTo(Math.max(0, pulse.x - sweepWidth * 0.48), bandY + 11);
      this.layer.lineTo(Math.min(width, pulse.x + sweepWidth * 0.48), bandY + 11);
      this.layer.stroke({ color: 0xffffff, width: 1, alpha: 0.11 * alpha });
    }

    if (profile.verticalCurtain) {
      const travel = height * (0.14 + Math.min(1, t * 1.4) * 0.82);
      const curtainCount = pulse.performanceLite || pulse.reducedMotion ? 3 : 7;
      for (let curtain = 0; curtain < curtainCount; curtain += 1) {
        const lane = curtain - (curtainCount - 1) / 2;
        const offset = lane * (8 + intensity * 4);
        const wobble = Math.sin(rotation * 2 + curtain) * (pulse.reducedMotion ? 1.5 : 7);
        this.layer.moveTo(pulse.x + offset, Math.max(0, pulse.y - baseRadius * 0.52));
        this.layer.lineTo(
          pulse.x + offset + wobble,
          Math.min(height, pulse.y + travel * (0.82 + (curtain % 3) * 0.1))
        );
      }
      this.layer.stroke({ color: pulse.color, width: 1.4 + intensity, alpha: 0.13 * alpha });
    }

    if (profile.edgeBloom) {
      const edgeAlpha = 0.11 * alpha * Math.max(0, 1 - t * 0.72);
      const inset = 8 + t * 24;
      const corner = Math.min(width, height) * (0.08 + intensity * 0.018);
      this.layer.moveTo(inset, corner);
      this.layer.lineTo(inset, inset);
      this.layer.lineTo(corner, inset);
      this.layer.moveTo(width - corner, inset);
      this.layer.lineTo(width - inset, inset);
      this.layer.lineTo(width - inset, corner);
      this.layer.moveTo(inset, height - corner);
      this.layer.lineTo(inset, height - inset);
      this.layer.lineTo(corner, height - inset);
      this.layer.moveTo(width - corner, height - inset);
      this.layer.lineTo(width - inset, height - inset);
      this.layer.lineTo(width - inset, height - corner);
      this.layer.stroke({ color: pulse.accent, width: 3.2, alpha: edgeAlpha });
    }

    const coreRadius = Math.max(3, baseRadius * (0.095 + (1 - t) * 0.06));
    const corePoints = [];
    for (let point = 0; point < 12; point += 1) {
      const angle = rotation * 0.34 + point * Math.PI / 6;
      const radius = coreRadius * (point % 2 ? 0.52 : 1);
      corePoints.push(pulse.x + Math.cos(angle) * radius, pulse.y + Math.sin(angle) * radius);
    }
    this.layer.poly(corePoints);
    this.layer.fill({ color: 0xffffff, alpha: 0.28 * alpha });
    this.layer.poly([
      pulse.x, pulse.y - coreRadius * 0.58,
      pulse.x + coreRadius * 0.58, pulse.y,
      pulse.x, pulse.y + coreRadius * 0.58,
      pulse.x - coreRadius * 0.58, pulse.y
    ]);
    this.layer.fill({ color: pulse.color, alpha: 0.55 * alpha });
  }

  getDebugState() {
    const reducedMotion = Boolean(this.getAccessibilitySettings()?.prefersReducedMotion);
    const activeKinds = [];
    for (let index = 0; index < this.pulses.length; index += 1) {
      const kind = this.pulses[index].kind;
      if (!activeKinds.includes(kind)) activeKinds.push(kind);
    }
    return {
      active: this.pulses.length > 0,
      activePulses: this.pulses.length,
      maxActivePulses: MAX_ACTIVE_PULSES,
      activeLimit: reducedMotion ? 5 : MAX_ACTIVE_PULSES,
      peakActivePulses: this.peakActivePulses,
      activeKinds,
      reducedMotion,
      totalEmitted: this.totalEmitted,
      totalDropped: this.totalDropped,
      layerAttached: Boolean(this.layer?.parent),
      layerVisible: Boolean(this.layer?.visible),
      oneTicker: Boolean(this.boundUpdate),
      visualLanguage: 'plasma_fracture_v2',
      primitiveCircleCount: 0,
      primitiveDiamondCount: 0,
      lastEvent: this.lastEvent ? { ...this.lastEvent } : null
    };
  }

  clear() {
    this.pulses.length = 0;
    this.layer?.clear?.();
    if (this.layer) this.layer.visible = false;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.ticker?.remove?.(this.boundUpdate);
    this.clear();
    if (this.layer?.parent) this.layer.parent.removeChild(this.layer);
    this.layer?.destroy?.();
    this.layer = null;
    this.container = null;
    this.ticker = null;
    this.cooldowns.clear();
  }
}
