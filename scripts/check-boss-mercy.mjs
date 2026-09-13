import { readFileSync } from 'node:fs';
import { BalanceConfig } from '../src/config/BalanceConfig.js';

const failures = [];
const mercy = BalanceConfig.bossMercy || {};
const lifeLossCap = mercy.lifeLossCap || {};

function fail(message) {
  failures.push(message);
}

function getCooldown(level) {
  if (!mercy.enabled) return 0;
  const safeLevel = Math.max(1, Number(level) || 1);
  const early = Number(mercy.earlyCooldownMs) || 0;
  const late = Number(mercy.lateCooldownMs) || early;
  const min = Number(mercy.minimumCooldownMs) || 0;
  const reduction = Math.max(0, Number(mercy.levelReductionMs) || 0);
  const protectedLevel = Math.max(1, Number(mercy.maxProtectedLevel) || 1);
  if (safeLevel <= protectedLevel) {
    return Math.max(late, early - (safeLevel - 1) * reduction);
  }
  return Math.max(min, late - (safeLevel - protectedLevel) * reduction);
}

function getLifeLossCapWindow(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const baseWindowMs = Math.max(1000, Number(lifeLossCap.windowMs) || 7000);
  const fullWindowThroughLevel = Math.max(1, Math.floor(Number(lifeLossCap.fullWindowThroughLevel) || 30));
  const windowReductionMsPerLevel = Math.max(0, Number(lifeLossCap.windowReductionMsPerLevel) || 0);
  const minimumWindowMs = Math.max(1000, Number(lifeLossCap.minimumWindowMs) || baseWindowMs);
  const levelsPastFullWindow = Math.max(0, safeLevel - fullWindowThroughLevel);
  return Math.max(minimumWindowMs, baseWindowMs - levelsPastFullWindow * windowReductionMsPerLevel);
}

function simulateRepeatedBossContact({ level, lives, durationMs, attemptEveryMs }) {
  let remainingLives = lives;
  let bossMercyUntilMs = -1;
  let playerInvulnerableUntilMs = -1;
  let bossLifeLossTimes = [];
  const events = [];
  const capEnabled = mercy.enabled === true && lifeLossCap.enabled === true;
  const capMaxLives = Math.max(1, Math.floor(Number(lifeLossCap.maxLives) || 2));
  const capWindowMs = getLifeLossCapWindow(level);

  for (let t = 0; t < durationMs; t += attemptEveryMs) {
    bossLifeLossTimes = bossLifeLossTimes.filter((time) => t - time < capWindowMs);
    const protectedByMercy = t < bossMercyUntilMs;
    const protectedByInvulnerability = t < playerInvulnerableUntilMs;
    const protectedByLifeLossCap = capEnabled && bossLifeLossTimes.length >= capMaxLives;
    if (protectedByMercy || protectedByInvulnerability || protectedByLifeLossCap) {
      events.push({
        t,
        blocked: true,
        reason: protectedByLifeLossCap ? 'life_loss_cap' : 'mercy',
        remainingLives,
        recentBossLosses: bossLifeLossTimes.length
      });
      continue;
    }

    remainingLives -= 1;
    bossLifeLossTimes.push(t);
    const cooldownMs = getCooldown(level);
    bossMercyUntilMs = t + cooldownMs;
    playerInvulnerableUntilMs = t + cooldownMs;
    events.push({ t, blocked: false, remainingLives, cooldownMs, recentBossLosses: bossLifeLossTimes.length });
    if (remainingLives <= 0) break;
  }

  return { remainingLives, losses: lives - remainingLives, events };
}

function simulateDamageFlow({ bossOwned = false, shield = false, invulnerable = false, ghost = false } = {}) {
  let lives = 4;
  let bossMercyUntilMs = -1;
  const now = 0;
  if (ghost || invulnerable || (bossOwned && now < bossMercyUntilMs)) return { lives, lostLife: false };
  if (shield) return { lives, lostLife: false };
  lives -= 1;
  if (bossOwned) bossMercyUntilMs = now + getCooldown(6);
  return { lives, lostLife: true, bossMercyUntilMs };
}

if (!mercy.enabled) fail('boss mercy must be enabled');
if (lifeLossCap.enabled !== true) fail('boss life-loss cap must be enabled');
if (Number(lifeLossCap.maxLives) !== 2) fail(`boss life-loss cap should allow exactly 2 lives, got ${lifeLossCap.maxLives}`);
if (Number(lifeLossCap.windowMs) !== 7000) fail(`boss life-loss cap base window should be 7000ms, got ${lifeLossCap.windowMs}`);
if (Number(lifeLossCap.fullWindowThroughLevel) !== 30) fail(`boss life-loss cap should keep full window through level 30, got ${lifeLossCap.fullWindowThroughLevel}`);
if (Number(lifeLossCap.windowReductionMsPerLevel) !== 100) fail(`boss life-loss cap reduction should be 100ms per level, got ${lifeLossCap.windowReductionMsPerLevel}`);
if (Number(lifeLossCap.minimumWindowMs) !== 4000) fail(`boss life-loss cap minimum should be 4000ms, got ${lifeLossCap.minimumWindowMs}`);
if (getLifeLossCapWindow(1) !== 7000) fail(`level 1 life-loss cap window expected 7000ms, got ${getLifeLossCapWindow(1)}`);
if (getLifeLossCapWindow(30) !== 7000) fail(`level 30 life-loss cap window expected 7000ms, got ${getLifeLossCapWindow(30)}`);
if (getLifeLossCapWindow(31) !== 6900) fail(`level 31 life-loss cap window expected 6900ms, got ${getLifeLossCapWindow(31)}`);
if (getLifeLossCapWindow(99) !== 4000) fail(`deep boss life-loss cap window should clamp to 4000ms, got ${getLifeLossCapWindow(99)}`);
if (getCooldown(1) !== 7000) fail(`level 1 cooldown expected 7000ms, got ${getCooldown(1)}`);
if (getCooldown(6) !== 5750) fail(`level 6 cooldown expected 5750ms, got ${getCooldown(6)}`);
if (getCooldown(10) !== 5000) fail(`level 10 cooldown expected 5000ms, got ${getCooldown(10)}`);
if (!(getCooldown(1) > getCooldown(6) && getCooldown(6) > getCooldown(10))) {
  fail(`cooldown should step down from level 1 to 10, got l1=${getCooldown(1)} l6=${getCooldown(6)} l10=${getCooldown(10)}`);
}
if (!(getCooldown(11) < getCooldown(10) && getCooldown(11) >= Number(mercy.minimumCooldownMs))) {
  fail(`cooldown should continue reducing after level 10 without crossing minimum, got l10=${getCooldown(10)} l11=${getCooldown(11)}`);
}
if (getCooldown(99) !== Number(mercy.minimumCooldownMs)) {
  fail(`high-level cooldown should clamp to minimum ${mercy.minimumCooldownMs}, got ${getCooldown(99)}`);
}

