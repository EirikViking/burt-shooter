import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findPort(4628);
const baseUrl = `http://${host}:${port}`;
const outputDir = path.resolve(`test-results/combat-clarity-visuals-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findPort(start) {
  for (let portNumber = start; portNumber < start + 30; portNumber += 1) {
    const free = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(portNumber, host);
    });
    if (free) return portNumber;
  }
  throw new Error('No visual-capture port available.');
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find(existsSync);
}

mkdirSync(outputDir, { recursive: true });
const server = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), '--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});
server.stdout.on('data', (data) => process.stdout.write(`[vite] ${data}`));
server.stderr.on('data', (data) => process.stderr.write(`[vite] ${data}`));

for (let waited = 0; waited < 30000; waited += 250) {
  try {
    if ((await fetch(baseUrl)).ok) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 250));
}

const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const report = { outputDir, captures: [] };

try {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 960, height: 640 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => {
      const play = window.__game?.scenes?.play;
      return Boolean(play?.player && play?.hud && play?.gameplayBackdrop && play?.enqueueToast);
    }, null, { timeout: 30000 });
    await page.evaluate(() => {
      const play = window.__game.scenes.play;
      play.introActive = false;
      play.introComplete = true;
      play.isPaused = true;
      play.clearToastState();
      if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
      const originalBullets = play.bulletManager.enemyBullets;
      play.__combatClarityVisualOriginalBullets = originalBullets;
      play.bulletManager.enemyBullets = Array.from({ length: 120 }, () => ({ active: true, visible: true }));
      for (let i = 0; i < 40; i += 1) play.updateCombatBackdropClarity(50);
      play.enqueueToast('SIDE DIRECTIVE COMPLETE\nREWARD: EXTRA RESCAN', {
        type: 'tacticalDirective',
        priority: 4,
        duration: 5000,
        extraReadTimeMs: 0,
        routineFocusLane: true,
        maxQueueAgeMs: 1800,
        accent: 0xffef7e
      });
    });
    await page.waitForTimeout(420);
    const file = path.join(outputDir, `combat-clarity-${viewport.width}x${viewport.height}.png`);
    await page.screenshot({ path: file });
    const state = await page.evaluate(() => {
      const play = window.__game.scenes.play;
      const bounds = play.getToastDisplayBounds(play.activeTopToast);
      return {
        clarity: play.getCombatBackdropClarityDebugState(),
        topToast: play.getToastDebugState().active.find((entry) => entry.slot === 'top') || null,
        bounds,
        screen: { width: play.game.getWidth(), height: play.game.getHeight() }
      };
    });
    if (!state.topToast || state.topToast.type !== 'tacticalDirective') throw new Error(`Focus lane missing: ${JSON.stringify(state)}`);
    if (state.clarity.suppression > 0.18 || state.clarity.suppression < 0.17) throw new Error(`Clarity cap mismatch: ${JSON.stringify(state)}`);
    if (!state.bounds || state.bounds.x < 24 || state.bounds.x + state.bounds.width > state.screen.width - 24) {
      throw new Error(`Focus lane unsafe: ${JSON.stringify(state)}`);
    }
    report.captures.push({ file, viewport, state });
    await page.close();
  }
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[combat-clarity-visuals] PASS captures=${report.captures.length} output=${outputDir}`);
} finally {
  await browser.close();
  server.kill();
}
