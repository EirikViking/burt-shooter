import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, VOICE_MIX } from '../src/audio/SoundCatalog.js';
import {
  MENU_BOSS_BARK_DEFAULT_VOICE_ID,
  MENU_BOSS_BARK_EVENT_COUNTS,
  MENU_BOSS_BARK_TOTAL_COUNT,
  MENU_BOSS_BARK_VARIANTS_PER_EVENT,
  menuBossBarkGroups,
  menuBossBarkLines
} from '../src/config/MenuBossBarkLines.js';
import {
  RUN_MODE_NARRATION_EVENT_IDS,
  RUN_MODE_NARRATION_SPECS
} from '../src/config/RunModeNarration.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(rootDir, 'public');
const errors = [];
const MISFIT_GALAXY_MALE_VOICE_ID = 'YO6HUzlgJ0HQvmYejW5c';

function fail(message) {
  errors.push(message);
}

if (MENU_BOSS_BARK_DEFAULT_VOICE_ID !== MISFIT_GALAXY_MALE_VOICE_ID) {
  fail(`menu boss barks must use the boss voice id ${MISFIT_GALAXY_MALE_VOICE_ID}`);
}

if (menuBossBarkGroups.length < 10) {
  fail(`expected at least 10 menu boss bark groups, got ${menuBossBarkGroups.length}`);
}

if (menuBossBarkLines.length !== MENU_BOSS_BARK_TOTAL_COUNT) {
  fail(`expected ${MENU_BOSS_BARK_TOTAL_COUNT} menu boss barks, got ${menuBossBarkLines.length}`);
}

const ids = new Set();
const texts = new Set();
for (const group of menuBossBarkGroups) {
  if (!group.event?.startsWith('boss_menu_bark_')) fail(`bad menu boss bark event: ${group.event}`);
  const expectedCount = group.isRunModeNarration
    ? 1
    : group.id === 'idle'
      ? 30
      : MENU_BOSS_BARK_VARIANTS_PER_EVENT;
  if (group.lines.length !== expectedCount) {
    fail(`${group.id} expected ${expectedCount} variants, got ${group.lines.length}`);
  }
  if (MENU_BOSS_BARK_EVENT_COUNTS[group.event] !== group.lines.length) {
    fail(`${group.event} count map mismatch`);
  }
}

const modeNarrationGroups = menuBossBarkGroups.filter((group) => group.isRunModeNarration);
if (modeNarrationGroups.length !== RUN_MODE_NARRATION_EVENT_IDS.length) {
  fail(`expected ${RUN_MODE_NARRATION_EVENT_IDS.length} dedicated mode narration groups, got ${modeNarrationGroups.length}`);
}
if (new Set(RUN_MODE_NARRATION_EVENT_IDS).size !== RUN_MODE_NARRATION_EVENT_IDS.length) {
  fail('every selectable run-mode narration state must use a unique event');
}
for (const spec of RUN_MODE_NARRATION_SPECS) {
  for (const narration of [spec, ...spec.variants.map((variant) => ({ ...spec, ...variant }))]) {
    const group = modeNarrationGroups.find((entry) => entry.event === narration.event);
    if (!group) fail(`missing dedicated mode narration group for ${narration.modeId}: ${narration.event}`);
    if (group?.lines?.[0] !== narration.transcriptSource) {
      fail(`mode narration transcript mismatch for ${narration.modeId}`);
    }
  }
}

const idleGroup = menuBossBarkGroups.find((group) => group.id === 'idle');
if (!idleGroup) fail('missing idle menu boss bark group');
const idleChallengeLines = idleGroup?.lines.filter((line) => /\b(run|launch|mayhem|score|swarm|ship|button|leaderboard|boss|thumbs|lasers|cabinet)\b/i.test(line)).length || 0;
if (idleGroup && idleChallengeLines < 24) {
  fail('idle menu barks should challenge the player toward another run');
}

for (const line of menuBossBarkLines) {
  if (!/^boss_menu_bark_[a-z_]+_\d{3}$/.test(line.id)) fail(`bad menu boss bark id: ${line.id}`);
  if (!line.text || line.text.length < 12) fail(`menu boss bark line too short: ${line.id}`);
  if (!line.generationText?.includes('boss voice')) fail(`menu boss bark ${line.id} missing boss voice generation direction`);
  if (ids.has(line.id)) fail(`duplicate menu boss bark id: ${line.id}`);
  if (texts.has(line.text)) fail(`duplicate menu boss bark text: ${line.text}`);
  ids.add(line.id);
  texts.add(line.text);
}

