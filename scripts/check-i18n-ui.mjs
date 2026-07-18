import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.I18N_UI_HOST || '127.0.0.1';
const explicitPort = process.env.I18N_UI_PORT ? Number(process.env.I18N_UI_PORT) : null;
const port = process.env.I18N_UI_URL ? null : (explicitPort || await findAvailablePort(Number(process.env.I18N_UI_PORT_START || 4173)));
const baseUrl = process.env.I18N_UI_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.I18N_UI_OUTPUT_DIR || `test-results/i18n-ui-${timestamp()}`);

const languages = [
  { code: 'en', slug: 'english', settingsLabel: 'English', menuSettings: 'SETTINGS', launch: 'MAYHEM PURE', scorePrefix: 'SCORE', gameOver: 'GAME OVER', leaderboard: 'GLOBAL SCORE DECK', glyphProbe: 'Nova Swarm' },
  { code: 'de', slug: 'german', settingsLabel: 'Deutsch', menuSettings: 'EINSTELLUNGEN', launch: 'MAYHEM PUR', scorePrefix: 'PUNKTZAHL', gameOver: 'SPIEL VORBEI', leaderboard: 'GLOBALES SCORE-DECK', glyphProbe: 'äöüÄÖÜß' },
  { code: 'zh-CN', slug: 'chinese-simplified', settingsLabel: '简体中文', menuSettings: '设置', launch: '纯粹狂潮', scorePrefix: '分数', gameOver: '游戏结束', leaderboard: '全球计分榜', glyphProbe: '设置排行榜游戏结束' },
  { code: 'ru', slug: 'russian', settingsLabel: 'Русский', menuSettings: 'НАСТРОЙКИ', launch: 'ЧИСТЫЙ MAYHEM', scorePrefix: 'ОЧКИ', gameOver: 'ИГРА ОКОНЧЕНА', leaderboard: 'ГЛОБАЛЬНАЯ ТАБЛИЦА', glyphProbe: 'Настройки Очки Игра' },
  { code: 'es', slug: 'spanish-spain', settingsLabel: 'Español', menuSettings: 'AJUSTES', launch: 'MAYHEM PURO', scorePrefix: 'PUNTUACIÓN', gameOver: 'FIN DE LA PARTIDA', leaderboard: 'MARCADOR GLOBAL', glyphProbe: 'Ajustes Puntuación ñáéíóú' },
  { code: 'pt-BR', slug: 'portuguese-brazil', settingsLabel: 'Português do Brasil', menuSettings: 'CONFIGURAÇÕES', launch: 'MAYHEM PURO', scorePrefix: 'PONTUAÇÃO', gameOver: 'FIM DE JOGO', leaderboard: 'RANKING GLOBAL', glyphProbe: 'Configurações pontuação á à â ã ç é ê í ó ô õ ú' },
  { code: 'ko', slug: 'korean', settingsLabel: '한국어', menuSettings: '설정', launch: '메이헴 퓨어', scorePrefix: '점수', gameOver: '게임 오버', leaderboard: '글로벌 순위표', glyphProbe: '한국어 설정 점수 순위표' },
  { code: 'ja', slug: 'japanese', settingsLabel: '日本語', menuSettings: '設定', launch: 'メイヘム・ピュア', scorePrefix: 'スコア', gameOver: 'ゲームオーバー', leaderboard: 'グローバルランキング', glyphProbe: '日本語 設定 スコア ランキング' }
];

