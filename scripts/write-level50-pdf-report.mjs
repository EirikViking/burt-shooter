import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outputDir = path.resolve('test-results');
const telemetryPath = path.join(outputDir, 'level50-analysis-telemetry.json');
const auditPath = path.join(outputDir, 'implementation-audit.json');
const pdfPath = path.join(outputDir, 'level50-analysis-summary.pdf');
const htmlPath = path.join(outputDir, 'level50-analysis-summary.html');
const promptPath = path.join(outputDir, 'level50-improvement-codex-prompt.md');

function readJson(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing ${path.relative(root, filePath)}. Run npm run test:level50-analysis first.`);
  }
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('`', "'");
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function fmtMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'n/a';
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(1)} s`;
}

function statusClass(status) {
  const text = String(status || '').toLowerCase();
  if (text.includes('broken') || text.includes('missing') || text.includes('conflicting')) return 'bad';
  if (text.includes('partial') || text.includes('untestable') || text.includes('unreachable')) return 'warn';
  return 'good';
}

function uniqueRecommendations(telemetry, audit) {
  const seen = new Set();
  return [...(audit.recommendations || []), ...(telemetry.recommendations || [])]
    .filter((rec) => {
      const key = `${rec.priority}|${rec.problem}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const rank = { High: 0, Medium: 1, Low: 2 };
      return (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3);
    });
}

function highRiskMatrix(audit) {
  return (audit.matrix || [])
    .filter((entry) => ['Visible in game but broken', 'Missing', 'Conflicting evidence', 'Implemented in code but unreachable in game', 'Partially implemented'].includes(entry.status))
    .slice(0, 12);
}

function milestoneRows(telemetry) {
  const rows = [];
  for (const attempt of telemetry.attempts || []) {
    for (const [level, milestone] of Object.entries(attempt.milestones || {})) {
      rows.push({
        level: Number(level),
        profile: attempt.profile,
        attempt: attempt.attempt,
        realElapsedMs: milestone.realElapsedMs,
        gameElapsedSeconds: milestone.gameElapsedSeconds,
        lives: milestone.lives,
        damageTaken: milestone.damageTaken,
        boss: milestone.bossOrEliteEncounters?.boss || 'sampled',
        notes: (milestone.obviousBalanceProblems || []).join('; ') || 'none'
      });
    }
  }
  return rows.sort((a, b) => a.level - b.level || a.profile.localeCompare(b.profile) || a.attempt - b.attempt);
}

function buildCodexPrompt(telemetry, audit, recommendations) {
  const top = recommendations.slice(0, 8);
  const highRisk = highRiskMatrix(audit);
  return `In the Nova Swarm repo, continue from the Level 50 analysis branch and fix the highest-value findings from the automated reports.

Context:
- Branch/baseline used by reports: ${mdEscape(telemetry.git?.branch)} at ${mdEscape(telemetry.git?.baselineCommit)}
- Level 50 verdict: ${mdEscape(telemetry.level50Verdict)}
- Report files:
  - test-results/level50-analysis-report.md
  - test-results/level50-analysis-telemetry.json
  - test-results/implementation-audit-report.md
  - test-results/implementation-audit.json

Important boundaries:
- Do not change Steamworks settings.
- Do not deploy unless explicitly instructed.
- Keep fixes focused and safe.
- Any debug/test hotkeys must remain unranked/dev-only and impossible to affect normal ranked players.
- Do not pretend automation is human playtesting.

Highest-value findings to investigate:
${top.map((rec, index) => `${index + 1}. [${mdEscape(rec.priority)}] ${mdEscape(rec.problem)}
   Evidence: ${mdEscape(rec.evidence)}
   Suggested fix: ${mdEscape(rec.suggestedFix)}
   Expected effect: ${mdEscape(rec.expectedEffect)}
   Risk/tradeoff: ${mdEscape(rec.riskOrTradeoff)}`).join('\n\n')}

Implementation audit risks:
${highRisk.length ? highRisk.map((entry, index) => `${index + 1}. ${mdEscape(entry.featureName)} - ${mdEscape(entry.status)}
   Runtime evidence: ${mdEscape(entry.runtimeEvidence?.evidence || 'none')}`).join('\n') : '- No high-risk audit rows beyond the recommendations above.'}

Requested work:
1. Reproduce each high-priority finding with the existing automation before changing code.
2. Fix only the findings that have clear runtime evidence and a safe implementation path.
3. Add or update focused regression coverage.
4. Run:
   - npm run build
   - npm run smoke
   - npm run test:level50-analysis
   - npm run report:level50-pdf
5. Summarize what changed, what remains, and whether the PDF/report findings improved.
`;
}

