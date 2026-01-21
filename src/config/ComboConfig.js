// Combo milestone configuration
// Bonuses awarded once per combo chain when reaching these thresholds

export const COMBO_MILESTONES = [
  { threshold: 5, bonus: 500, label: 'COMBO 5!' },
  { threshold: 10, bonus: 1500, label: 'COMBO 10!' },
  { threshold: 15, bonus: 3000, label: 'COMBO 15!' },
  { threshold: 20, bonus: 5000, label: 'COMBO 20!' }
];

export const COMBO_WINDOW_MS = 3200; // Time window to maintain combo
export const COMBO_MULTIPLIERS = [
  { threshold: 50, multiplier: 4 },
  { threshold: 25, multiplier: 3 },
  { threshold: 10, multiplier: 2 }
];
