import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = Number(process.env.CHECK_PORT) || await findAvailablePort(4720);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/tactical-boss-banter-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error('No tactical boss banter check port available');
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startPreview() {
  if (await canFetch(baseUrl)) return null;
  const vite = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [vite, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error('Tactical boss banter preview did not start');
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForPlay(page) {
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && state.player?.active === true;
  }, null, { timeout: 30000 });
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (!play) return;
    play.debugInvincible = true;
    play.player?.grantInvulnerability?.(120000, 'tactical_boss_banter_check');
  });
}

async function waitForBanter(page, { id, context, after = 0 }) {
  await page.waitForFunction(({ id, context, after }) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.tacticalDraft?.lastBossBanterId === id
      && state.tacticalDraft?.lastBossBanterContext === context
      && state.tacticalDraft?.lastBossBanterAt > after
      && state.audio?.lastVoiceEvent === `boss_tactical_inspect_${id}`
      && String(state.audio?.lastVoiceTrack || '').startsWith(`boss_tactical_inspect_${id}_`);
  }, { id, context, after }, { timeout: 24000 });
  return readState(page);
}

function activeTacticalVoice(state) {
  return (state.audio?.activeVoiceEvents || []).some((entry) => entry.group === 'boss_tactical_inspect');
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreview();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const consoleErrors = [];
const report = { ok: false, baseUrl, outputDir, loadout: {}, draft: {} };

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => {
    localStorage.setItem('burt_voice_enabled', 'true');
    localStorage.setItem('burt_boss_voice_enabled', 'true');
  });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`console: ${message.text()}`);
  });
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlay(page);

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.player.runAugmentIds = ['damage_up', 'rapid_fire', 'shield', 'magnet', 'drones', 'combo_anchor'];
    play.player.consumedRunAugmentIds = [];
    play.setPaused(true);
    play.openTacticalLoadoutOverlay();
  });
  let state = await waitForBanter(page, { id: 'damage_up', context: 'loadout' });
  const firstDamageTrack = state.audio.lastVoiceTrack;
  report.loadout.initial = { id: 'damage_up', track: firstDamageTrack };
  await page.screenshot({ path: path.join(outputDir, 'tactical-loadout-boss-banter.png') });

  const initialAt = state.tacticalDraft.lastBossBanterAt;
  await page.keyboard.press('ArrowDown');
  state = await waitForBanter(page, { id: 'rapid_fire', context: 'loadout', after: initialAt });
  const rapidAt = state.tacticalDraft.lastBossBanterAt;
  report.loadout.keyboardFocus = { id: 'rapid_fire', track: state.audio.lastVoiceTrack };

  await page.keyboard.press('ArrowUp');
  state = await waitForBanter(page, { id: 'damage_up', context: 'loadout', after: rapidAt });
  assert(state.audio.lastVoiceTrack !== firstDamageTrack, 'revisiting an augment repeated the prior voice variant');
  const revisitAt = state.tacticalDraft.lastBossBanterAt;
  report.loadout.revisit = { id: 'damage_up', track: state.audio.lastVoiceTrack, varied: true };

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalLoadoutOverlay?.detail?.id === 'damage_up');
  state = await waitForBanter(page, { id: 'damage_up', context: 'loadout', after: revisitAt });
  report.loadout.detail = { id: state.tacticalLoadoutOverlay.detail.id, track: state.audio.lastVoiceTrack };
  await page.screenshot({ path: path.join(outputDir, 'tactical-upgrade-detail-boss-banter.png') });

  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalLoadoutOverlay === null);
  await page.waitForFunction(() => !(JSON.parse(window.render_game_to_text()).audio?.activeVoiceEvents || [])
    .some((entry) => entry.group === 'boss_tactical_inspect'));

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.setPaused(false);
    play.openTacticalDraft({ sectorCleared: 1 });
  });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === true);
  state = await readState(page);
  const initialDraftId = state.tacticalDraft.offers[state.tacticalDraft.focusIndex].id;
  state = await waitForBanter(page, { id: initialDraftId, context: 'draft' });
  report.draft.initial = { id: initialDraftId, track: state.audio.lastVoiceTrack };
  await page.screenshot({ path: path.join(outputDir, 'tactical-draft-boss-banter.png') });

  const draftAt = state.tacticalDraft.lastBossBanterAt;
  const finalFocusId = await page.evaluate(async () => {
    const play = window.__game.scenes.play;
    const start = play.tacticalDraft.focusIndex;
    play.setTacticalDraftFocus(start + 1);
    await new Promise((resolve) => setTimeout(resolve, 120));
    play.setTacticalDraftFocus(start + 2);
    return play.tacticalDraft.offers[play.tacticalDraft.focusIndex].id;
  });
  state = await waitForBanter(page, { id: finalFocusId, context: 'draft', after: draftAt });
  assert(state.tacticalDraft.pendingBossBanterId === null, 'rapid focus debounce left a pending comment');
  report.draft.debouncedFocus = { id: finalFocusId, track: state.audio.lastVoiceTrack };

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.tacticalDraft.inputArmed = true;
    play.confirmTacticalDraft(play.tacticalDraft.focusIndex, 'pointer');
  });
  await page.waitForFunction(() => !(JSON.parse(window.render_game_to_text()).audio?.activeVoiceEvents || [])
    .some((entry) => entry.group === 'boss_tactical_inspect'));
  state = await readState(page);
  assert(!activeTacticalVoice(state), 'confirming the Draft did not stop tactical boss banter');
  report.draft.confirmStopsVoice = true;

  assert(consoleErrors.length === 0, `browser errors: ${consoleErrors.join(' | ')}`);
  report.ok = true;
  report.consoleErrors = consoleErrors;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`PASS tactical boss banter runtime: loadout focus/detail/randomization, Draft debounce, and confirm cancellation (${outputDir})`);
} catch (error) {
  report.consoleErrors = consoleErrors;
  report.error = error?.stack || String(error);
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  throw error;
} finally {
  await browser.close();
  server?.kill();
}
