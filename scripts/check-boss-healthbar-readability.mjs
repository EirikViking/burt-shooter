import { readFileSync } from 'node:fs';

const bossSource = readFileSync('src/entities/Boss.js', 'utf8');
const expectations = [
  ['const bossPhaseThresholds = [0.75, 0.5, 0.4]', 'boss health bar should keep visible phase/half-health threshold ticks'],
  ['const lowHealth = healthPercent <= 0.25', 'boss health bar should keep a low-health readability state'],
  ['const leadX = barX + fillWidth', 'boss health bar should keep a current-health leading edge'],
  ['strokeThickness: 3', 'boss health text should keep a dark stroke for readability over effects'],
  ['__debugBossHealthBar', 'boss health bar should expose debug state for focused checks']
];

const failures = expectations
  .filter(([token]) => !bossSource.includes(token))
  .map(([, message]) => message);

if (failures.length) {
  console.error(`[boss-healthbar-readability] FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log('[boss-healthbar-readability] PASS boss phase ticks, low-health state, leading edge, and text stroke are present');
