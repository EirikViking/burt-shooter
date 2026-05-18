import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.resolve(root, 'release/steamworks');
const jsonPath = path.join(outputDir, 'human_review_packet.json');
const mdPath = path.join(outputDir, 'human_review_packet.md');

function readJson(relativePath) {
  const full = path.resolve(root, relativePath);
  return existsSync(full) ? JSON.parse(readFileSync(full, 'utf8')) : null;
}

function fileInfo(relativePath) {
  const full = path.resolve(root, relativePath);
  return {
    path: relativePath,
    exists: existsSync(full),
    bytes: existsSync(full) ? statSync(full).size : 0
  };
}

function approvalState() {
  const relativePath = 'docs/reviews/2026-05-17-human-release-approval.md';
  const full = path.resolve(root, relativePath);
  if (!existsSync(full)) return { path: relativePath, exists: false, approved: false, pending: [] };
  const text = readFileSync(full, 'utf8');
  const gates = ['screenshots', 'capsules', 'trailer', 'audio', 'storeCopy', 'legalProvenance', 'gameplayFeel'];
  return {
    path: relativePath,
    exists: true,
    approved: gates.every((gate) => new RegExp(`^${gate}:\\s*approved\\b`, 'im').test(text)),
    pending: gates.filter((gate) => !new RegExp(`^${gate}:\\s*approved\\b`, 'im').test(text)),
    approvedBy: (text.match(/^approvedBy:\s*(.+)$/im)?.[1] || '').trim(),
    approvedAt: (text.match(/^approvedAt:\s*(.+)$/im)?.[1] || '').trim()
  };
}

const version = readJson('public/version.json');
const screenshots = readJson('release/steam-screenshots/draft-2026-05-17-current/report.json');
const trailer = readJson('release/steam-trailer/candidate-2026-05-17-current/report.json');
const audio = readJson('docs/reviews/audio-mix-audit-2026-05-17.json');
const provenance = readJson('release/provenance/asset_provenance_report.json');
const store = readJson('release/steamworks/store_metadata_review_report.json');
const fullRc = readJson('release/steamworks/full_rc_verification_report.json');
const audit = readJson('docs/reviews/release-readiness-audit-2026-05-17.json');
const approval = approvalState();
const approvalWriteCommand = 'HUMAN_RELEASE_APPROVAL_CONFIRM=I_REVIEWED_NOVA_SWARM_RELEASE_CANDIDATE HUMAN_RELEASE_ALL_GATES_APPROVED=YES HUMAN_RELEASE_APPROVED_BY=<name> npm run steamworks:write-human-approval';

const reviewAreas = [
  {
    key: 'screenshots',
    label: 'Steam Screenshots',
    approvalGate: 'screenshots',
    status: screenshots?.build?.version === version?.version ? 'ready_for_human_review' : 'stale_or_missing',
    artifacts: [
      fileInfo('release/steam-screenshots/steam-upload-candidates-2026-05-17/steam_upload_candidate_sheet.png'),
      fileInfo('release/steam-screenshots/steam-upload-candidates-2026-05-17/README.md'),
      fileInfo('release/steam-screenshots/draft-2026-05-17-current/report.json')
    ],
    prompt: 'Review the 8 screenshot upload candidates for clarity, truthful gameplay representation, UI readability, and public arcade tone.'
  },
  {
    key: 'capsules',
    label: 'Steam Capsules And Library Art',
    approvalGate: 'capsules',
    status: 'ready_for_human_review',
    artifacts: [
      fileInfo('release/steam-assets/draft-2026-05-17-nova-swarm/review/steam_asset_contact_sheet.png'),
      fileInfo('release/steam-assets/draft-2026-05-17-nova-swarm/review/small_capsule_thumbnail_sheet.png'),
      fileInfo('release/steam-assets/draft-2026-05-17-nova-swarm/README.md')
    ],
    prompt: 'Review capsule title readability, thumbnail fit, public brand tone, and whether the art feels original and shippable.'
  },
  {
    key: 'trailer',
    label: 'Steam Trailer Candidate',
    approvalGate: 'trailer',
    status: trailer?.status === 'passed' && trailer?.build?.version === version?.version ? 'ready_for_human_review' : 'stale_or_missing',
    artifacts: [
      fileInfo('release/steam-trailer/candidate-2026-05-17-current/nova-swarm-steam-trailer-candidate.mp4'),
      fileInfo('release/steam-trailer/candidate-2026-05-17-current/candidate-contact-sheet.png'),
      fileInfo('release/steam-trailer/candidate-2026-05-17-current/report.json')
    ],
    prompt: 'Watch the whole trailer with sound. Approve pacing, title cards, gameplay clarity, audio balance, and absence of private/internal material.'
  },
  {
    key: 'audio',
    label: 'Audio Mix And Voice',
    approvalGate: 'audio',
    status: audio && (audio.warnings || []).length === 0 ? 'ready_for_human_review' : 'needs_audio_attention',
    artifacts: [
      fileInfo('docs/reviews/2026-05-17-audio-mix-audit.md'),
      fileInfo('docs/reviews/audio-mix-audit-2026-05-17.json'),
      fileInfo('docs/audio-pipeline.md')
    ],
    prompt: 'Listen on headphones or speakers through menu, intro narration, combat, powerups, boss, victory, and game over.'
  },
  {
    key: 'storeCopy',
    label: 'Steam Store Copy And Metadata',
    approvalGate: 'storeCopy',
    status: store?.status === 'passed' ? 'ready_for_human_review' : 'needs_metadata_attention',
    artifacts: [
      fileInfo('release/steamworks/store_metadata_draft.json'),
      fileInfo('release/steamworks/store_metadata_review_report.json'),
      fileInfo('docs/steam-store-handoff.md')
    ],
    prompt: 'Approve short description, long description, feature bullets, tags, controller claim, and v1 deferrals for Steam Cloud and achievements.'
  },
  {
    key: 'legalProvenance',
    label: 'Legal And Provenance',
    approvalGate: 'legalProvenance',
    status: provenance?.status === 'passed' ? 'ready_for_human_review' : 'needs_provenance_attention',
    artifacts: [
      fileInfo('docs/asset-provenance.md'),
      fileInfo('release/provenance/asset_provenance_manifest.json'),
      fileInfo('release/provenance/asset_provenance_report.json')
    ],
    prompt: 'Review generated and third-party art/audio provenance, names, jokes, and store materials. Only a human can mark legal approval.'
  },
  {
    key: 'gameplayFeel',
    label: 'Gameplay Feel',
    approvalGate: 'gameplayFeel',
    status: fullRc?.status === 'passed' ? 'ready_for_human_review' : 'needs_playtest_attention',
    artifacts: [
      fileInfo('release/steamworks/full_rc_verification_report.json'),
      fileInfo('docs/reviews/2026-05-17-steam-readiness-checklist.md'),
      fileInfo('docs/reviews/2026-05-16-release-candidate-review.md')
    ],
    prompt: 'Play a normal 10-15 minute session and approve late boss pressure, repair generosity, restart flow, controls, and UI clutter.'
  }
];

