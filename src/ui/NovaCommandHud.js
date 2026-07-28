import * as PIXI from 'pixi.js';

export const NOVA_COMMAND_HUD_TOKENS = Object.freeze({
  safeMargin: 48,
  surface: 0x03111e,
  surfaceLift: 0x09243a,
  primaryEdge: 0x57eaff,
  secondaryEdge: 0x1d6c83,
  warning: 0xffc857,
  danger: 0xff765c,
  prestige: 0xffe58a,
  text: 0xecfbff,
  detail: 0xcdf8ff,
  primaryLineWidth: 1.6,
  secondaryLineWidth: 1,
  secondaryFontSize: Object.freeze({
    compact: 13,
    standard: 14
  }),
  motion: Object.freeze({
    persistent: Object.freeze({ introMs: 0, exitMs: 0 }),
    side: Object.freeze({ introMs: 150, exitMs: 220 }),
    warning: Object.freeze({ introMs: 165, exitMs: 240 }),
    transition: Object.freeze({ introMs: 180, exitMs: 300 }),
    major: Object.freeze({ introMs: 200, exitMs: 320 })
  })
});

export const WAVE_CLEARED_COMMAND_HUD_TOKENS = Object.freeze({
  minWidth: 520,
  englishWidth: 560,
  maxWidth: 660,
  height: 96,
  safeMargin: NOVA_COMMAND_HUD_TOKENS.safeMargin,
  hudGap: 18,
  durationMs: 1320,
  minVisibleMs: 960,
  introMs: NOVA_COMMAND_HUD_TOKENS.motion.transition.introMs,
  exitMs: NOVA_COMMAND_HUD_TOKENS.motion.transition.exitMs,
  surface: NOVA_COMMAND_HUD_TOKENS.surface,
  surfaceLift: NOVA_COMMAND_HUD_TOKENS.surfaceLift,
  primaryEdge: NOVA_COMMAND_HUD_TOKENS.primaryEdge,
  secondaryEdge: NOVA_COMMAND_HUD_TOKENS.secondaryEdge,
  reward: NOVA_COMMAND_HUD_TOKENS.prestige,
  text: NOVA_COMMAND_HUD_TOKENS.text,
  detail: NOVA_COMMAND_HUD_TOKENS.detail
});

