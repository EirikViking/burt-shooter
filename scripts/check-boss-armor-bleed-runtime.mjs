import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = Number(process.env.CHECK_PORT) || await findAvailablePort(4890);
const baseUrl = `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-armor-bleed-runtime-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
  return next.toString();
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

async function waitForBoss(page) {
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.wave?.state === 'BOSS_ACTIVE';
  }, null, { timeout: 30000 });
}

mkdirSync(outputDir, { recursive: true });

const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu', '--no-sandbox']
});

try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startAtBoss: '1',
    startLevel: '1',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForBoss(page);

  const ordinaryBurst = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    if (!boss) throw new Error('Missing live boss for armor-bleed runtime check');

    boss.maxHealth = 100;
    boss.health = 100;
    boss.active = true;
    boss.firstDamageAtMs = 0;
    boss.fastKillGuideUntilMs = 0;
    boss.armorBleedGuideMs = 7000;
    boss.minimumFightMs = 7000;
    boss.finishGateUntilMs = 0;
    boss.finishGateLogged = false;
    boss.invulnerableUntilMs = 0;

    const firstDamageAt = Date.now();
    const openerKilled = boss.takeDamage(85);
    const afterOpener = boss.health;
    boss.firstDamageAtMs = Date.now() - 4900;
    boss.fastKillGuideUntilMs = boss.firstDamageAtMs + 7000;
    const killedBeforeGuide = boss.takeDamage(20);

    return {
      openerKilled,
      afterOpener,
      killedBeforeGuide,
      hpBeforeGuide: boss.health,
      guideRemainingMs: Math.max(0, Math.round((firstDamageAt + 7000) - Date.now())),
      finishGateActive: boss.isFinishPacingActive?.() === true
    };
  });

  const screenshot = path.join(outputDir, 'ordinary-burst-damped.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const lethalProof = await page.evaluate(() => {
    const boss = window.__game?.scenes?.play?.enemyManager?.boss;
    if (!boss) throw new Error('Missing live boss for lethal proof');

    boss.firstDamageAtMs = Date.now() - 7100;
    boss.finishGateUntilMs = 0;
    const killedAfterGuide = boss.takeDamage(20);
    const hpAfterGuide = boss.health;

    boss.maxHealth = 100;
    boss.health = 100;
    boss.active = true;
    boss.firstDamageAtMs = 0;
    boss.fastKillGuideUntilMs = 0;
    boss.armorBleedGuideMs = 7000;
    boss.minimumFightMs = 7000;
    boss.finishGateUntilMs = 0;
    boss.finishGateLogged = false;
    boss.invulnerableUntilMs = 0;
    const hugeOverkillKilled = boss.takeDamage(1000);

    return {
      killedAfterGuide,
      hpAfterGuide,
      hugeOverkillKilled,
      hpAfterHugeOverkill: boss.health
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    outputDir,
    screenshot,
    ordinaryBurst,
    lethalProof,
    ok: ordinaryBurst.openerKilled === false &&
      ordinaryBurst.killedBeforeGuide === false &&
      ordinaryBurst.hpBeforeGuide > 0 &&
      ordinaryBurst.finishGateActive === true &&
      lethalProof.killedAfterGuide === true &&
      lethalProof.hugeOverkillKilled === true
  };

  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await page.close();

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(`[boss-armor-bleed-runtime] PASS ordinaryHpBeforeGuide=${ordinaryBurst.hpBeforeGuide.toFixed(2)} hugeOverkillAllowed=true screenshot=${screenshot}`);
} finally {
  await browser.close().catch(() => {});
  if (server && !server.killed) server.kill();
}
