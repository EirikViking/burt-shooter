import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage();
  await page.goto(process.env.CHECK_URL || 'http://127.0.0.1:4197', { waitUntil: 'domcontentloaded' });
  const outcome = await page.evaluate(async () => {
    const { getOnslaughtShipAdvice } = await import('/src/scenes/ShipSelectScene.js');
    const weak = { baseId: 'weak', spriteKey: 'weak.png', unlock: { level: 1 }, stats: { damage: 1, speed: 1, bulletSpeed: 1, fireRate: 200 }, weapon: { bullets: 1 }, hitbox: { radius: 14 } };
    const strong = { baseId: 'strong', spriteKey: 'strong.png', unlock: { level: 4 }, stats: { damage: 2, speed: 1.3, bulletSpeed: 1.3, fireRate: 120 }, weapon: { bullets: 2 }, hitbox: { radius: 10 } };
    const engaged = (id) => ({ runId: id, mode: 'overrun_tactical', rulesetVersion: 'overrun_tactical_score_v2', hullId: 'weak', wavesCleared: 4, elapsedSeconds: 70, sectorsCleared: 1 });
    const aborted = { ...engaged('abort'), wavesCleared: 0, elapsedSeconds: 9 };
    const ships = [weak, strong];
    return {
      one: getOnslaughtShipAdvice(ships, weak, [engaged('one')], () => true),
      aborted: getOnslaughtShipAdvice(ships, weak, [engaged('one'), aborted], () => true),
      locked: getOnslaughtShipAdvice(ships, weak, [engaged('one'), engaged('two')], ship => ship.baseId === 'weak'),
      successful: getOnslaughtShipAdvice(ships, weak, [engaged('one'), { ...engaged('two'), sectorsCleared: 2 }], () => true),
      qualified: getOnslaughtShipAdvice(ships, weak, [engaged('one'), engaged('two')], () => true)?.ship?.baseId,
      reason: getOnslaughtShipAdvice(ships, weak, [engaged('one'), engaged('two')], () => true)?.reason
    };
  });
  assert.equal(outcome.one, null);
  assert.equal(outcome.aborted, null);
  assert.equal(outcome.locked, null);
  assert.equal(outcome.successful, null);
  assert.equal(outcome.qualified, 'strong');
  assert.equal(outcome.reason, 'MORE FIREPOWER');
  console.log('[onslaught-ship-advice] PASS repeated engaged failures, short abort, unlocks, success and mechanical advantage');
} finally {
  await browser.close();
}
