const labels = Object.freeze({
  en: 'MENU VOICES', de: 'MENÜSTIMMEN', es: 'VOCES DEL MENÚ',
  ru: 'ГОЛОСА В МЕНЮ', ja: 'メニューの音声', ko: '메뉴 음성',
  'pt-BR': 'VOZES DO MENU', 'zh-CN': '菜单语音'
});
export const getMenuAudioSourceText = locale => ({ 'MENU VOICES': labels[locale] });
