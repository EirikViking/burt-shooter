const { test } = require('@playwright/test');

function attachLogging(page, logs, errors) {
  page.on('console', (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}\n${err.stack || ''}`.trim());
  });
  page.on('crash', () => {
    errors.push('page crashed');
  });
}

function dumpLogs(label, logs, errors) {
  console.log(`--- ${label} console logs ---`);
  logs.forEach((line) => console.log(line));
  if (errors.length) {
    console.log(`--- ${label} page errors ---`);
    errors.forEach((line) => console.log(line));
  }
}

async function waitForPlayScene(page) {
  await page.waitForFunction(() => {
    return window.__game && window.__game.scenes && window.__game.currentScene === window.__game.scenes.play;
  }, null, { timeout: 15000 });
}

test('perf run', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'webgl-disabled') {
    test.skip('Perf run requires WebGL');
  }

  const durationMs = Number(process.env.PERF_DURATION_MS || 120000);
  const sampleMs = 5000;
  const logs = [];
  const errors = [];
  attachLogging(page, logs, errors);

  let failure;
  try {
    await page.goto('/?autostart=1&perf=1', { waitUntil: 'domcontentloaded' });
    await waitForPlayScene(page);

    await page.keyboard.down('Space');
    await page.evaluate(() => {
      const player = window.__game?.scenes?.play?.player;
      if (player) {
        player.invulnerable = true;
        player.invulnerableTime = 1e9;
      }
    });

    const start = Date.now();
    let sampleIndex = 0;
    while (Date.now() - start < durationMs) {
      await page.waitForTimeout(sampleMs);
      sampleIndex += 1;

      const sample = await page.evaluate(() => {
        const stats = window.__perfStats || {};
        return {
          now: performance.now(),
          lastFrameTime: stats.lastFrameTime || 0,
          fps: stats.fps || 0,
          frameMs: stats.frameMs || 0,
          delta: stats.delta || 0,
          clampedDelta: stats.clampedDelta || 0,
          bullets: stats.bullets || 0,
          enemies: stats.enemies || 0,
          particles: stats.particles || 0,
          children: stats.children || 0,
          level: stats.level || 0,
          scene: stats.scene || '',
          renderer: stats.renderer || '',
          fatal: stats.fatal || false,
          fatalOverlay: !!document.querySelector('#fatal-overlay'),
          mem: performance.memory?.usedJSHeapSize || 0
        };
      });

      const lag = sample.now - sample.lastFrameTime;
      const elapsed = Math.round((Date.now() - start) / 1000);
      const memMb = sample.mem ? (sample.mem / (1024 * 1024)).toFixed(1) : 'n/a';
      console.log(
        `t=${elapsed}s fps=${sample.fps.toFixed(1)} ms=${sample.frameMs.toFixed(1)} ` +
        `bullets=${sample.bullets} enemies=${sample.enemies} particles=${sample.particles} ` +
        `children=${sample.children} level=${sample.level} mem=${memMb}MB scene=${sample.scene}`
      );

      if (sample.fatal || sample.fatalOverlay) {
        throw new Error('Fatal overlay detected');
      }
      if (lag > 2000) {
        throw new Error(`rAF stalled for ${Math.round(lag)}ms at sample ${sampleIndex}`);
      }
    }
  } catch (error) {
    failure = error;
  } finally {
    dumpLogs('perf run', logs, errors);
    if (failure) throw failure;
  }
});

test('webgl disabled shows fatal overlay', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'webgl-disabled') {
    test.skip('Only run with WebGL disabled');
  }

  const logs = [];
  const errors = [];
  attachLogging(page, logs, errors);

  let failure;
  try {
    await page.goto('/?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const el = document.querySelector('#fatal-overlay');
      return !!el && (el.textContent || '').length > 0;
    }, null, { timeout: 5000 });
  } catch (error) {
    failure = error;
  } finally {
    dumpLogs('webgl disabled', logs, errors);
    if (failure) throw failure;
  }
});

