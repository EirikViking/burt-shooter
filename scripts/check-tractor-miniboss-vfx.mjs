import { readFileSync } from 'node:fs';
import { getHijackerMaxHealth } from '../src/config/HijackerBalance.js';

function read(path) {
  return readFileSync(path, 'utf8');
}

function expect(source, token, message) {
  if (!source.includes(token)) {
    console.error(`[tractor-miniboss-vfx] FAIL ${message}`);
    process.exit(1);
  }
}

function fail(message) {
  console.error(`[tractor-miniboss-vfx] FAIL ${message}`);
  process.exit(1);
}

const hijackerSource = read('src/entities/Hijacker.js');
const enemySource = read('src/entities/Enemy.js');
const packageJson = read('package.json');

const fieldVisualSource = read('src/effects/TractorBeamVisual.js');
expect(hijackerSource, 'sampleTractorField', 'Hijacker pull should use the shared field');
expect(fieldVisualSource, 'tractorLanes', 'Visible beam boundaries should use the same field as physics');
expect(fieldVisualSource, 'MeshGeometry', 'Tractor fields should have continuous animated surfaces');
expect(fieldVisualSource, 'getReducedMotionEnabled', 'Tractor effects should respect reduced motion');
expect(hijackerSource, "blendMode: 'normal'", 'Hijacker active beam should avoid additive whiteout');
expect(fieldVisualSource, 'hostileProjectilesAboveBeam:true', 'Hijacker diagnostics should preserve hostile projectile priority');
if (getHijackerMaxHealth(1) !== 35 || getHijackerMaxHealth(5) !== 55) {
  fail('Hijacker health should preserve the opening-sector curve');
}
if (getHijackerMaxHealth(20) !== 85 || getHijackerMaxHealth(50) !== 85) {
  fail('Hijacker health should flatten at 85 for Sector 20+ readability and fairness');
}

expect(enemySource, 'drawEliteAttackSignatureVfx(layer', 'elite mini-bosses should keep role-specific attack-signature VFX');
expect(enemySource, 'drawEliteEnergy(this,layer,context)', 'elite renderer should use the authored energy presentation');
const eliteEnergySource=read('src/effects/EliteEnergyVfx.js');
for(const family of ['tractor','gravity','rail','shield','support','pulse','phase','carrier','expansion','ordnance'])
  expect(eliteEnergySource, `'${family}'`, `missing elite energy family ${family}`);
expect(eliteEnergySource,'drawHighSectorTractorEscapeLane','tractor escape cues must remain');
if(/\.ellipse\(|\.arc\(/.test(eliteEnergySource))fail('Primitive elite wire loops returned');

expect(packageJson, '"check:tractor-miniboss-vfx"', 'package.json should expose the focused tractor/mini-boss VFX check');

console.log('[tractor-miniboss-vfx] PASS tractor and mini-boss attack VFX hooks are present');
