import { existsSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.CHECK_URL || 'http://127.0.0.1:4746';
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || 'test-results/new-pilot-menu-video');
const chromePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].filter(Boolean).find(existsSync);

mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(chromePath ? { executablePath: chromePath } : {}),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: {
    dir: outputDir,
    size: { width: 1280, height: 720 }
  }
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error?.message || String(error)));
await page.addInitScript(() => {
  localStorage.clear();
  localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
  localStorage.setItem('burt_voice_enabled', 'false');
  localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
    totalRuns: 0,
    bestScore: 0,
    bestSector: 1,
    bestLevel: 1,
    totalBossesDefeated: 0,
    totalWavesCleared: 0
  }));
});

await page.goto(`${baseUrl}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
await page.waitForTimeout(2400);
await page.mouse.move(860, 520);
await page.waitForTimeout(1400);
await page.mouse.move(1025, 352, { steps: 28 });
await page.waitForTimeout(4200);
await page.mouse.move(1115, 520, { steps: 18 });
await page.waitForTimeout(1600);

if (errors.length) throw new Error(`New-pilot menu capture page errors: ${errors.join(' | ')}`);
const video = page.video();
await context.close();
await browser.close();
const rawPath = await video.path();
const finalPath = path.join(outputDir, 'nova-swarm-new-pilot-menu.webm');
if (path.resolve(rawPath) !== path.resolve(finalPath)) renameSync(rawPath, finalPath);
console.log(JSON.stringify({ status: 'passed', finalPath, viewport: '1280x720', pageErrors: errors }, null, 2));