const forbiddenPlaceholderMarkers = [
  'Texto:',
  '문구:',
  '文言:',
  'Text:',
  'TODO:',
  'MISSING:',
  'FALLBACK:',
  'UNTRANSLATED:'
];
const englishLeakLanguageCodes = new Set(['pt-BR', 'ko', 'ja']);
const forbiddenEnglishFragments = [
  'Sector 1:',
  'Sector 2:',
  'Sector 3:',
  'Sector 4:',
  'Sector 6:',
  'Sector 7:',
  'Sector 8:',
  'Sector 9:',
  'One coin woke the cabinet',
  'The pilot still has not decided',
  'The popcorn formation',
  'Formation Coach reports',
  'Quartermaster, the hitbox',
  'Mind the hitbox'
];
const allowedEnglishPhrases = [
  'Nova Swarm',
  'Tinyfoundry Games',
  'Cabinet',
  'Popcorn Patrol',
  'Spiral Academy',
  'Laser Lane Union',
  'Bonus Stage Panic',
  'Meteor Queue',
  'Neon Swarm',
  'Hitbox Negotiations',
  'Cabinet Overdrive',
  'THE FORMATION FOREMAN',
  'THE QUARTER EATER',
  'ENTER',
  'ESC',
  'WASD',
  'SPACE',
  'Space',
  'SFX',
  'FIRE',
  'A',
  'B',
  'Y',
  'START',
  'GAMEPAD',
  'GLOBAL',
  'LOCAL'
];
const englishLeakWords = new Set([
  'one', 'coin', 'woke', 'the', 'cabinet', 'pilot', 'still', 'has', 'not', 'decided', 'if', 'that', 'was', 'luck',
  'popcorn', 'formation', 'coach', 'reports', 'quartermaster', 'hitbox', 'mind', 'sector', 'level', 'wave',
  'local', 'board', 'loaded', 'global', 'score', 'scores', 'yet', 'claim', 'first', 'slot', 'scoreboard', 'lonely',
  'arcade', 'control', 'says', 'swarm', 'dispatch', 'next', 'run', 'bonus', 'stage', 'called', 'braver', 'pilot'
]);

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
  throw new Error(`No available i18n preview port found starting at ${startPort}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, baseArgs: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', baseArgs: ['vite'] };
}

async function fetchStatus(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    const text = response.ok ? '' : (await response.text()).slice(0, 500);
    return { ok: response.ok, status: response.status, statusText: response.statusText, body: text };
  } catch (error) {
    return { ok: false, status: 0, statusText: error.message, body: '' };
  }
}

async function canFetch(url) {
  return (await fetchStatus(url)).ok;
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  let lastStatus = null;
  while (Date.now() - start < timeoutMs) {
    lastStatus = await fetchStatus(url);
    if (lastStatus.ok) return { ok: true, lastStatus };
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return { ok: false, lastStatus };
}

async function startPreviewServer() {
  const probeUrl = withQuery({ skipIntro: '1' });
  if (await canFetch(probeUrl)) return null;
  const { command, baseArgs } = viteCommand();
  const args = [...baseArgs, 'preview', '--host', host, '--port', String(port), '--strictPort'];
  const output = [];
  const server = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  let exitCode = null;
  server.on('exit', (code, signal) => {
    exitCode = { code, signal };
  });
  server.stdout.on('data', (chunk) => {
    output.push(chunk.toString());
    process.stdout.write(`[preview] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    output.push(chunk.toString());
    process.stderr.write(`[preview] ${chunk}`);
  });
  const ready = await waitForServer(probeUrl);
  if (!ready.ok) {
    server.kill();
    throw new Error([
      `Preview server did not become ready at ${probeUrl}`,
      `Last HTTP status: ${ready.lastStatus?.status || 'n/a'} ${ready.lastStatus?.statusText || ''}`,
      ready.lastStatus?.body ? `Response body: ${ready.lastStatus.body}` : null,
      exitCode ? `Preview process exited: ${JSON.stringify(exitCode)}` : null,
      output.length ? `Preview output:\n${output.join('').slice(-2000)}` : null
    ].filter(Boolean).join('\n'));
  }
  return server;
}

function withQuery(params = {}) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

async function waitForScene(page, expectedScene = 'menu') {
  await page.waitForFunction((scene) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return Boolean(window.__game && state.scene === scene);
  }, expectedScene, { timeout: 20000 });
}

