import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const out = process.env.CHECK_OUTPUT_DIR;
assert(out?.startsWith('E:') && process.env.CHECK_URL);
mkdirSync(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const errors = [];
// This harness intentionally fails until both production changes are integrated.
let result;
try {
 const page = await browser.newPage({viewport: {width: 1280, height: 720}});
 page.on('pageerror', e => errors.push(e.message));
 await page.route('**/*', route => /^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(route.request().url()) ? route.continue() : route.abort());
 await page.goto(process.env.CHECK_URL + '/?autostart=1&offlineLeaderboard=1&encounterEvolution=planetfall');
 await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.boss?.isPlanetfall, null, {timeout: 90000});
 result = await page.evaluate(async () => {
  const g = window.__game, scene = g.scenes.play, player = scene.player;
  if (!g.runPolicy.prototype || g.runPolicy.allowGlobalLeaderboard) throw Error('Unsafe policy');
  g.app.ticker.stop();
  const {Bullet} = await import('/src/entities/Bullet.js');
  const {GameAssets} = await import('/src/utils/GameAssets.js');
  const original = GameAssets.getEnemyWeaponTexture;
  let discardedAssetLookups = 0;
  GameAssets.getEnemyWeaponTexture = (...args) => { discardedAssetLookups++; return original.apply(GameAssets, args); };
  const batches = [], traces = [];
  try {
   for (let batch = 0; batch < 9; batch++) {
    const start = performance.now();
    for (let n = 0; n < 240; n++) {
     const bullet = new Bullet(100, 200, 2, 3, 4, 0xff6655, n % 2 === 0,
      {assetIndex: n % 18, cosmeticPhase: .75, radius: 6, damageMult: 1.25});
     if (batch === 1 && n < 2) traces.push({radius: bullet.radius, damage: bullet.damage, x: bullet.x, y: bullet.y, label: bullet.core.label, scale: bullet.baseScale, children: bullet.sprite.children.length});
     bullet.sprite.destroy({children: true});
    }
    batches.push(performance.now() - start);
   }
  } finally { GameAssets.getEnemyWeaponTexture = original; }
  const silhouette = player.hullSilhouette;
  return {discardedAssetLookups, batches, traces, silhouette: silhouette ? {count: silhouette.children.length, parent: silhouette.parent === player.sprite} : null};
 });
 await page.screenshot({path: path.join(out, 'gameplay.png')});
} finally {
 await browser.close();
 writeFileSync(path.join(out, 'report.json'), JSON.stringify({result, errors}, null, 2));
}
assert.deepEqual(errors, []);
assert.equal(result.discardedAssetLookups, 0, 'Browser constructs and discards legacy shot artwork');
assert.equal(result.silhouette?.count, 4, 'Player has no persistent hull separation');
assert.equal(result.silhouette?.parent, true);
