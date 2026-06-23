import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  EASTER_EGG_TOTAL,
  EASTER_EGGS,
  pickEasterEggForLevel
} from '../src/config/EasterEggCatalog.js';

const removedTitle = 'SPACE TAX AUDIT';
const removedLine = 'Receipts detected. Enemy morale fell three percent and filed an appeal.';
const removedId = 'space_tax_audit';
const removedPng = 'public/art/generated/nova-swarm/easter-eggs/nova-space-tax-audit-flyby-20260623.png';
const removedMp3 = 'public/audio/sfx/nova-swarm/nova_space_tax_audit_flyby.mp3';
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/space-tax-audit-removed-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

const ids = new Set(EASTER_EGGS.map((egg) => egg.id));
assert.equal(EASTER_EGG_TOTAL, 9, 'catalog total should reflect the removed Space Tax Audit entry');
assert.equal(EASTER_EGGS.length, EASTER_EGG_TOTAL, 'catalog count mismatch');
assert(!ids.has(removedId), 'Space Tax Audit must not be registered as a runtime easter egg');
assert(!EASTER_EGGS.some((egg) => egg.title === removedTitle || egg.line === removedLine), 'Space Tax Audit player-facing copy must not remain in the runtime catalog');

for (let level = 1; level <= 40; level += 1) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const picked = pickEasterEggForLevel(level, new Set());
    assert.notEqual(picked?.id, removedId, `picker returned removed Space Tax Audit at level ${level}`);
  }
}

assert(!existsSync(removedPng), 'removed Space Tax Audit PNG should not exist on disk');
assert(!existsSync(removedMp3), 'removed Space Tax Audit MP3 should not exist on disk');

const filesToScan = [
  'src/assets/assetManifest.js',
  'src/audio/SoundCatalog.js',
  'src/config/EasterEggCatalog.js',
  'src/i18n/locales/de.js',
  'src/i18n/locales/es.js',
  'src/i18n/locales/ja.js',
  'src/i18n/locales/ko.js',
  'src/i18n/locales/pt-BR.js',
  'src/i18n/locales/ru.js',
  'src/i18n/locales/zh-CN.js'
];

for (const file of filesToScan) {
  const source = readFileSync(file, 'utf8');
  assert(!source.includes(removedTitle), `${file} still contains removed title`);
  assert(!source.includes(removedLine), `${file} still contains removed line`);
  assert(!source.includes('nova-space-tax-audit-flyby-20260623.png'), `${file} still references removed PNG`);
  assert(!source.includes('nova_space_tax_audit_flyby.mp3'), `${file} still references removed MP3`);
  assert(!source.includes('space_tax_audit_flyby'), `${file} still references removed SFX key`);
}

const playScene = readFileSync('src/scenes/PlayScene.js', 'utf8');
assert(playScene.includes("if (egg?.id === 'space_tax_audit') return false;"), 'PlayScene should reject stale forced Space Tax Audit flyby objects');
assert(!playScene.includes("ensureEasterEggFlybyTexture('spaceTaxAudit')"), 'PlayScene should not preload removed Space Tax Audit flyby art');
assert(!playScene.includes("getEasterEggFlybyTexture('spaceTaxAudit')"), 'PlayScene should not fetch removed Space Tax Audit flyby art');

mkdirSync(outputDir, { recursive: true });
const report = {
  checkedAt: new Date().toISOString(),
  status: 'passed',
  removedId,
  catalogTotal: EASTER_EGG_TOTAL,
  removedAssets: [removedPng, removedMp3],
  scannedFiles: filesToScan
};
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(`[space-tax-audit-removed] PASS report=${path.join(outputDir, 'report.json')}`);
