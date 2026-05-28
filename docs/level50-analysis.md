# Level 50 Analysis Automation

Run:

```bash
npm run test:level50-analysis
```

The command launches the local browser runtime through Vite preview, starts isolated unranked debug runs, samples levels through Level 50, models beginner/average/skilled player profiles, and writes:

- `test-results/level50-analysis-report.md`
- `test-results/level50-analysis-telemetry.json`
- `test-results/implementation-audit-report.md`
- `test-results/implementation-audit.json`

This is automated evidence, not human playtesting. The harness uses seeded randomness, isolated localStorage, and the existing `NOVA_DEBUG_2026` unranked route so it cannot submit scores, unlock Steam achievements, change Steamworks settings, or tune production balance. It is meant to reveal runtime reachability, pacing pressure, feature wiring, stale claims, and regression risks.

Useful full pass:

```bash
npm run build
npm run smoke
npm run test:level50-analysis
npm run report:level50-pdf
```

On Windows, double-click `Generate-Level50-Report-PDF.cmd` from the repo root to build, run the Level 50 analysis, render `test-results/level50-analysis-summary.pdf`, write `test-results/level50-improvement-codex-prompt.md`, and open the PDF automatically.
