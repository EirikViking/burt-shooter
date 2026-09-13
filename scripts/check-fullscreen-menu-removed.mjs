import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settingsOverlay = readFileSync('src/ui/SettingsOverlay.js', 'utf8');
const displaySettings = readFileSync('src/config/DisplaySettings.js', 'utf8');

assert(
  !settingsOverlay.includes("translateText('FULLSCREEN')") &&
  !settingsOverlay.includes('"FULLSCREEN"') &&
  !settingsOverlay.includes("'FULLSCREEN'"),
  'Settings overlay must not expose the retired all-caps fullscreen-only menu option'
);
assert(
  !/id:\s*['"]fullscreen['"]/i.test(settingsOverlay),
  'Settings overlay must not register the retired fullscreen-only focus/control item'
);
assert(
  settingsOverlay.includes('addDisplayModeRow') &&
  settingsOverlay.includes('applyDisplaySettings') &&
  settingsOverlay.includes("id: 'display_mode'") &&
  displaySettings.includes("'Fullscreen'"),
  'Settings overlay should expose the new display-mode selector with Fullscreen as one option'
);

const releaseCheck = readFileSync('scripts/check-release-line.mjs', 'utf8');
assert(
  releaseCheck.includes('fullscreen launch guard'),
  'release-line guard should continue verifying packaged fullscreen launch safety separately'
);

console.log('[fullscreen-menu] PASS legacy fullscreen-only menu removed; display mode selector present');
