import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const startedAt = new Date();
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;

const steps = [
  { label: 'release line guard', command: npm, args: ['run', 'check:release-line'] },
  { label: 'combo and distinct SFX', command: node, args: ['scripts/check-release-hardening-audio.mjs'] },
  { label: 'boss flow and death spectacle', command: node, args: ['scripts/check-release-hardening-boss-flow.mjs'] },
  { label: 'UI overlap and game-over hold', command: node, args: ['scripts/check-release-hardening-ui-flow.mjs'] },
  { label: 'Steam autosubmit mock guard', command: node, args: ['scripts/check-release-hardening-steam-autosubmit.mjs'] },
  { label: 'enemy cleanup accumulation', command: npm, args: ['run', 'check:dead-enemy-cleanup'] },
  { label: 'wave stuck watchdog', command: npm, args: ['run', 'check:wave-stuck-watchdog'] },
  { label: 'boss mercy gate', command: npm, args: ['run', 'check:boss-mercy'] },
  { label: 'first boss balance', command: npm, args: ['run', 'check:first-boss-balance'] },
  { label: 'game over interlude readability', command: npm, args: ['run', 'check:gameover-interlude'] },
  { label: 'one more run flow', command: npm, args: ['run', 'check:gameover-motivation'] },
  { label: 'leaderboard status screens', command: npm, args: ['run', 'check:leaderboard-visuals'] },
  { label: 'Steam leaderboard autosubmit mock', command: npm, args: ['run', 'check:steam-leaderboard-mock'] },
  { label: 'ship usage counter', command: npm, args: ['run', 'check:ship-usage-counter'] },
  { label: 'Steam Cloud save', command: npm, args: ['run', 'check:steam-cloud-save'] },
  { label: 'i18n strings', command: npm, args: ['run', 'check:i18n'] },
  { label: 'localized UI visual QA', command: npm, args: ['run', 'check:i18n-ui'] },
  { label: 'Steam Electron bridge', command: npm, args: ['run', 'check:steam-electron-bridge'] },
  { label: 'controller flow', command: npm, args: ['run', 'check:controller-flow'] },
  { label: 'browser smoke', command: npm, args: ['run', 'smoke'] },
  { label: 'current build', command: npm, args: ['run', 'build:current'] },
  { label: 'desktop smoke current build', command: npm, args: ['run', 'desktop:smoke:current'] },
  { label: 'Steam package runtime', command: npm, args: ['run', 'check:steam-package-runtime'] }
];

function runStep(step, index) {
  return new Promise((resolve, reject) => {
    const prefix = `[release-hardening ${index + 1}/${steps.length}]`;
    console.log(`${prefix} ${step.label}`);
    console.log(`${prefix} > ${[step.command, ...step.args].join(' ')}`);
    const child = spawn(step.command, step.args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      windowsHide: true
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${step.label} failed with ${signal || `exit ${code}`}`));
    });
  });
}

const results = [];
let status = 'passed';
let failure = null;

for (let index = 0; index < steps.length; index += 1) {
  const step = steps[index];
  const stepStartedAt = new Date();
  try {
    await runStep(step, index);
    results.push({
      label: step.label,
      command: [step.command, ...step.args].join(' '),
      status: 'passed',
      durationMs: Date.now() - stepStartedAt.getTime()
    });
  } catch (error) {
    status = 'failed';
    failure = error.message;
    results.push({
      label: step.label,
      command: [step.command, ...step.args].join(' '),
      status: 'failed',
      durationMs: Date.now() - stepStartedAt.getTime(),
      error: error.message
    });
    break;
  }
}

const outputDir = path.resolve('test-results', 'release-hardening');
mkdirSync(outputDir, { recursive: true });
const report = {
  status,
  startedAt: startedAt.toISOString(),
  finishedAt: new Date().toISOString(),
  durationMs: Date.now() - startedAt.getTime(),
  steps: results,
  failure
};
writeFileSync(path.join(outputDir, 'latest-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (status !== 'passed') {
  console.error(`[release-hardening] FAIL ${failure}`);
  process.exit(1);
}

console.log(`[release-hardening] PASS ${steps.length} checks in ${Math.round(report.durationMs / 1000)}s`);
