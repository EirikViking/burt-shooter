import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.resolve(root, 'release/provenance/asset_provenance_manifest.json');
const reportPath = path.resolve(root, 'release/provenance/asset_provenance_report.json');

const scannedRoots = [
  'public/art',
  'public/audio',
  'public/icons',
  'public/sprites',
  'build/icons',
  'release/steam-assets/draft-2026-05-17-nova-swarm',
  'release/marketing-assets/mission-control-2026-05-16',
  'release/steam-screenshots',
  'release/steam-trailer/draft-2026-05-17-12-46',
  'release/steam-trailer/draft-2026-05-17-17-03',
  'release/steam-trailer/candidate-2026-05-17-editorial'
];

const assetExtensions = new Set([
  '.aac', '.ico', '.jpg', '.jpeg', '.mp3', '.mp4', '.png', '.svg', '.webm', '.webp', '.wav'
]);

const ignoredPathParts = [
  '/review/',
  '/node_modules/',
  '/release/desktop/'
];

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function walk(entry, files = []) {
  const full = path.resolve(root, entry);
  if (!existsSync(full)) return files;
  const stats = statSync(full);
  if (stats.isFile()) {
    const relative = rel(full);
    if (assetExtensions.has(path.extname(relative).toLowerCase()) &&
      !ignoredPathParts.some((part) => relative.includes(part))) {
      files.push(relative);
    }
    return files;
  }
  if (!stats.isDirectory()) return files;
  for (const child of readdirSync(full, { withFileTypes: true })) {
    walk(path.join(entry, child.name), files);
  }
  return files;
}

function prefixMatches(file, prefix) {
  return file === prefix || file.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`);
}

function mostSpecificRule(file, rules) {
  const matches = rules.filter((rule) => (rule.prefixes || []).some((prefix) => prefixMatches(file, prefix)));
  return matches.sort((a, b) => {
    const aLength = Math.max(...a.prefixes.map((prefix) => prefix.length));
    const bLength = Math.max(...b.prefixes.map((prefix) => prefix.length));
    return bLength - aLength;
  })[0] || null;
}

const deniedPathTerms = [
  ['d', 'onald'].join(''),
  ['k', 'urt'].join(''),
  ['e', 'irik'].join(''),
  ['stok', 'marknes'].join(''),
  ['burt', '-shooter'].join('')
];

const errors = [];
const warnings = [];

if (!existsSync(manifestPath)) {
  errors.push(`Missing ${rel(manifestPath)}`);
}

const manifest = errors.length ? { rules: [] } : JSON.parse(readFileSync(manifestPath, 'utf8'));
const rules = Array.isArray(manifest.rules) ? manifest.rules : [];

if (manifest.status !== 'inventory_pending_human_legal_approval') {
  errors.push('Manifest status must remain inventory_pending_human_legal_approval until human legal approval is recorded elsewhere');
}
if (!manifest.policy?.humanApprovalRequired || !manifest.policy?.doNotClaimLegalClearanceFromThisFile) {
  errors.push('Manifest policy must explicitly require human approval and avoid claiming legal clearance');
}
if (rules.length < 5) {
  errors.push('Manifest must include path rules for generated art, generated audio, bundled assets, icons, screenshots, and trailer/store assets');
}

for (const rule of rules) {
  if (!rule.id) errors.push('A provenance rule is missing id');
  if (!Array.isArray(rule.prefixes) || rule.prefixes.length === 0) errors.push(`Rule ${rule.id || 'unknown'} has no prefixes`);
  if (!rule.sourceType) errors.push(`Rule ${rule.id || 'unknown'} is missing sourceType`);
  if (rule.licenseStatus !== 'pending_human_review' && rule.licenseStatus !== 'approved') {
    errors.push(`Rule ${rule.id || 'unknown'} has invalid licenseStatus`);
  }
}

const files = scannedRoots.flatMap((entry) => walk(entry)).sort();
const uncovered = [];
const deniedMatches = [];
const coverage = new Map();
const deniedTerms = deniedPathTerms;

for (const file of files) {
  const rule = mostSpecificRule(file, rules);
  if (!rule) {
    uncovered.push(file);
  } else {
    coverage.set(rule.id, (coverage.get(rule.id) || 0) + 1);
  }

  const lower = file.toLowerCase();
  for (const term of deniedTerms) {
    if (term && lower.includes(String(term).toLowerCase())) {
      deniedMatches.push({ file, term });
    }
  }
}

if (uncovered.length) errors.push(`${uncovered.length} asset(s) lack provenance coverage`);
if (deniedMatches.length) errors.push(`${deniedMatches.length} asset path(s) contain denied terms`);

const approvedRules = rules.filter((rule) => rule.licenseStatus === 'approved');
if (approvedRules.length) {
  warnings.push(`${approvedRules.length} provenance rule(s) are marked approved; confirm this is backed by human approval docs`);
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  manifestPath: rel(manifestPath),
  scannedRoots,
  assetCount: files.length,
  coveredCount: files.length - uncovered.length,
  uncovered,
  deniedMatches,
  ruleCoverage: Object.fromEntries([...coverage.entries()].sort()),
  warnings,
  errors
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error('[asset-provenance] failed');
  for (const error of errors) console.error(`- ${error}`);
  if (uncovered.length) {
    for (const file of uncovered.slice(0, 20)) console.error(`  uncovered: ${file}`);
  }
  process.exit(1);
}

console.log(`[asset-provenance] ok: ${report.coveredCount}/${report.assetCount} assets covered by provenance inventory`);
if (warnings.length) {
  console.warn(`[asset-provenance] warnings: ${warnings.length}`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}
