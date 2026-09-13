/**
 * Shared readability targets for menu and overlay UI.
 *
 * Values are authored for the 1920x1080 desktop presentation. Individual
 * layouts can still scale or reflow them, but persistent copy should not fall
 * below the semantic floor for its role.
 */
export const READABILITY = Object.freeze({
  typography: Object.freeze({
    display: 36,
    screenTitle: 42,
    sectionTitle: 22,
    cardTitle: 18,
    body: 16,
    secondary: 15,
    metadata: 14,
    button: 16,
    utility: 14
  }),
  controls: Object.freeze({
    utilityHeight: 44,
    actionHeight: 48,
    dockHeight: 92,
    compactRowHeight: 58,
    listRowHeight: 64,
    settingsRowHeight: 50
  }),
  spacing: Object.freeze({
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32
  }),
  surfaces: Object.freeze({
    passiveAlpha: 0.72,
    panelAlpha: 0.9,
    selectedAlpha: 0.97
  })
});

export function readableSize(role = 'body', { compact = false, scale = 1 } = {}) {
  const base = Number(READABILITY.typography[role]) || READABILITY.typography.body;
  const compactMultiplier = compact ? 0.9 : 1;
  const minimumByRole = role === 'metadata'
    ? READABILITY.typography.metadata
    : role === 'secondary'
      ? READABILITY.typography.secondary
      : role === 'utility'
        ? READABILITY.typography.utility
        : 14;
  return Math.max(minimumByRole, Math.round(base * compactMultiplier * Math.max(0.8, Number(scale) || 1)));
}

export function readableLineHeight(fontSize, multiplier = 1.28) {
  return Math.max(16, Math.round((Number(fontSize) || READABILITY.typography.body) * multiplier));
}
