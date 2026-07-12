import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

globalThis.Audio = class AudioStub {
  addEventListener() {}
  removeEventListener() {}
  load() {}
  pause() {}
  play() { return Promise.resolve(); }
};

const {
  calculateTacticalLoadoutLayout,
  groupTacticalAugments
} = await import('../src/ui/TacticalLoadoutOverlay.js');

const selectedIds = [
  'damage_up', 'damage_up', 'rapid_fire', 'rail_surge', 'double_shot', 'pierce',
  'target_paint', 'plasma_lance', 'chain_lightning', 'speed_up', 'blink_drive',
  'vector_boost', 'shield', 'ghost', 'point_defense', 'nano_patch', 'magnet',
  'drones', 'drones', 'bomb', 'orbital_strike',
  'phase_reactor', 'focus_lens', 'inertial_dampers', 'phase_wake', 'slipstream_coils',
  'emergency_bulkhead', 'impact_foam', 'graze_plating', 'last_light',
  'combo_anchor', 'salvage_clock', 'power_saver', 'drone_link'
];

const consumedIds = ['nano_patch'];
const grouped = groupTacticalAugments(selectedIds, consumedIds);
assert.equal(grouped.length, 32, 'duplicates should collapse into the complete curated pool');
assert.equal(grouped.find((item) => item.id === 'damage_up')?.stacks, 2);
assert.equal(grouped.find((item) => item.id === 'damage_up')?.name, 'WARHEAD AUTHORITY');
assert.equal(grouped.find((item) => item.id === 'damage_up')?.evolved, true);
assert.equal(grouped.find((item) => item.id === 'drones')?.stacks, 2);
assert.equal(grouped.find((item) => item.id === 'drones')?.name, 'DRONE WING');
assert.equal(grouped.find((item) => item.id === 'nano_patch')?.consumed, true);
assert.ok(grouped.every((item) => item.known && item.name && item.description));

for (const [width, height, expected] of [
  [1920, 1080, { columns: 4, rows: 2, pageSize: 8 }],
  [1280, 720, { columns: 3, rows: 2, pageSize: 6 }],
  [800, 600, { columns: 2, rows: 2, pageSize: 4 }],
  [640, 480, { columns: 1, rows: 3, pageSize: 3 }]
]) {
  const layout = calculateTacticalLoadoutLayout(width, height, grouped.length);
  assert.equal(layout.columns, expected.columns);
  assert.equal(layout.rows, expected.rows);
  assert.equal(layout.pageSize, expected.pageSize);
  assert.ok(layout.panel.x >= 0 && layout.panel.y >= 0);
  assert.ok(layout.panel.x + layout.panel.width <= width + 0.01);
  assert.ok(layout.panel.y + layout.panel.height <= height + 0.01);
  assert.ok(layout.cardWidth > 0 && layout.cardHeight > 0);
}

