const MOBILE_LAYOUT = Object.freeze({
  width: 154,
  height: 27,
  medalStartX: 13,
  medalSpacing: 14,
  medalRadius: 4.3,
  labelX: 57,
  labelMaxWidth: 43,
  countRightX: 127,
  countMaxWidth: 25,
  dividerX: 133,
  identityX: 143,
  identityRadius: 5,
  identityExtent: 8.2
});

const DESKTOP_LAYOUT = Object.freeze({
  width: 224,
  height: 38,
  medalStartX: 17,
  medalSpacing: 20,
  medalRadius: 6.4,
  labelX: 78,
  labelMaxWidth: 68,
  countRightX: 184,
  countMaxWidth: 32,
  dividerX: 193,
  identityX: 210,
  identityRadius: 7,
  identityExtent: 10.5
});

export function getShipMasteryBadgeLayout({ mobile = false } = {}) {
  return mobile ? MOBILE_LAYOUT : DESKTOP_LAYOUT;
}

export function fitMasteryTextScale(measuredWidth, maxWidth) {
  const width = Math.max(0, Number(measuredWidth) || 0);
  const limit = Math.max(1, Number(maxWidth) || 1);
  if (width <= limit) return 1;
  return limit / width;
}

export function getMasteryBadgeRegionDebug(layout, {
  labelWidth = layout.labelMaxWidth,
  countWidth = layout.countMaxWidth
} = {}) {
  const safeLabelWidth = Math.min(layout.labelMaxWidth, Math.max(0, Number(labelWidth) || 0));
  const safeCountWidth = Math.min(layout.countMaxWidth, Math.max(0, Number(countWidth) || 0));
  const medalRight = layout.medalStartX + layout.medalSpacing * 2 + layout.medalRadius;
  const labelRight = layout.labelX + safeLabelWidth;
  const countLeft = layout.countRightX - safeCountWidth;
  const identityLeft = layout.identityX - layout.identityExtent;
  return {
    medalRight,
    label: { left: layout.labelX, right: labelRight },
    count: { left: countLeft, right: layout.countRightX },
    identity: { left: identityLeft, right: layout.identityX + layout.identityExtent },
    overlaps: {
      medalsLabel: medalRight > layout.labelX,
      labelCount: labelRight > countLeft,
      countIdentity: layout.countRightX > identityLeft
    }
  };
}
