import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(startPort = 4877) {
  for (let port = startPort; port < startPort + 40; port += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(port, '127.0.0.1');
    });
    if (available) return port;
  }
  throw new Error('No available frame-pacing browser probe port');
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startVite(baseUrl, port) {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = existsSync(viteEntry)
    ? [viteEntry, '--host', '127.0.0.1', '--port', String(port), '--strictPort']
    : ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
  const server = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', chunk => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', chunk => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error(`Vite did not start at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find(existsSync);
}

const port = Number(process.env.CHECK_PORT) || await findAvailablePort();
const baseUrl = process.env.CHECK_URL || `http://127.0.0.1:${port}`;
const durationMs = Math.max(10000, Math.min(60000, Number(process.env.FRAME_PACING_PROBE_DURATION_MS) || 10000));
const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR || `test-results/frame-pacing-browser-${timestamp()}`
);
mkdirSync(outputDir, { recursive: true });
const server = await startVite(baseUrl, port);
const headless = process.env.FRAME_PACING_PROBE_HEADLESS !== '0';
const browser = await chromium.launch({
  headless,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', error => errors.push(`page error: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console error: ${message.text()}`);
  });
  await page.goto(`${baseUrl}/frame-pacing-probe.html`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => Boolean(window.__novaFramePacingProbe?.ready), null, { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__novaFramePacingProbe.reset());
  await page.waitForTimeout(durationMs);
  const probe = await page.evaluate(() => window.__novaFramePacingProbe.getReport());
  await page.screenshot({
    path: path.join(outputDir, 'frame-pacing-probe-final.png'),
    fullPage: false
  });

  const timing = probe.timing.requestAnimationFrame;
  if (probe.rates.requestAnimationFrameHz < 55) errors.push(`rAF ${probe.rates.requestAnimationFrameHz} Hz below 55 Hz`);
  if (probe.rates.fixedSimulationStepHz < 59 || probe.rates.fixedSimulationStepHz > 61) {
    errors.push(`fixed simulation ${probe.rates.fixedSimulationStepHz} Hz outside 59-61 Hz`);
  }
  if (probe.rates.renderInvocationHz < 55) errors.push(`render ${probe.rates.renderInvocationHz} Hz below 55 Hz`);
  if (timing.p95Ms > 20) errors.push(`rAF p95 ${timing.p95Ms} ms above 20 ms`);
  if (timing.p99Ms > (1000 / 30)) errors.push(`rAF p99 ${timing.p99Ms} ms above 33.3 ms`);
  if (Math.abs(probe.wallClockDriftPercent) > 0.5) errors.push(`wall-clock drift ${probe.wallClockDriftPercent}% above 0.5%`);

  const report = {
    status: errors.length ? 'failed' : 'passed',
    generatedAt: new Date().toISOString(),
    outputDir,
    baseUrl,
    durationMs,
    headless,
    browserVersion: await browser.version(),
    probe,
    screenshot: path.join(outputDir, 'frame-pacing-probe-final.png'),
    errors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[frame-pacing-browser] ${report.status.toUpperCase()} raf=${probe.rates.requestAnimationFrameHz}Hz fixed=${probe.rates.fixedSimulationStepHz}Hz render=${probe.rates.renderInvocationHz}Hz p95=${timing.p95Ms}ms p99=${timing.p99Ms}ms report=${path.relative(process.cwd(), path.join(outputDir, 'report.json')).replaceAll(path.sep, '/')}`);
  assert.equal(errors.length, 0, errors.join('\n'));
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
