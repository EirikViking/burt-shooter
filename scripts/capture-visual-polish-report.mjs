import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4488));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.VISUAL_POLISH_OUTPUT_DIR || path.join('test-results', `visual-polish-report-${timestamp()}`));
const screenshotsDir = path.join(outputDir, 'screenshots');
const pdfPath = path.join(outputDir, 'nova-swarm-visual-polish-report.pdf');
const reportJsonPath = path.join(outputDir, 'report.json');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function commandText(command, args = []) {
  try {
    return execFileSync(command, args, { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function withQuery(params = {}) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
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

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function waitForScene(page, sceneName) {
  await page.waitForFunction((expected) => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state?.scene === expected;
    } catch {
      return false;
    }
  }, sceneName, { timeout: 30000 });
}

async function openPlay(page, extraParams = {}) {
  await page.goto(withQuery({
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: '10',
    audio: '0',
    ...extraParams
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'play');
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.player), { timeout: 30000 });
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player) return;
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.introOverlay = null;
    game.lives = Math.max(3, Number(game.lives) || 3);
    player.invulnerable = true;
    player.invulnerableTime = 60000;
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.78;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
      player.sprite.visible = true;
      player.sprite.alpha = 1;
    }
  });
  await page.waitForTimeout(400);
}

async function clearOverlay(page) {
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (!play) return;
    for (const layer of [play.uiOverlay, play.overrunClearLayer]) {
      if (!layer?.children) continue;
      for (const child of [...layer.children]) {
        if (/ui_(boss_dossier|rank_up_badge|overrun_clear_celebration|overrun_interlude)/.test(String(child.label || ''))) {
          layer.removeChild(child);
          child.destroy?.({ children: true });
        }
      }
    }
    play.overrunClearEffects = [];
    play.overrunMilestoneInterlude = null;
  });
}

