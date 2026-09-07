const keys = ['OTHER MODES', 'CHANGE SHIP', 'SELECTED SHIP', 'Survive the swarm. Defeat bosses. Choose powerful upgrades.'];
const values = {
  en: keys,
  de: ['ANDERE MODI', 'SCHIFF WECHSELN', 'GEWÄHLTES SCHIFF', 'Überlebe den Schwarm. Besiege Bosse. Wähle mächtige Upgrades.'],
  es: ['OTROS MODOS', 'CAMBIAR NAVE', 'NAVE SELECCIONADA', 'Sobrevive al enjambre. Derrota a los jefes. Elige mejoras poderosas.'],
  ru: ['ДРУГИЕ РЕЖИМЫ', 'СМЕНИТЬ КОРАБЛЬ', 'ВЫБРАННЫЙ КОРАБЛЬ', 'Выживи среди роя. Победи боссов. Выбирай мощные улучшения.'],
  'zh-CN': ['其他模式', '更换飞船', '已选飞船', '在虫群中生存。击败首领。选择强力升级。'],
  'pt-BR': ['OUTROS MODOS', 'TROCAR NAVE', 'NAVE SELECIONADA', 'Sobreviva ao enxame. Derrote chefes. Escolha melhorias poderosas.'],
  ko: ['다른 모드', '기체 변경', '선택한 기체', '군단 속에서 살아남으세요. 보스를 쓰러뜨리고 강력한 업그레이드를 선택하세요.'],
  ja: ['その他のモード', '機体を変更', '選択中の機体', '群れを生き延び、ボスを倒し、強力なアップグレードを選ぼう。']
};
export function getLaunchHomeSourceText(locale) { return Object.fromEntries(keys.map((key,i)=>[key,(values[locale]||values.en)[i]])); }
