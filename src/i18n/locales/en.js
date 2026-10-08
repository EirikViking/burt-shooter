import { getGameOverQualitySourceText } from '../gameOverQualityText.js';
import { getFirstLightSourceText } from '../firstLightText.js';
import { getOnslaughtText } from '../onslaughtText.js';
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
  history: { unknownMode: "Mode unknown", sectorUnrecorded: "SECTOR NOT RECORDED", sectorUnrecordedHint: "Older Steam entries did not save sector details." },
  recovery: {storageHelp:"Saving failed. Keep the game open and free disk space or restore access to the save folder. Saving retries automatically. Restart is unavailable until saving succeeds.","title":"Game paused after a problem","help":"If graphics recover, return to the pause menu. Restart ends the unfinished flight; previously saved progress is kept. If this happens again, include the build and recovery/recovery-latest.json in your report.","resume":"Return to pause menu","restart":"Restart game"},
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
  sourceText: Object.freeze({ ...getFirstLightSourceText('en'), ...getOnslaughtText('en'), "Steam: Upload pending":"Steam: Upload pending","Steam: Upload not confirmed":"Steam: Upload not confirmed", "TEST FLIGHT · SECTOR {sector} · CHOOSE ANY SHIP": "TEST FLIGHT · SECTOR {sector} · CHOOSE ANY SHIP", ...getMysterySourceText('en'), ...getDiscoveryText('en'), ...getTractorFleetSourceText('en'), ...getMenuAudioSourceText('en'), ...getActivePilotingText('en'), ...getLaunchHomeSourceText('en'), ...getShipTraitSummarySourceText("en"), ...getBonusCoreSourceText('en'), ...getBonusDroneSourceText('en'), ...getCoreSerpentSourceText('en'), ...getAstraPresentationSourceText('en'), ...getGameOverQualitySourceText('en') }),
  patterns: Object.freeze([])
};
