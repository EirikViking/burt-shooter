import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const candidateReportPath = path.resolve('release/steam-trailer/candidate-2026-05-17-current/report.json');
const versionPath = path.resolve('public/version.json');
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/steam-trailer-opening-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

const errors = [];
if (!existsSync(candidateReportPath)) errors.push(`missing candidate report: ${candidateReportPath}`);
if (!existsSync(versionPath)) errors.push(`missing version file: ${versionPath}`);

const report = errors.length ? null : readJson(candidateReportPath);
const version = errors.length ? null : readJson(versionPath);

if (report) {
  if (report.status !== 'passed') errors.push(`candidate status is ${report.status}`);
  if (report.opening !== 'hijacker_and_boss_first') errors.push(`opening is ${report.opening}`);
  if (report.build?.version !== version?.version) errors.push(`candidate build ${report.build?.version} does not match current build ${version?.version}`);
  if (!Array.isArray(report.firstTenSeconds) || report.firstTenSeconds.length < 3) errors.push('firstTenSeconds evidence is missing');
  const firstTenText = (report.firstTenSeconds || []).join(' ').toLowerCase();
  if (!firstTenText.includes('hijacker') || !firstTenText.includes('tractor')) errors.push('firstTenSeconds does not name hijacker tractor-beam proof');
  if (!firstTenText.includes('hijack') || !firstTenText.includes('payoff')) errors.push('firstTenSeconds does not name Tractor Hijack payoff proof');
  if (!firstTenText.includes('boss')) errors.push('firstTenSeconds does not name boss proof');
  if (!existsSync(path.resolve(report.outputVideo || ''))) errors.push(`missing candidate video: ${report.outputVideo}`);
  if (!existsSync(path.resolve(report.contactSheet || ''))) errors.push(`missing candidate contact sheet: ${report.contactSheet}`);
  const duration = Number(report.ffprobe?.format?.duration || 0);
  if (duration < 30 || duration > 45) errors.push(`candidate duration ${duration}s is outside 30-45s`);
  for (const frame of report.frames || []) {
    if (!existsSync(path.resolve(frame))) errors.push(`missing contact-sheet frame: ${frame}`);
  }
}

const result = {
  ok: errors.length === 0,
  candidateReport: candidateReportPath,
  currentBuild: version?.version || null,
  opening: report?.opening || null,
  firstTenSeconds: report?.firstTenSeconds || null,
  durationSeconds: Number(report?.ffprobe?.format?.duration || 0),
  errors
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');

if (errors.length) {
  console.error(`[steam-trailer-opening] FAIL ${errors.join('; ')}`);
  process.exit(1);
}

console.log(`[steam-trailer-opening] PASS opening=${result.opening} duration=${result.durationSeconds.toFixed(2)}s report=${path.join(outputDir, 'report.json')}`);
