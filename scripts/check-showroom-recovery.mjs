import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, _electron } from 'playwright';

const url = process.env.CHECK_URL;
const out = process.env.CHECK_OUTPUT_DIR;
const executable = process.env.SHOWROOM_NATIVE_EXE;
assert((url || executable) && out?.startsWith('E:'), 'Use an explicit local server/executable and E: evidence directory');
if (executable) assert(process.env.TEMP?.startsWith('E:'), 'Native profiles require E: TEMP');
mkdirSync(out, { recursive: true });
const browser = executable ? null : await chromium.launch({ channel: 'chrome', headless: true });
const native = executable ? await _electron.launch({ executablePath: executable, timeout: 120000,
  args: ['--windowed', '--nova-fresh-profile', `--nova-qa-user-data=${process.env.TEMP}/showroom-native`],
  env: { ...process.env, NOVA_SWARM_FRESH_PROFILE: '1' } }) : null;
const errors = [], checks = [], failures = [];
try {
  const page = native ? await native.firstWindow() : await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', error => errors.push(error.message));
  if (!native) await page.route('**/*', route => /^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(route.request().url()) ? route.continue() : route.abort());
  if (native) await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  const target = new URL(native ? page.url() : url);
  target.searchParams.set('skipIntro', '1');
  target.searchParams.set('offlineLeaderboard', '1');
  await page.addInitScript(() => {
    window.__showroomContexts = [];
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      const context = original.call(this, type, ...args);
      if (context && /^webgl/.test(type) && !window.__showroomContexts.includes(context)) {
        window.__showroomContexts.push(context);
        const draw = context.drawElements.bind(context);
        context.drawElements = (...drawArgs) => {
          const result = draw(...drawArgs);
          if (window.__loseDuringShowroomDraw && context === window.__showroomContext) {
            window.__loseDuringShowroomDraw = false;
            context.getExtension('WEBGL_lose_context').loseContext();
          }
          return result;
        };
      }
      return context;
    };
  });
  for (const [width, height, mode] of [[1280, 720, 'between-frames'], [390, 844, 'between-frames'], [1280, 720, 'during-render'], [390, 844, 'stationary']]) {
    if (!native) await page.setViewportSize({ width, height });
    await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__game?.scenes.menu.astraMenuShip?.ready, null, { timeout: 120000 });
    if (native) await native.evaluate(({ BrowserWindow }, size) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.setFullScreen(false); win.unmaximize(); win.setMinimumSize(0, 0);
      win.setContentSize(size.width, size.height);
    }, { width, height });
    await page.waitForFunction(size => innerWidth === size.width && innerHeight === size.height, { width, height });
    if (process.env.CHECK_SHIP_KEY) await page.evaluate(async key => {
      const game = window.__game, menu = game.scenes.menu;
      menu.getQuickStartShipKey = () => key;
      game.showThreatCodex(); game.showMenu();
      await menu.presentationReady;
    }, process.env.CHECK_SHIP_KEY);
    await page.waitForFunction(w => window.__game.getWidth() === w, width);
    const initial = await page.evaluate(() => {
      const g = window.__game, ship = g.scenes.menu.astraMenuShip;
      g.app.ticker.stop();
      window.__showroomShip = ship;
      const context = window.__showroomContexts.find(c => c.getContextAttributes()?.preserveDrawingBuffer && c.canvas.width === ship.solid.size);
      if (!context) throw Error('Owned shared showroom context not found');
      window.__showroomContext = context;
      window.__showroomExtension = context.getExtension('WEBGL_lose_context');
      if (!window.__showroomExtension) throw Error('Context-loss extension unavailable');
      window.__showroomPixels = () => {
        const canvas = ship.solid.canvas;
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let occupied = 0, signature = 0;
        for (let i = 0; i < pixels.length; i += 16) {
          if (pixels[i + 3] > 16) occupied++;
          signature = (signature + pixels[i] * 3 + pixels[i + 1] * 5 + pixels[i + 2] * 7 + pixels[i + 3]) >>> 0;
        }
        return { occupied, signature };
      };
      ship.update(1); g.app.render();
      return { pixels: window.__showroomPixels(), ready: ship.ready, resident: ship.solid.constructor.resident,
        index: ship.index, canvasSize: ship.solid.size, viewVisible: ship.views[0].visible,
        contextLost: context.isContextLost(), diagnostics: ship.solid.constructor.diagnostics };
    });
    checks.push({ width, height, mode, initial });
    await page.screenshot({ path: path.join(out, `initial-${width}.png`) });
    assert(initial.pixels.occupied > 1000, 'Initial genuine 3D ship must contain visible pixels');
    await page.evaluate(mode => {
      if (mode === 'during-render') {
        window.__loseDuringShowroomDraw = true;
        window.__showroomShip.targetAngle += 0.1;
        window.__showroomShip.update(1);
      } else window.__showroomExtension.loseContext();
    }, mode);
    await page.waitForFunction(() => window.__showroomContext.isContextLost());
    const lost = await page.evaluate(mode => {
      const ship = window.__showroomShip;
      if (mode !== 'stationary') ship.targetAngle += 0.45;
      for (let n = 0; n < 90; n++) ship.update(1);
      window.__game.app.render();
      return { pixels: window.__showroomPixels(), ready: ship.ready };
    }, mode);
    await page.screenshot({ path: path.join(out, `context-lost-${width}.png`) });
    if (lost.pixels.signature !== initial.pixels.signature || lost.pixels.occupied <= 1000) failures.push({ width, mode, reason: 'Context loss erased the last genuine ship frame', initial, lost });
    await page.evaluate(() => window.__showroomExtension.restoreContext());
    await page.waitForFunction(() => !window.__showroomContext.isContextLost(), null, { timeout: 20000 });
    const restored = await page.evaluate(() => {
      const ship = window.__showroomShip;
      for (let n = 0; n < 4; n++) ship.update(1);
      window.__game.app.render();
      return { pixels: window.__showroomPixels(), ready: ship.ready, resident: ship.solid.constructor.resident };
    });
    await page.screenshot({ path: path.join(out, `restored-${width}.png`) });
    if (restored.pixels.occupied <= 1000 || (mode !== 'stationary' && restored.pixels.signature === initial.pixels.signature)) failures.push({ width, mode, reason: 'Restored context did not render the requested new pose', initial, restored });
    assert.equal(restored.resident, initial.resident, 'Recovery leaked a ship instance');
    assert.equal(restored.resident, 1, 'Menu owns exactly one 3D ship');
    checks.at(-1).lost = lost;
    checks.at(-1).restored = restored;
  }
} finally {
  await native?.close();
  await browser?.close();
  writeFileSync(path.join(out, 'report.json'), JSON.stringify({ checks, failures, errors }, null, 2));
}
assert.deepEqual(errors, []);
assert.deepEqual(failures, []);
console.log('PASS: actual showroom pixels survive context loss and update after restoration at desktop/mobile sizes');
