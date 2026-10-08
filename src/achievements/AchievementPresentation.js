import { ACHIEVEMENT_MODE_NAMES } from './AchievementCatalog.js';
import { translateTextForLocale } from '../i18n/index.js';

export function getAchievementDescriptionForLocale(achievement, locale) {
  if (!achievement) return '';
  const source = String(achievement.description || '');
  if (/\bModes:/u.test(source)) return translateTextForLocale(locale, source);
  const requirement = translateTextForLocale(locale, source);
  const names = modes => modes.map(mode => translateTextForLocale(locale, ACHIEVEMENT_MODE_NAMES[mode] || mode)).join(', ');
  const progress = achievement.progressModes || achievement.allowedModes || [];
  const complete = achievement.completeModes || progress;
  if (progress.join('|') === complete.join('|')) {
    return `${requirement} ${translateTextForLocale(locale, 'Modes: {modes}', { modes: names(complete) })}.`;
  }
  return `${requirement} ${translateTextForLocale(locale, 'Progress counts in: {modes}', { modes: names(progress) })}. ${translateTextForLocale(locale, 'Complete in: {modes}', { modes: names(complete) })}.`;
}
