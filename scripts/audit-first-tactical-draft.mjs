import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findAvailablePort(4930);
const baseUrl = `http://${host}:${port}`;
const outputDir = path.resolve(`test-results/first-tactical-draft-audit-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const locales = ['en', 'de', 'zh-CN', 'ru', 'es', 'pt-BR', 'ko', 'ja'];

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const open = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (open) return candidate;
  }
  throw new Error('No available Tactical Draft audit port');
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startServer() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : 'npx.cmd';
  const args = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error('Tactical Draft audit server did not start');
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function rect(raw) {
  return {
    x: Number(raw?.x) || 0,
    y: Number(raw?.y) || 0,
    width: Number(raw?.width) || 0,
    height: Number(raw?.height) || 0,
    right: (Number(raw?.x) || 0) + (Number(raw?.width) || 0),
    bottom: (Number(raw?.y) || 0) + (Number(raw?.height) || 0)
  };
}

function overlap(a, b) {
  const width = Math.min(a.right, b.right) - Math.max(a.x, b.x);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
  return { width, height, area: Math.max(0, width) * Math.max(0, height) };
}

async function prepareDraft(page, scenario) {
  await page.goto(`${baseUrl}/?autostart=1&skipIntro=1&offlineLeaderboard=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.evaluate(({ locale, uiScale, reducedMotion }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', locale);
    localStorage.setItem('nova_ui_scale_v1', String(uiScale));
    localStorage.setItem('nova_accessibility_reduced_motion', reducedMotion ? '1' : '0');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({ version: 1, totalRuns: 0 }));
  }, scenario);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, {
    timeout: 30000
  });
  await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    play.introActive = false;
    play.introComplete = true;
    play.setShipIntroAgencyState?.('complete', 'tactical_draft_audit_fixture');
    game.runMode = 'ranked_tactical';
    game.lives = Math.max(3, Number(game.lives) || 0);
    const opened = play.openTacticalDraft({ sectorCleared: 1 });
    if (!opened) throw new Error('First Tactical Draft did not open');
  });
  await page.waitForFunction(() => {
    const draft = window.__game?.scenes?.play?.tacticalDraft;
    return draft?.active && draft?.cards?.length === 3;
  }, null, { timeout: 10000 });
  await page.waitForTimeout(500);
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const play = window.__game.scenes.play;
    const draft = play.tacticalDraft;
    const nodeInfo = (node) => {
      if (!node) return null;
      const bounds = node.getBounds();
      const fontSize = Number(node.style?.fontSize) || null;
      const lineHeight = Number(node.style?.lineHeight) || (fontSize ? fontSize * 1.2 : null);
      return {
        text: String(node.text || ''),
        visible: node.visible !== false && node.renderable !== false,
        fontSize,
        scaleX: Number(node.scale?.x) || 0,
        scaleY: Number(node.scale?.y) || 0,
        estimatedLines: lineHeight ? Math.max(1, Math.round(bounds.height / Math.max(1, lineHeight * (Number(node.scale?.y) || 1)))) : 1,
        bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      };
    };
    return {
      build: JSON.parse(window.render_game_to_text?.() || '{}')?.gitSha || null,
      compact: Boolean(draft.compact),
      focusIndex: draft.focusIndex,
      initialFocusIndex: draft.initialFocusIndex,
      inputArmed: Boolean(draft.inputArmed),
      controls: {
        rescan: nodeInfo(draft.rescan?._nodes?.label),
        hold: nodeInfo(draft.hold?._nodes?.label),
        ban: nodeInfo(draft.ban?._nodes?.label),
        pass: nodeInfo(draft.pass?._nodes?.label),
        consequence: nodeInfo(draft.pass?._nodes?.consequence)
      },
      cards: draft.cards.map((card) => {
        const nodes = card._nodes;
        const cardBounds = card.getBounds();
        return {
          id: card._offer.id,
          category: card._offer.category,
          focused: card._draftIndex === draft.focusIndex,
          hitArea: card.hitArea ? { x: card.hitArea.x, y: card.hitArea.y, width: card.hitArea.width, height: card.hitArea.height } : null,
          bounds: { x: cardBounds.x, y: cardBounds.y, width: cardBounds.width, height: cardBounds.height },
          nodes: {
            name: nodeInfo(nodes.name),
            description: nodeInfo(nodes.description),
            impactBadge: nodeInfo(nodes.impactBadge),
            impactLabel: nodeInfo(nodes.impactLabel),
            impactValue: nodeInfo(nodes.impactValue),
            doctrineBadge: nodeInfo(nodes.doctrineBadge),
            doctrine: nodeInfo(nodes.doctrine),
            fusionBadge: nodeInfo(nodes.fusionBadge),
            permanenceBadge: nodeInfo(nodes.permanenceBadge),
            permanence: nodeInfo(nodes.permanence),
            chooseBg: nodeInfo(nodes.chooseBg),
            choose: nodeInfo(nodes.choose)
          }
        };
      })
    };
  });
}

