const labels = Object.freeze({
  en: 'MENU VOICES', de: 'MENÜSTIMMEN', es: 'VOCES DEL MENÚ',
  ru: 'ГОЛОСА В МЕНЮ', ja: 'メニューの音声', ko: '메뉴 음성',
  'pt-BR': 'VOZES DO MENU', 'zh-CN': '菜单语音'
});
const modeLabels = {
  en: ['MENU AUDIO', 'AMBIENCE'], de: ['MENÜAUDIO', 'ATMOSPHÄRE'],
  es: ['AUDIO DEL MENÚ', 'AMBIENTE'], 'pt-BR': ['ÁUDIO DO MENU', 'AMBIENTE'],
  ru: ['ЗВУК В МЕНЮ', 'АТМОСФЕРА'], 'zh-CN': ['菜单音频', '环境音'],
  ja: ['メニューの音', '環境音'], ko: ['메뉴 오디오', '환경음']
};
export const getMenuAudioSourceText = locale => ({
  'MENU VOICES': labels[locale], 'MENU AUDIO': modeLabels[locale][0], 'AMBIENCE': modeLabels[locale][1]
});
