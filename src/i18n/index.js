import { en } from './locales/en.js';
import { de } from './locales/de.js';
import { es } from './locales/es.js';
import { ru } from './locales/ru.js';
import { zhCN } from './locales/zh-CN.js';

export const LANGUAGE_PREFERENCE_KEY = 'novaSwarm.languagePreference.v1';
export const LANGUAGE_CHANGE_EVENT = 'novaSwarm:languageChanged';
export const SYSTEM_LANGUAGE = 'system';

const locales = Object.freeze({ en, de, es, ru, 'zh-CN': zhCN });
const supportedLanguages = Object.freeze(['en', 'de', 'es', 'ru', 'zh-CN']);

let currentLanguage = 'en';
let preferenceMode = SYSTEM_LANGUAGE;
let lastRuntimeInfo = null;
const warnedMissingKeys = new Set();

function hasWindow() {
  return typeof window !== 'undefined';
}

function isDev() {
  return Boolean(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV);
}

function readStoredPreference() {
  if (!hasWindow()) return SYSTEM_LANGUAGE;
  try {
    const stored = window.localStorage?.getItem(LANGUAGE_PREFERENCE_KEY);
    return normalizePreferenceMode(stored);
  } catch {
    return SYSTEM_LANGUAGE;
  }
}

function writeStoredPreference(mode) {
  if (!hasWindow()) return;
  try {
    if (mode === SYSTEM_LANGUAGE) {
      window.localStorage?.removeItem(LANGUAGE_PREFERENCE_KEY);
    } else {
      window.localStorage?.setItem(LANGUAGE_PREFERENCE_KEY, mode);
    }
  } catch {
    // Local storage may be unavailable in restricted browser contexts.
  }
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

async function readSteamRuntimeInfo({ timeoutMs = 900 } = {}) {
  if (!hasWindow()) return null;
  const bridge = window.__novaSteamBridge || window.__novaSteamLeaderboard || null;
  const task = bridge?.getRuntimeInfo?.();
  if (!task || typeof task.then !== 'function') return null;
  try {
    return await Promise.race([
      task.catch(() => null),
      timeout(timeoutMs)
    ]);
  } catch {
    return null;
  }
}

export function getSupportedLanguages() {
  return [...supportedLanguages];
}

export function isSupportedLanguage(value) {
  return supportedLanguages.includes(value);
}

export function normalizeLanguageCode(value) {
  if (value == null) return null;
  const raw = String(value).trim().toLowerCase().replace(/_/g, '-');
  if (!raw) return null;
  if (raw === SYSTEM_LANGUAGE || raw === 'auto') return SYSTEM_LANGUAGE;
  if (raw === 'english' || raw === 'en' || raw.startsWith('en-') || raw === 'eng') return 'en';
  if (raw === 'german' || raw === 'de' || raw.startsWith('de-') || raw === 'deu' || raw === 'ger') return 'de';
  if (raw === 'spanish' || raw === 'spanish-spain' || raw === 'castilian' || raw === 'es' || raw === 'es-es' || raw === 'spa') return 'es';
  if (raw === 'latam' || raw === 'spanish-latin-america' || raw === 'es-419') return 'es';
  if (raw === 'russian' || raw === 'ru' || raw.startsWith('ru-') || raw === 'rus') return 'ru';
  if (
    raw === 'schinese'
    || raw === 'simplified chinese'
    || raw === 'simplified-chinese'
    || raw === 'zh-cn'
    || raw === 'zh-hans'
    || raw === 'zh'
    || raw === 'chi'
    || raw === 'zho'
  ) return 'zh-CN';
  return null;
}

export function normalizePreferenceMode(value) {
  const normalized = normalizeLanguageCode(value);
  if (isSupportedLanguage(normalized)) return normalized;
  return SYSTEM_LANGUAGE;
}

function getRuntimeLanguageCandidates(runtimeInfo = lastRuntimeInfo) {
  const steamEnv = runtimeInfo?.steamEnv || {};
  const candidates = [
    runtimeInfo?.currentGameLanguage,
    runtimeInfo?.steamLanguage,
    steamEnv.SteamLanguage,
    steamEnv.STEAM_LANGUAGE,
    runtimeInfo?.appLocale,
    runtimeInfo?.systemLocale,
    hasWindow() ? window.navigator?.language : null,
    hasWindow() ? window.navigator?.languages?.[0] : null
  ];
  return candidates.filter(Boolean);
}

export function resolveLanguage({
  preference = preferenceMode,
  runtimeInfo = lastRuntimeInfo,
  steamLanguage = null,
  appLocale = null,
  navigatorLanguage = null
} = {}) {
  const manual = normalizeLanguageCode(preference);
  if (isSupportedLanguage(manual)) return manual;

  const candidates = [
    steamLanguage,
    ...getRuntimeLanguageCandidates(runtimeInfo),
    appLocale,
    navigatorLanguage
  ];

  for (const candidate of candidates) {
    const normalized = normalizeLanguageCode(candidate);
    if (isSupportedLanguage(normalized)) return normalized;
  }
  return 'en';
}

function setCurrentLanguage(language, { notify = true, forceNotify = false } = {}) {
  const next = isSupportedLanguage(language) ? language : 'en';
  const previous = currentLanguage;
  currentLanguage = next;
  if (notify && (previous !== next || forceNotify) && hasWindow()) {
    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, {
      detail: {
        previous,
        language: currentLanguage,
        preference: preferenceMode,
        runtimeInfo: lastRuntimeInfo
      }
    }));
  }
  return currentLanguage;
}

