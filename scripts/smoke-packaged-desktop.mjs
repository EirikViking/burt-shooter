import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  resolvePackagedSmokeMode,
  validatePackagedSteamRuntime
} from './lib/packaged-steam-runtime-gate.mjs';

const root = process.cwd();
const exePath = path.resolve(process.env.NOVA_SWARM_PACKAGED_EXE || 'release/desktop/win-unpacked/Nova Swarm.exe');
const outputDir = path.resolve(
  process.env.NOVA_SWARM_PACKAGED_SMOKE_OUTPUT_DIR ||
  `test-results/packaged-exe-smoke-${new Date().toISOString().replace(/[:.]/g, '-')}`
);
const reportPath = path.join(outputDir, 'report.json');
const versionPath = path.resolve(root, 'public/version.json');

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

if (!existsSync(exePath)) {
  console.error(`[packaged-smoke] missing executable: ${path.relative(root, exePath)}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const result = spawnSync(exePath, ['--smoke'], {
  cwd: root,
  env: {
    ...process.env,
    NOVA_SWARM_ELECTRON_SMOKE_OUTPUT_DIR: outputDir,
    NOVA_SWARM_USER_DATA_DIR: path.join(outputDir, 'userData')
  },
  windowsHide: true,
  encoding: 'utf8',
  timeout: 60000
});

if (result.error) {
  console.error(`[packaged-smoke] failed to launch: ${result.error.message}`);
  process.exit(1);
}

if (!existsSync(reportPath)) {
  console.error(`[packaged-smoke] missing report: ${path.relative(root, reportPath)}`);
  if (result.stdout?.trim()) console.error(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
  process.exit(result.status || 1);
}

const report = readJson(reportPath);
const currentBuild = existsSync(versionPath) ? readJson(versionPath) : null;
const errors = [];
let steamValidation;

try {
  steamValidation = validatePackagedSteamRuntime(report.state, {
    mode: resolvePackagedSmokeMode()
  });
  errors.push(...steamValidation.errors);
} catch (error) {
  errors.push(error?.message || String(error));
}

if (report.status !== 'passed') errors.push(`status=${report.status || 'missing'}`);
if (currentBuild?.version && report.state?.build !== currentBuild.version) {
  errors.push(`build=${report.state?.build || 'missing'} expected=${currentBuild.version}`);
}
if (report.state?.apiOk !== true || report.state?.apiStatus !== 200) errors.push('local highscore API failed');
if (report.state?.readyState?.ready !== true) errors.push('rendered intro/menu state not ready');
if ((report.consoleEvents || []).length) errors.push(`${report.consoleEvents.length} console event(s)`);

if (errors.length) {
  console.error(`[packaged-smoke] failed: ${errors.join('; ')}`);
  process.exit(1);
}

if (steamValidation?.required === false) {
  console.warn('[packaged-smoke] Steam runtime gate skipped by explicit NOVA_SWARM_PACKAGED_SMOKE_MODE=local');
}
console.log(`[packaged-smoke] ok: ${path.relative(root, reportPath).replaceAll(path.sep, '/')}`);
