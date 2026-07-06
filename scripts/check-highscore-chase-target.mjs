import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4362));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/highscore-chase-target-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available check port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

const staleProgress = {
  version: 1,
  unlockTuningVersion: 3,
  bestScore: 45386,
  bestRank: 6,
  bestLevel: 6,
  bestSector: 6,
  totalRuns: 4,
  unlockedShipIds: ['nova_ship_01'],
  updatedAt: '2026-06-13T00:00:00.000Z'
};

const realBest = {
  name: 'REAL ACE',
  score: 120140,
  level: 12,
  levelReached: 12,
  rankIndex: 12,
  timestamp: '2026-06-13T00:01:00.000Z',
  source: 'local'
};

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/highscores', async (route) => {
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' });
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.evaluate(async ({ staleProgressState, bestEntry }) => {
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: staleProgressState.bestScore,
      bestRank: staleProgressState.bestRank,
      bestLevel: staleProgressState.bestLevel
    }));
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(staleProgressState));
    localStorage.setItem('novaSwarm.localLeaderboard.v2', JSON.stringify([bestEntry]));
    await window.__game.startGame();
  }, { staleProgressState: staleProgress, bestEntry: realBest });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.hud, null, { timeout: 30000 });
  await page.waitForFunction((expected) => window.__game?.getHighscoreChaseState?.()?.targetScore === expected, realBest.score, { timeout: 10000 });
  const finalState = await page.evaluate(() => {
    const game = window.__game;
    const hud = game?.scenes?.play?.hud;
    hud?.update?.();
    return {
      initialProgressBest: 45386,
      targetScore: game?.getHighscoreChaseState?.()?.targetScore || 0,
      targetSource: game?.getHighscoreChaseState?.()?.source || null,
      targetText: hud?.highscoreChaseTarget?.text || null,
      gapText: hud?.highscoreChaseGap?.text || null
    };
  });
  const renderCacheProbe = await page.evaluate(() => {
    const hud = window.__game?.scenes?.play?.hud;
    if (!hud?.updateHighscoreChase) return { available: false };
    const measure = (callback) => {
      let graphicsClearCalls = 0;
      let textUpdateCalls = 0;
      const graphics = [hud.highscoreChaseBg, hud.highscoreChaseBarBg, hud.highscoreChaseBarFill, hud.highscoreChaseTicks].filter(Boolean);
      const texts = [hud.highscoreChaseTitle, hud.highscoreChaseTarget, hud.highscoreChaseGap].filter(Boolean);
      const restore = [];
      for (const graphic of graphics) {
        const original = graphic.clear?.bind(graphic);
        if (!original) continue;
        graphic.clear = (...args) => {
          graphicsClearCalls += 1;
          return original(...args);
        };
        restore.push(() => {
          graphic.clear = original;
        });
      }
      for (const text of texts) {
        const original = text.updateText?.bind(text);
        if (!original) continue;
        text.updateText = (...args) => {
          textUpdateCalls += 1;
          return original(...args);
        };
        restore.push(() => {
          text.updateText = original;
        });
      }
      callback();
      for (const undo of restore) undo();
      return {
        graphicsClearCalls,
        textUpdateCalls
      };
    };

    const unchanged = measure(() => {
      for (let index = 0; index < 40; index += 1) {
        hud.updateHighscoreChase();
      }
    });

    const beforeScoreText = hud.highscoreChaseGap?.text || '';
    const sameSectorScore = measure(() => {
      window.__game.score = (Number(window.__game.score) || 0) + 7777;
      for (let index = 0; index < 12; index += 1) {
        hud.updateHighscoreChase();
      }
    });
    const afterSameSectorText = hud.highscoreChaseGap?.text || '';

    const nextSector = measure(() => {
      window.__game.level = (Number(window.__game.level) || 1) + 1;
      hud.updateHighscoreChase();
    });
    const afterNextSectorText = hud.highscoreChaseGap?.text || '';
    return {
      available: true,
      graphicsClearCalls: unchanged.graphicsClearCalls,
      textUpdateCalls: unchanged.textUpdateCalls,
      unchanged,
      sameSectorScore,
      nextSector,
      beforeScoreText,
      afterSameSectorText,
      afterNextSectorText,
      displayKey: hud.highscoreChaseDisplayKey || null,
      displayScore: hud.highscoreChaseDisplayScore || 0,
      renderKey: hud.highscoreChaseRenderKey || null
    };
  });

  const targetCrossingProbe = await page.evaluate((targetScore) => {
    const hud = window.__game?.scenes?.play?.hud;
    if (!hud?.updateHighscoreChase) return { available: false };
    const graphics = [hud.highscoreChaseBg, hud.highscoreChaseBarBg, hud.highscoreChaseBarFill, hud.highscoreChaseTicks].filter(Boolean);
    const texts = [hud.highscoreChaseTitle, hud.highscoreChaseTarget, hud.highscoreChaseGap].filter(Boolean);
    let graphicsClearCalls = 0;
    let textUpdateCalls = 0;
    const restore = [];
    for (const graphic of graphics) {
      const original = graphic.clear?.bind(graphic);
      if (!original) continue;
      graphic.clear = (...args) => {
        graphicsClearCalls += 1;
        return original(...args);
      };
      restore.push(() => {
        graphic.clear = original;
      });
    }
    for (const text of texts) {
      const original = text.updateText?.bind(text);
      if (!original) continue;
      text.updateText = (...args) => {
        textUpdateCalls += 1;
        return original(...args);
      };
      restore.push(() => {
        text.updateText = original;
      });
    }
    window.__game.score = targetScore + 1;
    hud.updateHighscoreChase();
    for (const undo of restore) undo();
    return {
      available: true,
      graphicsClearCalls,
      textUpdateCalls,
      text: hud.highscoreChaseGap?.text || null,
      debug: hud.highscoreChaseGroup?._debugChase || null
    };
  }, realBest.score);

  assert.equal(finalState.targetScore, realBest.score, 'high-score chase should use the highest known personal score');
  assert.match(finalState.targetText || '', /120,140/, 'HUD should print the real best score target');
  assert.equal(renderCacheProbe.available, true, 'high-score chase render cache probe should attach');
  assert.ok(renderCacheProbe.renderKey, 'high-score chase should retain a render cache key');
  assert.equal(renderCacheProbe.graphicsClearCalls, 0, 'unchanged high-score chase state should not redraw graphics on repeated HUD updates');
  assert.equal(renderCacheProbe.textUpdateCalls, 0, 'unchanged high-score chase state should not rerun text layout on repeated HUD updates');
  assert.ok(renderCacheProbe.sameSectorScore.graphicsClearCalls > 0, 'same-sector score changes should redraw the high-score chase widget');
  assert.notEqual(renderCacheProbe.afterSameSectorText, renderCacheProbe.beforeScoreText, 'same-sector high-score chase text should count down in real time');
  assert.ok(renderCacheProbe.nextSector.graphicsClearCalls > 0, 'next sector should refresh high-score chase graphics');
  assert.ok(renderCacheProbe.displayScore >= 7777, 'next-sector high-score chase display should snapshot the latest score');
  assert.equal(targetCrossingProbe.available, true, 'target-crossing probe should attach');
  assert.ok(targetCrossingProbe.graphicsClearCalls > 0, 'crossing the target should still redraw the high-score chase widget');
  assert.match(targetCrossingProbe.text || '', /OLD SCORE HUMILIATED/i, 'crossing the target should still show the success line');
  assert.equal(targetCrossingProbe.debug?.surpassed, true, 'crossing the target should expose surpassed high-score chase state');
  assert.equal(targetCrossingProbe.debug?.tickCount, 3, 'high-score chase should draw target milestone ticks');
  assert.equal(pageErrors.length, 0, `page errors: ${pageErrors.join('; ')}`);

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'highscore-chase-target.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ ok: true, baseUrl, finalState, renderCacheProbe, targetCrossingProbe, screenshot }, null, 2)}\n`);
  console.log(`[highscore-chase-target] PASS target=${finalState.targetScore} source=${finalState.targetSource} sameSectorRedraws=${renderCacheProbe.sameSectorScore.graphicsClearCalls} sectorRedraws=${renderCacheProbe.nextSector.graphicsClearCalls} screenshot=${screenshot} report=${path.join(outputDir, 'report.json')}`);
  await page.close();
} catch (error) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ ok: false, baseUrl, error: error.message }, null, 2)}\n`);
  console.error(`[highscore-chase-target] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
