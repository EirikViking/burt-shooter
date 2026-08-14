const ENTRIES = Object.freeze({
  de: {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': 'BEWEGEN — WASD / PFEILE  •  SCHIESSEN — LEERTASTE',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': 'BEWEGEN — STICK / D-PAD  •  SCHIESSEN — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': 'PHASE — SHIFT  •  FOKUS — STRG',
    'PHASE — B / LB  •  FOCUS — LT': 'PHASE — B / LB  •  FOKUS — LT'
  },
  es: {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': 'MOVER — WASD / FLECHAS  •  DISPARAR — ESPACIO',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': 'MOVER — STICK / CRUCETA  •  DISPARAR — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': 'FASE — SHIFT  •  ENFOQUE — CTRL',
    'PHASE — B / LB  •  FOCUS — LT': 'FASE — B / LB  •  ENFOQUE — LT'
  },
  ru: {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': 'ДВИЖЕНИЕ — WASD / СТРЕЛКИ  •  ОГОНЬ — ПРОБЕЛ',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': 'ДВИЖЕНИЕ — СТИК / D-PAD  •  ОГОНЬ — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': 'ФАЗА — SHIFT  •  ФОКУС — CTRL',
    'PHASE — B / LB  •  FOCUS — LT': 'ФАЗА — B / LB  •  ФОКУС — LT'
  },
  'zh-CN': {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': '移动 — WASD / 方向键  •  射击 — 空格',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': '移动 — 摇杆 / D-PAD  •  射击 — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': '相位 — SHIFT  •  专注 — CTRL',
    'PHASE — B / LB  •  FOCUS — LT': '相位 — B / LB  •  专注 — LT'
  },
  'pt-BR': {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': 'MOVER — WASD / SETAS  •  ATIRAR — ESPAÇO',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': 'MOVER — ANALÓGICO / D-PAD  •  ATIRAR — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': 'FASE — SHIFT  •  FOCO — CTRL',
    'PHASE — B / LB  •  FOCUS — LT': 'FASE — B / LB  •  FOCO — LT'
  },
  ko: {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': '이동 — WASD / 방향키  •  발사 — SPACE',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': '이동 — 스틱 / D-PAD  •  발사 — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': '위상 — SHIFT  •  집중 — CTRL',
    'PHASE — B / LB  •  FOCUS — LT': '위상 — B / LB  •  집중 — LT'
  },
  ja: {
    'MOVE — WASD / ARROWS  •  SHOOT — SPACE': '移動 — WASD / 矢印  •  ショット — SPACE',
    'MOVE — STICK / D-PAD  •  SHOOT — A / RT': '移動 — スティック / D-PAD  •  ショット — A / RT',
    'PHASE — SHIFT  •  FOCUS — CTRL': 'フェーズ — SHIFT  •  フォーカス — CTRL',
    'PHASE — B / LB  •  FOCUS — LT': 'フェーズ — B / LB  •  フォーカス — LT'
  }
});

export function getFirstRunRetentionSourceText(locale) {
  return ENTRIES[locale] || {};
}
