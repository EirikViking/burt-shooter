import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const removedCatalog = 'src/config/EasterEggCatalog.js';
const removedRuntimeSnippets = [
  'EasterEggCatalog',
  'EASTER_EGG_TOTAL',
  'pickEasterEggForLevel',
  'updateEasterEgg',
  'spawnEasterEgg()',
  'spawnAmbientEasterEgg',
  'spawnEasterEggFlyby',
  'easterEggFlyby',
  'easterEggTimer',
  'easterEggSeenIds',
  'lastEasterEgg',
  'activeEasterEgg',
  'easterEggSignals',
  'gameplay_easterEgg',
  'decorative_lore_signal',
  'legendaryFlyby'
];

const removedCopy = [
  'COIN GHOST RECEIPT',
  'The cabinet charged one invisible quarter. Accounting is terrified.',
  'THE BUTTON BLINKED BACK',
  'Cockpit hardware is now emotionally available. Bad timing, honestly.',
  'SNACK BAR WARP',
  'A vending machine crossed hyperspace and still forgot the spoon.',
  "KURT'S HAT SIGNAL",
  'A distant hill is transmitting rent complaints at weaponized volume.',
  "SONIA'S MIXTAPE",
  'Four centuries old, still too dramatic, somehow still your problem.',
  'INTERN FIXED PHYSICS',
  'Reality is held together with tape, spite, and one unpaid checkbox.',
  'TINYFOUNDRY AFTERBURNER',
  'A legal department said this glow was too much. We added two more.',
  'LEADERBOARD WHISPER',
  'The Top 40 just cleared its throat. It wants your initials and your lunch.',
  'VOID CUSTOMER SUPPORT',
  'Your ticket is important to the abyss. Estimated reply time: never.'
];

const runtimeFiles = [
  'src/scenes/PlayScene.js',
  'src/main.js'
];

assert(!existsSync(removedCatalog), 'ambient gameplay easter egg catalog must be removed');

for (const file of runtimeFiles) {
  const source = readFileSync(file, 'utf8');
  for (const snippet of removedRuntimeSnippets) {
    assert(!source.includes(snippet), `${file} still contains removed ambient easter egg runtime snippet: ${snippet}`);
  }
}

for (const locale of ['de', 'es', 'ja', 'ko', 'pt-BR', 'ru', 'zh-CN']) {
  const source = readFileSync(`src/i18n/locales/${locale}.js`, 'utf8');
  for (const snippet of removedCopy) {
    assert(!source.includes(snippet), `${locale} still ships removed ambient easter egg copy: ${snippet}`);
  }
}

const settingsOverlay = readFileSync('src/ui/SettingsOverlay.js', 'utf8');
assert(settingsOverlay.includes("source: 'credits_easter_egg'"), 'credits secret unlock easter egg should remain available');

const soundCatalog = readFileSync('src/audio/SoundCatalog.js', 'utf8');
assert(!soundCatalog.includes('space_tax_audit_flyby'), 'SoundCatalog must not register removed Space Tax Audit flyby SFX');
assert(!soundCatalog.includes('nova_space_tax_audit_flyby'), 'SoundCatalog must not reference removed Space Tax Audit audio file');

const assetManifest = readFileSync('src/assets/assetManifest.js', 'utf8');
assert(!assetManifest.includes('nova-space-tax-audit-flyby-20260623.png'), 'AssetManifest must not reference removed Space Tax Audit PNG');
assert(!assetManifest.includes('nova_space_tax_audit_flyby.mp3'), 'AssetManifest must not ship removed Space Tax Audit SFX');

console.log('[easter-eggs] PASS ambient gameplay easter egg flybys removed; credits secret remains');
