const ENTRIES = Object.freeze({
  de: {
    CLEARS: 'ABSCHLÜSSE',
    'SHIP DOWN': 'SCHIFF VERLOREN',
    'HOSTILE FIRE': 'FEINDFEUER',
    'ENEMY CONTACT': 'FEINDKONTAKT',
    'HAZARD IMPACT': 'GEFAHRENTREFFER',
    'CORE HIT': 'KERNTREFFER',
    'FINAL HIT: {cause}': 'LETZTER TREFFER: {cause}',
    'PRESS A / ANY KEY / CLICK TO CONTINUE': 'A / TASTE / KLICK ZUM FORTFAHREN',
    'ARROWS: SHIP | ENTER: LAUNCH | X: DETAILS | R: RANDOM | ESC: BACK': 'PFEILE: SCHIFF | ENTER: START | X: DETAILS | R: ZUFALL | ESC: ZURÜCK',
    'STICK: SHIP | A: LAUNCH | X: DETAILS | Y: RANDOM | B: BACK': 'STICK: SCHIFF | A: START | X: DETAILS | Y: ZUFALL | B: ZURÜCK',
    'SECTOR {sector} | HOSTILES {hostiles} | THREATS {threats}': 'SEKTOR {sector} | GEGNER {hostiles} | GEFAHREN {threats}'
  },
  es: {
    CLEARS: 'VICTORIAS',
    'SHIP DOWN': 'NAVE PERDIDA',
    'HOSTILE FIRE': 'FUEGO HOSTIL',
    'ENEMY CONTACT': 'CONTACTO ENEMIGO',
    'HAZARD IMPACT': 'IMPACTO DE PELIGRO',
    'CORE HIT': 'IMPACTO AL NÚCLEO',
    'FINAL HIT: {cause}': 'IMPACTO FINAL: {cause}',
    'PRESS A / ANY KEY / CLICK TO CONTINUE': 'PULSA A / UNA TECLA / CLIC PARA CONTINUAR',
    'ARROWS: SHIP | ENTER: LAUNCH | X: DETAILS | R: RANDOM | ESC: BACK': 'FLECHAS: NAVE | ENTER: INICIAR | X: DETALLES | R: AZAR | ESC: ATRÁS',
    'STICK: SHIP | A: LAUNCH | X: DETAILS | Y: RANDOM | B: BACK': 'STICK: NAVE | A: INICIAR | X: DETALLES | Y: AZAR | B: ATRÁS',
    'SECTOR {sector} | HOSTILES {hostiles} | THREATS {threats}': 'SECTOR {sector} | ENEMIGOS {hostiles} | AMENAZAS {threats}'
  },
  ru: {
    CLEARS: 'ЗАЧИСТКИ',
    'SHIP DOWN': 'КОРАБЛЬ ПОТЕРЯН',
    'HOSTILE FIRE': 'ВРАЖЕСКИЙ ОГОНЬ',
    'ENEMY CONTACT': 'СТОЛКНОВЕНИЕ С ВРАГОМ',
    'HAZARD IMPACT': 'УДАР ОПАСНОСТИ',
    'CORE HIT': 'УДАР ПО ЯДРУ',
    'FINAL HIT: {cause}': 'ПОСЛЕДНИЙ УДАР: {cause}',
    'PRESS A / ANY KEY / CLICK TO CONTINUE': 'A / ЛЮБАЯ КЛАВИША / КЛИК — ПРОДОЛЖИТЬ',
    'ARROWS: SHIP | ENTER: LAUNCH | X: DETAILS | R: RANDOM | ESC: BACK': 'СТРЕЛКИ: КОРАБЛЬ | ENTER: СТАРТ | X: ДЕТАЛИ | R: СЛУЧАЙНО | ESC: НАЗАД',
    'STICK: SHIP | A: LAUNCH | X: DETAILS | Y: RANDOM | B: BACK': 'СТИК: КОРАБЛЬ | A: СТАРТ | X: ДЕТАЛИ | Y: СЛУЧАЙНО | B: НАЗАД',
    'SECTOR {sector} | HOSTILES {hostiles} | THREATS {threats}': 'СЕКТОР {sector} | ВРАГИ {hostiles} | УГРОЗЫ {threats}'
  },
  'zh-CN': {
    CLEARS: '通关',
    'SHIP DOWN': '飞船损毁',
    'HOSTILE FIRE': '敌方火力',
    'ENEMY CONTACT': '敌舰撞击',
    'HAZARD IMPACT': '危险撞击',
    'CORE HIT': '核心受击',
    'FINAL HIT: {cause}': '最终一击：{cause}',
    'PRESS A / ANY KEY / CLICK TO CONTINUE': '按 A / 任意键 / 点击继续',
    'ARROWS: SHIP | ENTER: LAUNCH | X: DETAILS | R: RANDOM | ESC: BACK': '方向键：飞船 | ENTER：出击 | X：详情 | R：随机 | ESC：返回',
    'STICK: SHIP | A: LAUNCH | X: DETAILS | Y: RANDOM | B: BACK': '摇杆：飞船 | A：出击 | X：详情 | Y：随机 | B：返回',
    'SECTOR {sector} | HOSTILES {hostiles} | THREATS {threats}': '区域 {sector} | 敌机 {hostiles} | 威胁 {threats}'
  },
  'pt-BR': {
    CLEARS: 'CONCLUSÕES',
    'SHIP DOWN': 'NAVE PERDIDA',
    'HOSTILE FIRE': 'FOGO HOSTIL',
    'ENEMY CONTACT': 'CONTATO INIMIGO',
    'HAZARD IMPACT': 'IMPACTO DE PERIGO',
    'CORE HIT': 'IMPACTO NO NÚCLEO',
    'FINAL HIT: {cause}': 'IMPACTO FINAL: {cause}',
    'PRESS A / ANY KEY / CLICK TO CONTINUE': 'APERTE A / QUALQUER TECLA / CLIQUE PARA CONTINUAR',
    'ARROWS: SHIP | ENTER: LAUNCH | X: DETAILS | R: RANDOM | ESC: BACK': 'SETAS: NAVE | ENTER: INICIAR | X: DETALHES | R: ALEATÓRIA | ESC: VOLTAR',
    'STICK: SHIP | A: LAUNCH | X: DETAILS | Y: RANDOM | B: BACK': 'ANALÓGICO: NAVE | A: INICIAR | X: DETALHES | Y: ALEATÓRIA | B: VOLTAR',
    'SECTOR {sector} | HOSTILES {hostiles} | THREATS {threats}': 'SETOR {sector} | INIMIGOS {hostiles} | AMEAÇAS {threats}'
  },
  ko: {
    CLEARS: '클리어',
    'SHIP DOWN': '함선 격추',
    'HOSTILE FIRE': '적의 포격',
    'ENEMY CONTACT': '적기 충돌',
    'HAZARD IMPACT': '위험물 충돌',
    'CORE HIT': '코어 피격',
    'FINAL HIT: {cause}': '최종 피격: {cause}',
    'PRESS A / ANY KEY / CLICK TO CONTINUE': 'A / 아무 키 / 클릭으로 계속',
    'ARROWS: SHIP | ENTER: LAUNCH | X: DETAILS | R: RANDOM | ESC: BACK': '방향키: 함선 | ENTER: 출격 | X: 상세 | R: 무작위 | ESC: 뒤로',
    'STICK: SHIP | A: LAUNCH | X: DETAILS | Y: RANDOM | B: BACK': '스틱: 함선 | A: 출격 | X: 상세 | Y: 무작위 | B: 뒤로',
    'SECTOR {sector} | HOSTILES {hostiles} | THREATS {threats}': '섹터 {sector} | 적기 {hostiles} | 위협 {threats}'
  },
  ja: {
    CLEARS: 'クリア',
    'SHIP DOWN': '機体撃墜',
    'HOSTILE FIRE': '敵の砲火',
    'ENEMY CONTACT': '敵機接触',
    'HAZARD IMPACT': '危険物衝突',
    'CORE HIT': 'コア被弾',
    'FINAL HIT: {cause}': '最後の一撃：{cause}',
    'PRESS A / ANY KEY / CLICK TO CONTINUE': 'A / 任意のキー / クリックで続行',
    'ARROWS: SHIP | ENTER: LAUNCH | X: DETAILS | R: RANDOM | ESC: BACK': '矢印：機体 | ENTER：出撃 | X：詳細 | R：ランダム | ESC：戻る',
    'STICK: SHIP | A: LAUNCH | X: DETAILS | Y: RANDOM | B: BACK': 'スティック：機体 | A：出撃 | X：詳細 | Y：ランダム | B：戻る',
    'SECTOR {sector} | HOSTILES {hostiles} | THREATS {threats}': 'セクター {sector} | 敵機 {hostiles} | 脅威 {threats}'
  }
});

export function getSecondPolishSourceText(locale) {
  return ENTRIES[locale] || {};
}

