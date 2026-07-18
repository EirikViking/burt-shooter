import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const gate = require('../electron/maintainerDevtoolsGate.cjs');

const EXPECTED_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const workspaceRoot = process.cwd();

assert.equal(gate.MAINTAINER_DEVTOOLS_KEY_SHA256, EXPECTED_HASH);
assert.equal(gate.DEVTOOLS_KEY_ARG, '--nova-devtools-key=');
assert.equal(gate.getMaintainerDevtoolsState(['Nova Swarm']).enabled, false);
assert.equal(gate.getMaintainerDevtoolsState(['Nova Swarm', '--nova-devtools-key=wrong']).enabled, false);
assert.equal(gate.getMaintainerDevtoolsState(['Nova Swarm', '--nova-devtools-key=f07e7cbbaa835bfa']).enabled, false);
assert.equal(gate.constantTimeEqualHex(EXPECTED_HASH, EXPECTED_HASH), true);
assert.equal(gate.constantTimeEqualHex(EXPECTED_HASH, `${EXPECTED_HASH.slice(0, -1)}0`), false);

const electronGateSource = readFileSync('electron/maintainerDevtoolsGate.cjs', 'utf8');
const electronMainSource = readFileSync('electron/main.cjs', 'utf8');
const preloadSource = readFileSync('electron/preload.cjs', 'utf8');
const rendererGateSource = readFileSync('src/config/MaintainerDevtools.js', 'utf8');
const mainSource = readFileSync('src/main.js', 'utf8');
const playSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
const debugToolsCheck = readFileSync('scripts/check-debug-tools.mjs', 'utf8');
const debugRunCheck = readFileSync('scripts/check-debug-run-unranked.mjs', 'utf8');
const smokeSource = readFileSync('scripts/smoke-playtest.mjs', 'utf8');

assert.match(electronGateSource, /createHash\('sha256'\)/);
assert.match(electronGateSource, /timingSafeEqual/);
assert.match(preloadSource, /__novaMaintainerDevtools/);
assert.match(preloadSource, /nova-maintainer-devtools:getState/);
assert.doesNotMatch(preloadSource, /require\('\.\/maintainerDevtoolsGate\.cjs'\)/);
assert.match(rendererGateSource, /LOCAL_DEVTOOLS_HASH_PARAM = 'nova-devtools-hash'/);
assert.match(rendererGateSource, /await readPreloadState\(preloadState\)/);
assert.match(rendererGateSource, /params\.get\('desktop'\) === '1'/);
assert.match(rendererGateSource, /isLocalBrowserRuntime/);
assert.match(electronMainSource, /getMaintainerDevtoolsState\(process\.argv\)/);
assert.match(electronMainSource, /ipcMain\.handle\('nova-maintainer-devtools:getState'/);
assert.match(mainSource, /await initializeMaintainerDevtools\(\)/);
assert.match(mainSource, /maintainerDevtools: getMaintainerDevtoolsState\(\)/);
assert.match(mainSource, /levelJumpAvailable: isMaintainerDevtoolsEnabled\(\) && typeof playScene\.debugJumpToLevel === 'function'/);
assert.match(playSource, /if \(this\.canUseMaintainerDevtools\(\) && debugToken === 'NOVA_DEBUG_2026'\)/);
assert.match(playSource, /if \(!this\.canUseMaintainerDevtools\(\)\) return false;\s*const queryEnabled = params\?\.get\?\.\('balanceDebug'\)/);
assert.match(playSource, /if \(!this\.canUseMaintainerDevtools\(\)\) \{\s*this\.debugStartLevel = null;\s*this\.debugStartAtBoss = false;\s*this\.debugPowerups = false;\s*this\.debugOverlayEnabled = false;/);
assert.match(playSource, /return this\.canUseMaintainerDevtools\(\) && this\.debugInvincible === true/);
assert.match(playSource, /if \(!this\.canUseMaintainerDevtools\(\)\) return false;\s*this\.debugInvincible = !this\.debugInvincible/);
assert.match(debugToolsCheck, /nova-devtools-hash/);
assert.match(debugRunCheck, /nova-devtools-hash/);
assert.match(smokeSource, /nova-devtools-hash/);

const secretLikeMatches = [];
function scanDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(workspaceRoot, fullPath).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'dist', 'output', 'test-results', 'release/dist'].some((prefix) => relPath === prefix || relPath.startsWith(`${prefix}/`))) continue;
      scanDir(fullPath);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(js|mjs|cjs|json|md|txt|html|css|yml|yaml|ps1|vdf)$/i.test(entry.name)) continue;
    if (statSync(fullPath).size > 2_000_000) continue;
    const source = readFileSync(fullPath, 'utf8');
    for (const match of source.matchAll(/\bnsw-[a-z0-9-]{16,}\b/gi)) {
      secretLikeMatches.push(`${relPath}:${match[0]}`);
    }
  }
}
scanDir(workspaceRoot);
assert.deepEqual(secretLikeMatches, [], 'maintainer devtools key-like plaintext must not be committed');

assert(electronGateSource.includes(EXPECTED_HASH), 'Electron launch gate should store the expected hash');
assert(rendererGateSource.includes(EXPECTED_HASH), 'Renderer localhost test gate should store the expected hash');

console.log('[devtools-gate] PASS maintainer debug tools require the hashed launch-arg gate and no key-like plaintext is present');