function renderRecommendationCard(rec, index) {
  return `
    <article class="recommendation ${statusClass(rec.priority === 'High' ? 'broken' : 'partial')}">
      <div class="rec-head">
        <span class="pill ${rec.priority === 'High' ? 'bad' : rec.priority === 'Medium' ? 'warn' : 'good'}">${esc(rec.priority)}</span>
        <h3>${index + 1}. ${esc(rec.problem)}</h3>
      </div>
      <dl>
        <dt>Evidence</dt><dd>${esc(rec.evidence)}</dd>
        <dt>Suggested Fix</dt><dd>${esc(rec.suggestedFix)}</dd>
        <dt>Expected Effect</dt><dd>${esc(rec.expectedEffect)}</dd>
        <dt>Risk Or Tradeoff</dt><dd>${esc(rec.riskOrTradeoff)}</dd>
      </dl>
    </article>`;
}

function renderHtml(telemetry, audit, prompt) {
  const recommendations = uniqueRecommendations(telemetry, audit);
  const profileSummaries = telemetry.profileSummaries || [];
  const milestones = milestoneRows(telemetry);
  const riskRows = highRiskMatrix(audit);
  const statusCounts = audit.statusCounts || {};
  const technical = telemetry.technical || {};
  const generatedAt = telemetry.generatedAt || audit.generatedAt || new Date().toISOString();
  const reportTitle = 'Nova Swarm Level 50 Analysis';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${reportTitle}</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #17202a;
      background: #f4f7fb;
      font: 12px/1.45 "Segoe UI", Arial, sans-serif;
    }
    .page {
      background: #ffffff;
      border: 1px solid #d8e2ef;
      border-radius: 8px;
      padding: 24px;
      margin: 0 auto 14px;
      box-shadow: 0 8px 28px rgba(21, 40, 70, 0.08);
    }
    .cover {
      background: linear-gradient(135deg, #071523 0%, #10263f 48%, #123a41 100%);
      color: #fff;
      min-height: 620px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 0;
    }
    .kicker { color: #74e0ff; text-transform: uppercase; letter-spacing: 1.8px; font-size: 10px; font-weight: 700; }
    h1 { margin: 14px 0 10px; font-size: 36px; line-height: 1.05; letter-spacing: 0; }
    h2 { margin: 0 0 12px; font-size: 19px; color: #0c2740; }
    .cover h2 { color: #d9f7ff; font-size: 17px; font-weight: 500; max-width: 620px; }
    h3 { margin: 0; font-size: 13px; color: #10263f; }
    .cover-meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 28px;
    }
    .meta-card {
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 12px;
    }
    .meta-card span { display: block; color: #a7d9e9; font-size: 10px; text-transform: uppercase; }
    .meta-card strong { display: block; margin-top: 4px; font-size: 13px; overflow-wrap: anywhere; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .card {
      border: 1px solid #d9e3ee;
      border-radius: 8px;
      padding: 13px;
      background: #fbfdff;
      min-height: 78px;
    }
    .metric { font-size: 24px; font-weight: 800; color: #0e6f8f; margin-top: 4px; }
    .label { color: #65758a; font-size: 10px; text-transform: uppercase; font-weight: 700; }
    .muted { color: #65758a; }
    .pill {
      display: inline-block;
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .good { background: #dff8eb; color: #12683b; }
    .warn { background: #fff2cc; color: #8a5a00; }
    .bad { background: #ffe0e0; color: #9b1c1c; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: auto; }
    th, td { border-bottom: 1px solid #e4ebf3; padding: 6px 7px; text-align: left; vertical-align: top; }
    th { background: #edf4fb; color: #23384f; font-size: 10px; text-transform: uppercase; }
    tr { page-break-inside: avoid; }
    .recommendation {
      border: 1px solid #dce7f2;
      border-left: 5px solid #f1b53c;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
      background: #fffdf8;
      page-break-inside: avoid;
    }
    .recommendation.bad, .recommendation.broken { border-left-color: #dc3c3c; background: #fff8f8; }
    .rec-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    dl { display: grid; grid-template-columns: 105px 1fr; gap: 5px 10px; margin: 0; }
    dt { font-weight: 800; color: #465a70; }
    dd { margin: 0; color: #1d2f42; }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: #081523;
      color: #eefaff;
      border-radius: 8px;
      padding: 14px;
      font-size: 9.5px;
      line-height: 1.38;
    }
    .footer-note {
      margin-top: 20px;
      color: #6c7d91;
      font-size: 10px;
    }
    .break { page-break-before: always; }
  </style>
</head>
<body>
  <section class="page cover">
    <div>
      <div class="kicker">Automated Gameplay Validation</div>
      <h1>Nova Swarm Level 50 Analysis</h1>
      <h2>${esc(telemetry.level50Verdict)}</h2>
      <div class="cover-meta">
        <div class="meta-card"><span>Generated</span><strong>${esc(generatedAt)}</strong></div>
        <div class="meta-card"><span>Branch</span><strong>${esc(telemetry.git?.branch || audit.git?.branch || 'unknown')}</strong></div>
        <div class="meta-card"><span>Baseline</span><strong>${esc(telemetry.git?.baselineCommit || audit.git?.baselineCommit || 'unknown')}</strong></div>
        <div class="meta-card"><span>Mode</span><strong>Accelerated, unranked, seeded browser automation</strong></div>
      </div>
    </div>
    <p class="footer-note">This PDF separates automated evidence from human playtest assumptions. It does not claim that simulated automation is equivalent to real player testing.</p>
  </section>

  <section class="page">
    <h2>Executive Summary</h2>
    <div class="grid-3">
      <div class="card"><div class="label">Target Reach</div><div class="metric">${esc((telemetry.attempts || []).filter((a) => a.reachedLevel >= telemetry.maxLevel).length)}/${esc((telemetry.attempts || []).length)}</div><div class="muted">Accelerated attempts reached target</div></div>
      <div class="card"><div class="label">Audit Features</div><div class="metric">${esc((audit.matrix || []).length)}</div><div class="muted">Feature rows inspected</div></div>
      <div class="card"><div class="label">High Value Fixes</div><div class="metric">${esc(recommendations.length)}</div><div class="muted">Recommendations generated</div></div>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div class="card">
        <div class="label">Technical Signals</div>
        <p>Page errors: <strong>${esc((technical.pageErrors || []).length)}</strong><br>
        Console warnings/errors: <strong>${esc((technical.consoleWarnings || []).length)}</strong><br>
        Request failures: <strong>${esc((technical.requestFailures || []).length)}</strong></p>
      </div>
      <div class="card">
        <div class="label">Audit Status Counts</div>
        <p>${Object.entries(statusCounts).map(([key, value]) => `<span class="pill ${statusClass(key)}">${esc(key)}: ${esc(value)}</span>`).join(' ')}</p>
      </div>
    </div>
  </section>

  <section class="page">
    <h2>Profile Results</h2>
    <table>
      <thead><tr><th>Profile</th><th>Median</th><th>Average</th><th>Best</th><th>Worst</th><th>Avg Time</th><th>Failure</th><th>Retry</th></tr></thead>
      <tbody>
        ${profileSummaries.map((profile) => `<tr>
          <td>${esc(profile.label)}</td>
          <td>${esc(profile.medianLevelReached)}</td>
          <td>${esc(profile.averageLevelReached)}</td>
          <td>${esc(profile.bestLevelReached)}</td>
          <td>${esc(profile.worstLevelReached)}</td>
          <td>${esc(fmtMs(profile.averageTimeSurvivedMs))}</td>
          <td>${esc(profile.mostCommonCauseOfFailure)}</td>
          <td>${profile.likelyToRetry ? '<span class="pill good">likely</span>' : '<span class="pill warn">unclear</span>'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <p class="footer-note">Profile reachability is modeled from automated pressure telemetry. Treat it as a signal for investigation, not as human playtest proof.</p>
  </section>

  <section class="page break">
    <h2>Milestone Timing</h2>
    <table>
      <thead><tr><th>Level</th><th>Profile</th><th>Attempt</th><th>Real</th><th>Game</th><th>Lives</th><th>Damage</th><th>Boss / Elite</th><th>Notes</th></tr></thead>
      <tbody>
        ${milestones.map((row) => `<tr>
          <td>${esc(row.level)}</td>
          <td>${esc(row.profile)}</td>
          <td>${esc(row.attempt)}</td>
          <td>${esc(fmtMs(row.realElapsedMs))}</td>
          <td>${esc(row.gameElapsedSeconds)} s</td>
          <td>${esc(row.lives)}</td>
          <td>${esc(row.damageTaken)}</td>
          <td>${esc(row.boss)}</td>
          <td>${esc(row.notes)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </section>

  <section class="page">
    <h2>Engagement And Frustration</h2>
    <div class="grid-2">
      <div class="card">
        <div class="label">Engagement Verdict</div>
        <p><strong>${esc(telemetry.engagement?.verdict || 'unknown')}</strong></p>
        <p>${esc(telemetry.engagement?.enemyVariety || '')}</p>
      </div>
      <div class="card">
        <div class="label">Likely Frustration</div>
        <p>Unfair-feeling stretches: ${esc((telemetry.engagement?.unfairFeelingStretches || []).join(', ') || 'none modeled')}</p>
        <p>Reward pacing: ${esc(telemetry.engagement?.timeBetweenRewards || 'unknown')}</p>
      </div>
    </div>
  </section>

  <section class="page break">
    <h2>Highest Risk Audit Findings</h2>
    <table>
      <thead><tr><th>Feature</th><th>Status</th><th>Runtime Evidence</th><th>Risk</th></tr></thead>
      <tbody>
        ${riskRows.length ? riskRows.map((entry) => `<tr>
          <td>${esc(entry.featureName)}</td>
          <td><span class="pill ${statusClass(entry.status)}">${esc(entry.status)}</span></td>
          <td>${esc(entry.runtimeEvidence?.evidence || 'not run')}</td>
          <td>${esc(entry.answers?.steamReviewOrPlayerTrustRisk || 'unknown')}</td>
        </tr>`).join('') : '<tr><td colspan="4">No high-risk audit rows detected.</td></tr>'}
      </tbody>
    </table>
  </section>

  <section class="page">
    <h2>Recommended Fixes</h2>
    ${recommendations.length ? recommendations.map(renderRecommendationCard).join('') : '<p>No recommendations generated.</p>'}
  </section>

  <section class="page break">
    <h2>Suggested Codex Prompt</h2>
    <p class="muted">The same prompt is also written to <strong>test-results/level50-improvement-codex-prompt.md</strong>.</p>
    <pre>${esc(prompt)}</pre>
  </section>
</body>
</html>`;
}

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const telemetry = readJson(telemetryPath);
  const audit = readJson(auditPath);
  const recommendations = uniqueRecommendations(telemetry, audit);
  const prompt = buildCodexPrompt(telemetry, audit, recommendations);
  const html = renderHtml(telemetry, audit, prompt);

  writeFileSync(promptPath, prompt);
  writeFileSync(htmlPath, html);

  const browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--disable-gpu', '--no-sandbox']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="width:100%;font-size:8px;color:#6c7d91;padding:0 14mm;display:flex;justify-content:space-between;"><span>Nova Swarm Level 50 Analysis</span><span class="pageNumber"></span></div>',
      margin: { top: '10mm', right: '10mm', bottom: '13mm', left: '10mm' }
    });
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({
    pdf: path.relative(root, pdfPath).replaceAll(path.sep, '/'),
    html: path.relative(root, htmlPath).replaceAll(path.sep, '/'),
    prompt: path.relative(root, promptPath).replaceAll(path.sep, '/')
  }, null, 2));
}

main().catch((error) => {
  console.error('[level50-pdf] failed');
  console.error(error);
  process.exitCode = 1;
});
