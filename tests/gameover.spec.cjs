const { test, expect } = require('@playwright/test');

test('leaderboard submit listens for Enter', async ({ page }) => {
  await page.route('**/api/highscores', (route) => {
    route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([])
    });
  });

  await page.goto('/?autostart=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    return window.__game && window.__game.currentScene === window.__game.scenes?.play;
  });
  await page.waitForFunction(() => {
    return window.__game?.scenes?.play?.player;
  });

  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (play && play.player) {
      play.player.active = false;
    }
    window.__game.lives = 0;
    window.__game.gameOver();
  });

  await page.waitForFunction(() => {
    const game = window.__game;
    return game?.currentScene === game?.scenes?.gameOver;
  }, null, { timeout: 20000 });

  await page.waitForTimeout(500);
  await page.keyboard.type('JONAS');

  const submitRequest = page.waitForRequest((request) => {
    return request.url().endsWith('/api/highscores') && request.method() === 'POST';
  });

  await page.keyboard.press('NumpadEnter');

  await submitRequest;

  await page.waitForFunction(() => {
    const game = window.__game;
    return game?.currentScene === game?.scenes?.highscore;
  }, null, { timeout: 20000 });
});