function analyzeScenario(scenario, metrics) {
  const findings = [];
  for (const [index, card] of metrics.cards.entries()) {
    const nodes = Object.fromEntries(Object.entries(card.nodes).map(([key, value]) => [key, value ? { ...value, bounds: rect(value.bounds) } : null]));
    const visible = (key) => nodes[key]?.visible ? nodes[key] : null;
    const pairs = [
      ['name', 'description'],
      ['description', 'impactBadge'],
      ['impactBadge', 'doctrineBadge'],
      ['impactBadge', 'fusionBadge'],
      ['doctrineBadge', 'permanenceBadge'],
      ['fusionBadge', 'permanenceBadge'],
      ['permanenceBadge', 'chooseBg']
    ];
    for (const [left, right] of pairs) {
      if (!visible(left) || !visible(right)) continue;
      const collision = overlap(nodes[left].bounds, nodes[right].bounds);
      if (collision.area > 1) findings.push({ type: 'overlap', card: index, left, right, ...collision });
    }
    if (nodes.description?.visible && nodes.description.fontSize < 12) {
      findings.push({ type: 'primary_effect_below_floor', card: index, fontSize: nodes.description.fontSize, scale: nodes.description.scaleX });
    }
    if (nodes.description?.estimatedLines > 2) {
      findings.push({ type: 'primary_effect_wraps_over_two_lines', card: index, lines: nodes.description.estimatedLines });
    }
    if (nodes.description?.scaleX < 0.75) {
      findings.push({ type: 'primary_effect_heavily_scaled', card: index, scale: nodes.description.scaleX });
    }
    const cardRect = rect(card.bounds);
    for (const [key, node] of Object.entries(nodes)) {
      if (!node?.visible || key.endsWith('Badge') || key === 'chooseBg') continue;
      const inset = Math.min(
        node.bounds.x - cardRect.x,
        node.bounds.y - cardRect.y,
        cardRect.right - node.bounds.right,
        cardRect.bottom - node.bounds.bottom
      );
      if (inset < 2) findings.push({ type: 'frame_contact', card: index, node: key, inset });
    }
  }
  return { scenario: scenario.id, findings };
}

async function runScenario(browser, scenario) {
  const scenarioDir = path.join(outputDir, scenario.id);
  mkdirSync(scenarioDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: scenario.height },
    ...(scenario.recordVideo ? { recordVideo: { dir: scenarioDir, size: { width: scenario.width, height: scenario.height } } } : {})
  });
  const page = await context.newPage();
  const video = page.video();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await prepareDraft(page, scenario);
  const initial = await collectMetrics(page);
  await page.screenshot({ path: path.join(scenarioDir, '01-initial.png') });

  const firstCard = initial.cards[0];
  await page.mouse.move(firstCard.bounds.x + firstCard.bounds.width / 2, firstCard.bounds.y + firstCard.bounds.height / 2);
  await page.waitForTimeout(350);
  const hovered = await collectMetrics(page);
  await page.screenshot({ path: path.join(scenarioDir, '02-hover-card-1.png') });

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.setTacticalDraftFocus(play.tacticalDraft.initialFocusIndex, { silent: true });
    window.__burtGamepadOverride = { connected: true, axes: [1, 0], buttons: [] };
  });
  await page.waitForFunction((initialFocus) => window.__game.scenes.play.tacticalDraft.focusIndex !== initialFocus, initial.initialFocusIndex, { timeout: 3000 });
  await page.evaluate(() => { window.__burtGamepadOverride.axes = [0, 0]; });
  await page.waitForTimeout(250);
  const controllerFocused = await collectMetrics(page);
  await page.screenshot({ path: path.join(scenarioDir, '03-controller-focus-moved.png') });
  await page.waitForTimeout(scenario.recordVideo ? 2500 : 100);
  await page.evaluate(() => { delete window.__burtGamepadOverride; });

  const analysis = analyzeScenario(scenario, initial);
  await page.close();
  if (video) await video.saveAs(path.join(scenarioDir, `${scenario.id}.webm`));
  await context.close();
  return { scenario, initial, hovered, controllerFocused, analysis, pageErrors, consoleErrors };
}

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const browser = await chromium.launch({ headless: true, executablePath: findChrome() });
const scenarios = [
  { id: 'en-1920x1080-max', locale: 'en', width: 1920, height: 1080, uiScale: 2, reducedMotion: false },
  { id: 'en-1280x720-max', locale: 'en', width: 1280, height: 720, uiScale: 2, reducedMotion: false, recordVideo: true },
  { id: 'en-960x640-max', locale: 'en', width: 960, height: 640, uiScale: 2, reducedMotion: false, recordVideo: true },
  { id: 'en-960x640-reduced', locale: 'en', width: 960, height: 640, uiScale: 2, reducedMotion: true },
  ...locales.filter((locale) => locale !== 'en').map((locale) => ({
    id: `${locale.replaceAll(/[^a-z0-9]+/gi, '-')}-960x640-max`,
    locale,
    width: 960,
    height: 640,
    uiScale: 2,
    reducedMotion: false
  }))
];
  const report = { status: 'passed', outputDir, scenarios: [] };

try {
  for (const scenario of scenarios) {
    report.scenarios.push(await runScenario(browser, scenario));
  }
  const allFindings = report.scenarios.flatMap((entry) => entry.analysis.findings.map((finding) => ({ scenario: entry.scenario.id, ...finding })));
  const allErrors = report.scenarios.flatMap((entry) => [
    ...entry.pageErrors.map((error) => `${entry.scenario.id}: pageerror: ${error}`),
    ...entry.consoleErrors.map((error) => `${entry.scenario.id}: console: ${error}`)
  ]);
  assert.deepEqual(allErrors, [], `Tactical Draft audit runtime errors: ${allErrors.join('; ')}`);
  assert.deepEqual(allFindings, [], `Tactical Draft readability findings: ${JSON.stringify(allFindings)}`);
  report.findings = allFindings;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[first-tactical-draft-audit] PASS scenarios=${report.scenarios.length} findings=${allFindings.length}`);
  console.log(`[first-tactical-draft-audit] report=${path.join(outputDir, 'report.json')}`);
  console.log(JSON.stringify(allFindings, null, 2));
} finally {
  await browser.close();
  server.kill();
}
