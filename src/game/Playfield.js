export const LOGICAL_PLAYFIELD_WIDTH = 1920;
export const LOGICAL_PLAYFIELD_HEIGHT = 1080;
export const LOGICAL_PLAYFIELD_ASPECT = LOGICAL_PLAYFIELD_WIDTH / LOGICAL_PLAYFIELD_HEIGHT;

export function getLogicalPlayfieldBounds() {
  return {
    x: 0,
    y: 0,
    width: LOGICAL_PLAYFIELD_WIDTH,
    height: LOGICAL_PLAYFIELD_HEIGHT,
    minX: 0,
    minY: 0,
    maxX: LOGICAL_PLAYFIELD_WIDTH,
    maxY: LOGICAL_PLAYFIELD_HEIGHT
  };
}

export function computeActivePlayfieldRect(viewportWidth, viewportHeight) {
  const width = Math.max(1, Number(viewportWidth) || LOGICAL_PLAYFIELD_WIDTH);
  const height = Math.max(1, Number(viewportHeight) || LOGICAL_PLAYFIELD_HEIGHT);
  const scale = Math.min(width / LOGICAL_PLAYFIELD_WIDTH, height / LOGICAL_PLAYFIELD_HEIGHT);
  const activeWidth = LOGICAL_PLAYFIELD_WIDTH * scale;
  const activeHeight = LOGICAL_PLAYFIELD_HEIGHT * scale;
  return {
    x: (width - activeWidth) / 2,
    y: (height - activeHeight) / 2,
    width: activeWidth,
    height: activeHeight,
    scale
  };
}

export function screenToWorld(screenX, screenY, viewportWidth, viewportHeight) {
  const rect = computeActivePlayfieldRect(viewportWidth, viewportHeight);
  return {
    x: (Number(screenX) - rect.x) / rect.scale,
    y: (Number(screenY) - rect.y) / rect.scale
  };
}

export function worldToScreen(worldX, worldY, viewportWidth, viewportHeight) {
  const rect = computeActivePlayfieldRect(viewportWidth, viewportHeight);
  return {
    x: rect.x + Number(worldX) * rect.scale,
    y: rect.y + Number(worldY) * rect.scale
  };
}

export function clampToLogicalPlayfield(x, y, margin = 0) {
  const safeMargin = Math.max(0, Number(margin) || 0);
  return {
    x: Math.max(safeMargin, Math.min(LOGICAL_PLAYFIELD_WIDTH - safeMargin, Number(x) || 0)),
    y: Math.max(safeMargin, Math.min(LOGICAL_PLAYFIELD_HEIGHT - safeMargin, Number(y) || 0))
  };
}
