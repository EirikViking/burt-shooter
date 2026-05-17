import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const full = args.has('--full') || process.env.STEAM_RC_FULL === '1';
const strict = args.has('--strict') || process.env.RELEASE_AUDIT_STRICT === '1';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve(process.env.STEAM_RC_VERIFY_OUTPUT_DIR || `test-results/steam-rc-verify-${timestamp}`);
const reportPath = path.join(outputDir, 'report.json');

const shellCommand = process.platform === 'win32' ? 'cmd.exe' : 'sh';

const stages = [
  ['build:current', ['run', 'build:current']],
  ['check:provenance', ['run', 'check:provenance']],
  ['check:steam-assets', ['run', 'check:steam-assets']],
  ['check:steam-store', ['run', 'check:steam-store']],
  ['package:steam:win:current', ['run', 'package:steam:win:current']],
  ['desktop:smoke:current', ['run', 'desktop:smoke:current']],
  ['desktop:smoke:packaged', ['run', 'desktop:smoke:packaged']],
  ['check:desktop-package', ['run', 'check:desktop-package']],
  ['check:live-deployment', ['run', 'check:live-deployment']],
  ['audit:audio-mix', ['run', 'audit:audio-mix']]
];

if (full) {
  stages.push(
    ['smoke', ['run', 'smoke']],
    ['playtest:release', ['run', 'playtest:release']]
  );
}

stages.push(['audit:release-readiness', ['run', 'audit:release-readiness']]);

function runStage(name, npmArgs) {
  console.log(`[steam-rc] starting ${name}`);
  const startedAt = Date.now();
  const env = {
    ...process.env,
    ...(strict ? { RELEASE_AUDIT_STRICT: '1' } : {})
  };
  const shellArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm ${npmArgs.join(' ')}`]
    : ['-lc', `npm ${npmArgs.join(' ')}`];
  const result = spawnSync(shellCommand, shellArgs, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env,
    windowsHide: true
  });
  const durationMs = Date.now() - startedAt;
  const ok = result.status === 0;
  console.log(`[steam-rc] ${ok ? 'ok' : 'failed'} ${name} (${Math.round(durationMs / 1000)}s)`);
  return {
    name,
    command: `npm ${npmArgs.join(' ')}`,
    error: result.error?.message || null,
    status: result.status,
    signal: result.signal,
    durationMs,
    ok
  };
}

function readJsonIfExists(relativePath) {
  const fullPath = path.resolve(relativePath);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, 'utf8'));
}

mkdirSync(outputDir, { recursive: true });

const results = [];
for (const [name, npmArgs] of stages) {
  const result = runStage(name, npmArgs);
  results.push(result);
  if (!result.ok) break;
}

const releaseAudit = readJsonIfExists('docs/reviews/release-readiness-audit-2026-05-17.json');
const audioAudit = readJsonIfExists('docs/reviews/audio-mix-audit-2026-05-17.json');
const failed = results.filter((result) => !result.ok);
const manualBlockers = releaseAudit?.summary?.manualBlockers || [];

const report = {
  generatedAt: new Date().toISOString(),
  mode: full ? 'full' : 'fast',
  strict,
  ok: failed.length === 0,
  outputDir,
  stages: results,
  releaseAudit: releaseAudit ? {
    verdict: releaseAudit.verdict,
    passed: releaseAudit.summary?.passed,
    failed: releaseAudit.summary?.failed,
    hardFailures: releaseAudit.summary?.hardFailures,
    manualBlockers
  } : null,
  audioAudit: audioAudit ? {
    generatedAt: audioAudit.generatedAt,
    decodeErrors: audioAudit.decodeErrors?.length ?? null,
    warnings: audioAudit.warnings?.length ?? null
  } : null,
  notes: [
    full
      ? 'Full mode verifies build/static release evidence, refreshes the Windows package and Electron smoke from the same build, then runs browser smoke and release playtest.'
      : 'Fast mode verifies build/static release evidence and refreshes the Windows package plus Electron and packaged-executable smoke from the same build. Use --full for browser smoke and release playtest.',
    `A successful ${full ? 'full' : 'fast'} report does not mean Steam-ready while releaseAudit.verdict is not_steam_ready.`
  ]
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`[steam-rc] wrote ${path.relative(process.cwd(), reportPath)}`);

if (failed.length) {
  process.exit(failed[0].status || 1);
}
