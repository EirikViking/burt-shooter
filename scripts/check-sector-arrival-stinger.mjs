import fs from 'node:fs';

const source = fs.readFileSync('src/scenes/PlayScene.js', 'utf8');
const errors = [];

function fail(message) {
  errors.push(message);
}

if (!source.includes('SECTOR_ARRIVAL_STINGER_MS = 2400')) {
  fail('sector arrival stinger should stay punchy at 2400ms');
}

if (!source.includes('showSectorArrivalStinger({ postBoss: postBossLevelIntro })')) {
  fail('startLevel should show the sector arrival stinger before the normal sector toast');
}

if (!source.includes('this.uiContainer.addChild(root)')) {
  fail('sector arrival stinger should render in uiContainer so the HUD remains above it');
}

if (!source.includes("root.zIndex = -20")) {
  fail('sector arrival stinger should stay behind the HUD layer');
}

if (!source.includes('getSectorCodexArt(level)') || !source.includes('getThreatCodexCatalog()')) {
  fail('sector arrival stinger should reuse sector Codex art and metadata');
}

if (!source.includes("translateText('NEON RADAR LOCK')") || !source.includes("translateText('THREAT DOSSIER: {hint}', { hint })")) {
  fail('sector arrival stinger labels should use localized existing strings');
}

if (!source.includes('this.clearSectorArrivalStinger();')) {
  fail('sector arrival stinger should clean up during scene lifecycle');
}

if (!source.includes('backdropBaseScale.value * (1 + progress * 0.035)')) {
  fail('sector arrival stinger should preserve cover scale while animating the art');
}

if (errors.length) {
  console.error(`[sector-arrival-stinger] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[sector-arrival-stinger] PASS punchy full-screen sector art stinger wired behind HUD');
