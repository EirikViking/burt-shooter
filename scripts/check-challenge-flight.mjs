import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CHALLENGE_FLIGHT_PATTERNS,
  getChallengeFlightPattern,
  gradeChallengeFlight
} from '../src/config/ChallengeFlights.js';

const root = new URL('../', import.meta.url);
const read = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

assert.equal(CHALLENGE_FLIGHT_PATTERNS.length, 5, 'expected five Cabinet Skill Flight choreographies');
assert.equal(new Set(CHALLENGE_FLIGHT_PATTERNS.map((pattern) => pattern.id)).size, 5, 'pattern ids must be unique');
assert.equal(new Set(CHALLENGE_FLIGHT_PATTERNS.map((pattern) => pattern.formation)).size, 5, 'formations must be unique');
assert.ok(CHALLENGE_FLIGHT_PATTERNS.every((pattern) => pattern.label && pattern.tactic && pattern.entry), 'each pattern needs a complete flight plan');
assert.equal(getChallengeFlightPattern(7, 2), getChallengeFlightPattern(7, 2), 'pattern selection must be deterministic');

assert.deepEqual(gradeChallengeFlight(8, 8), { grade: 'PERFECT', label: 'PERFECT FLIGHT!', bonus: 5000, ratio: 1 });
assert.equal(gradeChallengeFlight(6, 8).grade, 'A');
assert.equal(gradeChallengeFlight(4, 8).grade, 'B');
assert.equal(gradeChallengeFlight(1, 8).grade, 'C');
assert.equal(gradeChallengeFlight(0, 8).grade, 'MISS');

const managerSource = read('src/managers/EnemyManager.js');
const playSource = read('src/scenes/PlayScene.js');
const mainSource = read('src/main.js');
assert.match(managerSource, /enemy\.challengeFlightTarget\s*\?\s*false/, 'challenge targets must never shoot');
assert.match(managerSource, /enemy\.health = 1;[\s\S]*enemy\.shootDelay = Number\.MAX_SAFE_INTEGER/, 'challenge targets must be one-hit and unarmed');
assert.match(managerSource, /if \(!config\.isChallenge\) \{[\s\S]*maybePromoteAceEnemy/, 'challenge flights must not inherit Ace encounters');
assert.match(managerSource, /if \(!config\.isChallenge\) \{[\s\S]{0,220}requestAnimationFrame\(runDiscoveryHooks\)/, 'challenge flights must not open Codex discovery panels');
assert.match(managerSource, /showChallengeFlightResult/, 'challenge completion must use the graded presentation');
assert.match(playSource, /if \(enemy\.challengeFlightTarget\) return;/, 'challenge targets must be harmless on contact');
assert.match(playSource, /showChallengeFlightHud\(state = \{\}\)/, 'live challenge HUD is missing');
assert.match(playSource, /recordChallengeFlightKill/, 'challenge kills are not connected to combat resolution');
assert.match(mainSource, /challengeFlight: enemyManager\.getChallengeFlightDebugState/, 'render_game_to_text challenge state is missing');

const requiredKeys = [
  'CABINET SKILL FLIGHT',
  'TARGETS {kills}/{total} // {seconds}s',
  'SKILL FLIGHT: {pattern}\\nBREAK TARGETS BEFORE THEY EXIT',
  'STAR PARADE',
  'PINCER POLKA',
  'PERFECT FLIGHT!',
  'FLIGHT MISSED',
  'TARGETS {kills}/{total} // +{score}'
];
for (const locale of ['de', 'es', 'pt-BR', 'ru', 'zh-CN', 'ko', 'ja']) {
  const source = read(`src/i18n/locales/${locale}.js`);
  for (const key of requiredKeys) {
    assert.ok(source.includes(`\"${key}\"`), `${locale} missing Challenge Flight translation: ${key}`);
  }
}

console.log(`[challenge-flight] PASS patterns=${CHALLENGE_FLIGHT_PATTERNS.length} grades=PERFECT,A,B,C,MISS locales=7`);
