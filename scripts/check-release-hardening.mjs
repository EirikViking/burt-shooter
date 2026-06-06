import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const startedAt = new Date();
const node = process.execPath;
const manualTestingStillNeeded = [
  'Steam-client combo x10/x20 by-ear pass: softened tick, score bonus unchanged.',
  'Steam-client SFX by-ear pass: combo, wave clear, sector clear, powerup pickup, boss death all distinct.',
  'Human boss pass: boss 1 lasts longer/readable without feeling much harder; sample one later boss if possible.',
  'Human boss-death pass: bursts/rings/shockwaves look varied and clear before the next sector.',
  'Level 8-9 stuck-sprite pass: death, despawn, wave/sector clear, boss transition, support ships, pause/freeze/interlude.',
  'Steam-client game-over pass: auto-submit status is readable, Continue advances cleanly, One More Run/Top 3 remain readable.',
  'UI overlap pass: Rank badge, Run Clear, One More Run, Global Score Deck, empty/populated leaderboards.',
  'Real Steam leaderboard pass: use a real ranked run only; no dummy scores; board stays nova_swarm_global_score_v2.'
];

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
  npmStep('cold menu labels', 'check:menu-cold-labels'),
  npmStep('enemy wave counts and delayed entries', 'check:enemy-wave-patterns'),
  npmStep('enemy cleanup accumulation', 'check:dead-enemy-cleanup'),
  npmStep('dead enemy playthrough visual audit', 'check:dead-enemy-playthrough'),
  npmStep('wave stuck watchdog', 'check:wave-stuck-watchdog'),
  npmStep('gameplay message overlap', 'check:gameplay-message-overlap'),
  npmStep('boss mercy gate', 'check:boss-mercy'),
  npmStep('first boss balance', 'check:first-boss-balance'),
  npmStep('powerup gameplay effects', 'check:powerup-effects'),
  npmStep('debug shortcut stays unranked', 'check:debug-unranked'),
  npmStep('game over interlude readability', 'check:gameover-interlude'),
  npmStep('overrun confirmation pause', 'check:overrun-confirmation'),
  npmStep('overrun recurring milestones', 'check:overrun-milestones'),
  npmStep('result screen leaderboard statuses', 'check:result-screen-status'),
  npmStep('result screen final flow layout', 'check:result-screen-flow'),
  npmStep('one more run flow', 'check:gameover-motivation'),
  npmStep('leaderboard status screens', 'check:leaderboard-visuals'),
  npmStep('Steam leaderboard autosubmit mock', 'check:steam-leaderboard-mock'),
  npmStep('ship usage counter', 'check:ship-usage-counter'),
  npmStep('player ship source and padding', 'check:player-ship-padding'),
  npmStep('Steam Cloud save', 'check:steam-cloud-save'),
  npmStep('i18n strings', 'check:i18n'),
  npmStep('localized UI visual QA', 'check:i18n-ui'),
  npmStep('Steam Electron bridge', 'check:steam-electron-bridge'),
  npmStep('controller flow', 'check:controller-flow'),
  npmStep('keyboard launch controls', 'check:keyboard-launches'),
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
  passedCount: results.filter((result) => result.status === 'passed').length,
  failedCount: results.filter((result) => result.status === 'failed').length,
  failure,
  manualTestingStillNeeded,
  manualChecklistPath: 'release/steamworks/release_hardening_manual_test_checklist_20260605.md'
};
writeFileSync(path.join(outputDir, 'latest-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(path.join(outputDir, 'latest-summary.md'), [
  '# Nova Swarm Release Hardening Summary',
  '',
  `Status: ${status}`,
  `Started: ${report.startedAt}`,
  `Finished: ${report.finishedAt}`,
  `Duration: ${Math.round(report.durationMs / 1000)}s`,
  '',
  '## Automated Checks',
  '',
  ...results.map((result) => `- ${result.status === 'passed' ? 'PASS' : 'FAIL'} ${result.label} (${Math.round(result.durationMs / 1000)}s)`),
  '',
  '## Manual Testing Still Needed',
  '',
  ...manualTestingStillNeeded.map((item) => `- ${item}`),
  '',
  `Full checklist: ${report.manualChecklistPath}`,
  ''
].join('\n'), 'utf8');

if (status !== 'passed') {
  console.error(`[release-hardening] FAIL ${failure}`);
  process.exit(1);
}

console.log('');
console.log('[release-hardening] Automated summary');
console.log(`[release-hardening] PASS ${report.passedCount}/${steps.length} checks in ${Math.round(report.durationMs / 1000)}s`);
console.log(`[release-hardening] report=${path.join(outputDir, 'latest-report.json')}`);
console.log(`[release-hardening] summary=${path.join(outputDir, 'latest-summary.md')}`);
console.log('[release-hardening] Manual testing still needed:');
manualTestingStillNeeded.forEach((item, index) => {
  console.log(`[release-hardening] ${index + 1}. ${item}`);
});
console.log(`[release-hardening] Full manual checklist: ${report.manualChecklistPath}`);
