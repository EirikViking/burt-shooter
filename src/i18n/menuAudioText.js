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
const launchTips = {
  en: 'Crew too chatty? Engines too loud? Tame sounds and voices in Settings. The swarm has no mute button.',
  de: 'Crew zu gesprächig? Triebwerke zu laut? Zähme Geräusche und Stimmen in den Einstellungen. Der Schwarm hat leider keine Stummtaste.',
  es: '¿Tripulación parlanchina? ¿Motores ruidosos? Ajusta sonidos y voces en Ajustes. El enjambre no tiene botón de silencio.',
  'pt-BR': 'Tripulação tagarela? Motores barulhentos? Ajuste sons e vozes nas Configurações. O enxame não tem botão de silenciar.',
  ru: 'Экипаж болтает? Двигатели ревут? Укротите звуки и голоса в настройках. У роя кнопки отключения звука нет.',
  ja: 'おしゃべりな乗組員？うるさいエンジン？効果音とボイスは設定で調整できます。敵の大群にはミュートボタンがありません。',
  ko: '승무원이 수다스럽나요? 엔진이 시끄럽나요? 설정에서 소리와 음성을 조절하세요. 적 무리에는 음소거 버튼이 없답니다.',
  'zh-CN': '船员太话痨？引擎太吵？在设置中调节音效和语音。可惜敌群没有静音键。'
};
export const getMenuAudioSourceText = locale => ({
  'MENU VOICES': labels[locale], 'MENU AUDIO': modeLabels[locale][0], 'AMBIENCE': modeLabels[locale][1],
  'Crew too chatty? Engines too loud? Tame sounds and voices in Settings. The swarm has no mute button.': launchTips[locale]
});
