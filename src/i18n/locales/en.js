import { getMysterySourceText } from '../mysteryText.js';
import {getDiscoveryText} from '../discoveryText.js';
import { getTractorFleetSourceText } from '../tractorFleetText.js';
import { getMenuAudioSourceText } from '../menuAudioText.js';
import { getActivePilotingText } from '../activePilotingText.js';
import { getLaunchHomeSourceText } from '../launchHomeText.js';
import { getShipTraitSummarySourceText } from "../shipTraitSummaryText.js";
import { getBonusCoreSourceText } from '../bonusCoreText.js';
import { getBonusDroneSourceText } from '../bonusDroneText.js';
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
  sourceText: Object.freeze({ "TEST FLIGHT · SECTOR {sector} · CHOOSE ANY SHIP": "TEST FLIGHT · SECTOR {sector} · CHOOSE ANY SHIP", ...getMysterySourceText('en'), ...getDiscoveryText('en'), ...getTractorFleetSourceText('en'), ...getMenuAudioSourceText('en'), ...getActivePilotingText('en'), ...getLaunchHomeSourceText('en'), ...getShipTraitSummarySourceText("en"), ...getBonusCoreSourceText('en'), ...getBonusDroneSourceText('en'), ...getCoreSerpentSourceText('en'), ...getAstraPresentationSourceText('en'),}),
  patterns: Object.freeze([])
};
