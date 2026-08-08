const ENTRIES = Object.freeze({
  de: {
    'Fire Input': 'Feuermodus',
    HOLD: 'HALTEN',
    TOGGLE: 'UMSCHALTEN',
    'Mouse Steering': 'Maussteuerung',
    'AUTO FIRE ON': 'DAUERFEUER AN',
    'Hold fire, or enable Toggle in Settings. Mouse Steering follows the pointer; controller fire always stays hold.': 'Halte Feuer gedrueckt oder aktiviere Umschalten in den Einstellungen. Die Maussteuerung folgt dem Zeiger; Controller-Feuer bleibt immer Halten.'
  },
  es: {
    'Fire Input': 'Entrada de disparo',
    HOLD: 'MANTENER',
    TOGGLE: 'ALTERNAR',
    'Mouse Steering': 'Control con raton',
    'AUTO FIRE ON': 'DISPARO AUTOMATICO ACTIVO',
    'Hold fire, or enable Toggle in Settings. Mouse Steering follows the pointer; controller fire always stays hold.': 'Manten pulsado para disparar o activa Alternar en Ajustes. El control con raton sigue el puntero; el mando siempre usa mantener.'
  },
  ru: {
    'Fire Input': 'Режим огня',
    HOLD: 'УДЕРЖАНИЕ',
    TOGGLE: 'ПЕРЕКЛЮЧЕНИЕ',
    'Mouse Steering': 'Управление мышью',
    'AUTO FIRE ON': 'АВТООГОНЬ ВКЛ',
    'Hold fire, or enable Toggle in Settings. Mouse Steering follows the pointer; controller fire always stays hold.': 'Удерживай огонь или включи переключение в настройках. Управление мышью следует за указателем; огонь с геймпада всегда работает удержанием.'
  },
  'zh-CN': {
    'Fire Input': '开火输入',
    HOLD: '按住',
    TOGGLE: '切换',
    'Mouse Steering': '鼠标操控',
    'AUTO FIRE ON': '自动开火已开启',
    'Hold fire, or enable Toggle in Settings. Mouse Steering follows the pointer; controller fire always stays hold.': '按住即可开火，或在设置中启用切换模式。鼠标操控会跟随指针；手柄开火始终为按住。'
  },
  'pt-BR': {
    'Fire Input': 'Entrada de tiro',
    HOLD: 'SEGURAR',
    TOGGLE: 'ALTERNAR',
    'Mouse Steering': 'Controle pelo mouse',
    'AUTO FIRE ON': 'TIRO AUTOMATICO ATIVO',
    'Hold fire, or enable Toggle in Settings. Mouse Steering follows the pointer; controller fire always stays hold.': 'Segure para atirar ou ative Alternar nas Configuracoes. O controle pelo mouse segue o ponteiro; o controle sempre usa segurar.'
  },
  ko: {
    'Fire Input': '발사 입력',
    HOLD: '누르기',
    TOGGLE: '전환',
    'Mouse Steering': '마우스 조종',
    'AUTO FIRE ON': '자동 발사 켜짐',
    'Hold fire, or enable Toggle in Settings. Mouse Steering follows the pointer; controller fire always stays hold.': '발사를 누르고 있거나 설정에서 전환을 켜세요. 마우스 조종은 포인터를 따라가며, 컨트롤러 발사는 항상 누르기 방식입니다.'
  },
  ja: {
    'Fire Input': '射撃入力',
    HOLD: '長押し',
    TOGGLE: '切り替え',
    'Mouse Steering': 'マウス操縦',
    'AUTO FIRE ON': '自動射撃オン',
    'Hold fire, or enable Toggle in Settings. Mouse Steering follows the pointer; controller fire always stays hold.': '射撃を長押しするか、設定で切り替えを有効にします。マウス操縦はポインターを追従し、コントローラー射撃は常に長押しです。'
  }
});

export function getNewestTyrianFeedbackSourceText(locale) {
  return ENTRIES[locale] || {};
}