export async function initLocalization({ runtimeInfo = null } = {}) {
  preferenceMode = readStoredPreference();
  lastRuntimeInfo = runtimeInfo || await readSteamRuntimeInfo();
  const language = resolveLanguage({ preference: preferenceMode, runtimeInfo: lastRuntimeInfo });
  setCurrentLanguage(language, { notify: false });
  if (hasWindow()) {
    window.__novaI18n = Object.freeze({
      getCurrentLanguage,
      getLanguagePreferenceMode,
      getLastRuntimeInfo: () => lastRuntimeInfo,
      setLanguagePreference
    });
  }
  return {
    language: currentLanguage,
    preference: preferenceMode,
    runtimeInfo: lastRuntimeInfo
  };
}

export async function setLanguagePreference(mode) {
  const previousPreference = preferenceMode;
  const normalized = normalizePreferenceMode(mode);
  preferenceMode = normalized;
  writeStoredPreference(normalized);
  if (normalized === SYSTEM_LANGUAGE) {
    lastRuntimeInfo = await readSteamRuntimeInfo({ timeoutMs: 650 }) || lastRuntimeInfo;
  }
  const language = resolveLanguage({ preference: preferenceMode, runtimeInfo: lastRuntimeInfo });
  return {
    language: setCurrentLanguage(language, { forceNotify: previousPreference !== preferenceMode }),
    preference: preferenceMode,
    runtimeInfo: lastRuntimeInfo
  };
}

export function getCurrentLanguage() {
  return currentLanguage;
}

export function getLanguagePreferenceMode() {
  return preferenceMode;
}

export function getLastRuntimeInfo() {
  return lastRuntimeInfo;
}

export function getLanguageOptions() {
  return [
    { value: SYSTEM_LANGUAGE, label: 'System default', hint: 'Steam/system' },
    { value: 'en', label: 'English', hint: 'Saved choice' },
    { value: 'de', label: 'Deutsch', hint: 'Saved choice' },
    { value: 'es', label: 'Español', hint: 'Saved choice' },
    { value: 'ru', label: 'Русский', hint: 'Saved choice' },
    { value: 'zh-CN', label: '简体中文', hint: 'Saved choice' }
  ];
}

function lookup(locale, key) {
  if (!locale || !key) return undefined;
  return String(key).split('.').reduce((node, part) => (
    node && Object.prototype.hasOwnProperty.call(node, part) ? node[part] : undefined
  ), locale);
}

export function interpolate(template, vars = {}) {
  const text = String(template ?? '');
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key) => (
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : full
  ));
}

export function t(key, vars = {}, { locale = currentLanguage } = {}) {
  const target = locales[locale] || en;
  const fallback = en;
  const value = lookup(target, key) ?? lookup(fallback, key);
  if (value == null) {
    if (isDev() && !warnedMissingKeys.has(key)) {
      warnedMissingKeys.add(key);
      console.warn(`[i18n] Missing key: ${key}`);
    }
    return key;
  }
  return interpolate(value, vars);
}

export function translateTextForLocale(localeCode, source, vars = {}) {
  const sourceText = String(source ?? '');
  if (!sourceText) return sourceText;
  const locale = locales[localeCode] || en;
  if (locale.code === 'en') return interpolate(sourceText, vars);

  const exact = locale.sourceText?.[sourceText];
  if (exact != null) {
    const resolved = typeof exact === 'function' ? exact(vars) : exact;
    return interpolate(resolved, vars);
  }

  if (sourceText.includes('\n')) {
    const translatedLines = sourceText.split('\n').map((line) => translateTextForLocale(localeCode, line, vars));
    const translated = translatedLines.join('\n');
    if (translated !== sourceText) return translated;
  }

  for (const pattern of locale.patterns || []) {
    const match = sourceText.match(pattern.regex);
    if (!match) continue;
    const replacement = pattern.replace(match, {
      translate: (value) => translateTextForLocale(localeCode, value, vars),
      vars
    });
    return interpolate(replacement, vars);
  }

  if (isDev()) {
    const warningKey = `${localeCode}:${sourceText}`;
    if (!warnedMissingKeys.has(warningKey) && /[A-Za-z]{3,}/.test(sourceText)) {
      warnedMissingKeys.add(warningKey);
      console.warn(`[i18n] Missing ${localeCode} text: ${sourceText}`);
    }
  }
  return interpolate(sourceText, vars);
}

export function translateText(source, vars = {}) {
  return translateTextForLocale(currentLanguage, source, vars);
}

export function formatNumber(value) {
  const locale = {
    de: 'de-DE',
    es: 'es-ES',
    ru: 'ru-RU',
    'zh-CN': 'zh-CN'
  }[currentLanguage] || 'en-US';
  return Number(value || 0).toLocaleString(locale);
}

export function onLanguageChange(callback) {
  if (!hasWindow() || typeof callback !== 'function') return () => {};
  const handler = (event) => callback(event.detail || {});
  window.addEventListener(LANGUAGE_CHANGE_EVENT, handler);
  return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handler);
}
