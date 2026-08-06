import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { VAULT_RUN_TARGET, VaultRunGate } from '../src/enjin/vaultRunGate.js';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const gate = new VaultRunGate();
assert.equal(VAULT_RUN_TARGET, 30_000);
assert.equal(gate.acceptAward(29_950, { previousScore: 0 }).score, 29_950);
const crossing = gate.acceptAward(200, { previousScore: 29_950, level: 4 });
assert.equal(crossing.completed, true);
assert.equal(crossing.score, 30_000);
assert.equal(crossing.rawCrossingScore, 30_150);
assert.equal(gate.acceptAward(999_999).applied, 0);
assert.equal(gate.score, 30_000);
assert.equal(gate.frozen, true);
assert.equal(gate.freezeFrames, 0);
gate.onFrozenFrame();
gate.onFrozenFrame();
assert.equal(gate.freezeFrames, 2);

const gameSource = read('src/game/Game.js');
const playSource = read('src/scenes/PlayScene.js');
const controllerSource = read('src/enjin/enjinEdition.js');
const menuSource = read('src/scenes/MenuScene.js');
const editionStyleSource = read('src/enjin/enjinEdition.css');
const apiSource = read('src/enjin/api.js');
const workerSource = read('functions/shared/enjin.js');
const importerSource = read('scripts/enjin-import-beam.mjs');
const packageSource = read('package.json');
const deployerSource = read('scripts/deploy-enjin-pages.mjs');
const enjinWranglerSource = read('wrangler.enjin.toml');
const migrationSource = read('migrations/002_enjin_mvp.sql');

for (const required of [
  'scoreGate?.frozen',
  'scoreGate?.acceptAward',
  'finalScoreLockReason = \'score_gate\'',
  'score_gate'
]) assert.ok(gameSource.includes(required), `missing game gate contract: ${required}`);
assert.ok(playSource.includes("cleanupSkippedFrameVisuals('score_gate')"), 'play scene does not stop the active frame');
for (const required of [
  'NOVA SWARM: WEB3 ARCADE',
  'EIRIK THE VIKING',
  'SCORE 30,000',
  'CONTINUE BEYOND 30,000 ON STEAM',
  'NO PURCHASE NECESSARY',
  'MAYHEM TACTICAL',
  'STEAM BUILD ONLY',
  'ranked_tactical',
  'THE EIRIK VAULT',
  'THE FULL SWARM CONTINUES ON STEAM',
  'NO WALLET',
  'OPEN ENJIN CLAIM',
  'debugCompleteForTest',
  'renderMainMenu',
  "this.mode = 'menu'"
]) assert.ok(controllerSource.includes(required), `missing campaign copy or test hook: ${required}`);
for (const required of [
  'setEnjinEditionMode',
  'STEAM BUILD ONLY',
  'showEnjinSteamOnlyNotice',
  'FULL STEAM VERSION REQUIRED',
  'enjinEditionController',
  '_enjinDisabled'
]) assert.ok(menuSource.includes(required), `missing Enjin menu lock contract: ${required}`);
for (const required of ['mode-menu', 'mode-playing', 'background: transparent', 'pointer-events: none']) {
  assert.ok(editionStyleSource.includes(required), `missing Enjin visibility contract: ${required}`);
}
assert.ok(gameSource.includes('enjinEditionModeLocked'), 'Enjin edition does not enforce its locked run mode');
for (const required of [
  'HttpOnly',
  'AES-GCM',
  'enjin_claim_inventory',
  'enjin_reward_assignments',
  'status = \'available\'',
  'identity_id TEXT NOT NULL UNIQUE'
]) assert.ok(workerSource.includes(required), `missing secure inventory contract: ${required}`);
for (const required of [
  'enjin:import-beam',
  'build:enjin',
  'deploy:enjin:preview'
]) assert.ok(packageSource.includes(required), `missing npm command: ${required}`);
assert.ok(packageSource.includes('node scripts/deploy-enjin-pages.mjs'), 'Enjin deploy must use the isolated Pages deploy helper');
assert.ok(deployerSource.includes("fs.copyFile(enjinConfig, path.join(staging, 'wrangler.toml'))"), 'Enjin deploy helper must stage the Enjin config as wrangler.toml');
assert.ok(deployerSource.includes("'--branch=enjin-webedition'"), 'Enjin deploy helper must target only the Enjin preview branch');
assert.match(enjinWranglerSource, /binding\s*=\s*"WEB3_DB"/, 'Enjin Wrangler config must bind WEB3_DB');
assert.match(enjinWranglerSource, /database_name\s*=\s*"nova-swarm-enjin-web3"/, 'Enjin Wrangler config must use the dedicated D1 database');
for (const required of ['enjin_campaigns', 'enjin_runs', 'enjin_claim_inventory', 'enjin_reward_assignments']) {
  assert.ok(migrationSource.includes(required), `missing migration table: ${required}`);
}
assert.ok(apiSource.includes('credentials: \'include\''), 'campaign identity is not sent with API calls');
assert.ok(apiSource.includes('https://mock.invalid/enjin/claim/'), 'mock claims are not clearly non-production');
assert.ok(apiSource.includes('shouldUseMockClaims'), 'mock claims are not restricted to local/test runtimes');
assert.ok(importerSource.includes("'claim_link'"), 'NFT.io Claim link CSV exports are not supported');
assert.ok(!controllerSource.match(/https:\/\/[^\s"']+beam[^\s"']+/i), 'a real Beam URL leaked into the frontend source');

const steamUrl = new URL('https://store.steampowered.com/app/4765070/?utm_source=tinyfoundry&utm_medium=enjin_web3_arcade&utm_campaign=eirik_viking_vault&utm_content=vault_complete');
assert.equal(steamUrl.searchParams.get('utm_source'), 'tinyfoundry');
assert.equal(steamUrl.searchParams.get('utm_medium'), 'enjin_web3_arcade');
assert.equal(steamUrl.searchParams.get('utm_campaign'), 'eirik_viking_vault');
assert.equal(steamUrl.searchParams.get('utm_content'), 'vault_complete');

console.log(JSON.stringify({
  status: 'passed',
  checks: [
    'exact_30000_gate',
    'post_gate_freeze',
    'completed_identity_contract',
    'encrypted_claim_inventory_contract',
    'beam_import_command',
    'steam_utm_contract',
    'mock_claim_isolation'
  ]
}, null, 2));