async function waitForLanguage(page, code) {
  await page.waitForFunction((expected) => JSON.parse(window.render_game_to_text?.() || '{}').language?.current === expected, code, { timeout: 10000 });
}

async function openFreshMenu(page, code) {
  const url = withQuery({ skipIntro: '1' });
  let response = null;
  try {
    response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (error) {
    if (!String(error.message || '').includes('ERR_HTTP_RESPONSE_CODE_FAILURE')) throw error;
    await page.waitForTimeout(500);
    response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  assert(response?.ok(), `Navigation failed for ${url}: HTTP ${response?.status() || 'no response'}`);
  await waitForScene(page, 'menu');
  await page.evaluate((language) => window.__novaI18n?.setLanguagePreference?.(language), code);
  await waitForLanguage(page, code);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const bounds = (displayObject) => {
      if (!displayObject?.getBounds) return null;
      try {
        const box = displayObject.getBounds();
        return {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          right: Math.round(box.x + box.width),
          bottom: Math.round(box.y + box.height)
        };
      } catch {
        return null;
      }
    };
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const game = window.__game;
    const scene = game?.currentScene;
    const play = game?.scenes?.play;
    const settings = scene?.settingsOverlay || play?.settingsOverlay || null;
    const highscore = game?.scenes?.highscore;
    const pause = play?.pauseOverlay || play?.settingsOverlay || null;
    return {
      language: state.language,
      scene: state.scene,
      menu: {
        launch: game?.scenes?.menu?.startBtn?._label?.text || null,
        settings: game?.scenes?.menu?.settingsBtn?._label?.text || null,
        missionBriefing: state.menu?.missionBriefing || null,
        launchDeck: state.menu?.launchDeck || null
      },
      settings: {
        language: settings?.languageButton?._label?.text || null,
        languageHint: settings?.languageHint?.text || null,
        close: settings?.footerButtons?.close?._label?.text || null
      },
      hud: {
        score: play?.hud?.scoreText?.text || null,
        lives: play?.hud?.livesText?.text || null,
        mission: play?.hud?.missionLabel?.text || null
      },
      pause: {
        title: pause?.title?.text || scene?.pauseTitle?.text || null,
        resume: pause?.resumeButton?._label?.text || null
      },
      gameOver: {
        title: game?.scenes?.gameOver?.title?.text || null,
        prompt: game?.scenes?.gameOver?.promptText?.text || null,
        score: game?.scenes?.gameOver?.scoreText?.text || null,
        cta: game?.scenes?.gameOver?.retryButtonLabel?.text || null
      },
      leaderboard: {
        title: highscore?.title?.text || null,
        retry: highscore?.retryButton?._label?.text || null,
        board: highscore?.boardTitle?.text || null,
        comment: highscore?.comment?.text || null,
        stateMessage: highscore?.stateMessage?.text || null,
        commentBounds: bounds(highscore?.comment),
        stateBounds: bounds(highscore?.stateMessage),
        rowChildCount: highscore?.rowsContainer?.children?.length || 0,
        firstRowBounds: bounds(highscore?.rowsContainer?.children?.[0])
      },
      toasts: play?.getToastDebugState?.() || null,
      glyphs: {
        sans: document.fonts?.check?.('18px sans-serif', {
          'zh-CN': '设置排行榜游戏结束',
          ko: '한국어 설정 점수 순위표',
          ja: '日本語 設定 スコア ランキング',
          'pt-BR': 'Configurações pontuação á à â ã ç é ê í ó ô õ ú'
        }[state.language?.current] || 'Nova Swarm') ?? null,
        rajdhani: document.fonts?.check?.('18px Rajdhani', 'Nova Swarm') ?? null
      }
    };
  });
}

function boxesOverlap(a, b, gap = 0) {
  if (!a || !b || a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0) return false;
  return !(a.right + gap <= b.x || b.right + gap <= a.x || a.bottom + gap <= b.y || b.bottom + gap <= a.y);
}

