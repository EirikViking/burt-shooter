import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const packageRoot = process.env.NOVA_SWARM_STEAM_PACKAGE_ROOT;
const taskTemp = process.env.TEMP;
assert.ok(packageRoot && taskTemp, 'Set NOVA_SWARM_STEAM_PACKAGE_ROOT and E: TEMP/TMP before packaging');
const onE = (value) => /^E:[\\/]/i.test(path.resolve(value));
assert.ok(onE(packageRoot) && onE(taskTemp), 'Steam package and temporary config must stay on E:');
assert.equal(path.basename(path.resolve(packageRoot)).toLowerCase(), 'win-unpacked');
const dist = realpathSync.native(path.resolve(root, 'dist'));
assert.ok(onE(dist) && existsSync(path.join(dist, 'index.html')), 'Resolved E: dist must contain the current game build');
const expectedBuild = JSON.parse(readFileSync(path.join(root, 'public', 'version.json'), 'utf8')).version;
const builtBuild = JSON.parse(readFileSync(path.join(dist, 'version.json'), 'utf8')).version;
assert.equal(builtBuild, expectedBuild, 'Package source must match the current stamped build');

const config = JSON.parse(readFileSync(path.join(root, 'electron-builder.json'), 'utf8'));
const matches = config.files.filter((entry) => entry === 'dist/**/*').length;
assert.equal(matches, 1, 'Expected one canonical dist file rule');
config.files = config.files.map((entry) => entry === 'dist/**/*'
  ? { from: dist, to: 'dist', filter: ['**/*'] }
  : entry);
config.directories.output = path.dirname(path.resolve(packageRoot));
mkdirSync(taskTemp, { recursive: true });
const configPath = path.join(taskTemp, 'nova-swarm-electron-builder-resolved.json');
writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
console.log(`[package-steam-current] source=${dist} build=${expectedBuild}`);

const result = spawnSync(process.execPath, [path.join(root, 'node_modules', 'electron-builder', 'cli.js'),
  '--win', 'dir', '--x64', '--config', configPath], { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

const asarPath = path.join(packageRoot, 'resources', 'app.asar');
const asar = require('@electron/asar');
const files = asar.listPackage(asarPath).map((file) => file.replaceAll('\\', '/'));
assert.ok(files.includes('/dist/index.html'), 'Packaged app.asar omitted the game build');
const packagedBuild = JSON.parse(asar.extractFile(asarPath, 'dist/version.json').toString('utf8')).version;
assert.equal(packagedBuild, expectedBuild, 'Packaged app.asar has a stale game build');
console.log(`[package-steam-current] PASS package=${packageRoot} build=${packagedBuild}`);