const FRAME_VARIANTS = Object.freeze({
  persistent: Object.freeze({
    plateRatio: 0.82,
    plateInsetY: 5,
    surfaceAlpha: 0.34,
    liftAlpha: 0.16,
    railMode: 'calm_bracket',
    motifSize: 4
  }),
  side: Object.freeze({
    plateRatio: 0.78,
    plateInsetY: 5,
    surfaceAlpha: 0.68,
    liftAlpha: 0.22,
    railMode: 'compact_cap',
    motifSize: 4
  }),
  warning: Object.freeze({
    plateRatio: 0.74,
    plateInsetY: 5,
    surfaceAlpha: 0.68,
    liftAlpha: 0.2,
    railMode: 'alert_step',
    motifSize: 5
  }),
  major: Object.freeze({
    plateRatio: 0.78,
    plateInsetY: 6,
    surfaceAlpha: 0.74,
    liftAlpha: 0.24,
    railMode: 'prestige_step',
    motifSize: 6
  })
});

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function drawRail(graphics, {
  mode,
  plateHalfWidth,
  halfWidth,
  halfHeight,
  accent,
  secondaryAccent,
  primaryLineWidth,
  secondaryLineWidth
}) {
  const top = -halfHeight;
  const bottom = halfHeight;
  if (mode === 'calm_bracket') {
    graphics.moveTo(plateHalfWidth - 10, top);
    graphics.lineTo(halfWidth - 7, top);
    graphics.lineTo(halfWidth, top + 7);
    graphics.moveTo(plateHalfWidth - 10, bottom);
    graphics.lineTo(halfWidth - 7, bottom);
    graphics.lineTo(halfWidth, bottom - 7);
  } else if (mode === 'compact_cap') {
    graphics.moveTo(plateHalfWidth - 8, top);
    graphics.lineTo(halfWidth - 3, top);
    graphics.lineTo(halfWidth - 3, top + 10);
    graphics.moveTo(plateHalfWidth - 8, bottom);
    graphics.lineTo(halfWidth - 3, bottom);
    graphics.lineTo(halfWidth - 3, bottom - 10);
  } else if (mode === 'alert_step') {
    graphics.moveTo(plateHalfWidth - 8, top);
    graphics.lineTo(halfWidth - 17, top);
    graphics.lineTo(halfWidth - 5, top + 8);
    graphics.lineTo(halfWidth, top + 8);
    graphics.moveTo(plateHalfWidth - 8, bottom);
    graphics.lineTo(halfWidth - 17, bottom);
    graphics.lineTo(halfWidth - 5, bottom - 8);
    graphics.lineTo(halfWidth, bottom - 8);
  } else {
    graphics.moveTo(plateHalfWidth - 10, top);
    graphics.lineTo(halfWidth - 24, top);
    graphics.lineTo(halfWidth - 10, top + 9);
    graphics.lineTo(halfWidth, top + 9);
    graphics.moveTo(plateHalfWidth - 10, bottom);
    graphics.lineTo(halfWidth - 24, bottom);
    graphics.lineTo(halfWidth - 10, bottom - 9);
    graphics.lineTo(halfWidth, bottom - 9);
  }
  graphics.stroke({ color: accent, width: primaryLineWidth, alpha: 0.88 });

  const inset = Math.max(6, Math.round(halfHeight * 0.2));
  graphics.moveTo(plateHalfWidth + 6, top + inset);
  graphics.lineTo(halfWidth - 12, top + inset);
  graphics.moveTo(plateHalfWidth + 6, bottom - inset);
  graphics.lineTo(halfWidth - 12, bottom - inset);
  graphics.stroke({ color: secondaryAccent, width: secondaryLineWidth, alpha: 0.48 });
}

function buildStructuralHalf({
  variant,
  halfWidth,
  halfHeight,
  plateHalfWidth,
  accent,
  secondaryAccent,
  decorativeAccents,
  surfaceAlpha,
  liftAlpha,
  primaryLineWidth,
  secondaryLineWidth
}) {
  const config = FRAME_VARIANTS[variant];
  const half = new PIXI.Container();
  half.label = `novaCommandHud${variant}StructuralHalf`;

  const plateInsetY = config.plateInsetY;
  const surface = new PIXI.Graphics();
  surface.poly([
    0, -halfHeight,
    plateHalfWidth - 9, -halfHeight,
    plateHalfWidth, -halfHeight + 9,
    plateHalfWidth, halfHeight - 9,
    plateHalfWidth - 9, halfHeight,
    0, halfHeight
  ]);
  surface.fill({ color: NOVA_COMMAND_HUD_TOKENS.surface, alpha: surfaceAlpha });
  half.addChild(surface);

  const lift = new PIXI.Graphics();
  lift.poly([
    0, -halfHeight + plateInsetY,
    plateHalfWidth - 12, -halfHeight + plateInsetY,
    plateHalfWidth - plateInsetY, -halfHeight + 12,
    plateHalfWidth - plateInsetY, -3,
    0, -3
  ]);
  lift.fill({ color: NOVA_COMMAND_HUD_TOKENS.surfaceLift, alpha: liftAlpha });
  half.addChild(lift);

  const primaryEdge = new PIXI.Graphics();
  primaryEdge.moveTo(0, -halfHeight);
  primaryEdge.lineTo(plateHalfWidth - 9, -halfHeight);
  primaryEdge.lineTo(plateHalfWidth, -halfHeight + 9);
  primaryEdge.moveTo(0, halfHeight);
  primaryEdge.lineTo(plateHalfWidth - 9, halfHeight);
  primaryEdge.lineTo(plateHalfWidth, halfHeight - 9);
  primaryEdge.stroke({ color: accent, width: primaryLineWidth, alpha: 0.9 });
  drawRail(primaryEdge, {
    mode: config.railMode,
    plateHalfWidth,
    halfWidth,
    halfHeight,
    accent,
    secondaryAccent,
    primaryLineWidth,
    secondaryLineWidth
  });
  half.addChild(primaryEdge);

  const secondaryEdge = new PIXI.Graphics();
  secondaryEdge.moveTo(15, -halfHeight + 7);
  secondaryEdge.lineTo(plateHalfWidth - 15, -halfHeight + 7);
  secondaryEdge.moveTo(15, halfHeight - 7);
  secondaryEdge.lineTo(plateHalfWidth - 15, halfHeight - 7);
  secondaryEdge.stroke({ color: secondaryAccent, width: secondaryLineWidth, alpha: 0.52 });
  half.addChild(secondaryEdge);

  let railFill = null;
  if (decorativeAccents && variant !== 'persistent') {
    railFill = new PIXI.Graphics();
    const railStart = plateHalfWidth + 5;
    const railEnd = halfWidth - 7;
    railFill.poly([
      railStart, -halfHeight + 5,
      railEnd, -halfHeight + 5,
      railEnd - 10, -halfHeight + 11,
      railStart, -halfHeight + 10
    ]);
    railFill.fill({ color: accent, alpha: variant === 'warning' ? 0.14 : 0.1 });
    railFill.poly([
      railStart, halfHeight - 5,
      railEnd, halfHeight - 5,
      railEnd - 10, halfHeight - 11,
      railStart, halfHeight - 10
    ]);
    railFill.fill({ color: accent, alpha: variant === 'warning' ? 0.14 : 0.1 });
    railFill.blendMode = 'add';
    half.addChild(railFill);
  }

  return { half, surface, lift, primaryEdge, secondaryEdge, rail: railFill };
}

