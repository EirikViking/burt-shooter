const MIN_PADDING = 16;
const MAX_PADDING = 60;
const MIN_SPACING = 20;
const MAX_SPACING = 48;
const MIN_LINE_HEIGHT = 22;
const MAX_LINE_HEIGHT = 40;

export function createTextLayout(width, height, options = {}) {
  const isMobile = options.isMobile !== undefined ? options.isMobile : (width <= 720);
  const isPortrait = options.isPortrait !== undefined ? options.isPortrait : (height >= width);

  const paddingBase = isMobile ? (isPortrait ? 20 : 16) : Math.min(width * 0.06, MAX_PADDING);
  const padding = Math.max(MIN_PADDING, paddingBase);

  const lineHeightBase = isMobile ? (isPortrait ? 26 : 24) : height * 0.045;
  const lineHeight = Math.max(MIN_LINE_HEIGHT, Math.min(lineHeightBase, MAX_LINE_HEIGHT));

  const spacingBase = isMobile ? (isPortrait ? 32 : 28) : height * 0.045;
  const spacing = Math.max(MIN_SPACING, Math.min(spacingBase, MAX_SPACING));

  return {
    width,
    height,
    padding,
    lineHeight,
    spacing,
    isMobile,
    isPortrait
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
