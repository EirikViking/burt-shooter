import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const outputDir = path.resolve(`test-results/gameplay-backdrop-runtime-${Date.now()}`);
fs.mkdirSync(outputDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function findPort(start = 4792) {
  for (let port = start; port < start + 40; port += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(port, host);
    });
    if (available) return port;
  }
  throw new Error('No free backdrop runtime port');
}

async function waitForUrl(url) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return;
    } catch { }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Vite did not start at ${url}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => fs.existsSync(candidate));
}

const port = await findPort();
const baseUrl = `http://${host}:${port}`;
const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
const server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});
server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));

let browser;
try {
  await waitForUrl(baseUrl);
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      version: 4,
      totalRuns: 1,
      bestScore: 1000,
      bestLevel: 1,
      bestSector: 1,
      pilotXp: 0,
      pilotRank: 0,
      unlockedShipIds: ['nova_ship_01']
    }));
  });
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return window.__game?.currentSceneName === 'play'
      && Boolean(play?.gameplayBackdrop?.parent)
      && Boolean(play?.gameplayStormBackdrop?.parent)
      && Boolean(play?.gameplayBossBackdrop?.parent);
  }, null, { timeout: 30000 });

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.isPaused = true;
    play.clearToastState?.();
    if (play.introActive) play.completeShipIntro?.();
  });

  const snapshot = () => page.evaluate(() => {
    const play = window.__game.scenes.play;
    const read = (sprite) => sprite ? {
      x: sprite.x,
      y: sprite.y,
      alpha: sprite.alpha,
      renderable: sprite.renderable,
      scale: sprite.scale.x,
      textureWidth: sprite.texture?.width || 0,
      textureHeight: sprite.texture?.height || 0
    } : null;
    return {
      mode: play.gameplayBackdropMode,
      width: play.gameplayBackdropWidth,
      height: play.gameplayBackdropHeight,
      reducedMotion: play.gameplayBackdropReducedMotion,
      base: read(play.gameplayBackdrop),
      storm: read(play.gameplayStormBackdrop),
      boss: read(play.gameplayBossBackdrop),
      shadeAlpha: play.gameplayBackdropShade?.alpha ?? null
    };
  });

  const assertCoverage = (state, label) => {
    for (const key of ['base', 'storm', 'boss']) {
      const sprite = state[key];
      assert(sprite, `${label} missing ${key} sprite`);
      const halfWidth = sprite.textureWidth * sprite.scale / 2;
      const halfHeight = sprite.textureHeight * sprite.scale / 2;
      assert(sprite.x - halfWidth <= 0.01, `${label} ${key} exposed left edge`);
      assert(sprite.x + halfWidth >= state.width - 0.01, `${label} ${key} exposed right edge`);
      assert(sprite.y - halfHeight <= 0.01, `${label} ${key} exposed top edge`);
      assert(sprite.y + halfHeight >= state.height - 0.01, `${label} ${key} exposed bottom edge`);
    }
  };

  const baseBefore = await snapshot();
  await page.screenshot({ path: path.join(outputDir, 'base-before.png'), fullPage: true });
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    for (let index = 0; index < 120; index += 1) play.updateGameplayBackdrop(6);
  });
  const baseAfter = await snapshot();
  const baseTravelDistance = Math.hypot(
    baseAfter.base.x - baseBefore.base.x,
    baseAfter.base.y - baseBefore.base.y
  );
  assert(baseAfter.mode === 'base', `expected base mode, got ${baseAfter.mode}`);
  assert(baseTravelDistance > 24, `base backdrop camera travel was too subtle (${baseTravelDistance.toFixed(1)}px)`);
  assertCoverage(baseAfter, 'base');
  await page.screenshot({ path: path.join(outputDir, 'base-drift.png'), fullPage: true });

  await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    game.level = 3;
    play.applyGameplayBackdropLevel(3);
    for (let index = 0; index < 12; index += 1) play.updateGameplayBackdrop(6);
  });
  const storm = await snapshot();
  assert(storm.mode === 'storm', `expected storm mode, got ${storm.mode}`);
  assert(Math.abs(storm.base.alpha - 0.26) < 0.01, `wrong storm base alpha ${storm.base.alpha}`);
  assert(Math.abs(storm.storm.alpha - 0.34) < 0.01, `wrong storm alpha ${storm.storm.alpha}`);
  assertCoverage(storm, 'storm');
  await page.screenshot({ path: path.join(outputDir, 'storm-drift.png'), fullPage: true });

  await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    game.level = 5;
    play.applyGameplayBackdropLevel(5);
    for (let index = 0; index < 12; index += 1) play.updateGameplayBackdrop(6);
  });
  const boss = await snapshot();
  assert(boss.mode === 'boss', `expected boss mode, got ${boss.mode}`);
  assert(Math.abs(boss.boss.alpha - 0.4) < 0.01, `wrong boss alpha ${boss.boss.alpha}`);
  assert(Math.abs(boss.shadeAlpha - 0.54) < 0.01, `wrong boss shade ${boss.shadeAlpha}`);
  assertCoverage(boss, 'boss');
  await page.screenshot({ path: path.join(outputDir, 'boss-drift.png'), fullPage: true });

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.gameplayBackdropReducedMotion = true;
    play.layoutGameplayBackdrops();
    play.updateGameplayBackdrop(6);
  });
  const reduced = await snapshot();
  assert(reduced.base.x === reduced.width / 2 && reduced.base.y === reduced.height / 2, 'reduced motion did not center base backdrop');
  assert(reduced.storm.x === reduced.width / 2 && reduced.storm.y === reduced.height / 2, 'reduced motion did not center storm backdrop');
  assert(reduced.boss.x === reduced.width / 2 && reduced.boss.y === reduced.height / 2, 'reduced motion did not center boss backdrop');
  assertCoverage(reduced, 'reduced');
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join('; ')}`);

  const report = { status: 'passed', baseTravelDistance, baseBefore, baseAfter, storm, boss, reduced, pageErrors };
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[gameplay-backdrop-runtime] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[gameplay-backdrop-runtime] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
