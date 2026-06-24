import fs from 'node:fs';
import path from 'node:path';
import { ELITE_MIDDLE_SHIPS, pickEliteMiddleShipForLevel } from '../src/config/EliteMiddleShips.js';

function fail(message) {
  console.error(`[gameplay-followups] FAIL ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function read(file) {
  return fs.readFileSync(path.resolve(file), 'utf8');
}

const playScene = read('src/scenes/PlayScene.js');
const player = read('src/entities/Player.js');
const boss = read('src/entities/Boss.js');
const enemy = read('src/entities/Enemy.js');
const enemyManager = read('src/managers/EnemyManager.js');
const powerups = read('src/managers/PowerupManager.js');
const gameOver = read('src/scenes/GameOverScene.js');
const steamAchievements = read('electron/steamAchievementsBridge.cjs');

assert(playScene.includes('detonateBombBullet(bullet') && playScene.includes("this.detonateBombBullet(bullet, 'impact')"),
  'bomb shots must detonate on direct enemy impact');
assert(player.includes('bomb.isBomb = true') && player.includes('bomb.blastRadius = 150') && player.includes('bomb.radius = 11'),
  'bomb shot projectile must remain armed and visibly distinct');

assert(boss.includes('minimumFightMs') && boss.includes('finishGateUntilMs') && boss.includes('BossDamageGate'),
  'boss lethal-damage showcase hold is missing');
assert(boss.includes('if (now < this.finishGateUntilMs) return false;'),
  'boss must suppress fire during the early-finish hold');

const tractor = ELITE_MIDDLE_SHIPS.find((profile) => profile.specialAbility === 'tractor_pull');
assert(tractor && tractor.spawnWeight < 0.5, 'tractor elite should be less common than before');
assert(ELITE_MIDDLE_SHIPS.filter((profile) => profile.minLevel <= 8 && profile.specialAbility !== 'tractor_pull')
  .every((profile) => profile.spawnWeight >= 0.95), 'early non-tractor elites should be weighted up');
assert(enemy.includes('* 0.034 * frameScale') && enemy.includes('- 1.9 * frameScale'),
  'tractor pull strength did not increase');
assert(player.includes('this.statusVfxPulse = 1.45') && player.includes('duration = 680'),
  'tractor debuff visibility pulse was not strengthened');

assert(enemyManager.includes('eliteMinY') && enemyManager.includes('minFormationY'),
  'enemy formation/elite vertical clamp is missing');
assert(powerups.includes("scene.game.gainLife()") && !powerups.includes("translateText('MAX LIVES REACHED!')"),
  'extra-life pickup must gain another life instead of preserving the old max-lives message path');

assert(gameOver.includes('createUnlockSummary') && gameOver.includes('playShipUnlockVoice') && gameOver.includes('getShipUnlockRevealDebugState'),
  'ship-unlock reveal/announcement path is missing');
assert(steamAchievements.includes('nativeMethodName:') && steamAchievements.includes('SetAchievement+StoreStats'),
  'Steam achievement bridge should record SetAchievement+StoreStats diagnostics');

let tractorPicks = 0;
let nonTractorPicks = 0;
for (let i = 0; i < 200; i += 1) {
  const value = (i + 0.5) / 200;
  const picked = pickEliteMiddleShipForLevel(12, () => value);
  if (picked?.specialAbility === 'tractor_pull') tractorPicks += 1;
  else if (picked) nonTractorPicks += 1;
}
assert(nonTractorPicks > tractorPicks * 2, `tractor distribution still too high at level 12 (${tractorPicks}/${nonTractorPicks})`);

console.log(`[gameplay-followups] PASS tractorPicks=${tractorPicks} nonTractorPicks=${nonTractorPicks}`);