export function createNovaCommandFrame({
  variant = 'side',
  width = 320,
  height = 58,
  accent = NOVA_COMMAND_HUD_TOKENS.primaryEdge,
  secondaryAccent = NOVA_COMMAND_HUD_TOKENS.secondaryEdge,
  decorativeAccents = true,
  surfaceAlpha = null,
  liftAlpha = null
} = {}) {
  const normalizedVariant = FRAME_VARIANTS[variant] ? variant : 'side';
  const config = FRAME_VARIANTS[normalizedVariant];
  const componentWidth = Math.round(clamp(width, 220, 720) / 2) * 2;
  const componentHeight = Math.round(clamp(height, 46, 124) / 2) * 2;
  const halfWidth = componentWidth / 2;
  const halfHeight = componentHeight / 2;
  const plateWidth = Math.round(componentWidth * config.plateRatio / 2) * 2;
  const plateHalfWidth = plateWidth / 2;
  const resolvedSurfaceAlpha = surfaceAlpha == null ? config.surfaceAlpha : clamp(surfaceAlpha, 0, 1);
  const resolvedLiftAlpha = liftAlpha == null ? config.liftAlpha : clamp(liftAlpha, 0, 1);
  const primaryLineWidth = NOVA_COMMAND_HUD_TOKENS.primaryLineWidth;
  const secondaryLineWidth = NOVA_COMMAND_HUD_TOKENS.secondaryLineWidth;

  const root = new PIXI.Container();
  root.label = `novaCommandHud${normalizedVariant}Frame`;
  root.eventMode = 'none';
  root.interactive = false;

  const right = buildStructuralHalf({
    variant: normalizedVariant,
    halfWidth,
    halfHeight,
    plateHalfWidth,
    accent,
    secondaryAccent,
    decorativeAccents,
    surfaceAlpha: resolvedSurfaceAlpha,
    liftAlpha: resolvedLiftAlpha,
    primaryLineWidth,
    secondaryLineWidth
  });
  const left = buildStructuralHalf({
    variant: normalizedVariant,
    halfWidth,
    halfHeight,
    plateHalfWidth,
    accent,
    secondaryAccent,
    decorativeAccents,
    surfaceAlpha: resolvedSurfaceAlpha,
    liftAlpha: resolvedLiftAlpha,
    primaryLineWidth,
    secondaryLineWidth
  });
  left.half.scale.x = -1;
  root.addChild(left.half, right.half);

  const motif = new PIXI.Graphics();
  motif.label = `novaCommandHud${normalizedVariant}ReactorMotif`;
  const motifSize = config.motifSize;
  const motifGap = halfHeight + 2;
  motif.poly([
    -motifSize, -motifGap,
    0, -motifGap - motifSize,
    motifSize, -motifGap,
    0, -motifGap + motifSize
  ]);
  motif.fill({ color: NOVA_COMMAND_HUD_TOKENS.surfaceLift, alpha: normalizedVariant === 'persistent' ? 0.72 : 0.9 });
  motif.stroke({ color: accent, width: 1.2, alpha: normalizedVariant === 'persistent' ? 0.68 : 0.9 });
  motif.poly([
    -motifSize, motifGap,
    0, motifGap - motifSize,
    motifSize, motifGap,
    0, motifGap + motifSize
  ]);
  motif.fill({ color: NOVA_COMMAND_HUD_TOKENS.surfaceLift, alpha: normalizedVariant === 'persistent' ? 0.72 : 0.9 });
  motif.stroke({ color: accent, width: 1.2, alpha: normalizedVariant === 'persistent' ? 0.68 : 0.9 });
  root.addChild(motif);

  const bounds = root.getLocalBounds();
  const alphaCenterOffsetPx = bounds.x + bounds.width / 2;
  const opaqueCoverageRatio = Number(((plateWidth * componentHeight * resolvedSurfaceAlpha) /
    (componentWidth * componentHeight)).toFixed(3));

  return {
    root,
    left,
    right,
    motif,
    componentWidth,
    componentHeight,
    plateWidth,
    plateHeight: componentHeight,
    openRailWidthPerSide: (componentWidth - plateWidth) / 2,
    debug: {
      family: 'nova_command_hud',
      variant: normalizedVariant,
      componentWidth,
      componentHeight,
      plateWidth,
      plateHeight: componentHeight,
      openRailWidthPerSide: (componentWidth - plateWidth) / 2,
      surfaceAlpha: resolvedSurfaceAlpha,
      opaqueCoverageRatio,
      mirroredStructure: left.half.scale.x === -right.half.scale.x,
      structuralHalfCount: 2,
      alphaCenterOffsetPx: Number(alphaCenterOffsetPx.toFixed(3)),
      signatureMotif: 'paired_reactor_pulse',
      decorativeAccents,
      primaryLineWidth,
      secondaryLineWidth,
      newRasterAssetCount: 0
    }
  };
}

