import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BOSS_ROSTER } from '../src/config/BossRoster.js';
import { AssetManifest } from '../src/assets/assetManifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const errors = [];
const ids = new Set();
const names = new Set();
const archetypes = new Set();
const attacks = new Set();
const movements = new Set();
const signatures = new Set();

if (BOSS_ROSTER.length !== 50) {
  errors.push(`Expected 50 boss profiles, found ${BOSS_ROSTER.length}.`);
}

if ((AssetManifest.generated.bosses || []).length !== 50) {
  errors.push(`Expected 50 generated boss assets in AssetManifest, found ${(AssetManifest.generated.bosses || []).length}.`);
}

for (const boss of BOSS_ROSTER) {
  ids.add(boss.id);
  names.add(boss.name);
  archetypes.add(boss.archetype);
  attacks.add(boss.attack);
  movements.add(boss.movement);
  signatures.add(boss.signature);
  if (!boss.art || !AssetManifest.generated.bosses.includes(boss.art)) {
    errors.push(`${boss.id} art is not present in AssetManifest.generated.bosses: ${boss.art}`);
    continue;
  }
  const diskPath = join(root, 'public', boss.art.replace(/^\//, ''));
  if (!existsSync(diskPath)) {
    errors.push(`${boss.id} art file missing: ${diskPath}`);
  }
}

if (ids.size !== BOSS_ROSTER.length) errors.push('Boss profile ids are not unique.');
if (names.size !== BOSS_ROSTER.length) errors.push('Boss profile names are not unique.');
if (archetypes.size < 10) errors.push(`Expected at least 10 boss archetypes, found ${archetypes.size}.`);
if (attacks.size < 10) errors.push(`Expected at least 10 boss attack styles, found ${attacks.size}.`);
if (movements.size < 9) errors.push(`Expected at least 9 boss movement styles, found ${movements.size}.`);
if (signatures.size < 5) errors.push(`Expected at least 5 boss signature styles, found ${signatures.size}.`);

if (errors.length) {
  console.error('[check-boss-roster] failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[check-boss-roster] ok profiles=${BOSS_ROSTER.length} archetypes=${archetypes.size} attacks=${attacks.size} signatures=${signatures.size}`);