function boxContains(outer, inner, tolerance = 3) {
  if (!outer || !inner || outer.width <= 0 || outer.height <= 0 || inner.width <= 0 || inner.height <= 0) return false;
  return inner.x >= outer.x - tolerance
    && inner.y >= outer.y - tolerance
    && inner.right <= outer.right + tolerance
    && inner.bottom <= outer.bottom + tolerance;
}

async function screenshot(page, name) {
  const file = path.join(outputDir, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function collectPlaceholderHits(value, pathLabel = 'snapshot', hits = []) {
  if (value == null) return hits;
  if (typeof value === 'string') {
    for (const marker of forbiddenPlaceholderMarkers) {
      if (value.includes(marker)) hits.push(`${pathLabel}: ${marker} in "${value}"`);
    }
    return hits;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectPlaceholderHits(entry, `${pathLabel}[${index}]`, hits));
    return hits;
  }
  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      collectPlaceholderHits(entry, `${pathLabel}.${key}`, hits);
    }
  }
  return hits;
}

function stripAllowedEnglish(text) {
  let stripped = String(text ?? '');
  for (const phrase of allowedEnglishPhrases) {
    stripped = stripped.split(phrase).join(' ');
  }
  return stripped;
}

function collectEnglishLeakHits(value, pathLabel = 'snapshot', localeCode = null, hits = []) {
  if (!englishLeakLanguageCodes.has(localeCode) || value == null) return hits;
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    for (const fragment of forbiddenEnglishFragments) {
      if (lowered.includes(fragment.toLowerCase())) hits.push(`${pathLabel}: forbidden English phrase "${fragment}" in "${value}"`);
    }
    const stripped = stripAllowedEnglish(value);
    const tokens = stripped.match(/\b[A-Za-z][A-Za-z'’.-]*\b/g) || [];
    let sequence = [];
    for (const token of tokens) {
      const normalized = token.toLowerCase().replace(/[^a-z]/g, '');
      if (englishLeakWords.has(normalized)) {
        sequence.push(token);
      } else {
        if (sequence.length >= 2) hits.push(`${pathLabel}: English phrase "${sequence.join(' ')}" in "${value}"`);
        sequence = [];
      }
    }
    if (sequence.length >= 2) hits.push(`${pathLabel}: English phrase "${sequence.join(' ')}" in "${value}"`);
    return hits;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectEnglishLeakHits(entry, `${pathLabel}[${index}]`, localeCode, hits));
    return hits;
  }
  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      collectEnglishLeakHits(entry, `${pathLabel}.${key}`, localeCode, hits);
    }
  }
  return hits;
}

function assertSnapshotClean(snapshotValue, language, pathLabel) {
  const placeholderHits = collectPlaceholderHits(snapshotValue, pathLabel);
  assert(placeholderHits.length === 0, `${pathLabel} contains placeholder marker: ${placeholderHits.join('; ')}`);
  const englishLeakHits = collectEnglishLeakHits(snapshotValue, pathLabel, language.code);
  assert(englishLeakHits.length === 0, `${pathLabel} contains English text leakage: ${englishLeakHits.join('; ')}`);
}

