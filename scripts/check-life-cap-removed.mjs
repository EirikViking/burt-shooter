import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { BalanceConfig, MAX_PLAYER_LIVES } from '../src/config/BalanceConfig.js';

const read = (file) => readFileSync(file, 'utf8');

assert.equal(Number.isFinite(MAX_PLAYER_LIVES), false, 'MAX_PLAYER_LIVES should be unlimited');
assert.equal(Number.isFinite(BalanceConfig.survival?.maxLives), false, 'survival.maxLives should be unlimited');
assert.equal(BalanceConfig.rewards?.bossClearRepairMaxLives, 3, 'boss-clear recovery should still only repair up to 3 lives');

const gameSource = read('src/game/Game.js');
assert.match(gameSource, /Math\.min\(this\.lives \+ grantCount, maxLives\)/, 'Game.gainLife should apply the requested grant against the shared max lives value');
assert.match(gameSource, /Number\.isFinite\(maxLives\).*after >= maxLives/s, 'Game.gainLife should only report reachedMax for finite caps');

const powerupSource = read('src/managers/PowerupManager.js');
assert.match(powerupSource, /Number\.POSITIVE_INFINITY/, 'life pickup handling should allow unlimited lives');
assert.doesNotMatch(powerupSource, /translateText\('MAX LIVES REACHED!'\)/, 'life pickups should not show the old capped-life toast');
assert.doesNotMatch(powerupSource, /at max, bonus awarded/, 'life pickups should not convert to the old capped-life score bonus');

const playSceneSource = read('src/scenes/PlayScene.js');
assert.match(playSceneSource, /if \(!Number\.isFinite\(maxLives\)\) return;/, 'PlayScene should suppress max-life notifications when lives are unlimited');
assert.match(playSceneSource, /bossClearRepairMaxLives/, 'boss-clear repair must keep its separate recovery cap');

const powerupCatalogSource = read('src/config/PowerupCatalog.js');
assert.match(powerupCatalogSource, /Extra lives now keep stacking/, 'Powerup Codex copy should describe stackable extra lives');
assert.doesNotMatch(powerupCatalogSource, /score payout at max lives|expensive confetti|At max lives it becomes a bonus/, 'Powerup Codex copy should not describe the old cap bonus');

console.log('[life-cap] PASS extra-life pickups can stack beyond the old 6-life limit');
