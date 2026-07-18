import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const removedPng = 'public/art/generated/nova-swarm/easter-eggs/nova-space-tax-audit-flyby-20260623.png';
const removedMp3 = 'public/audio/sfx/nova-swarm/nova_space_tax_audit_flyby.mp3';
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/ambient-easter-egg-flyby-removed-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

const playScene = readFileSync('src/scenes/PlayScene.js', 'utf8');
const main = readFileSync('src/main.js', 'utf8');

for (const snippet of [
  'updateEasterEgg',
  'spawnAmbientEasterEgg',
  'spawnEasterEggFlyby',
  'easterEggFlyby',
  'gameplay_easterEgg',
  'decorative_lore_signal',
  'pickEasterEggForLevel',
  'EasterEggCatalog'
]) {
  assert(!playScene.includes(snippet), `PlayScene still contains removed flyby snippet: ${snippet}`);
}

for (const snippet of ['activeEasterEgg', 'lastEasterEgg', 'easterEggFlyby']) {
  assert(!main.includes(snippet), `render_game_to_text still exposes removed easter egg flyby state: ${snippet}`);
}

assert(!existsSync('src/config/EasterEggCatalog.js'), 'ambient easter egg catalog should not exist');
assert(!existsSync(removedPng), 'removed Space Tax Audit PNG should not exist on disk');
assert(!existsSync(removedMp3), 'removed Space Tax Audit MP3 should not exist on disk');

mkdirSync(outputDir, { recursive: true });
const report = {
  checkedAt: new Date().toISOString(),
  status: 'passed',
  removedRuntime: [
    'PlayScene.updateEasterEgg',
    'PlayScene.spawnAmbientEasterEgg',
    'PlayScene.spawnEasterEggFlyby',
    'render_game_to_text.activeEasterEgg'
  ],
  removedAssets: [removedPng, removedMp3],
  preserved: ['Settings credits secret unlock']
};
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(`[ambient-easter-egg-flyby-removed] PASS report=${path.join(outputDir, 'report.json')}`);
