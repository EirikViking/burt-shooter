const COPY = Object.freeze({
  de: Object.freeze({
    Wonders: 'Wunder',
    'Cabinet Wonder': 'Cabinet-Wunder',
    'Observed Phenomenon': 'Beobachtetes Phänomen'
  }),
  es: Object.freeze({
    Wonders: 'Maravillas',
    'Cabinet Wonder': 'Maravilla del Cabinet',
    'Observed Phenomenon': 'Fenómeno observado'
  }),
  ru: Object.freeze({
    Wonders: 'Чудеса',
    'Cabinet Wonder': 'Чудо Cabinet',
    'Observed Phenomenon': 'Наблюдаемое явление'
  }),
  'pt-BR': Object.freeze({
    Wonders: 'Maravilhas',
    'Cabinet Wonder': 'Maravilha do Cabinet',
    'Observed Phenomenon': 'Fenômeno observado'
  }),
  'zh-CN': Object.freeze({
    Wonders: '奇观',
    'Cabinet Wonder': 'Cabinet奇观',
    'Observed Phenomenon': '已观测现象'
  }),
  ko: Object.freeze({
    Wonders: '경이',
    'Cabinet Wonder': 'Cabinet 경이',
    'Observed Phenomenon': '관측된 현상'
  }),
  ja: Object.freeze({
    Wonders: 'ワンダー',
    'Cabinet Wonder': 'Cabinetワンダー',
    'Observed Phenomenon': '観測現象'
  })
});

export function getWonderCodexSourceText(locale = 'en') {
  return COPY[locale] || Object.freeze({});
}