const packet = {
  generatedAt: new Date().toISOString(),
  status: reviewAreas.every((area) => area.status === 'ready_for_human_review') ? 'ready_for_human_review' : 'needs_attention',
  build: {
    version: version?.version || null,
    timestamp: version?.timestamp || null
  },
  releaseAudit: audit ? {
    verdict: audit.verdict || null,
    passed: audit.summary?.passed ?? null,
    failed: audit.summary?.failed ?? null,
    hardFailures: audit.summary?.hardFailures ?? null
  } : null,
  approval,
  approvalWriteCommand,
  reviewAreas,
  instructions: [
    'Use this packet as the human review map; do not mark approvals without actually reviewing the listed artifact or runtime behavior.',
    'Record final decisions in docs/reviews/2026-05-17-human-release-approval.md, or use the guarded approval writer after every gate is actually approved.',
    'This packet does not replace Steam client install validation.'
  ]
};

function renderMarkdown(data) {
  const rows = data.reviewAreas.map((area) =>
    `| ${area.label} | ${area.status} | ${area.approvalGate} | ${area.artifacts.map((artifact) => `\`${artifact.path}\``).join('<br>')} |`
  ).join('\n');
  const pending = data.approval.pending.length ? data.approval.pending.map((gate) => `- ${gate}`).join('\n') : '- None';
  const prompts = data.reviewAreas.map((area) => `- ${area.label}: ${area.prompt}`).join('\n');

  return `# Nova Swarm Human Review Packet

Generated: ${data.generatedAt}
Build: \`${data.build.version || 'unknown'}\`

This is a review map, not approval. Final approval must be recorded in \`${data.approval.path}\`.

Guarded approval command after all gates are reviewed:

\`${data.approvalWriteCommand}\`

## Approval State

- Approved: ${data.approval.approved ? 'yes' : 'no'}
- Approved by: ${data.approval.approvedBy || 'TBD'}
- Approved at: ${data.approval.approvedAt || 'TBD'}

Pending gates:

${pending}

## Review Areas

| Area | Status | Approval Gate | Artifacts |
| --- | --- | --- | --- |
${rows}

## Human Review Prompts

${prompts}

## Notes

${data.instructions.map((note) => `- ${note}`).join('\n')}
`;
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(packet), 'utf8');

if (!version?.version) {
  console.error('[human-review] missing public/version.json build metadata');
  process.exit(1);
}

console.log(`[human-review] wrote ${path.relative(root, jsonPath).replaceAll(path.sep, '/')}`);
console.log(`[human-review] wrote ${path.relative(root, mdPath).replaceAll(path.sep, '/')}`);
