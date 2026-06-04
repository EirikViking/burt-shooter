import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const startedAt = new Date();
const node = process.execPath;

function npmStep(label, script) {
  if (process.platform === 'win32') {
    return { label, command: 'cmd.exe', args: ['/d', '/s', '/c', `npm run ${script}`] };
  }
  return { label, command: 'npm', args: ['run', script] };
}

const steps = [
  npmStep('release line guard', 'check:release-line'),
  { label: 'combo and distinct SFX', command: node, args: ['scripts/check-release-hardening-audio.mjs'] },
  { label: 'boss flow and death spectacle', command: node, args: ['scripts/check-release-hardening-boss-flow.mjs'] },
  { label: 'UI overlap and game-over hold', command: node, args: ['scripts/check-release-hardening-ui-flow.mjs'] },
  { label: 'Steam autosubmit mock guard', command: node, args: ['scripts/check-release-hardening-steam-autosubmit.mjs'] },
  npmStep('enemy cleanup accumulation', 'check:dead-enemy-cleanup'),
  npmStep('wave stuck watchdog', 'check:wave-stuck-watchdog'),
  npmStep('boss mercy gate', 'check:boss-mercy'),
  npmStep('first boss balance', 'check:first-boss-balance'),
  npmStep('game over interlude readability', 'check:gameover-interlude'),
  npmStep('one more run flow', 'check:gameover-motivation'),
  npmStep('leaderboard status screens', 'check:leaderboard-visuals'),
  npmStep('Steam leaderboard autosubmit mock', 'check:steam-leaderboard-mock'),
  npmStep('ship usage counter', 'check:ship-usage-counter'),
  npmStep('Steam Cloud save', 'check:steam-cloud-save'),
  npmStep('i18n strings', 'check:i18n'),
  npmStep('localized UI visual QA', 'check:i18n-ui'),
  npmStep('Steam Electron bridge', 'check:steam-electron-bridge'),
  npmStep('controller flow', 'check:controller-flow'),
  npmStep('browser smoke', 'smoke'),
  npmStep('current build', 'build:current'),
  npmStep('desktop smoke current build', 'desktop:smoke:current'),
  npmStep('Steam package runtime', 'check:steam-package-runtime')
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