const levelSix = simulateRepeatedBossContact({
  level: 6,
  lives: 4,
  durationMs: 10000,
  attemptEveryMs: 250
});
if (levelSix.losses > 2 || levelSix.remainingLives <= 0) {
  fail(`level 6 boss contact drained too many lives in 10s: losses=${levelSix.losses} remaining=${levelSix.remainingLives}`);
}

const highSectorBurst = simulateRepeatedBossContact({
  level: 30,
  lives: 8,
  durationMs: 7000,
  attemptEveryMs: 250
});
if (highSectorBurst.losses > 2) {
  fail(`level 30 boss drained more than 2 lives inside 7s: losses=${highSectorBurst.losses}`);
}
if (!highSectorBurst.events.some((event) => event.blocked && event.reason === 'life_loss_cap')) {
  fail(`level 30 boss burst should hit the life-loss cap: ${JSON.stringify(highSectorBurst.events.slice(0, 8))}`);
}

const highSectorRolling = simulateRepeatedBossContact({
  level: 30,
  lives: 8,
  durationMs: 14000,
  attemptEveryMs: 250
});
if (highSectorRolling.losses > 4) {
  fail(`rolling boss cap should limit 14s level 30 losses to 4, got ${highSectorRolling.losses}`);
}

const deepSectorBurst = simulateRepeatedBossContact({
  level: 99,
  lives: 8,
  durationMs: 4000,
  attemptEveryMs: 250
});
if (deepSectorBurst.losses > 2) {
  fail(`deep boss drained more than 2 lives inside its 4s cap window: losses=${deepSectorBurst.losses}`);
}

const bossAgain = simulateRepeatedBossContact({
  level: 6,
  lives: 4,
  durationMs: getCooldown(6) + 300,
  attemptEveryMs: getCooldown(6) + 1
});
if (bossAgain.losses < 2) {
  fail(`boss contact should become dangerous again after cooldown expires, losses=${bossAgain.losses}`);
}

const normal = simulateDamageFlow();
if (!normal.lostLife || normal.lives !== 3) fail(`normal player damage flow should still lose one life, got ${JSON.stringify(normal)}`);

const shield = simulateDamageFlow({ shield: true });
if (shield.lostLife || shield.lives !== 4) fail(`shield absorption should prevent life loss, got ${JSON.stringify(shield)}`);

const invulnerable = simulateDamageFlow({ invulnerable: true });
if (invulnerable.lostLife || invulnerable.lives !== 4) fail(`existing invulnerability should prevent life loss, got ${JSON.stringify(invulnerable)}`);

const ghost = simulateDamageFlow({ ghost: true });
if (ghost.lostLife || ghost.lives !== 4) fail(`ghost state should prevent life loss, got ${JSON.stringify(ghost)}`);

const playScene = readFileSync(new URL('../src/scenes/PlayScene.js', import.meta.url), 'utf8');
for (const needle of [
  'getBossMercyCooldownMs',
  'canBossCauseLifeLoss',
  'startBossMercyWindow',
  'applyBossRecoverySeparation',
  'showBossMercyBlockedFeedback',
  'getBossLifeLossCapConfig',
  'canBossLifeLossCapAllowHit',
  'recordBossLifeLossCap',
  'boss_contact',
  'boss_bullet',
  'boss_hazard'
]) {
  if (!playScene.includes(needle)) fail(`PlayScene missing boss mercy integration marker: ${needle}`);
}

const playerSource = readFileSync(new URL('../src/entities/Player.js', import.meta.url), 'utf8');
if (!playerSource.includes('grantInvulnerability(ms')) fail('Player.grantInvulnerability helper is missing');

if (failures.length) {
  console.error(`[boss-mercy] FAIL ${failures.length} issue(s)`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`[boss-mercy] PASS level6Losses10s=${levelSix.losses} level30Losses7s=${highSectorBurst.losses} cap=${lifeLossCap.maxLives}/${lifeLossCap.windowMs}->${lifeLossCap.minimumWindowMs}ms cooldowns=l1:${getCooldown(1)} l6:${getCooldown(6)} l10:${getCooldown(10)} min:${getCooldown(99)}`);
