import fs from 'node:fs';

const source = fs.readFileSync('src/scenes/PlayScene.js', 'utf8');
const enemyManagerSource = fs.readFileSync('src/managers/EnemyManager.js', 'utf8');
const errors = [];

function fail(message) {
  errors.push(message);
}

if (!source.includes('SECTOR_ARRIVAL_STINGER_MS = 1100 + GAMEPLAY_MESSAGE_EXTRA_READ_MS')) {
  fail('sector arrival stinger should use the compact 2100ms readable window');
}

if (!source.includes('showSectorArrivalStinger({ postBoss: postBossLevelIntro })')) {
  fail('startLevel should show the sector arrival stinger before the normal sector toast');
}

if (!source.includes('getSectorArrivalEntry(level)') || !source.includes('getSectorArrivalSignal(safeLevel)')) {
  fail('sector arrival stinger should reuse the lightweight Threat Codex sector signal');
}

const stingerStart = source.indexOf('showSectorArrivalStinger({ postBoss = false } = {})');
const stingerEnd = source.indexOf('\n  update(delta) {', stingerStart);
const stingerSource = stingerStart >= 0 && stingerEnd > stingerStart
  ? source.slice(stingerStart, stingerEnd)
  : '';

if (!stingerSource) {
  fail('sector arrival stinger implementation was not found');
} else {
  const requiredCompactTokens = [
    'this.enqueueToast(',
    '`${sectorLabel} // ${pressure}`',
    "slot: 'top'",
    "type: 'sector_arrival'",
    'extraReadTimeMs: GAMEPLAY_MESSAGE_EXTRA_READ_MS',
    'transition: true'
  ];
  requiredCompactTokens.forEach((token) => {
    if (!stingerSource.includes(token)) fail(`compact sector arrival stinger is missing ${token}`);
  });
  const forbiddenHotPathTokens = [
    'PIXI.Assets.load(',
    'preloadSectorArrivalArt(',
    'new PIXI.Container(',
    'new PIXI.Graphics(',
    'createText(',
    'ticker.add('
  ];
  forbiddenHotPathTokens.forEach((token) => {
    if (stingerSource.includes(token)) fail(`sector arrival hot path should not include ${token}`);
  });
}

if (!source.includes('RUN_MODES.SECTOR_START') ||
  !source.includes('sectorStartPlaySector') ||
  !source.includes('shouldShowSectorArrivalStinger') ||
  !source.includes('return safeLevel > this.getRunStartSector();')) {
  fail('sector arrival stinger should skip sector 1 and the initial Sector Start challenge sector');
}

const startPrewarmIndex = source.indexOf('this.prewarmLevelEntryAssets(this.game.level, { ahead: 2 })');
const scheduledEnemyStartIndex = source.indexOf('this.scheduleEnemyStartForLevel(this.game.level, {');
if (startPrewarmIndex < 0 || scheduledEnemyStartIndex < 0 || startPrewarmIndex > scheduledEnemyStartIndex) {
  fail('incoming generated enemy textures should begin prewarming before the first wave');
}

if (!source.includes('getGeneratedEnemyProfilesForLevel') || !source.includes('GameAssets.getGeneratedEnemyTexture(index)')) {
  fail('level entry warmup should include generated enemy ship textures for the incoming sector');
}

const showArrivalIndex = source.indexOf('this.showSectorArrivalStinger({ postBoss: postBossLevelIntro })');
if (!source.includes('pendingEnemyStartTimeout') ||
  !source.includes('getSectorArrivalStingerDuration({ postBoss: postBossLevelIntro }) + 120') ||
  !source.includes('this.enemyManager?.beginLevelEntryHold?.(targetLevel)') ||
  showArrivalIndex < 0 ||
  scheduledEnemyStartIndex < 0 ||
  showArrivalIndex > scheduledEnemyStartIndex) {
  fail('enemy wave release should remain delayed until the compact sector signal finishes');
}

const holdIndex = source.indexOf('this.enemyManager?.beginLevelEntryHold?.(targetLevel)');
const releaseIndex = source.indexOf('this.pendingEnemyStartTimeout = setTimeout(startEnemies, delayMs)');
if (holdIndex < 0 || releaseIndex < 0 || holdIndex > releaseIndex) {
  fail('delayed sector entry should put EnemyManager into a guarded hold before its timeout');
}

if (!enemyManagerSource.includes('beginLevelEntryHold(level)') ||
  !enemyManagerSource.includes("this.state = 'LEVEL_ENTRY_HOLD'") ||
  !enemyManagerSource.includes("this.phase = 'ENTRY_HOLD'")) {
  fail('EnemyManager should expose a non-complete level entry hold state');
}

if (!source.includes('scheduleEnemyStartForLevel(level') ||
  !source.includes('this.enemyManager.startLevel(targetLevel)') ||
  !source.includes('this.enemyManager.forceBossStart(targetLevel)')) {
  fail('normal and debug boss starts should remain behind one guarded helper');
}

if (!source.includes('if (!this.introActive && !this.pendingEnemyStartTimeout)') ||
  !source.includes('this.gameTime += delta / 60')) {
  fail('run clock should advance only after intro and sector-entry holds finish');
}

if (!source.includes('this.clearSectorArrivalStinger();') || !source.includes('if (stinger.timeout) clearTimeout(stinger.timeout)')) {
  fail('sector arrival stinger should clean up during scene lifecycle');
}

if (errors.length) {
  console.error(`[sector-arrival-stinger] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[sector-arrival-stinger] PASS compact performance-safe radar signal wired behind HUD');
