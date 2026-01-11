const MIN_PADDING = 16;
const MAX_PADDING = 60;
const MIN_SPACING = 20;
const MAX_SPACING = 48;
const MIN_LINE_HEIGHT = 22;
const MAX_LINE_HEIGHT = 40;

export function createTextLayout(width, height) {
  const padding = Math.max(MIN_PADDING, Math.min(width * 0.06, MAX_PADDING));
  const lineHeight = Math.max(MIN_LINE_HEIGHT, Math.min(height * 0.045, MAX_LINE_HEIGHT));
  const spacing = Math.max(MIN_SPACING, Math.min(height * 0.045, MAX_SPACING));
  return {
    width,
    height,
    padding,
    lineHeight,
    spacing
  };
}

export function createVerticalStack(layout, options = {}) {
  let currentY = options.startY ?? layout.padding;
  const baseSpacing = options.spacing ?? layout.spacing;
  return {
    next(extraSpacing = 0) {
      const y = currentY;
      currentY += baseSpacing + extraSpacing;
      return y;
    },
    addGap(amount) {
      currentY += amount;
    },
    reset() {
      currentY = options.startY ?? layout.padding;
    }
  };
}

export function clampTextWidth(width, layout) {
  return Math.max(200, Math.min(layout.width * 0.92, width));
}
