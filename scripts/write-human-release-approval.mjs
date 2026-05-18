import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputPath = path.resolve(process.env.HUMAN_RELEASE_APPROVAL_OUTPUT || 'docs/reviews/2026-05-17-human-release-approval.md');
const confirmText = 'I_REVIEWED_NOVA_SWARM_RELEASE_CANDIDATE';
const allGatesText = 'YES';
const gates = [
  'screenshots',
  'capsules',
  'trailer',
  'audio',
  'storeCopy',
  'legalProvenance',
  'gameplayFeel'
];

const evidenceFiles = [
  'release/steam-screenshots/steam-upload-candidates-2026-05-17/steam_upload_candidate_sheet.png',
  'release/steam-assets/draft-2026-05-17-nova-swarm/review/steam_asset_contact_sheet.png',
  'release/steam-trailer/candidate-2026-05-17-current/nova-swarm-steam-trailer-candidate.mp4',
  'docs/reviews/2026-05-17-audio-mix-audit.md',
  'release/steamworks/store_metadata_draft.json',
  'release/provenance/asset_provenance_report.json',
  'release/steamworks/full_rc_verification_report.json'
];

function requiredEnv(name) {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseNotes(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

if ((process.env.HUMAN_RELEASE_APPROVAL_CONFIRM || '').trim() !== confirmText) {
  throw new Error(`Set HUMAN_RELEASE_APPROVAL_CONFIRM=${confirmText} after completing the required human review.`);
}

if ((process.env.HUMAN_RELEASE_ALL_GATES_APPROVED || '').trim().toUpperCase() !== allGatesText) {
  throw new Error(`Set HUMAN_RELEASE_ALL_GATES_APPROVED=${allGatesText} only after approving every listed review gate.`);
}

const approvedBy = requiredEnv('HUMAN_RELEASE_APPROVED_BY');
if (/^TBD$/i.test(approvedBy)) {
  throw new Error('HUMAN_RELEASE_APPROVED_BY must name the real reviewer, not TBD.');
}

const version = existsSync(path.resolve(root, 'public/version.json'))
  ? JSON.parse(readFileSync(path.resolve(root, 'public/version.json'), 'utf8'))
  : null;

const missingEvidence = evidenceFiles.filter((relativePath) => !existsSync(path.resolve(root, relativePath)));
if (missingEvidence.length) {
  throw new Error(`Missing required review evidence: ${missingEvidence.join(', ')}`);
}

const approvedAt = new Date().toISOString();
const extraNotes = parseNotes(process.env.HUMAN_RELEASE_APPROVAL_NOTES);
const notes = extraNotes.length
  ? extraNotes.map((note) => `- ${note}`).join('\n')
  : '- No extra approval notes supplied.';

const body = `# Human Release Approval - Approved

This file records a human approval decision for the Nova Swarm Steam release candidate.
Only keep this file in the approved state if the reviewer actually inspected the listed artifacts and runtime behavior.

approvedBy: ${approvedBy}
approvedAt: ${approvedAt}
build: ${version?.version || 'unknown'}

${gates.map((gate) => `${gate}: approved`).join('\n')}

## Required Review Evidence

- Screenshots: review \`release/steam-screenshots/steam-upload-candidates-2026-05-17/\`.
- Capsules: review \`release/steam-assets/draft-2026-05-17-nova-swarm/review/\`.
- Trailer: watch \`release/steam-trailer/candidate-2026-05-17-current/nova-swarm-steam-trailer-candidate.mp4\` and review \`release/steam-trailer/candidate-2026-05-17-current/candidate-contact-sheet.png\`.
- Audio: listen through menu, intro narration, normal gameplay, powerups, boss inbound, boss fight, victory, and game over.
- Store copy: approve the text in \`docs/reviews/2026-05-17-steam-readiness-checklist.md\`.
- Legal/provenance: approve generated art/audio/voice use, third-party assets, names, jokes, and store materials.
- Gameplay feel: complete a normal 10-15 minute playthrough and approve late boss pressure, repair generosity, restart flow, UI clutter, and control feel.

## Approval Notes

${notes}
`;

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, body, 'utf8');
console.log(`wrote ${path.relative(root, outputPath).replaceAll(path.sep, '/')}`);