async function captureLanguage(page, language, index) {
  const prefix = `${String(index + 1).padStart(2, '0')}-${language.slug}`;
  const shots = {};
  const snaps = {};

  await openFreshMenu(page, language.code);
  await page.evaluate(() => window.__game?.currentScene?.openSettingsOverlay?.());
  await page.waitForFunction(() => Boolean(window.__game?.currentScene?.settingsOverlay), null, { timeout: 10000 });
  snaps.settings = await snapshot(page);
  assertSnapshotClean(snaps.settings, language, `${language.slug}.settings`);
  shots.settings = await screenshot(page, `${prefix}-settings.png`);
  assert(snaps.settings.language.current === language.code, `${language.slug} did not resolve to ${language.code}`);
  assert(snaps.settings.settings.language === language.settingsLabel, `${language.slug} Settings language label mismatch`);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__game?.currentScene?.settingsOverlay, null, { timeout: 10000 });
  snaps.menu = await snapshot(page);
  assertSnapshotClean(snaps.menu, language, `${language.slug}.menu`);
  shots.menu = await screenshot(page, `${prefix}-main-menu.png`);
  assert(snaps.menu.menu.settings === language.menuSettings, `${language.slug} menu Settings label mismatch`);
  assert(snaps.menu.menu.launch === language.launch, `${language.slug} launch label mismatch`);

  await page.evaluate((showAttempt) => {
    const menu = window.__game?.scenes?.menu || window.__game?.currentScene;
    const syntheticRecord = {
      score: 123456,
      sectorReached: 9,
      runElapsedSeconds: 599,
      runCleared: !showAttempt
    };
    menu.dailySignalBestAttempt = showAttempt ? syntheticRecord : null;
    menu.dailySignalBestClear = showAttempt ? null : syntheticRecord;
    menu.dailySignalBest = syntheticRecord;
    menu?.setMenuFocusByButton?.(menu?.dailySignalBtn);
  }, index % 2 === 1);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').menu?.missionBriefing?.mode === 'dailySignal', null, { timeout: 10000 });
  snaps.dailyMenu = await snapshot(page);
  assertSnapshotClean(snaps.dailyMenu, language, `${language.slug}.dailyMenu`);
  shots.dailyMenu = await screenshot(page, `${prefix}-daily-signal-menu.png`);
  assert(boxContains(snaps.dailyMenu.menu?.missionBriefing?.panelBounds, snaps.dailyMenu.menu?.missionBriefing?.titleBounds), `${language.slug} Daily title escaped its briefing panel: ${JSON.stringify(snaps.dailyMenu.menu?.missionBriefing)}`);
  assert(boxContains(snaps.dailyMenu.menu?.missionBriefing?.panelBounds, snaps.dailyMenu.menu?.missionBriefing?.bodyBounds), `${language.slug} Daily body escaped its briefing panel: ${JSON.stringify(snaps.dailyMenu.menu?.missionBriefing)}`);
  assert(snaps.dailyMenu.menu?.launchDeck?.featuredDailySignal?.flightLog?.symbols?.length > 0, `${language.slug} Daily Flight Log was not exposed`);

  await page.evaluate(() => window.__game?.startGame?.());
  await waitForScene(page, 'play');
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (play?.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play?.completeShipIntro?.();
    play?.hud?.update?.();
    play?.showStoryTransmission?.({ force: true });
    play?.processToastQueue?.();
  });
  await page.waitForTimeout(350);
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.hud?.scoreText?.text), null, { timeout: 10000 });
  snaps.hud = await snapshot(page);
  assertSnapshotClean(snaps.hud, language, `${language.slug}.hud`);
  shots.hud = await screenshot(page, `${prefix}-hud.png`);
  assert(String(snaps.hud.hud.score || '').startsWith(language.scorePrefix), `${language.slug} HUD score label mismatch: ${snaps.hud.hud.score}`);

  await page.keyboard.press('KeyP');
  await page.waitForTimeout(300);
  snaps.pause = await snapshot(page);
  assertSnapshotClean(snaps.pause, language, `${language.slug}.pause`);
  shots.pause = await screenshot(page, `${prefix}-pause.png`);

  await page.evaluate(() => {
    window.__game.score = 1234;
    window.__game.level = 3;
    window.__game.gameOver();
  });
  await waitForScene(page, 'gameOver');
  snaps.gameOver = await snapshot(page);
  assertSnapshotClean(snaps.gameOver, language, `${language.slug}.gameOver`);
  shots.gameOver = await screenshot(page, `${prefix}-game-over.png`);
  assert(String(snaps.gameOver.gameOver.score || '').startsWith(language.scorePrefix), `${language.slug} game-over score label mismatch`);

  await page.evaluate(() => window.__game?.showHighscores?.());
  await waitForScene(page, 'highscore');
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.highscore?.title?.text), null, { timeout: 10000 });
  await page.waitForTimeout(600);
  snaps.leaderboard = await snapshot(page);
  assertSnapshotClean(snaps.leaderboard, language, `${language.slug}.leaderboard`);
  shots.leaderboard = await screenshot(page, `${prefix}-leaderboard.png`);
  assert(snaps.leaderboard.leaderboard.title === language.leaderboard, `${language.slug} leaderboard title mismatch: ${snaps.leaderboard.leaderboard.title}`);
  assert(!boxesOverlap(snaps.leaderboard.leaderboard.commentBounds, snaps.leaderboard.leaderboard.stateBounds, 4), `${language.slug} leaderboard empty-state text overlaps`);
  assert(!boxesOverlap(snaps.leaderboard.leaderboard.stateBounds, snaps.leaderboard.leaderboard.firstRowBounds, 4), `${language.slug} leaderboard empty rows overlap state message`);

  await page.evaluate(() => {
    const scene = window.__game?.scenes?.highscore;
    scene?.applyLeaderboardResult?.({
      status: 'available',
      source: 'local',
      sourceLabel: 'Local Memory',
      entries: [
        { name: 'ACE', score: 98765, level: 12, rank_index: 5 },
        { name: 'NOVA', score: 54321, level: 8, rank_index: 3 },
        { name: 'TFG', score: 32010, level: 5, rank_index: 2 }
      ],
      message: 'Local board loaded.'
    });
  });
  await page.waitForTimeout(500);
  snaps.leaderboardPopulated = await snapshot(page);
  assertSnapshotClean(snaps.leaderboardPopulated, language, `${language.slug}.leaderboardPopulated`);
  shots.leaderboardPopulated = await screenshot(page, `${prefix}-leaderboard-populated.png`);
  assert(snaps.leaderboardPopulated.leaderboard.rowChildCount > 3, `${language.slug} populated leaderboard did not render rows`);

  return { shots, snaps };
}

