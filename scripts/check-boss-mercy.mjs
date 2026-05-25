import { readFileSync } from 'node:fs';
import { BalanceConfig } from '../src/config/BalanceConfig.js';

const failures = [];
const mercy = BalanceConfig.bossMercy || {};

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

function simulateRepeatedBossContact({ level, lives, durationMs, attemptEveryMs }) {
  let remainingLives = lives;
  let bossMercyUntilMs = -1;
  let playerInvulnerableUntilMs = -1;
  const events = [];

  for (let t = 0; t < durationMs; t += attemptEveryMs) {
    const protectedByMercy = t < bossMercyUntilMs;
    const protectedByInvulnerability = t < playerInvulnerableUntilMs;
    if (protectedByMercy || protectedByInvulnerability) {
      events.push({ t, blocked: true, remainingLives });
      continue;
    }

    remainingLives -= 1;
    const cooldownMs = getCooldown(level);
    bossMercyUntilMs = t + cooldownMs;
    playerInvulnerableUntilMs = t + cooldownMs;
    events.push({ t, blocked: false, remainingLives, cooldownMs });
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

console.log(`[boss-mercy] PASS level6Losses10s=${levelSix.losses} cooldowns=l1:${getCooldown(1)} l6:${getCooldown(6)} l10:${getCooldown(10)} min:${getCooldown(99)}`);
