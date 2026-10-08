// Use the same keyboard confirmation as a tester; never bypass ship validation.
export async function chooseEncounterTestShip(page, name) {
  await page.waitForFunction(() => window.__game?.currentSceneName === 'shipSelect'
    && window.__game.currentScene?.startButton, null, { timeout: 120000 });
  await page.bringToFront();
  if (name) {
    const steps = await page.evaluate(name => {
      const s = window.__game.currentScene;
      const target = s.ships.findIndex(ship => ship.name.toLowerCase() === name.toLowerCase());
      if (target < 0) throw Error('Unknown test ship: ' + name);
      const right = (target - s.selectedIndex + s.ships.length) % s.ships.length;
      return right <= s.ships.length / 2 ? right : right - s.ships.length;
    }, name);
    for (let i = 0; i < Math.abs(steps); i++) {
      await page.keyboard.press(steps > 0 ? 'ArrowRight' : 'ArrowLeft');
      await page.waitForFunction(() => !window.__game.currentScene.animating
        && window.__game.currentScene.pendingIndex == null, null, { timeout: 15000 });
    }
  }
  return page.evaluate(() => {
    const s = window.__game.currentScene;
    return { ...s.ships[s.selectedIndex], rosterSize: s.ships.length, readyText: s.leftIntel?.count?.text };
  });
}

export async function launchEncounterTestFromHangar(page) {
  const ship = await chooseEncounterTestShip(page, process.env.CHECK_SHIP);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play', null, { timeout: 120000 });
  return ship;
}
