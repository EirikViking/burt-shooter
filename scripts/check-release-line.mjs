import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const errors = [];

function rel(path) {
  return relative(root, path).replace(/\\/g, '/');
}

function requireFile(path, description = rel(path)) {
  if (!existsSync(path)) errors.push(`Missing ${description}: ${rel(path)}`);
}

function requireText(path, patterns) {
  requireFile(path);
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const [pattern, description] of patterns) {
    if (!pattern.test(text)) errors.push(`Missing ${description} in ${rel(path)}`);
  }
}

for (const locale of ['en', 'de', 'zh-CN', 'ru', 'es', 'pt-BR', 'ko', 'ja']) {
  requireFile(resolve(root, 'src', 'i18n', 'locales', `${locale}.js`), `${locale} locale`);
}

requireFile(resolve(root, 'AGENTS.md'), 'project agent instructions');
requireFile(resolve(root, 'src', 'achievements', 'AchievementCatalog.js'), 'achievement catalog');
requireFile(resolve(root, 'src', 'achievements', 'AchievementManager.js'), 'achievement manager');
requireFile(resolve(root, 'src', 'scenes', 'AchievementsScene.js'), 'achievements scene');
requireFile(resolve(root, 'electron', 'steamCloudSave.cjs'), 'Steam Cloud save system');

requireText(resolve(root, 'electron', 'main.cjs'), [
  [/shouldStartFullscreen/, 'fullscreen launch guard'],
  [/fullscreen:\s*shouldStartFullscreen/, 'fullscreen BrowserWindow option'],
  [/isWindowed/, 'explicit windowed diagnostic escape hatch'],
  [/createSteamCloudSave/, 'Steam Cloud save initialization']
]);

requireText(resolve(root, 'src', 'scenes', 'PlayScene.js'), [
  [/spawnMarketingDebugWave/, 'marketing wave hotkey'],
  [/spawnMarketingDebugMiniBoss/, 'marketing miniboss hotkey'],
  [/spawnMarketingDebugBoss/, 'marketing boss hotkey']
]);

requireText(resolve(root, 'src', 'managers', 'EnemyManager.js'), [
  [/marketingDebugMode/, 'marketing debug spawn mode'],
  [/spawnMarketingDebugBoss/, 'marketing boss spawn implementation']
]);

requireText(resolve(root, 'scripts', 'check-i18n.mjs'), [
  [/marketing hotkey marker/, 'i18n guard for marketing hotkeys']
]);

if (errors.length) {
  console.error('[release-line] FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[release-line] PASS latest localization, achievements, Steam Cloud, fullscreen, and marketing hotkey markers present');
