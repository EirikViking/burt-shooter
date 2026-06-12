import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4360));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/leaderboard-visuals-${timestamp()}`);
const localKey = 'novaSwarm.localLeaderboard.v2';
const currentPlayerIndex = 7;

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

function seededScores() {
  const names = [
    'NOVA ACE', 'ORBIT QUEEN', 'LASER PILOT', 'STAR RUNNER', 'SWARM BREAKER',
    'PILOT41', 'COMBO ROYAL', 'SKY VECTOR', 'PILOT35', 'PILOT37',
    'CABINET ACE', 'VOID SPARK', 'NEON RUNNER', 'ORBITAL KID', 'LASER SAGE',
    'BOSS BAITER', 'NOVA PRIME', 'STAR CLERK', 'SWARM PILOT', 'PIXEL KNIGHT',
    'RIFT TAXI', 'COMET JUDGE', 'ASTRO BOLT', 'LUNAR WRENCH', 'STATIC DUKE',
    'ION NERD', 'PLASMA VICAR', 'SUN GHOST', 'METEOR BOSS', 'LASER COOK',
    'STAR HAGGLER', 'ORBIT MOTH', 'VOID CLERK', 'NOVA TELLER', 'SWARM DENT',
    'BULLET POET', 'HULL MONK', 'RANK KNIFE', 'SCORE VICE', 'FINAL COIN'
  ];
  return Array.from({ length: 40 }, (_, index) => ({
    name: names[index],
    score: 240000 - index * 4200,
    level: Math.max(3, 12 - Math.floor(index / 2)),
    rank_index: Math.max(0, 12 - index),
    isCurrentPlayer: index === currentPlayerIndex
  }));
}

function intersects(a, b, pad = 0) {
  if (!a || !b) return false;
  return !(
    a.right <= b.x + pad ||
    b.right <= a.x + pad ||
    a.bottom <= b.y + pad ||
    b.bottom <= a.y + pad
  );
}

function contains(outer, inner, pad = 0) {
  if (!outer || !inner) return false;
  return (
    inner.x >= outer.x - pad &&
    inner.y >= outer.y - pad &&
    inner.right <= outer.right + pad &&
    inner.bottom <= outer.bottom + pad
  );
}

async function openLeaderboard(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.evaluate(({ storageKey, scores, currentPlayerIndex }) => {
    localStorage.setItem(storageKey, JSON.stringify(scores));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 240000, bestRank: 12, bestLevel: 12 }));
    window.__game.lastLeaderboardResult = {
      name: scores[currentPlayerIndex].name,
      score: scores[currentPlayerIndex].score,
      level: scores[currentPlayerIndex].level,
      localPlacement: currentPlayerIndex + 1,
      localStatus: 'saved',
      localEntry: scores[currentPlayerIndex]
    };
    window.__game.leaderboardView = 'local';
    window.__game.switchScene('highscore');
  }, { storageKey: localKey, scores: seededScores(), currentPlayerIndex });
  await page.waitForFunction(() => {
    const scene = window.__game?.scenes?.highscore;
    return window.__game?.currentSceneName === 'highscore' &&
      scene?.status === 'LOADED' &&
      scene?.backdropSprite?.texture?.width > 0 &&
      scene?.tableMetrics?.width > 0 &&
      scene?.rowsContainer?.children?.length > 20;
  }, null, { timeout: 45000 });
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const scene = window.__game?.scenes?.highscore;
    return {
      currentSceneName: window.__game?.currentSceneName,
      activeLeaderboard: scene?.activeLeaderboard,
      status: scene?.status,
      backdropLoaded: Boolean(scene?.backdropSprite?.texture?.width > 0),
      statsText: scene?.statsText?.text || '',
      comment: scene?.comment?.text || '',
      tauntBubbleVisible: Boolean(scene?.currentBubble?.container?.visible),
      tableMetrics: scene?.tableMetrics || null,
      rows: scene?.rowLayoutDebug || [],
      highlightedRows: (scene?.rowLayoutDebug || []).filter((row) => row.featured).map((row) => row.index),
      rowChildren: scene?.rowsContainer?.children?.length || 0,
      title: scene?.title?.text || ''
    };
  });
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const pageErrors = [];
const consoleErrors = [];
const results = [];

try {
  mkdirSync(outputDir, { recursive: true });
  const page = await browser.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.route('**/api/highscores', async (route) => {
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(seededScores()) });
  });

  const desktop = await openLeaderboard(page, { width: 1366, height: 768 });
  const desktopShot = path.join(outputDir, 'leaderboard-desktop.png');
  await page.screenshot({ path: desktopShot, fullPage: true });
  results.push({ viewport: 'desktop', screenshot: desktopShot, state: desktop });

  const wide = await openLeaderboard(page, { width: 1920, height: 955 });
  const wideShot = path.join(outputDir, 'leaderboard-wide.png');
  await page.screenshot({ path: wideShot, fullPage: true });
  results.push({ viewport: 'wide', screenshot: wideShot, state: wide });

  const mobile = await openLeaderboard(page, { width: 390, height: 844 });
  const mobileShot = path.join(outputDir, 'leaderboard-mobile.png');
  await page.screenshot({ path: mobileShot, fullPage: true });
  results.push({ viewport: 'mobile', screenshot: mobileShot, state: mobile });

  const failures = [
    ...results.flatMap((result) => [
      result.state.currentSceneName !== 'highscore' ? `${result.viewport}: not in highscore scene` : null,
      result.state.activeLeaderboard !== 'local' ? `${result.viewport}: local view not active` : null,
      result.state.status !== 'LOADED' ? `${result.viewport}: leaderboard not loaded` : null,
      !result.state.backdropLoaded ? `${result.viewport}: generated backdrop not loaded` : null,
      !/(TINYFOUNDRY GAMES|TINYFOUNDRY|TFG)/.test(result.state.statsText) ? `${result.viewport}: stats deck missing Tinyfoundry mark` : null,
      result.state.tauntBubbleVisible ? `${result.viewport}: taunt bubble is visible on scoreboard` : null,
      /\b(roast|taunt|mock|boss bait|fixes everything|damage)\b/i.test(result.state.comment) ? `${result.viewport}: taunting comment text is still present` : null,
      result.state.rowChildren < 20 ? `${result.viewport}: row chrome did not render` : null,
      result.state.title !== 'LOCAL SCORE DECK' ? `${result.viewport}: title did not switch to local score deck` : null,
      result.viewport !== 'mobile' && result.state.rows?.length !== 40 ? `${result.viewport}: desktop leaderboard did not render top 40` : null,
      result.viewport === 'mobile' && result.state.rows?.length !== 10 ? `${result.viewport}: mobile leaderboard should keep 10 visible rows` : null,
      !result.state.highlightedRows?.includes(currentPlayerIndex) ? `${result.viewport}: current player row was not highlighted` : null,
      (() => {
        const rows = result.state.rows || [];
        if (!rows.length || !result.state.tableMetrics) return null;
        const lastBottom = rows[rows.length - 1]?.row?.bottom || 0;
        const targetBottom = result.state.tableMetrics.rowsBottom || result.state.tableMetrics.bottom;
        const gap = targetBottom - lastBottom;
        const maxGap = result.viewport === 'wide' ? 32 : result.viewport === 'desktop' ? 34 : 38;
        return gap > maxGap ? `${result.viewport}: leaderboard leaves ${Math.round(gap)}px unused below last row` : null;
      })(),
      ...((result.state.rows || []).flatMap((row, index, rows) => [
        !contains(row.row, row.name, 3) ? `${result.viewport}: row ${index + 1} pilot name escapes row frame` : null,
        !contains(row.row, row.rankTitle, 3) ? `${result.viewport}: row ${index + 1} rank title escapes row frame` : null,
        !contains(row.row, row.score, 3) ? `${result.viewport}: row ${index + 1} score escapes row frame` : null,
        !contains(row.row, row.level, 3) ? `${result.viewport}: row ${index + 1} level escapes row frame` : null,
        row.scoreGroup && !contains(row.row, row.scoreGroup, 3) ? `${result.viewport}: row ${index + 1} score group escapes row frame` : null,
        intersects(row.name, row.rankTitle, -1) ? `${result.viewport}: row ${index + 1} pilot name overlaps rank title` : null,
        row.scoreGroup && intersects(row.name, row.scoreGroup, 2) ? `${result.viewport}: row ${index + 1} pilot name crowds score group` : null,
        row.scoreGroup && intersects(row.rankTitle, row.scoreGroup, 2) ? `${result.viewport}: row ${index + 1} rank title crowds score group` : null,
        rows[index + 1] && intersects(row.rankTitle, rows[index + 1].name, 2) ? `${result.viewport}: row ${index + 1} rank title overlaps next pilot name` : null,
        row.scoreGroup && row.scoreGroup.width < (result.viewport === 'mobile' ? 120 : (result.state.rows?.length >= 30 ? 96 : 166)) ? `${result.viewport}: row ${index + 1} score group is too cramped` : null
      ]))
    ]),
    ...pageErrors.map((message) => `page error: ${message}`),
    ...consoleErrors.map((message) => `console error: ${message}`)
  ].filter(Boolean);

  const report = { ok: failures.length === 0, baseUrl, results, failures, pageErrors, consoleErrors };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[leaderboard-visuals] PASS desktop=${desktopShot} mobile=${mobileShot}`);
  }
  await page.close();
} finally {
  await browser.close();
  if (server) server.kill();
}
