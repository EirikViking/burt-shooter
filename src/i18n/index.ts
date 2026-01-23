import { nb } from './nb';
import { en } from './en';

type Lang = 'nb' | 'en';
type Dict = Record<string, string>;

const STORAGE_KEY = 'burt.lang';
const dictionaries: Record<Lang, Dict> = { nb, en };
const listeners = new Set<(lang: Lang) => void>();

let currentLanguage: Lang = detectInitialLanguage();

if (typeof document !== 'undefined') {
  document.documentElement.lang = currentLanguage;
}

function detectInitialLanguage(): Lang {
  const stored = readStoredLanguage();
  if (stored) return stored;

  if (typeof navigator !== 'undefined') {
    const langs = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language];
    for (const lang of langs) {
      const normalized = (lang || '').toLowerCase();
      if (normalized.startsWith('nb') || normalized.startsWith('nn') || normalized.startsWith('no')) {
        return 'nb';
      }
    }
  }

  return 'en';
}

function readStoredLanguage(): Lang | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'nb' || stored === 'en') return stored;
  } catch {
    return null;
  }
  return null;
}

function notify() {
  for (const listener of listeners) {
    listener(currentLanguage);
  }
}

export function getLanguage(): Lang {
  return currentLanguage;
}

export function setLanguage(lang: Lang, options: { persist?: boolean } = {}) {
  const next = lang === 'nb' || lang === 'en' ? lang : 'en';
  if (next === currentLanguage) return;
  currentLanguage = next;

  if (options.persist !== false && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, currentLanguage);
    } catch {
      // ignore storage failures
    }
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLanguage;
  }

  notify();
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[currentLanguage] || dictionaries.nb;
  const fallback = dictionaries.nb || {};
  let value = dict[key] ?? fallback[key] ?? key;
  if (params) {
    value = value.replace(/\{(\w+)\}/g, (_, name) => {
      const replacement = params[name];
      return replacement === undefined || replacement === null ? '' : String(replacement);
    });
  }
  return value;
}

export function onLanguageChange(listener: (lang: Lang) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
