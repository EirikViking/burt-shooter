import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const enemyManagerSource = readFileSync(path.join(root, 'src/managers/EnemyManager.js'), 'utf8');
const audioManagerSource = readFileSync(path.join(root, 'src/audio/AudioManager.js'), 'utf8');

function fail(message) {
  console.error(`[hijacker-voice-exclusivity] FAIL ${message}`);
  process.exit(1);
}

const callMatch = enemyManagerSource.match(/AudioManager\.playVoice\('mission_control_hijacker',\s*\{([\s\S]*?)\n\s*\}\);/);
if (!callMatch) fail('missing mission_control_hijacker voice call in EnemyManager.spawnHijacker');

const options = callMatch[1];
const requiredTokens = [
  'stopOtherVoices: true',
  "exclusiveGroup: 'announcer'",
  'exclusiveLockMs:',
  'exclusiveLockReason:',
  'voicePriority:',
  'eventCooldownMs:'
];

for (const token of requiredTokens) {
  if (!options.includes(token)) fail(`hijacker call missing ${token}`);
}

if (!/cooldownMs:\s*24000/.test(options)) {
  fail('hijacker warning should keep its long event cooldown');
}

if (!audioManagerSource.includes('stopAllVoices(\'exclusive_voice_request\')')) {
  fail('AudioManager stopOtherVoices path is missing');
}

if (!audioManagerSource.includes('reserveVoiceLock(eventName')) {
  fail('AudioManager exclusive voice lock path is missing');
}

console.log('[hijacker-voice-exclusivity] PASS mission_control_hijacker uses exclusive announcer voice lane');
