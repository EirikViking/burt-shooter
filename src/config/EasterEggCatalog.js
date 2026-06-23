export const EASTER_EGG_TOTAL = 10;

export const EASTER_EGGS = Object.freeze([
  {
    id: 'coin_ghost_receipt',
    title: 'COIN GHOST RECEIPT',
    line: 'The cabinet charged one invisible quarter. Accounting is terrified.',
    symbol: 'CREDIT +1?',
    accent: 0xffef7e,
    secondary: 0x37f5ff,
    minLevel: 1,
    sfx: 'coin_portal_open'
  },
  {
    id: 'button_blinked_back',
    title: 'THE BUTTON BLINKED BACK',
    line: 'Cockpit hardware is now emotionally available. Bad timing, honestly.',
    symbol: 'INPUT FLIRT',
    accent: 0xff55d9,
    secondary: 0x66ffdd,
    minLevel: 1,
    sfx: 'menu_tick'
  },
  {
    id: 'snack_bar_warp',
    title: 'SNACK BAR WARP',
    line: 'A vending machine crossed hyperspace and still forgot the spoon.',
    symbol: 'SOUP ERROR',
    accent: 0xff8f5a,
    secondary: 0xffef7e,
    minLevel: 2,
    sfx: 'powerup'
  },
  {
    id: 'kurt_hat_signal',
    title: "KURT'S HAT SIGNAL",
    line: 'A distant hill is transmitting rent complaints at weaponized volume.',
    symbol: 'HAT ONLINE',
    accent: 0xb285ff,
    secondary: 0xff55d9,
    minLevel: 3,
    sfx: 'swarm_chatter_stinger'
  },
  {
    id: 'sonia_mixtape',
    title: "SONIA'S MIXTAPE",
    line: 'Four centuries old, still too dramatic, somehow still your problem.',
    symbol: 'LOVE NOISE',
    accent: 0xff55d9,
    secondary: 0xffef7e,
    minLevel: 4,
    sfx: 'codex_open'
  },
  {
    id: 'space_tax_audit',
    title: 'SPACE TAX AUDIT',
    line: 'Receipts detected. Enemy morale fell three percent and filed an appeal.',
    symbol: 'FORM 404',
    accent: 0x66ff9d,
    secondary: 0xffef7e,
    minLevel: 5,
    sfx: 'space_tax_audit_flyby'
  },
  {
    id: 'intern_fixed_physics',
    title: 'INTERN FIXED PHYSICS',
    line: 'Reality is held together with tape, spite, and one unpaid checkbox.',
    symbol: 'PHYSICS OK',
    accent: 0x37f5ff,
    secondary: 0xff8f5a,
    minLevel: 6,
    sfx: 'forceField'
  },
  {
    id: 'tinyfoundry_afterburner',
    title: 'TINYFOUNDRY AFTERBURNER',
    line: 'A legal department said this glow was too much. We added two more.',
    symbol: 'GLOW CRIME',
    accent: 0x7fffd8,
    secondary: 0xff55d9,
    minLevel: 7,
    sfx: 'thrusterFire'
  },
  {
    id: 'leaderboard_whisper',
    title: 'LEADERBOARD WHISPER',
    line: 'The Top 40 just cleared its throat. It wants your initials and your lunch.',
    symbol: 'TOP 40 HUNGRY',
    accent: 0xffef7e,
    secondary: 0x37f5ff,
    minLevel: 8,
    sfx: 'nova_highscore_chime'
  },
  {
    id: 'void_customer_support',
    title: 'VOID CUSTOMER SUPPORT',
    line: 'Your ticket is important to the abyss. Estimated reply time: never.',
    symbol: 'HOLD MUSIC',
    accent: 0xb285ff,
    secondary: 0x66ffdd,
    minLevel: 9,
    sfx: 'boss_phase_surge'
  }
]);

export function pickEasterEggForLevel(level = 1, seenIds = new Set()) {
  const currentLevel = Math.max(1, Math.floor(Number(level) || 1));
  const seen = seenIds instanceof Set ? seenIds : new Set();
  const eligible = EASTER_EGGS.filter((egg) => currentLevel >= egg.minLevel);
  const unseen = eligible.filter((egg) => !seen.has(egg.id));
  const pool = unseen.length ? unseen : eligible;
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}
