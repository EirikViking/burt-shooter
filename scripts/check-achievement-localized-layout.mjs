import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const output = process.env.CHECK_OUTPUT_DIR;
if (!output) throw new Error('Set CHECK_OUTPUT_DIR on E:');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const report = { checks: [], errors: [] };
page.on('pageerror', error => report.errors.push(String(error)));
try {
  await page.goto(`${process.env.CHECK_URL}/?skipIntro=1&offlineLeaderboard=1`);
  await page.waitForFunction(() => window.__game && document.body?.dataset.menuReady === '1', null, { timeout: 120000 });
  for (const locale of ['en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']) {
    await page.evaluate(code => window.__novaI18n.setLanguagePreference(code), locale);
    const overflow = await page.evaluate(() => {
      const g = window.__game; g.showAchievements();
      const s = g.scenes.achievements; s.groupFilter = 'all'; s.refreshFilteredRows();
      const failures = [];
      for (const [index, row] of s.rows.entries()) {
        const card = s.createAchievementRow(row, index);
        for (const text of card.children.filter(c => typeof c.text === 'string' && c.style?.wordWrap)) {
          if (text.x + text.width > s.rowWidth - 10) failures.push({ id: row.achievement.id, width: text.width, available: s.rowWidth - 10 - text.x });
        }
        card.destroy({ children: true });
      }
      return failures;
    });
    report.checks.push({ locale, overflow });
    assert.deepEqual(overflow, [], `${locale}: achievement descriptions must fit their card`);
  }
  assert.deepEqual(report.errors, []);
  console.log('[achievement-localized-layout] PASS all100 cards in8 locales at1280x720');
} finally {
  writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
