const labels = {
  "en": "DRAG TO ROTATE",
  "de": "ZUM DREHEN ZIEHEN",
  "es": "ARRASTRA PARA GIRAR",
  "ru": "ПЕРЕТАЩИТЕ ДЛЯ ВРАЩЕНИЯ",
  "zh-CN": "拖动旋转",
  "pt-BR": "ARRASTE PARA GIRAR",
  "ko": "드래그하여 회전",
  "ja": "ドラッグして回転"
};
const firing = { en: 'FIRING PATTERN', de: 'FEUERMUSTER', es: 'PATRÓN DE DISPARO', ru: 'СХЕМА СТРЕЛЬБЫ', 'zh-CN': '射击模式', 'pt-BR': 'PADRÃO DE DISPARO', ko: '사격 패턴', ja: '射撃パターン' };
export const getAstraPresentationSourceText = locale => ({ 'DRAG TO ROTATE': labels[locale] || labels.en, 'FIRING PATTERN': firing[locale] || firing.en });