const server = await startPreviewServer();
mkdirSync(outputDir, { recursive: true });

const launchOptions = {
  headless: true,
  viewport: { width: 1280, height: 720 }
};
const chromePath = findChrome();
if (chromePath) launchOptions.executablePath = chromePath;

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage();
const consoleEvents = [];
const pageErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleEvents.push(message.text().slice(0, 500));
});
page.on('pageerror', (error) => pageErrors.push(error.message));

const screenshots = {};
const snapshots = {};

try {
  for (let i = 0; i < languages.length; i += 1) {
    const result = await captureLanguage(page, languages[i], i);
    screenshots[languages[i].slug] = result.shots;
    snapshots[languages[i].slug] = result.snaps;
  }

  await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('system'));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').language?.preference === 'system', null, { timeout: 10000 });
  snapshots.systemFallback = await snapshot(page);
  assert(snapshots.systemFallback.language.current === 'en', 'System default fallback should resolve to English in this test runtime');

  await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('en'));
  snapshots.englishRestored = await snapshot(page);
  assert(snapshots.englishRestored.language.current === 'en', 'English restore failed');
} finally {
  await browser.close();
  if (server) server.kill();
}

const report = {
  placeholderHits: collectPlaceholderHits(snapshots),
  englishLeakHits: languages.flatMap((language) => collectEnglishLeakHits(snapshots[language.slug], language.slug, language.code)),
  status: consoleEvents.length || pageErrors.length || collectPlaceholderHits(snapshots).length || languages.flatMap((language) => collectEnglishLeakHits(snapshots[language.slug], language.slug, language.code)).length ? 'failed' : 'passed',
  baseUrl,
  outputDir,
  screenshots,
  snapshots,
  consoleEvents,
  pageErrors
};

writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outputDir, status: report.status, languages: languages.map((language) => language.code), consoleEvents, pageErrors, placeholderHits: report.placeholderHits, englishLeakHits: report.englishLeakHits }, null, 2));

if (report.status !== 'passed') {
  throw new Error('i18n UI check failed');
}
