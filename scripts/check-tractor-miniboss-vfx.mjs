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

expect(hijackerSource, 'drawBeamLattice(layer', 'Hijacker tractor beam should keep braided lattice VFX');
expect(hijackerSource, 'drawBeamLockMandala(layer', 'Hijacker tractor beam should keep ship-local lock mandala VFX');
expect(hijackerSource, 'drawBeamCaptureGlyph(layer', 'Hijacker tractor beam should keep capture glyph VFX near the player');
expect(hijackerSource, 'drawBeamArc(layer', 'Hijacker beam helper should use bounded local graphics helpers');
expect(hijackerSource, "blendMode: 'normal'", 'Hijacker active beam should avoid additive whiteout');
expect(hijackerSource, 'hostileProjectilesAboveBeam: true', 'Hijacker diagnostics should preserve hostile projectile priority');
if (getHijackerMaxHealth(1) !== 35 || getHijackerMaxHealth(5) !== 55) {
  fail('Hijacker health should preserve the opening-sector curve');
}
if (getHijackerMaxHealth(20) !== 85 || getHijackerMaxHealth(50) !== 85) {
  fail('Hijacker health should flatten at 85 for Sector 20+ readability and fairness');
}

expect(enemySource, 'drawEliteAttackSignatureVfx(layer', 'elite mini-bosses should keep role-specific attack-signature VFX');
expect(enemySource, 'drawEliteTractorSignature(layer', 'tractor puller elite should keep distinct tractor visuals');
expect(enemySource, 'drawEliteVortexSignature(layer', 'vortex elite should keep distinct gravity visuals');
expect(enemySource, 'drawEliteRailSignature(layer', 'rail/hunter elites should keep distinct lock-on visuals');
expect(enemySource, 'drawEliteShieldSignature(layer', 'shield/barrier elites should keep distinct panel visuals');
expect(enemySource, 'drawEliteSupportSignature(layer', 'support elites should keep distinct tether/command visuals');
expect(enemySource, 'drawElitePulseSignature(layer', 'jammer/EMP elites should keep distinct pulse/glitch visuals');
expect(enemySource, 'drawElitePhaseMirrorSignature(layer', 'phase/mirror/splitter elites should keep distinct shimmer visuals');
expect(enemySource, 'drawEliteCarrierSignature(layer', 'drone carrier elite should keep distinct bay visuals');
expect(enemySource, 'drawEliteOrdnanceSignature(layer', 'ordnance elites should keep distinct attack-family visuals');

expect(packageJson, '"check:tractor-miniboss-vfx"', 'package.json should expose the focused tractor/mini-boss VFX check');

console.log('[tractor-miniboss-vfx] PASS tractor and mini-boss attack VFX hooks are present');
