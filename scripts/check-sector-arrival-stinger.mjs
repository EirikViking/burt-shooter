import fs from 'node:fs';

const source = fs.readFileSync('src/scenes/PlayScene.js', 'utf8');
const enemyManagerSource = fs.readFileSync('src/managers/EnemyManager.js', 'utf8');
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

if (!source.includes('getSectorCodexArt(safeLevel)') || !source.includes('getThreatCodexCatalog()')) {
  fail('sector arrival stinger should reuse sector Codex art and metadata');
}

const stingerStart = source.indexOf('showSectorArrivalStinger({ postBoss = false } = {})');
const stingerEnd = source.indexOf('const shade = new PIXI.Graphics();', stingerStart);
const stingerSetupSource = stingerStart >= 0 && stingerEnd > stingerStart
  ? source.slice(stingerStart, stingerEnd)
  : '';
if (!source.includes('preloadSectorArrivalArt') || stingerSetupSource.includes('PIXI.Assets.load(')) {
  fail('sector arrival stinger art should be preloaded through the warm cache, not loaded cold during display');
}

if (!source.includes('RUN_MODES.SECTOR_START') ||
  !source.includes('sectorStartPlaySector') ||
  !source.includes('shouldShowSectorArrivalStinger') ||
  !source.includes('return safeLevel > this.getRunStartSector();')) {
  fail('sector arrival stinger should skip sector 1 and the initial Sector Start challenge sector');
}

if (!source.includes('prepare.upload(texture)')) {
  fail('sector arrival stinger should prepare textures for render to avoid first-use GPU upload hitches');
}

const startPrewarmIndex = source.indexOf('this.prewarmLevelEntryAssets(this.game.level, { ahead: 2 })');
const scheduledEnemyStartIndex = source.indexOf('this.scheduleEnemyStartForLevel(this.game.level, {');
if (startPrewarmIndex < 0 || scheduledEnemyStartIndex < 0 || startPrewarmIndex > scheduledEnemyStartIndex) {
  fail('level entry assets should begin prewarming before enemyManager.startLevel spawns the first wave');
}

const showArrivalIndex = source.indexOf('this.showSectorArrivalStinger({ postBoss: postBossLevelIntro })');
if (
  !source.includes('pendingEnemyStartTimeout') ||
  !source.includes('getSectorArrivalStingerDuration({ postBoss: postBossLevelIntro }) + 120') ||
  !source.includes('this.enemyManager?.beginLevelEntryHold?.(targetLevel)') ||
  showArrivalIndex < 0 ||
  scheduledEnemyStartIndex < 0 ||
  showArrivalIndex > scheduledEnemyStartIndex
) {
  fail('enemy wave release should be delayed until the visible sector arrival stinger is finished');
}

const holdIndex = source.indexOf('this.enemyManager?.beginLevelEntryHold?.(targetLevel)');
const releaseIndex = source.indexOf('this.pendingEnemyStartTimeout = setTimeout(startEnemies, delayMs)');
if (holdIndex < 0 || releaseIndex < 0 || holdIndex > releaseIndex) {
  fail('delayed sector entry should put EnemyManager into a non-complete hold before the timeout starts');
}

if (!enemyManagerSource.includes('beginLevelEntryHold(level)') ||
  !enemyManagerSource.includes("this.state = 'LEVEL_ENTRY_HOLD'") ||
  !enemyManagerSource.includes("this.phase = 'ENTRY_HOLD'")) {
  fail('EnemyManager should expose a non-complete level entry hold state for delayed arrivals');
}

if (!source.includes('scheduleEnemyStartForLevel(level') ||
  !source.includes('this.enemyManager.startLevel(targetLevel)') ||
  !source.includes('this.enemyManager.forceBossStart(targetLevel)')) {
  fail('delayed enemy release should keep normal and explicit debug boss starts behind one guarded helper');
}

if (!source.includes('getGeneratedEnemyProfilesForLevel') || !source.includes('GameAssets.getGeneratedEnemyTexture(index)')) {
  fail('level entry warmup should include generated enemy ship textures for the incoming sector');
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
