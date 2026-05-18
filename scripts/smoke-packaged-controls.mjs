import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exePath = path.resolve(process.env.NOVA_SWARM_PACKAGED_EXE || 'release/desktop/win-unpacked/Nova Swarm.exe');
const outputDir = path.resolve(
  process.env.NOVA_SWARM_PACKAGED_CONTROL_OUTPUT_DIR ||
  `test-results/packaged-control-smoke-${new Date().toISOString().replace(/[:.]/g, '-')}`
);
const reportPath = path.join(outputDir, 'report.json');
const versionPath = path.resolve(root, 'public/version.json');

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

if (!existsSync(exePath)) {
  console.error(`[packaged-controls] missing executable: ${path.relative(root, exePath)}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const result = spawnSync(exePath, ['--control-smoke'], {
  cwd: root,
  env: {
    ...process.env,
    NOVA_SWARM_ELECTRON_CONTROL_SMOKE_OUTPUT_DIR: outputDir
  },
  windowsHide: true,
  encoding: 'utf8',
  timeout: 90000
});

if (result.error) {
  console.error(`[packaged-controls] failed to launch: ${result.error.message}`);
  process.exit(1);
}

if (!existsSync(reportPath)) {
  console.error(`[packaged-controls] missing report: ${path.relative(root, reportPath)}`);
  if (result.stdout?.trim()) console.error(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
  process.exit(result.status || 1);
}

const report = readJson(reportPath);
const currentBuild = existsSync(versionPath) ? readJson(versionPath) : null;
const errors = [...(report.errors || [])];

if (report.status !== 'passed') errors.push(`status=${report.status || 'missing'}`);
if (currentBuild?.version && report.build !== currentBuild.version) {
  errors.push(`build=${report.build || 'missing'} expected=${currentBuild.version}`);
}

for (const [name, passed] of Object.entries(report.checks || {})) {
  if (passed !== true) errors.push(`${name} did not pass`);
}

if (errors.length) {
  console.error(`[packaged-controls] failed: ${errors.join('; ')}`);
  process.exit(1);
}

console.log(`[packaged-controls] ok: ${path.relative(root, reportPath).replaceAll(path.sep, '/')}`);
