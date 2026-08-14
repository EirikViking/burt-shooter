import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.CHECK_URL || 'http://127.0.0.1:4739';
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || 'test-results/menu-readability-review');
const viewport = {
  width: Number(process.env.CHECK_WIDTH) || 1920,
  height: Number(process.env.CHECK_HEIGHT) || 1080
};
const auditUiScale = Number(process.env.CHECK_UI_SCALE) || 1;
const auditProgressedProfile = process.env.CHECK_PROGRESS === '1';
const chromePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].filter(Boolean).find((candidate) => existsSync(candidate));

mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(chromePath ? { executablePath: chromePath } : {}) });
const page = await browser.newPage({ viewport });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error?.message || String(error)));

await page.addInitScript(({ uiScale, progressed }) => {
  localStorage.setItem('nova_ui_scale_v1', String(uiScale));
  const raw = localStorage.getItem('nova.hangarProgress.v1');
  const progress = raw ? JSON.parse(raw) : {};
  localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
    ...progress,
    totalRuns: progressed ? 64 : 0,
    bestScore: progressed ? 420000 : 0,
    bestSector: progressed ? 60 : 1,
    bestLevel: progressed ? 60 : 1,
    totalBossesDefeated: progressed ? 72 : 0,
    totalWavesCleared: progressed ? 360 : 0
  }));
}, { uiScale: auditUiScale, progressed: auditProgressedProfile });

await page.goto(`${baseUrl}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
await page.waitForTimeout(2400);
await page.screenshot({ path: path.join(outputDir, '01-main-menu.png') });

const mainState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
const menu = mainState?.menu || mainState;
const missionBoard = menu?.missionBoard;
const missionBriefing = menu?.missionBriefing;
const newPilot = menu?.newPilot;
const utilities = menu?.utilities;
if (missionBoard && missionBoard.hidden !== true) {
  throw new Error('Permanent Pilot Orders board must be hidden on the main menu.');
}
const expectedLaunchLabel = auditProgressedProfile ? 'PLAY' : 'START PLAYING';
if (missionBriefing?.launchButtonLabel !== expectedLaunchLabel) {
  throw new Error(`CTA must be ${expectedLaunchLabel}, got ${missionBriefing?.launchButtonLabel || 'missing'}.`);
}
if (!auditProgressedProfile && missionBriefing?.launchFocused !== true) {
  throw new Error('Fresh-profile START PLAYING action must receive initial focus.');
}
if (!auditProgressedProfile && newPilot?.cueVisible !== true) {
  throw new Error('Fresh-profile new-pilot cue must be visible.');
}
if (!auditProgressedProfile && (!newPilot?.arrowVisibleBounds || !newPilot?.labelFrameBounds || !newPilot?.labelBounds)) {
  throw new Error('Fresh-profile cue must expose measurable arrow, label, and frame bounds.');
}
if (!auditProgressedProfile && newPilot.targetClearance < 12) {
  throw new Error(`New-pilot cue must keep at least 12 px from the run-card frame, got ${newPilot.targetClearance}.`);
}
const frame = newPilot.labelFrameBounds;
const label = newPilot.labelBounds;
const minimumTextClearance = Math.min(12, Math.max(8, Math.round(viewport.width / 160)));
const textClearance = frame && label ? {
  left: label.x - frame.x,
  top: label.y - frame.y,
  right: frame.right - label.right,
  bottom: frame.bottom - label.bottom
} : null;
if (!auditProgressedProfile) {
  for (const [edge, clearance] of Object.entries(textClearance || {})) {
    if (clearance < minimumTextClearance) {
      throw new Error(`New-pilot label ${edge} clearance is ${clearance}px; requires ${minimumTextClearance}px.`);
    }
  }
}
const launchFrame = missionBriefing?.launchButtonBounds;
const launchLabel = missionBriefing?.launchButtonLabelBounds;
if (!launchFrame || !launchLabel) throw new Error('START PLAYING button bounds are missing.');
for (const [edge, clearance] of Object.entries({
  left: launchLabel.x - launchFrame.x,
  top: launchLabel.y - launchFrame.y,
  right: launchFrame.right - launchLabel.right,
  bottom: launchFrame.bottom - launchLabel.bottom
})) {
  if (clearance < minimumTextClearance) {
    throw new Error(`START PLAYING label ${edge} clearance is ${clearance}px; requires ${minimumTextClearance}px.`);
  }
}
if (!(utilities?.exitBounds?.x < utilities?.helpBounds?.x && utilities?.helpBounds?.x < utilities?.musicBounds?.x)) {
  throw new Error('Top-right utilities must read EXIT GAME, HOW TO PLAY, MUSIC from left to right.');
}
if (Math.max(
  Math.abs(utilities.exitBounds.y - utilities.helpBounds.y),
  Math.abs(utilities.helpBounds.y - utilities.musicBounds.y)
) > 2) {
  throw new Error('Top-right utility buttons must share one aligned row.');
}

await page.evaluate(() => window.__game?.currentScene?.openSettingsOverlay?.());
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(outputDir, '02-settings.png') });
await page.evaluate(() => window.__game?.currentScene?.settingsOverlay?.setActiveSettingsPage?.('audio'));
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(outputDir, '02b-settings-audio.png') });
await page.keyboard.press('Escape');

await page.evaluate(() => window.__game?.currentScene?.openModeBriefing?.());
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(outputDir, '03-mode-details.png') });
await page.evaluate(() => window.__game?.currentScene?.closeModeBriefing?.());

await page.evaluate(async () => window.__game?.showShipSelect?.());
await page.waitForTimeout(1800);
await page.screenshot({ path: path.join(outputDir, '04-hangar.png') });

await page.evaluate(() => window.__game?.switchScene?.('highscore'));
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(outputDir, '05-leaderboard.png') });

await page.evaluate(() => window.__game?.switchScene?.('threatCodex'));
await page.waitForTimeout(1400);
await page.screenshot({ path: path.join(outputDir, '06-codex.png') });

await page.evaluate(() => window.__game?.switchScene?.('achievements'));
await page.waitForTimeout(1400);
await page.screenshot({ path: path.join(outputDir, '07-achievements.png') });

await browser.close();
console.log(JSON.stringify({ outputDir, viewport, textClearance, pageErrors, status: pageErrors.length ? 'failed' : 'passed' }, null, 2));
if (pageErrors.length) process.exitCode = 1;
