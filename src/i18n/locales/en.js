import { getBonusCoreSourceText } from '../bonusCoreText.js';
import { getCoreSerpentSourceText } from '../coreSerpentText.js';
import { getAstraPresentationSourceText } from '../astraPresentationSourceText.js';
export const en = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  settings: {
    language: {
      label: 'Language',
      system: 'System default',
      en: 'English',
      de: 'Deutsch',
      es: 'Español',
      ru: 'Русский',
      zhCN: '简体中文',
      ptBR: 'Português do Brasil',
      ko: '한국어',
      ja: '日本語',
      systemHint: 'Steam/system',
      manualHint: 'Saved choice'
    }
  },
  diagnostics: {
    interfaceLanguage: 'Interface language'
  },
  sourceText: Object.freeze({ ...getBonusCoreSourceText('en'), ...getCoreSerpentSourceText('en'), ...getAstraPresentationSourceText('en'),}),
  patterns: Object.freeze([])
};
