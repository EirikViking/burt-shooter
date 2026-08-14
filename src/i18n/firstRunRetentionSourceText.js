const ENTRIES = Object.freeze({
  de: {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': 'BEWEGEN — WASD / PFEILE  •  SCHIESSEN — LEERTASTE',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': 'BEWEGEN — STICK / D-PAD  •  SCHIESSEN — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': 'PHASE — SHIFT  •  FOKUS — STRG',
    'PHASE — B / LB  •  FOCUS — LT': 'PHASE — B / LB  •  FOKUS — LT',
    'FIRST FLIGHT COMPLETE': 'ERSTER EINSATZ ABGESCHLOSSEN',
    'VIEW DETAILS': 'DETAILS ANZEIGEN',
    'NEXT TRY': 'NÄCHSTER VERSUCH',
    'SHIP UNLOCKED': 'SCHIFF FREIGESCHALTET',
    'A: PLAY AGAIN': 'A: NOCH EIN RUN',
    'V / Y': 'V / Y'
  },
  es: {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': 'MOVER — WASD / FLECHAS  •  DISPARAR — ESPACIO',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': 'MOVER — STICK / CRUCETA  •  DISPARAR — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': 'FASE — SHIFT  •  ENFOQUE — CTRL',
    'PHASE — B / LB  •  FOCUS — LT': 'FASE — B / LB  •  ENFOQUE — LT',
    'FIRST FLIGHT COMPLETE': 'PRIMER VUELO COMPLETADO',
    'VIEW DETAILS': 'VER DETALLES',
    'NEXT TRY': 'SIGUIENTE INTENTO',
    'SHIP UNLOCKED': 'NAVE DESBLOQUEADA',
    'A: PLAY AGAIN': 'A: JUGAR DE NUEVO',
    'V / Y': 'V / Y'
  },
  ru: {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': 'ДВИЖЕНИЕ — WASD / СТРЕЛКИ  •  ОГОНЬ — ПРОБЕЛ',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': 'ДВИЖЕНИЕ — СТИК / D-PAD  •  ОГОНЬ — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': 'ФАЗА — SHIFT  •  ФОКУС — CTRL',
    'PHASE — B / LB  •  FOCUS — LT': 'ФАЗА — B / LB  •  ФОКУС — LT',
    'FIRST FLIGHT COMPLETE': 'ПЕРВЫЙ ВЫЛЕТ ЗАВЕРШЕН',
    'VIEW DETAILS': 'ПОДРОБНОСТИ',
    'NEXT TRY': 'СЛЕДУЮЩАЯ ПОПЫТКА',
    'SHIP UNLOCKED': 'КОРАБЛЬ ОТКРЫТ',
    'A: PLAY AGAIN': 'A: ЕЩЕ РАЗ',
    'V / Y': 'V / Y'
  },
  'zh-CN': {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': '移动 — WASD / 方向键  •  射击 — 空格',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': '移动 — 摇杆 / D-PAD  •  射击 — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': '相位 — SHIFT  •  专注 — CTRL',
    'PHASE — B / LB  •  FOCUS — LT': '相位 — B / LB  •  专注 — LT',
    'FIRST FLIGHT COMPLETE': '首次飞行完成',
    'VIEW DETAILS': '查看详情',
    'NEXT TRY': '下次尝试',
    'SHIP UNLOCKED': '飞船已解锁',
    'A: PLAY AGAIN': 'A：再来一次',
    'V / Y': 'V / Y'
  },
  'pt-BR': {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': 'MOVER — WASD / SETAS  •  ATIRAR — ESPAÇO',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': 'MOVER — ANALÓGICO / D-PAD  •  ATIRAR — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': 'FASE — SHIFT  •  FOCO — CTRL',
    'PHASE — B / LB  •  FOCUS — LT': 'FASE — B / LB  •  FOCO — LT',
    'FIRST FLIGHT COMPLETE': 'PRIMEIRO VOO CONCLUÍDO',
    'VIEW DETAILS': 'VER DETALHES',
    'NEXT TRY': 'PRÓXIMA TENTATIVA',
    'SHIP UNLOCKED': 'NAVE DESBLOQUEADA',
    'A: PLAY AGAIN': 'A: JOGAR DE NOVO',
    'V / Y': 'V / Y'
  },
  ko: {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': '이동 — WASD / 방향키  •  발사 — SPACE',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': '이동 — 스틱 / D-PAD  •  발사 — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': '위상 — SHIFT  •  집중 — CTRL',
    'PHASE — B / LB  •  FOCUS — LT': '위상 — B / LB  •  집중 — LT',
    'FIRST FLIGHT COMPLETE': '첫 비행 완료',
    'VIEW DETAILS': '상세 보기',
    'NEXT TRY': '다음 시도',
    'SHIP UNLOCKED': '함선 해금',
    'A: PLAY AGAIN': 'A: 다시 플레이',
    'V / Y': 'V / Y'
  },
  ja: {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': '移動 — WASD / 矢印  •  ショット — SPACE',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': '移動 — スティック / D-PAD  •  ショット — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': 'フェーズ — SHIFT  •  フォーカス — CTRL',
    'PHASE — B / LB  •  FOCUS — LT': 'フェーズ — B / LB  •  フォーカス — LT',
    'FIRST FLIGHT COMPLETE': '初出撃完了',
    'VIEW DETAILS': '詳細を見る',
    'NEXT TRY': '次の挑戦',
    'SHIP UNLOCKED': '機体解放',
    'A: PLAY AGAIN': 'A: もう一度',
    'V / Y': 'V / Y'
  }
});

export function getFirstRunRetentionSourceText(locale) {
  return ENTRIES[locale] || {};
}
