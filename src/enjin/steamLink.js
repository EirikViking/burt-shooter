import { trackEnjinEvent } from './api.js';

const STEAM_BASE_URL = 'https://store.steampowered.com/app/4765070/';

export function getSteamUrl(placement = 'vault_complete') {
  const url = new URL(STEAM_BASE_URL);
  url.search = new URLSearchParams({
    utm_source: 'tinyfoundry',
    utm_medium: 'enjin_web3_arcade',
    utm_campaign: 'eirik_viking_vault',
    utm_content: placement
  }).toString();
  return url.toString();
}

export function openSteam(placement = 'vault_complete') {
  trackEnjinEvent('steam_cta_click', placement);
  const url = getSteamUrl(placement);
  window.open(url, '_blank', 'noopener,noreferrer');
  return url;
}

export { STEAM_BASE_URL };
