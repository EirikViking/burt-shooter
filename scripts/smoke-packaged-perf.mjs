import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const exePath = path.resolve(root, 'release/desktop/win-unpacked/Nova Swarm.exe');
const outputDir = path.resolve(
  process.env.NOVA_SWARM_PACKAGED_PERF_OUTPUT_DIR ||
  `test-results/packaged-perf-smoke-${new Date().toISOString().replace(/[:.]/g, '-')}`
);

if (!existsSync(exePath)) {
  console.error(`[packaged-perf] missing executable: ${path.relative(root, exePath)}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });
const env = {
  ...process.env,
  NOVA_SWARM_ELECTRON_PERF_SMOKE_OUTPUT_DIR: outputDir,
  NOVA_SWARM_USER_DATA_DIR: path.join(outputDir, 'userData')
};
const result = spawnSync(exePath, ['--perf-smoke'], {
  cwd: root,
  env,
  encoding: 'utf8',
  timeout: 120000,
  windowsHide: false
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) {
  console.error(`[packaged-perf] failed to launch: ${result.error.message}`);
  process.exit(1);
}

const reportPath = path.join(outputDir, 'report.json');
if (!existsSync(reportPath)) {
  console.error(`[packaged-perf] missing report: ${path.relative(root, reportPath)}`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const errors = [
  ...(result.status === 0 ? [] : [`process exited ${result.status}`]),
  ...(report.status === 'passed' ? [] : [`report status ${report.status || 'unknown'}`]),
  ...((report.minFps || 0) >= (report.minRequiredFps || 50) ? [] : [`min FPS ${report.minFps || 0} below ${report.minRequiredFps || 50}`]),
  ...((report.errors || []).length ? report.errors : [])
];

if (errors.length) {
  console.error(`[packaged-perf] failed: ${errors.join('; ')}`);
  process.exit(1);
}

console.log(`[packaged-perf] ok: ${path.relative(root, reportPath).replaceAll(path.sep, '/')}`);
