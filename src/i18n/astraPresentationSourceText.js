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
export const getAstraPresentationSourceText = locale => ({ 'DRAG TO ROTATE': labels[locale] || labels.en });
