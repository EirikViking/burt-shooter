export function getHijackerMaxHealth(level = 1) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  const openingLevels = Math.min(5, normalizedLevel);
  const lateLevels = Math.min(15, Math.max(0, normalizedLevel - 5));
  return 30 + openingLevels * 5 + lateLevels * 2;
}