const port = 4397;
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const server = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: repoRoot,
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += chunk; });
server.stderr.on('data', (chunk) => { serverOutput += chunk; });

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Vite did not start at ${url}\n${serverOutput}`);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
try {
  await waitForServer(`http://127.0.0.1:${port}`);
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
    { width: 800, height: 600 },
    { width: 640, height: 480 }
  ]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.route('**/overlay-test.html', (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body style="margin:0;overflow:hidden;background:#020713"></body></html>'
    }));
    await page.goto(`http://127.0.0.1:${port}/overlay-test.html`, { waitUntil: 'domcontentloaded' });
    const state = await page.evaluate(async ({ selectedIds, consumedIds, viewport }) => {
      const { TacticalLoadoutOverlay, TacticalLoadoutPixiRuntime } = await import('/src/ui/TacticalLoadoutOverlay.js');
      const app = new TacticalLoadoutPixiRuntime.Application();
      await app.init({ width: viewport.width, height: viewport.height, backgroundColor: 0x020713 });
      document.body.replaceChildren(app.canvas);
      const game = { getWidth: () => viewport.width, getHeight: () => viewport.height, app };
      let closeCount = 0;
      const overlay = new TacticalLoadoutOverlay(game, { selectedIds, consumedIds, onClose: () => {
        closeCount += 1;
        window.__tacticalCloseCount = closeCount;
      } });
      app.stage.addChild(overlay.container);
      app.render();
      const initial = overlay.getDebugState();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true }));
      app.render();
      const keyboardPaged = overlay.getDebugState();
      overlay.controls.previous?.emit('pointertap');
      const pointerPaged = overlay.getDebugState();
      window.__burtGamepadOverride = { connected: true, axes: [0, 0], buttons: [] };
      overlay.update();
      window.__burtGamepadOverride.buttons[5] = { pressed: true, value: 1 };
      overlay.update();
      const controllerPaged = overlay.getDebugState();
      window.__burtGamepadOverride.buttons = [];
      overlay.update();
      overlay.openDetail(overlay.items.find((item) => item.id === 'nano_patch'));
      app.render();
      const detailOpen = overlay.getDebugState();
      const extracted = await app.renderer.extract.pixels(app.stage);
      const pixels = extracted?.pixels || extracted;
      window.__tacticalOverlayTest = { overlay, app };
      return {
        initial,
        keyboardPaged,
        pointerPaged,
        controllerPaged,
        detailOpen,
        closeCount,
        canvasPixels: Array.from(pixels || []).some((value) => value !== 0)
      };
    }, { selectedIds, consumedIds, viewport });
    await page.evaluate(() => {
      const { overlay, app } = window.__tacticalOverlayTest;
      overlay.closeDetail?.();
      app.render();
    });
    const screenshotPath = path.join(tmpdir(), `nova-swarm-tactical-loadout-overlay-${viewport.width}x${viewport.height}.png`);
    await page.screenshot({ path: screenshotPath });
    assert.equal(state.initial.uniqueCount, 32);
    assert.equal(state.initial.doctrine?.id, 'arsenal_network');
    assert.equal(state.initial.doctrine?.stage, 'ASCENDANT');
    assert.match(state.initial.doctrine?.display || '', /ARSENAL NETWORK.*ASCENDANT/);
    assert.deepEqual(state.initial.layout.layoutWarnings, [], `${viewport.width}x${viewport.height} layout warnings`);
    assert.ok(state.initial.visibleIds.length <= state.initial.pageSize);
    assert.ok(state.canvasPixels, `${viewport.width}x${viewport.height} should render nonblank pixels`);
    assert.equal(state.keyboardPaged.pageIndex, state.initial.pageCount > 1 ? 1 : 0);
    assert.equal(state.pointerPaged.pageIndex, 0);
    assert.equal(state.controllerPaged.pageIndex, state.initial.pageCount > 1 ? 1 : 0);
    assert.equal(state.initial.items.find((item) => item.id === 'nano_patch')?.consumed, true);
    assert.deepEqual(state.detailOpen.detail, {
      id: 'nano_patch',
      consumed: true,
      panel: state.detailOpen.detail.panel
    });
    const closeState = await page.evaluate(() => {
      const { overlay } = window.__tacticalOverlayTest;
      window.__burtGamepadOverride.buttons = [];
      overlay.update();
      window.__burtGamepadOverride.buttons[1] = { pressed: true, value: 1 };
      overlay.update();
      window.__burtGamepadOverride.buttons[1] = { pressed: false, value: 0 };
      overlay.update();
      window.__burtGamepadOverride.buttons[1] = { pressed: true, value: 1 };
      overlay.update();
      return { closed: overlay.closed, parent: Boolean(overlay.container?.parent), closeCount: window.__tacticalCloseCount || 0 };
    });
    assert.deepEqual(closeState, { closed: true, parent: false, closeCount: 1 });
    console.log(`SCREENSHOT ${screenshotPath}`);
    await page.close();
  }
  assert.deepEqual(errors, [], `browser errors: ${errors.join('\n')}`);
  console.log('PASS tactical loadout overlay grouping, responsive layout, paging, and PIXI rendering');
} finally {
  await browser.close();
  server.kill();
}
