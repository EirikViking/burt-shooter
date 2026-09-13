export const SUPPORT_DRONE_TARGET_SPAN = 34;

export function computeSupportDroneTextureScale(texture, targetSpan = SUPPORT_DRONE_TARGET_SPAN) {
  const width = Math.max(1, Number(texture?.width) || 1);
  const height = Math.max(1, Number(texture?.height) || 1);
  const safeTarget = Math.max(12, Number(targetSpan) || SUPPORT_DRONE_TARGET_SPAN);
  return Math.min(0.45, safeTarget / Math.max(width, height));
}
