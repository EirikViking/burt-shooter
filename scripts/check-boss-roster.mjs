import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BOSS_ROSTER, getBossProfileForRun } from '../src/config/BossRoster.js';
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
if (BOSS_ROSTER[1]?.name !== 'Sam the Misfit') errors.push(`Boss 2 must be Sam the Misfit, found ${BOSS_ROSTER[1]?.name || 'missing'}.`);
if (BOSS_ROSTER[5]?.name !== 'Misfit Galaxy') errors.push(`Boss 6 must be Misfit Galaxy, found ${BOSS_ROSTER[5]?.name || 'missing'}.`);
if (archetypes.size < 10) errors.push(`Expected at least 10 boss archetypes, found ${archetypes.size}.`);
if (attacks.size < 10) errors.push(`Expected at least 10 boss attack styles, found ${attacks.size}.`);
if (movements.size < 9) errors.push(`Expected at least 9 boss movement styles, found ${movements.size}.`);
if (signatures.size < 5) errors.push(`Expected at least 5 boss signature styles, found ${signatures.size}.`);

for (let sector = 1; sector <= 50; sector += 1) {
  if (getBossProfileForRun(sector, { seed: 'preserve-first-50', seenThroughSector: 30 }) !== BOSS_ROSTER[sector - 1]) {
    errors.push(`Sector ${sector} must preserve the authored first-50 boss reveal order.`);
  }
}

const seenThirtyCycle = Array.from({ length: 30 }, (_entry, index) =>
  getBossProfileForRun(51 + index, { seed: 'seen-thirty', seenThroughSector: 30 })
);
if (seenThirtyCycle.some((profile) => profile.index > 30)) {
  errors.push('Sector 51+ pool exposed a boss beyond the profile seen-through limit.');
}
if (new Set(seenThirtyCycle.map((profile) => profile.id)).size !== 30) {
  errors.push('Sector 51+ first cycle must visit every seen boss exactly once.');
}

const repeatSeenThirtyCycle = Array.from({ length: 30 }, (_entry, index) =>
  getBossProfileForRun(51 + index, { seed: 'seen-thirty', seenThroughSector: 30 })
);
if (seenThirtyCycle.map((profile) => profile.id).join(',') !== repeatSeenThirtyCycle.map((profile) => profile.id).join(',')) {
  errors.push('Sector 51+ boss shuffle must be deterministic for the run seed.');
}

const alternateCycle = Array.from({ length: 30 }, (_entry, index) =>
  getBossProfileForRun(51 + index, { seed: 'alternate-seed', seenThroughSector: 30 })
);
if (seenThirtyCycle.map((profile) => profile.id).join(',') === alternateCycle.map((profile) => profile.id).join(',')) {
  errors.push('Sector 51+ boss shuffle should vary with the run seed.');
}

const secondSeenThirtyCycle = Array.from({ length: 30 }, (_entry, index) =>
  getBossProfileForRun(81 + index, { seed: 'seen-thirty', seenThroughSector: 30 })
);
if (seenThirtyCycle[29]?.id === secondSeenThirtyCycle[0]?.id) {
  errors.push('Sector 51+ boss shuffle must avoid an immediate repeat at cycle boundaries.');
}

if (errors.length) {
  console.error('[check-boss-roster] failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[check-boss-roster] ok profiles=${BOSS_ROSTER.length} archetypes=${archetypes.size} attacks=${attacks.size} signatures=${signatures.size}`);
