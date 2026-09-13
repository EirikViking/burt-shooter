import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function expect(source, token, message) {
  if (!source.includes(token)) {
    console.error(`[boss-vfx-clarity] FAIL ${message}`);
    process.exit(1);
  }
}

const bossSource = read('src/entities/Boss.js');
const playSource = read('src/scenes/PlayScene.js');
const packageJson = read('package.json');

expect(bossSource, 'getTelegraphVfxPalette', 'boss telegraphs should keep attack-family color language');
expect(bossSource, 'drawTelegraphChargeHalo', 'boss telegraphs should keep visible boss-local charge halos');
expect(bossSource, 'drawTelegraphReleaseGate', 'boss telegraphs should keep release gates before firing');
expect(bossSource, 'drawTelegraphLaneCharge', 'lane charge motion should remain wired');
expect(bossSource, 'drawTelegraphRingCharge', 'ring charge motion should remain wired');

expect(playSource, 'getBossHazardVfxPalette', 'active hazards should keep attack-family VFX colors');
expect(playSource, 'drawBossHazardMuzzleBurst', 'active hazards should keep muzzle bursts');
expect(playSource, 'drawBossHazardReleasePulse', 'active hazards should keep release-front pulses');
expect(playSource, 'drawBossHazardReleasePulse(layer, hazard, palette, alpha, progress)', 'hazard release pulses should be called from drawBossHazard');
expect(playSource, 'drawBossHazardMuzzleBurst(layer, hazard, palette, alpha, progress)', 'muzzle bursts should be called from drawBossHazard');

expect(packageJson, '"check:boss-vfx-clarity"', 'package.json should expose the focused boss VFX clarity check');

console.log('[boss-vfx-clarity] PASS stronger boss attack VFX hooks are present');
