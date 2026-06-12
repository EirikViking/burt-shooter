import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settingsOverlay = readFileSync('src/ui/SettingsOverlay.js', 'utf8');

assert(
  !settingsOverlay.includes("translateText('FULLSCREEN')") &&
  !settingsOverlay.includes('"FULLSCREEN"') &&
  !settingsOverlay.includes("'FULLSCREEN'"),
  'Settings overlay must not expose a FULLSCREEN menu option'
);
assert(
  !/id:\s*['"]fullscreen['"]/i.test(settingsOverlay),
  'Settings overlay must not register a fullscreen focus/control item'
);

const releaseCheck = readFileSync('scripts/check-release-line.mjs', 'utf8');
assert(
  releaseCheck.includes('fullscreen launch guard'),
  'release-line guard should continue verifying packaged fullscreen launch safety separately'
);

console.log('[fullscreen-menu] PASS settings menu no longer exposes fullscreen option');
