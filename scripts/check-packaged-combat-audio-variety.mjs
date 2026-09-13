import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { extractFile, listPackage } from '@electron/asar';

import { SFX_CATALOG } from '../src/audio/SoundCatalog.js';
import { GENERATED_ENEMY_DEATH_SFX } from '../src/config/GeneratedEnemyProfiles.js';

const packageRoot = path.resolve(
  process.env.NOVA_SWARM_PACKAGED_ROOT || 'release/desktop/win-unpacked'
);
const asarPath = path.join(packageRoot, 'resources', 'app.asar');
const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR || `test-results/packaged-combat-audio-${new Date().toISOString().replace(/[:.]/g, '-')}`
);
mkdirSync(outputDir, { recursive: true });

const entries = listPackage(asarPath).map((archivePath) => ({
  archivePath,
  extractPath: archivePath.replace(/^\\/, ''),
  normalized: archivePath.replaceAll('\\', '/').replace(/^\//, '')
}));
const jsEntries = entries.filter((entry) => /^dist\/assets\/.*\.js$/i.test(entry.normalized));
assert.ok(jsEntries.length > 0, 'packaged app.asar must contain the production JavaScript bundle');
const javascript = jsEntries.map((entry) => extractFile(asarPath, entry.extractPath).toString('utf8')).join('\n');

const deathEvents = [...GENERATED_ENEMY_DEATH_SFX];
const anchor = javascript.indexOf(deathEvents[0]);
assert.ok(anchor >= 0, 'packaged bundle is missing the ordinary enemy-death palette');
const paletteWindow = javascript.slice(Math.max(0, anchor - 300), anchor + 1400);
for (const eventName of deathEvents) {
  assert.ok(paletteWindow.includes(eventName), `packaged ordinary-death palette is missing ${eventName}`);
}
assert.equal(paletteWindow.includes('spawn_special'), false,
  'packaged ordinary enemy deaths must not include the five-second spawn/engine event');
assert.ok(javascript.includes('spawn_special'),
  'the deliberate long spawn event must remain available for its intended non-death callers');

const durations = [];
for (const eventName of deathEvents) {
  for (const url of SFX_CATALOG[eventName] || []) {
    const packagedEntry = `dist/${String(url).replace(/^\//, '')}`;
    const archiveEntry = entries.find((entry) => entry.normalized === packagedEntry);
    assert.ok(archiveEntry, `packaged app.asar is missing ${packagedEntry}`);
    const extension = path.extname(packagedEntry) || '.ogg';
    const probePath = path.join(outputDir, `${eventName}-${durations.length}${extension}`);
    writeFileSync(probePath, extractFile(asarPath, archiveEntry.extractPath));
    const probe = spawnSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      probePath
    ], { encoding: 'utf8' });
    assert.equal(probe.status, 0, `could not inspect packaged death SFX ${packagedEntry}`);
    const durationSeconds = Number(probe.stdout);
    assert.ok(Number.isFinite(durationSeconds) && durationSeconds <= 2.1,
      `packaged death SFX ${packagedEntry} is ${durationSeconds}s; sustained beds cannot be kill one-shots`);
    durations.push({ eventName, packagedEntry, durationSeconds });
  }
}

const report = {
  pass: true,
  asarPath,
  palette: deathEvents,
  excludedLongEvent: 'spawn_special',
  deliberateLongEventPreserved: true,
  durations
};
writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(`[packaged-combat-audio] PASS clips=${durations.length} evidence=${path.join(outputDir, 'report.json')}`);
