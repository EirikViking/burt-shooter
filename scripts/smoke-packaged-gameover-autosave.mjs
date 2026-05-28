import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const exePath = path.resolve(process.env.NOVA_SWARM_PACKAGED_EXE || 'release/desktop/win-unpacked/Nova Swarm.exe');
const outputDir = path.resolve(
  process.env.NOVA_SWARM_PACKAGED_GAMEOVER_OUTPUT_DIR ||
  `test-results/packaged-gameover-autosave-${new Date().toISOString().replace(/[:.]/g, '-')}`
);
const reportPath = path.join(outputDir, 'report.json');
const versionPath = path.resolve(root, 'public/version.json');
const userData = mkdtempSync(path.join(tmpdir(), 'nova-packaged-gameover-'));

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

if (!existsSync(exePath)) {
  console.error(`[packaged-gameover-autosave] missing executable: ${path.relative(root, exePath)}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

try {
  const result = spawnSync(exePath, ['--gameover-autosave-smoke'], {
    cwd: root,
    env: {
      ...process.env,
      NOVA_SWARM_GAMEOVER_AUTOSAVE_OUTPUT_DIR: outputDir,
      NOVA_SWARM_TEST_USER_DATA: userData
    },
    windowsHide: true,
    encoding: 'utf8',
    timeout: 120000
  });

  if (result.error) {
    console.error(`[packaged-gameover-autosave] failed to launch: ${result.error.message}`);
    process.exit(1);
  }

  if (!existsSync(reportPath)) {
    console.error(`[packaged-gameover-autosave] missing report: ${path.relative(root, reportPath)}`);
    if (result.stdout?.trim()) console.error(result.stdout.trim());
    if (result.stderr?.trim()) console.error(result.stderr.trim());
    process.exit(result.status || 1);
  }

  const report = readJson(reportPath);
  const currentBuild = existsSync(versionPath) ? readJson(versionPath) : null;
  const errors = [];

  if (result.status !== 0) errors.push(`exit=${result.status}`);
  if (report.status !== 'passed') errors.push(`status=${report.status || 'missing'}`);
  if (currentBuild?.version && report.build !== currentBuild.version) {
    errors.push(`build=${report.build || 'missing'} expected=${currentBuild.version}`);
  }
  if (report.noDebugFlagUsed !== true) errors.push('debug flag was present');
  if ((report.cloudSummary?.hangarPilotXp || 0) <= 0) errors.push('cloud hangar XP did not persist');
  if ((report.cloudSummary?.topScore || 0) < 504) errors.push('cloud/local top score did not persist');
  if ((report.restartHangarProgress?.pilotXp || 0) <= 0) errors.push('restart did not restore progress');
  if ((report.consoleEvents || []).length) errors.push(`${report.consoleEvents.length} console event(s)`);

  if (errors.length) {
    console.error(`[packaged-gameover-autosave] failed: ${errors.join('; ')}`);
    if (result.stdout?.trim()) console.error(result.stdout.trim());
    if (result.stderr?.trim()) console.error(result.stderr.trim());
    process.exit(1);
  }

  console.log(`[packaged-gameover-autosave] ok: ${path.relative(root, reportPath).replaceAll(path.sep, '/')}`);
} finally {
  rmSync(userData, { recursive: true, force: true });
}