async function take(page, entries, slug, label, notes, pass = true, options = {}) {
  const filePath = path.join(screenshotsDir, `${String(entries.length + 1).padStart(2, '0')}-${slug}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  entries.push({
    slug,
    label,
    notes,
    pass,
    images: [filePath],
    ...options
  });
  return filePath;
}

async function capturePlaySurfaces(page, entries) {
  await openPlay(page, { startLevel: '6' });
  await clearOverlay(page);
  const rankState = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    game.score = 58273;
    game.level = 8;
    game.rankIndex = 5;
    game.liveRankProgression = {
      rankIndex: 5,
      rankProgress: { progress: 0.63 },
      currentRunXp: 12156
    };
    play.hud?.update?.();
    play.enqueueToast?.('SECTOR CLEAR +1,000', {
      fontSize: 22,
      fill: '#9cfbff',
      duration: 5000,
      slot: 'top',
      type: 'level_clear',
      priority: 3
    });
    play.processToastQueue?.();
    return {
      rankText: play.hud?.rankText?.text || null,
      progress: game.getRankProgress?.()
    };
  });
  await page.waitForTimeout(350);
  await take(page, entries, 'rank-hud-live-progress', 'Rank HUD: no leading zeroes + live progress', `HUD rank=${rankState.rankText}; progress=${Number(rankState.progress || 0).toFixed(2)} toward next rank.`, !/^RANK 0/.test(String(rankState.rankText || '')));

  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play?.createRankUpAnimation?.(8, 'Arcade Ace');
  });
  await page.waitForTimeout(520);
  await take(page, entries, 'rank-up-badge', 'Rank-up badge placement', 'Compact badge staged with score/sector/HUD text visible for overlap review.');

  await clearOverlay(page);
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (play?.enemyManager) {
      game.level = 11;
      play.enemyManager.forceBossStart?.(11);
    }
    play?.showBossTaunt?.('boss_spawn');
  });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    const poster = play?.uiOverlay?.children?.find((child) => child.label === 'ui_boss_dossier');
    return Boolean(poster?.children?.some((child) => child.label === 'boss_warning_emblem'));
  }, { timeout: 10000 });
  await page.waitForTimeout(550);
  const bossArt = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const poster = play?.uiOverlay?.children?.find((child) => child.label === 'ui_boss_dossier');
    const visit = (node) => Boolean(node?.label === 'boss_warning_boss_art' || (node?.children || []).some(visit));
    return visit(poster);
  });
  await take(page, entries, 'boss-incoming-announcement', 'Boss incoming announcement', `Uses one clipped boss portrait in a radar dossier. Boss art loaded=${bossArt}.`, bossArt);

  await clearOverlay(page);
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) return;
    manager.clearEnemies?.();
    play.bulletManager.enemyBullets.forEach((bullet) => { bullet.active = false; });
    play.bulletManager.enemyBullets = [];
    const patterns = ['rail', 'mine', 'burst', 'lane', 'web', 'missile', 'anchor', 'hunter'];
    const ids = [
      'nova_elite_sniper_rail',
      'nova_elite_mine_layer',
      'nova_elite_burst_artillery',
      'nova_elite_lane_blocker',
      'nova_elite_orb_webber',
      'nova_elite_missile_frigate',
      'nova_elite_anchor_turret',
      'nova_elite_hunter'
    ];
    manager.level = 40;
    game.level = 40;
    const spacing = game.getWidth() / (patterns.length + 1);
    patterns.forEach((pattern, index) => {
      const elite = manager.spawnEliteMiddleShip(ids[index], {
        marketingDebug: true,
        ignoreCaps: true,
        ignoreLevelGate: true,
        targetX: spacing * (index + 1),
        targetY: 120 + (index % 2) * 52,
        delayMs: 0,
        entryDurationMs: 1
      });
      if (!elite) return;
      elite.waitingForEntry = false;
      elite.active = true;
      elite.x = spacing * (index + 1);
      elite.y = 124 + (index % 2) * 52;
      elite.formationX = elite.x;
      elite.formationY = elite.y;
      if (elite.sprite) {
        elite.sprite.x = elite.x;
        elite.sprite.y = elite.y;
        elite.sprite.visible = true;
      }
      elite.fireElitePattern?.(pattern, game.getWidth() * 0.5, game.getHeight() * 0.72);
    });
    play.bulletManager.update?.(1);
  });
  await page.waitForTimeout(450);
  const bulletStats = await page.evaluate(() => {
    const bullets = window.__game?.scenes?.play?.bulletManager?.enemyBullets || [];
    return {
      count: bullets.filter((bullet) => bullet.active !== false).length,
      damages: [...new Set(bullets.map((bullet) => Number(bullet.damage || 0).toFixed(2)))]
    };
  });
  await take(page, entries, 'miniboss-special-weapons', 'Miniboss special weapons', `Staged 8 elite patterns; active bullets=${bulletStats.count}; damage values=${bulletStats.damages.join(', ')}.`);

  await clearOverlay(page);
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    game.score = 72600;
    game.level = 10;
    game.rankIndex = 8;
    game.lives = 3;
    play?.triggerOverrunClearCelebration?.({
      nextSector: 11,
      milestoneSector: 10,
      eventKind: 'run_clear',
      clearBonus: 10000,
      livesBonus: 7500
    });
  });
  await page.waitForTimeout(850);
  await take(page, entries, 'sector-10-overrun-interlude', 'Sector 10 Overrun interlude', 'Readable interlude card with score/rank/lives/bonus while combat is briefly paused.');

  await clearOverlay(page);
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    game.score = 184200;
    game.level = 20;
    game.rankIndex = 12;
    game.lives = 2;
    play?.triggerOverrunClearCelebration?.({
      nextSector: 21,
      milestoneSector: 20,
      eventKind: 'overrun_milestone'
    });
  });
  await page.waitForTimeout(850);
  await take(page, entries, 'sector-20-overrun-milestone', 'Sector 20 Overrun milestone', 'Every-10-sector milestone event staged without playing through sector 20.');
}

async function captureGameOver(page, entries, placement, slug, label) {
  await openPlay(page, { startLevel: '12' });
  await page.evaluate(() => {
    const game = window.__game;
    game.score = 58273;
    game.level = 12;
    game.runMode = 'ranked';
    game.isDebugRun = false;
    game.runFinalized = true;
    game.runSummary = {
      score: 58273,
      levelReached: 12,
      sectorReached: 12,
      runCleared: true
    };
    game.switchScene('gameOver');
  });
  await waitForScene(page, 'gameOver');
  await page.waitForFunction(() => {
    const scene = window.__game?.scenes?.gameOver;
    return Boolean(scene?.title && scene?.scoreText && scene?.levelText && scene?.leaderboardStatusText && scene?.comment);
  }, { timeout: 10000 });
  await page.evaluate((placementValue) => {
    const game = window.__game;
    const scene = game.scenes.gameOver;
    scene.finalScore = 58273;
    scene.finalLevel = 12;
    scene.isRankedRun = true;
    scene.globalStatus = 'submitted';
    scene.applyConfirmedGlobalPlacement?.({
      score: 58273,
      placement: placementValue,
      qualified: true,
      numberOne: placementValue === 1,
      top3: placementValue <= 3,
      source: 'visual_report'
    }, 'steam');
    scene.enterRunbackStage?.('score_submitted');
  }, placement);
  await page.waitForTimeout(650);
  await take(page, entries, slug, label, `Game Over staged with confirmed Steam global rank #${placement}.`);
}

async function captureLeaderboard(page, entries) {
  await page.addInitScript(() => {
    localStorage.setItem('novaSwarm.mockSteamPersona.v1', 'EVILEIRIK');
    localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', JSON.stringify([
      {
        playerName: 'EVILEIRIK',
        name: 'EVILEIRIK',
        score: 58273,
        level: 12,
        levelReached: 12,
        details: [12, 1, 333, 60, 3, 18],
        isCurrentPlayer: true,
        source: 'steam',
        timestamp: '2026-06-04T00:00:00.000Z'
      },
      { playerName: 'PILOT30', name: 'PILOT30', score: 23750, level: 5, source: 'steam' },
      { playerName: 'VENERATOR', name: 'VENERATOR', score: 11588, level: 3, source: 'steam' }
    ]));
  });
  await page.goto(withQuery({ mockSteamLeaderboard: '1', skipIntro: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'menu');
  await page.evaluate(() => {
    window.__game.leaderboardView = 'global';
    window.__game.showHighscores();
  });
  await waitForScene(page, 'highscore');
  await page.waitForTimeout(900);
  const state = await page.evaluate(() => {
    const scene = window.__game?.scenes?.highscore;
    const texts = [];
    const visit = (node) => {
      if (!node) return;
      if (typeof node.text === 'string') texts.push(node.text);
      for (const child of node.children || []) visit(child);
    };
    visit(scene?.container);
    return {
      hasLevel12: texts.some((text) => /LV\s*12/i.test(text) || /LVL?\s*12/i.test(text)),
      rows: texts.filter((text) => /EVILEIRIK|LV\s*12|58,273/.test(text)).slice(0, 20)
    };
  });
  await take(page, entries, 'steam-leaderboard-level-12', 'Steam/global leaderboard level metadata', `Mock Steam row seeded as EVILEIRIK score 58,273 level 12. Detected LV12=${state.hasLevel12}.`, state.hasLevel12);
}

async function captureCodex(page, entries) {
  await page.goto(withQuery({ skipIntro: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'menu');
  await page.evaluate(() => {
    window.__game.showThreatCodex();
    const scene = window.__game.scenes.threatCodex;
    const now = new Date().toISOString();
    scene.discoveryState.items.enemies = Object.fromEntries((scene.catalog.enemies || []).slice(0, 24).map((entry, index) => [entry.id, {
      id: entry.id,
      category: 'enemies',
      name: entry.name,
      firstSeenAt: now,
      lastSeenAt: now,
      timesSeen: 4 + index,
      timesDefeated: 2 + index,
      metadata: { visualReport: true }
    }]));
    scene.entryIndex = 7;
    scene.refresh();
  });
  await waitForScene(page, 'threatCodex');
  await page.waitForTimeout(900);
  const images = [];
  for (let frame = 0; frame < 3; frame += 1) {
    if (frame > 0) await page.waitForTimeout(520);
    const filePath = path.join(screenshotsDir, `${String(entries.length + 1).padStart(2, '0')}-threat-codex-animation-${frame + 1}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    images.push(filePath);
  }
  entries.push({
    slug: 'threat-codex-animation-strip',
    label: 'Threat Codex animated entries',
    notes: 'Three-frame strip captured from the same selected entry so motion is inspectable in the PDF.',
    pass: true,
    images
  });
}

function dataUri(filePath) {
  const bytes = readFileSync(filePath);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

function buildHtml(entries, meta) {
  const sections = entries.map((entry) => `
    <section class="capture ${entry.pass ? 'pass' : 'fail'}">
      <div class="heading">
        <h2>${entry.label}</h2>
        <span>${entry.pass ? 'PASS' : 'CHECK'}</span>
      </div>
      <p>${entry.notes}</p>
      <div class="images ${entry.images.length > 1 ? 'strip' : ''}">
        ${entry.images.map((image) => `<img src="${dataUri(image)}" />`).join('')}
      </div>
    </section>
  `).join('\n');
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { margin: 0; background: #071019; color: #eafcff; font-family: Arial, sans-serif; }
        .cover { padding: 24px 28px 10px; border-bottom: 2px solid #29e7ff; }
        h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: 0; color: #fff3a2; }
        .meta { font-size: 11px; color: #a8dce5; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 18px; }
        .capture { page-break-inside: avoid; padding: 18px 24px 22px; border-bottom: 1px solid rgba(97, 246, 255, 0.25); }
        .heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        h2 { margin: 0; font-size: 19px; color: #9cfbff; }
        span { border: 1px solid #61f6ff; color: #61f6ff; padding: 3px 8px; font-size: 11px; font-weight: 700; }
        .fail span { border-color: #ff7a7a; color: #ffb4b4; }
        p { margin: 6px 0 10px; font-size: 12px; color: #d8fbff; }
        .images { display: grid; grid-template-columns: 1fr; gap: 8px; }
        .images.strip { grid-template-columns: repeat(3, 1fr); }
        img { width: 100%; border: 1px solid rgba(97, 246, 255, 0.55); border-radius: 4px; background: #020711; }
      </style>
    </head>
    <body>
      <div class="cover">
        <h1>Nova Swarm Visual Polish QA Report</h1>
        <div class="meta">
          <div>Generated: ${meta.generatedAt}</div>
          <div>Branch: ${meta.branch}</div>
          <div>Commit: ${meta.commit}</div>
          <div>Build ID: ${meta.buildId}</div>
          <div>Worktree: ${meta.cwd}</div>
          <div>Dirty state: ${meta.dirty || 'clean'}</div>
        </div>
      </div>
      ${sections}
    </body>
  </html>`;
}

mkdirSync(screenshotsDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const entries = [];
const pageErrors = [];
const consoleWarningsOrErrors = [];

try {
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 }, deviceScaleFactor: 1 });
  context.on('page', (page) => {
    page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
    page.on('console', (message) => {
      if (message.type() !== 'error' && message.type() !== 'warning') return;
      const text = message.text();
      if (/Service worker script missing or invalid/i.test(text)) return;
      consoleWarningsOrErrors.push(text);
    });
  });

  const playPage = await context.newPage();
  await capturePlaySurfaces(playPage, entries);

  const gameOverOne = await context.newPage();
  await captureGameOver(gameOverOne, entries, 1, 'gameover-number-one', 'Game Over #1 celebration');

  const gameOverTop3 = await context.newPage();
  await captureGameOver(gameOverTop3, entries, 3, 'gameover-top-three', 'Game Over top-three celebration');

  const leaderboardPage = await context.newPage();
  await captureLeaderboard(leaderboardPage, entries);

  const codexPage = await context.newPage();
  await captureCodex(codexPage, entries);

  const meta = {
    generatedAt: new Date().toISOString(),
    cwd: process.cwd(),
    branch: commandText('git', ['branch', '--show-current']),
    commit: commandText('git', ['rev-parse', '--short', 'HEAD']),
    dirty: commandText('git', ['status', '--short']).replace(/\r?\n/g, ' | '),
    buildId: commandText('node', ['-e', "import('./src/buildInfo.js').then(m=>console.log(m.BUILD_ID)).catch(()=>console.log('unknown'))"])
  };
  const html = buildHtml(entries, meta);
  writeFileSync(path.join(outputDir, 'report.html'), html, 'utf8');
  const reportPage = await context.newPage();
  await reportPage.setContent(html, { waitUntil: 'load' });
  await reportPage.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' }
  });

  const result = {
    ok: entries.every((entry) => entry.pass),
    baseUrl,
    outputDir,
    pdfPath,
    reportJsonPath,
    entries: entries.map((entry) => ({
      ...entry,
      images: entry.images.map((image) => path.relative(outputDir, image).replaceAll(path.sep, '/'))
    })),
    pageErrors,
    consoleWarningsOrErrors,
    meta
  };
  writeFileSync(reportJsonPath, JSON.stringify(result, null, 2));
  if (!result.ok || pageErrors.length) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[visual-polish-report] PASS pdf=${pdfPath}`);
  }
} catch (error) {
  const result = {
    ok: false,
    baseUrl,
    outputDir,
    pdfPath,
    reportJsonPath,
    entries,
    pageErrors,
    consoleWarningsOrErrors,
    error: error?.stack || String(error)
  };
  writeFileSync(reportJsonPath, JSON.stringify(result, null, 2));
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
