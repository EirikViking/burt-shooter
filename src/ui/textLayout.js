const MIN_PADDING = 16;
const MAX_PADDING = 60;
const MIN_SPACING = 12;
const MAX_SPACING = 32;
const MIN_LINE_HEIGHT = 18;
const MAX_LINE_HEIGHT = 36;

export function createTextLayout(width, height, options = {}) {
  const isMobile = options.isMobile !== undefined ? options.isMobile : (width <= 720);
  const isPortrait = options.isPortrait !== undefined ? options.isPortrait : (height >= width);

  // More conservative padding for better centering
  const paddingBase = isMobile ? (isPortrait ? 16 : 12) : Math.min(width * 0.04, MAX_PADDING);
  const padding = Math.max(MIN_PADDING, paddingBase);

  // Smaller line heights for tighter layouts
  const lineHeightBase = isMobile ? (isPortrait ? 20 : 18) : height * 0.035;
  const lineHeight = Math.max(MIN_LINE_HEIGHT, Math.min(lineHeightBase, MAX_LINE_HEIGHT));

  // Smaller spacing between elements
  const spacingBase = isMobile ? (isPortrait ? 16 : 14) : height * 0.025;
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

/**
 * Creates a vertical stack that positions elements based on their actual height.
 * Use placeElement() instead of next() for proper height-aware positioning.
 */
export function createVerticalStack(layout, options = {}) {
  let currentY = options.startY ?? layout.padding;
  const baseSpacing = options.spacing ?? layout.spacing;

  return {
    /**
     * Get current Y position and advance by baseSpacing + extraSpacing.
     * DEPRECATED: Use placeElement() for height-aware positioning.
     */
    next(extraSpacing = 0) {
      const y = currentY;
      currentY += baseSpacing + extraSpacing;
      return y;
    },

    /**
     * Place an element at current Y and advance by its actual height + spacing.
     * @param {PIXI.Text|PIXI.Container} element - The element to place
     * @param {number} spacingAfter - Extra spacing after element (default: baseSpacing)
     * @returns {number} The Y position where element was placed
     */
    placeElement(element, spacingAfter = baseSpacing) {
      const y = currentY;
      // Get actual height from bounds or style
      const elementHeight = element.height || element.style?.fontSize || baseSpacing;
      currentY += elementHeight + spacingAfter;
      return y;
    },

    /**
     * Place multiple lines of text and advance properly.
     * @param {PIXI.Text} textElement - Multi-line text element
     * @param {number} spacingAfter - Spacing after the text block
     * @returns {number} The Y position where text was placed
     */
    placeText(textElement, spacingAfter = baseSpacing) {
      const y = currentY;
      const textHeight = textElement.height || (textElement.style?.fontSize || 16) * 1.2;
      currentY += textHeight + spacingAfter;
      return y;
    },

    addGap(amount) {
      currentY += amount;
    },

    reset() {
      currentY = options.startY ?? layout.padding;
    },

    getCurrentY() {
      return currentY;
    },

    setY(y) {
      currentY = y;
    }
  };
}

/**
 * Calculate vertical center start position for content of given total height.
 * @param {Object} layout - Layout object with width/height
 * @param {number} contentHeight - Total height of all content
 * @param {number} topBias - Bias towards top (0 = center, 0.2 = 20% higher)
 * @returns {number} Starting Y position for centered content
 */
export function calculateCenteredStartY(layout, contentHeight, topBias = 0.1) {
  const availableHeight = layout.height - layout.padding * 2;
  const extraSpace = Math.max(0, availableHeight - contentHeight);
  return layout.padding + extraSpace * (0.5 - topBias);
}

/**
 * Get responsive font size based on viewport.
 * @param {Object} layout - Layout object
 * @param {string} type - Font type: 'title', 'subtitle', 'body', 'small', 'button'
 * @returns {number} Font size in pixels
 */
export function getResponsiveFontSize(layout, type) {
  const { isMobile, isPortrait, height } = layout;

  const sizes = {
    title: isMobile ? (isPortrait ? 36 : 32) : Math.min(56, height * 0.08),
    subtitle: isMobile ? (isPortrait ? 16 : 14) : Math.min(20, height * 0.03),
    body: isMobile ? (isPortrait ? 14 : 12) : Math.min(18, height * 0.025),
    small: isMobile ? (isPortrait ? 12 : 11) : Math.min(14, height * 0.02),
    button: isMobile ? (isPortrait ? 18 : 16) : 20,
    score: isMobile ? (isPortrait ? 28 : 24) : Math.min(36, height * 0.05),
    tableHeader: isMobile ? (isPortrait ? 14 : 12) : Math.min(16, height * 0.022),
    tableRow: isMobile ? (isPortrait ? 16 : 14) : Math.min(18, height * 0.025)
  };

  return sizes[type] || sizes.body;
}

export function clampTextWidth(width, layout) {
  return Math.max(200, Math.min(layout.width * 0.92, width));
}