const expectedUrls = menuBossBarkLines.map((line) => `/audio/voice/menu-boss-barks/${line.id}.mp3`);
const manifestVoiceUrls = AssetManifest.audio.voice.filter((url) => url.includes('/audio/voice/menu-boss-barks/'));
if (manifestVoiceUrls.length !== MENU_BOSS_BARK_TOTAL_COUNT) {
  fail(`AssetManifest menu boss bark count expected ${MENU_BOSS_BARK_TOTAL_COUNT}, got ${manifestVoiceUrls.length}`);
}

for (const url of expectedUrls) {
  if (!AssetManifest.audio.voice.includes(url)) fail(`AssetManifest missing ${url}`);
  const file = path.join(publicDir, url.replace(/^\//, ''));
  if (!fs.existsSync(file)) {
    fail(`missing menu boss bark file: ${url}`);
    continue;
  }
  const size = fs.statSync(file).size;
  if (size < 1000) fail(`menu boss bark file is suspiciously small (${size} bytes): ${url}`);
}

for (const group of menuBossBarkGroups) {
  const catalog = SFX_CATALOG[group.event] || [];
  const expectedCount = MENU_BOSS_BARK_EVENT_COUNTS[group.event] || 0;
  if (catalog.length !== expectedCount) {
    fail(`SFX_CATALOG.${group.event} expected ${expectedCount}, got ${catalog.length}`);
  }
  if (!VOICE_MIX[group.event]) fail(`VOICE_MIX.${group.event} missing`);
  for (let index = 0; index < expectedCount; index += 1) {
    const expected = `/audio/voice/menu-boss-barks/${group.event}_${String(index + 1).padStart(3, '0')}.mp3`;
    if (!catalog.includes(expected)) fail(`SFX_CATALOG.${group.event} missing ${expected}`);
  }
}

for (const oldTickEvent of ['ui_open', 'menuSelect']) {
  const variants = SFX_CATALOG[oldTickEvent] || [];
  if (variants.some((src) => String(src).includes('nova_menu_tick'))) {
    fail(`${oldTickEvent} should not include the old nova_menu_tick robot sound`);
  }
}

const menuSceneSource = fs.readFileSync(path.join(rootDir, 'src/scenes/MenuScene.js'), 'utf8');
for (const snippet of [
  'playBossMenuBarkForButton',
  'playBossMenuBarkForOption',
  'MENU_BOSS_BARK_FOCUS_DELAY_MS',
  'scheduleBossMenuBark',
  'hasActiveMenuBossBarkVoice',
  "exclusiveGroup: 'boss_menu_bark'",
  "Focus barks wait before starting, but click barks must be able to cut a hover bark cleanly.",
  'showBossMenuBarkVfx',
  'playMenuFocusSfx',
  'setupMenuActivityTracking',
  'scheduleNextIdleBossBark',
  'updateIdleBossMenuBark',
  "this.playBossMenuBark('idle'"
]) {
  if (!menuSceneSource.includes(snippet)) fail(`MenuScene missing ${snippet}`);
}
if (menuSceneSource.includes("AudioManager.playSfx('thrusterFire', { volume: 0.07, minIntervalMs: 90 })")) {
  fail('menu navigation should not use the old thrusterFire focus chirp');
}
if (menuSceneSource.includes("exclusiveGroup: isActivate ? 'boss_menu_bark' : null")) {
  fail('hover/focus menu barks must also use the boss_menu_bark group so click barks can cut them cleanly');
}

const fxSource = fs.readFileSync(path.join(rootDir, 'src/ui/MenuFxLayer.js'), 'utf8');
if (!fxSource.includes('playMenuFocusSfx')) fail('MenuFxLayer should still expose playMenuFocusSfx');
if (fxSource.includes("AudioManager.playSfx('menu_tick'")) {
  fail('playMenuFocusSfx should no longer play the annoying robot tick');
}

if (errors.length) {
  console.error('[menu-boss-barks] FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[menu-boss-barks] PASS voices=${MENU_BOSS_BARK_TOTAL_COUNT} groups=${menuBossBarkGroups.length}`);
