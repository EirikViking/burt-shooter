import { getMenuTipText } from './menuTipText.js';

const labels = Object.freeze({
  en: 'MENU VOICES', de: 'MENÜSTIMMEN', es: 'VOCES DEL MENÚ',
  ru: 'ГОЛОСА В МЕНЮ', ja: 'メニューの音声', ko: '메뉴 음성',
  'pt-BR': 'VOZES DO MENU', 'zh-CN': '菜单语音'
});
const modeLabels = {
  en: ['MENU AUDIO', 'HANGAR TRACK', 'PLAYLIST'], de: ['MENÜAUDIO', 'HANGAR-TITEL', 'PLAYLIST'],
  es: ['AUDIO DEL MENÚ', 'TEMA DEL HANGAR', 'LISTA MUSICAL'], 'pt-BR': ['ÁUDIO DO MENU', 'FAIXA DO HANGAR', 'PLAYLIST'],
  ru: ['ЗВУК В МЕНЮ', 'ТРЕК АНГАРА', 'ПЛЕЙЛИСТ'], 'zh-CN': ['菜单音频', '机库曲目', '播放列表'],
  ja: ['メニューの音', 'ハンガー曲', 'プレイリスト'], ko: ['메뉴 오디오', '격납고 음악', '재생 목록']
};
const legacyLabels = {
  en: 'LEGACY AMBIENCE', de: 'KLASSISCHE ATMOSPHÄRE', es: 'AMBIENTE CLÁSICO',
  'pt-BR': 'AMBIENTE CLÁSSICO', ru: 'ПРЕЖНИЙ ФОН', 'zh-CN': '经典环境音',
  ja: '従来の環境音', ko: '기존 환경음'
};

export const getMenuAudioSourceText = locale => ({
  'MENU VOICES': labels[locale], 'MENU AUDIO': modeLabels[locale][0],
  'HANGAR TRACK': modeLabels[locale][1], 'PLAYLIST': modeLabels[locale][2], 'LEGACY AMBIENCE': legacyLabels[locale],
  ...getMenuTipText(locale)
});