export function createNovaCommandGeometryOverlay({
  width,
  height,
  alphaBounds = null,
  textBounds = null
} = {}) {
  const overlay = new PIXI.Graphics();
  overlay.label = 'novaCommandHudGeometryOverlay';
  overlay.rect(-width / 2, -height / 2, width, height);
  overlay.stroke({ color: 0xffdf63, width: 1, alpha: 0.92 });
  if (alphaBounds) {
    overlay.rect(alphaBounds.x, alphaBounds.y, alphaBounds.width, alphaBounds.height);
    overlay.stroke({ color: 0xff4fd8, width: 1, alpha: 0.9 });
  }
  if (textBounds) {
    overlay.rect(textBounds.x, textBounds.y, textBounds.width, textBounds.height);
    overlay.stroke({ color: 0x7dff83, width: 1, alpha: 0.92 });
  }
  overlay.moveTo(0, -height / 2);
  overlay.lineTo(0, height / 2);
  overlay.moveTo(-width / 2, 0);
  overlay.lineTo(width / 2, 0);
  overlay.stroke({ color: 0xffffff, width: 0.8, alpha: 0.68 });
  overlay.circle(0, 0, 4);
  overlay.stroke({ color: 0xff5d5d, width: 1.3, alpha: 1 });
  return overlay;
}
