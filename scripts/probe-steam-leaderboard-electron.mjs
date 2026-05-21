import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const electronBin = require('electron');
const args = process.argv.slice(2);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function readArgValue(name, fallback = null) {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  return fallback;
}

function withoutLauncherArgs(values) {
  const skipNext = new Set(['--exe']);
  const filtered = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--packaged') continue;
    if (value.startsWith('--exe=')) continue;
    if (skipNext.has(value)) {
      index += 1;
      continue;
    }
    filtered.push(value);
  }
  return filtered;
}

const usePackaged = args.includes('--packaged') || process.env.NOVA_SWARM_STEAM_PROBE_PACKAGED === '1';
const exePath = path.resolve(readArgValue('--exe', process.env.NOVA_SWARM_PACKAGED_EXE || 'release/desktop/win-unpacked/Nova Swarm.exe'));
const outputDir = path.resolve(
  process.env.NOVA_SWARM_STEAM_LEADERBOARD_PROBE_OUTPUT_DIR ||
  path.join(root, 'test-results', `steam-leaderboard-electron-${timestamp()}`)
);
const reportPath = path.join(outputDir, 'report.json');
const probeArgs = withoutLauncherArgs(args);

if (usePackaged && !existsSync(exePath)) {
  console.error(`[steam-leaderboard-electron-probe] missing packaged executable: ${path.relative(root, exePath)}`);
  process.exit(1);
}

if (!usePackaged && !existsSync(path.resolve(root, 'dist/index.html'))) {
  console.error('[steam-leaderboard-electron-probe] missing dist/index.html; run npm run build first.');
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const command = usePackaged ? exePath : electronBin;
const commandArgs = usePackaged
  ? ['--steam-leaderboard-probe', ...probeArgs]
  : ['electron/main.cjs', '--steam-leaderboard-probe', ...probeArgs];

const result = spawnSync(command, commandArgs, {
  cwd: root,
  env: {
    ...process.env,
    NOVA_SWARM_STEAM_LEADERBOARD_PROBE_OUTPUT_DIR: outputDir
  },
  windowsHide: true,
  encoding: 'utf8',
  timeout: 90000
});

if (result.stdout?.trim()) console.log(result.stdout.trim());
if (result.stderr?.trim()) console.error(result.stderr.trim());

if (result.error) {
  console.error(`[steam-leaderboard-electron-probe] launch failed: ${result.error.message}`);
  process.exit(1);
}

if (!existsSync(reportPath)) {
  console.error(`[steam-leaderboard-electron-probe] missing report: ${path.relative(root, reportPath)}`);
  process.exit(result.status || 1);
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
console.log(`[steam-leaderboard-electron-probe] report=${path.relative(root, reportPath).replaceAll(path.sep, '/')} status=${report.status}`);
process.exit(result.status ?? 0);
