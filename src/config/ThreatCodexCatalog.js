import { ENEMY_THREAT_ACTIONS } from './EnemyThreatActions.js';
import { WAVE_TACTIC_VARIANTS } from './WaveTacticVariants.js';
import { GENERATED_ENEMY_PROFILES } from './GeneratedEnemyProfiles.js';
import { ELITE_MIDDLE_SHIPS } from './EliteMiddleShips.js';
import { RunContentDirectorConfig } from './RunContentDirectorConfig.js';
import { ENEMY_WEAPON_PROFILES } from './EnemyWeaponProfiles.js';
import { BOSS_ROSTER } from './BossRoster.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { translateText } from '../i18n/index.js';

export const CODEX_TEXT_TEMPLATES = Object.freeze({
  enemyDescription: '{name} is catalogued as a {role}: {roleDescription}. The hull signature shows {movement} and {fire}. In a themed formation it edits your escape route instead of simply chasing you.',
  actionDescription: '{name} is a readable attack pattern. The scanner marks a {telegraph} tell for about {readWindow} ms, then spends {budget} danger budget on the hit. Early previews are slower and wider; late-run versions get sharper.',
  waveDescription: '{name} is a wave tactic: {role}. It controls entry timing, lane ownership, and synchronized pressure so ordinary enemies behave like a rehearsed formation.',
  eliteDescription: '{name} is an elite middle ship. It mixes {movement} movement, {fire} fire, and the {ability} system. Clear nearby fodder, then focus the elite before the wave becomes a target-priority problem.',
  bossDescription: '{name} uses the runtime boss profile {title}: {movement} movement, {attack} pressure, and {signature} as its signature read. The Codex summary is data-driven, then dressed up for arcade drama.',
  themeDescription: 'Run theme {name} changes enemy and attack weights for a run. Director weights favor {threats} and formations such as {formations}.',
  runtimeDescription: 'The archive caught this signal in the wild, but the spectrometer is still making dramatic noises. Expect a readable tell, an attitude problem, and a better note once the swarm repeats itself.'
});

function codexText(key, vars = {}) {
  return translateText(CODEX_TEXT_TEMPLATES[key] || '', vars);
}

export const THREAT_CODEX_CATEGORIES = Object.freeze([
  { id: 'enemies', label: 'Enemies' },
  { id: 'attackPatterns', label: 'Attack Patterns' },
  { id: 'waveTactics', label: 'Wave Tactics' },
  { id: 'elites', label: 'Elites' },
  { id: 'bosses', label: 'Bosses' },
  { id: 'runThemes', label: 'Run Themes' }
]);

const ACTION_TIPS = Object.freeze({
  telegraph_rail_lance: 'The warning line locks before the shot. Dodge after lock, not before.',
  lane_cutter: 'Treat the lane marker as a door closing. Step across early or wait it out.',
  splitter_seed: 'Do not chase the seed. Read the split ring and pass through a gap.',
  mine_drop: 'Clear small enemies before mines shrink your escape lanes.',
  pulse_ring_bloom: 'The ring has intentional gaps. Move once, then hold the lane.',
  crossfire_pair: 'Watch the side ships first. The center lane is often bait.',
  boomerang_crescent: 'Let the curve pass instead of trying to outrun the arc.',
  brake_dash_bolt: 'The hover is the tell. Dodge on the pulse, not on launch.',
  shotgun_fan_feint: 'Find the safe wedge before the fan appears.',
  orbiting_satellites: 'Wait for satellites to release before crossing the enemy lane.'
});

function titleCaseSignal(id = '') {
  return String(id)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function hashString(value = '') {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hexColor(value) {
  return `#${(value & 0xffffff).toString(16).padStart(6, '0')}`;
}

function xmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createWaveTacticArtDataUri(id, name, role) {
  const seed = hashString(`${id}:${name}:${role}`);
  const accent = 0x37f5ff ^ (seed & 0x3f3fff);
  const hot = 0xffe76a ^ ((seed >>> 7) & 0x5f5f5f);
  const alt = 0xa77dff ^ ((seed >>> 13) & 0x3f3f3f);
  const lanes = 4 + (seed % 5);
  const nodes = 5 + ((seed >>> 4) % 7);
  const angle = ((seed >>> 9) % 34) - 17;
  const laneLines = Array.from({ length: lanes }, (_, index) => {
    const x = 84 + index * (632 / Math.max(1, lanes - 1));
    const dash = 10 + ((seed >>> (index + 2)) % 18);
    return `<path d="M${x.toFixed(1)} 48 L${(x + angle * 2).toFixed(1)} 352" stroke="${hexColor(accent)}" stroke-width="3" stroke-opacity="0.34" stroke-dasharray="${dash} ${dash + 8}"/>`;
  }).join('');
  const nodeShapes = Array.from({ length: nodes }, (_, index) => {
    const t = index / Math.max(1, nodes - 1);
    const wobble = ((seed >>> (index % 16)) & 31) - 15;
    const x = 108 + t * 584;
    const y = 92 + ((index * 53 + seed) % 214) + wobble * 0.8;
    const r = 8 + ((seed >>> (index + 6)) % 10);
    const color = index % 3 === 0 ? hot : index % 3 === 1 ? accent : alt;
    const diamond = index % 2 === 0
      ? `<polygon points="${x},${y - r * 1.25} ${x + r * 1.25},${y} ${x},${y + r * 1.25} ${x - r * 1.25},${y}" fill="${hexColor(color)}" fill-opacity="0.82"/>`
      : `<circle cx="${x}" cy="${y}" r="${r}" fill="${hexColor(color)}" fill-opacity="0.78"/>`;
    return `<g>${diamond}<circle cx="${x}" cy="${y}" r="${r + 10}" fill="none" stroke="${hexColor(color)}" stroke-opacity="0.22"/></g>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420">
<defs><radialGradient id="g" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${hexColor(accent)}" stop-opacity="0.22"/><stop offset="70%" stop-color="#03101b" stop-opacity="0.96"/><stop offset="100%" stop-color="#01060b"/></radialGradient></defs>
<rect width="800" height="420" fill="url(#g)"/>
<rect x="28" y="30" width="744" height="360" rx="24" fill="#030b13" fill-opacity="0.42" stroke="${hexColor(accent)}" stroke-opacity="0.72" stroke-width="3"/>
${laneLines}
<path d="M72 320 C210 ${(seed % 120) + 76}, 420 ${((seed >>> 5) % 170) + 72}, 728 98" fill="none" stroke="${hexColor(hot)}" stroke-width="5" stroke-opacity="0.72"/>
${nodeShapes}
<text x="400" y="380" text-anchor="middle" font-family="Rajdhani, Orbitron, sans-serif" font-size="26" font-weight="900" fill="${hexColor(hot)}" fill-opacity="0.9">${xmlEscape(name.toUpperCase())}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const BASE_WAVE_TACTIC_ENTRIES = Object.freeze([
  ['strafe_sweep', 'Strafe Sweep', 'Sweeping formation pressure', 'Track the formation edge before committing to a lane.'],
  ['crossfire_pincer', 'Crossfire Pincer', 'Flank pressure', 'Watch both wings; the crossing shots arrive after the turn.'],
  ['dive_chain', 'Dive Chain', 'Aggressive dive sequence', 'Move sideways early and keep a return lane open.'],
  ['pulse_net', 'Pulse Net', 'Pulse spacing drill', 'Wait for the net rhythm, then cross between beats.'],
  ['orbit_snare', 'Orbit Snare', 'Orbiting space control', 'Do not chase the first gap; it rotates.'],
  ['needle_stagger', 'Needle Stagger', 'Staggered precision fire', 'Small nudges beat big panic dodges.'],
  ['weave_wall', 'Weave Wall', 'Lane weave pressure', 'Read the wall direction and move with it.'],
  ['rush_feint', 'Rush Feint', 'Fake-out rush', 'Hold your dodge until the feint resolves.'],
  ['split_sweep', 'Split Sweep', 'Two-sided sweep pressure', 'Track the side that is quiet; it is usually about to speak.'],
  ['ambush_lattice', 'Ambush Lattice', 'Delayed grid attack', 'Do not trust the empty square. It has plans.']
]);

const WAVE_TACTIC_ENTRIES = Object.freeze([
  ...BASE_WAVE_TACTIC_ENTRIES,
  ...WAVE_TACTIC_VARIANTS.map((tactic) => [
    tactic.id,
    titleCaseSignal(String(tactic.label || tactic.id).toLowerCase()),
    tactic.role || 'Director tactic',
    tactic.tip || 'Read the formation rhythm before crossing the lane.'
  ])
]);

const ROLE_COPY = Object.freeze({
  basic_fodder: ['Fodder skirmisher', 'cheap pressure that tries to make the easy lane feel crowded'],
  fast_scout: ['Fast scout', 'quick movement and early lane tests before heavier ships arrive'],
  simple_shooter: ['Line shooter', 'plain readable shots that become dangerous inside formations'],
  slow_tank: ['Armored blocker', 'slower hulls that buy time for the wave around them'],
  sniper: ['Precision sniper', 'thin, deliberate fire that punishes drifting in one lane'],
  spread_shooter: ['Spread shooter', 'fan pressure that asks the pilot to find a wedge'],
  formation_anchor: ['Formation anchor', 'a ship that gives the wave its shape and rhythm'],
  space_denial: ['Space denial', 'hazard pressure that makes open lanes expire'],
  charger: ['Rush attacker', 'forward pressure that tests panic movement'],
  evasive: ['Evasive trickster', 'unsteady arcs and late dodges around the player lane'],
  escort: ['Escort craft', 'support movement that protects higher value targets'],
  disruptor: ['Disruptor', 'awkward timing and strange shot rules'],
  elite_fodder: ['Elite screen', 'late-run swarm cover with sharper stats'],
  elite_tactical: ['Tactical ace', 'late-run mixed behavior built to force target priority']
});

const MOVEMENT_COPY = Object.freeze({
  standard: 'steady arcade drift',
  sine: 'side-to-side sine movement',
  chain: 'linked wave motion',
  sweep: 'wide sweeping passes',
  pincer: 'flank pressure',
  pulse: 'stop-start pulse movement',
  orbit: 'rotating orbit lanes',
  anchor: 'a holding pattern near the wave center',
  weave_wall: 'screen-door lane weaving',
  needle: 'narrow precision entries',
  feint: 'fake-outs before committing',
  split_sweep: 'split movement from both sides',
  ambush: 'delayed angle changes',
  pulseAdvance: 'surging forward pressure'
});

const FIRE_COPY = Object.freeze({
  single: 'single aimed shots',
  double: 'paired shots',
  wide: 'wide lane pokes',
  fan: 'fan volleys',
  fanPulse: 'pulsed fan volleys',
  slowOrb: 'slow denial orbs',
  slowHeavy: 'heavy slow shots',
  quickChip: 'fast chip fire',
  splitLite: 'light split shots',
  crossShot: 'crossing fire',
  needle: 'needle shots',
  offsetPair: 'offset pairs',
  laneShot: 'lane pressure',
  warningShot: 'telegraphed warning shots',
  suppressiveLine: 'suppressive line fire',
  chargeShot: 'charged shots',
  stutter: 'stuttered timing',
  predictiveShot: 'prediction shots',
  arcVolley: 'curving volleys',
  rotatingPair: 'rotating paired shots',
  triad: 'three-shot patterns',
  forkShot: 'forking shots'
});

const ROLE_TIPS = Object.freeze({
  basic_fodder: 'Do not tunnel on it. Clear the group while keeping your escape lane open.',
  fast_scout: 'Meet scouts early. Waiting lets them herd you into the next shot.',
  simple_shooter: 'Small dodges are enough. Save big movement for the formation around it.',
  slow_tank: 'Use its slow turn as a timer; clear lighter ships before committing.',
  sniper: 'Watch for the lock, then move after the line settles.',
  spread_shooter: 'Find the wedge first, then shoot through it.',
  formation_anchor: 'Break the anchor and the wave loses its clean shape.',
  space_denial: 'Make a decision before the hazard owns the lane.',
  charger: 'Step aside early, then punish the recovery path.',
  evasive: 'Do not chase the body. Hold a safe lane and let it cross your fire.',
  escort: 'Pick off escorts before they turn a simple threat into a knot.',
  disruptor: 'Read the tell twice; disruptors punish automatic dodges.',
  elite_fodder: 'Treat it like cover for something worse.',
  elite_tactical: 'Target priority matters more than raw damage here.'
});

const THEME_ART = Object.freeze({
  swarm_lattice: AssetManifest.generated.gameplayArenaBackdrop,
  hunter_wing: AssetManifest.generated.stormGameplayBackdrop,
  minefield_protocol: AssetManifest.generated.bossArenaBackdrop,
  orbit_collapse: AssetManifest.generated.menuBackdrop,
  crossfire_doctrine: AssetManifest.generated.leaderboardHall,
  glitch_parade: AssetManifest.generated.menuCredits
});

const WEAPON_BY_ID = new Map(ENEMY_WEAPON_PROFILES.map((profile) => [profile.id, profile]));

function enemyEntry(profile) {
  const [roleLabel, roleDescription] = ROLE_COPY[profile.role] || ['Swarm contact', 'a readable hostile pattern'];
  const movement = MOVEMENT_COPY[profile.movementStyle] || `${profile.movementStyle || 'arcade'} movement`;
  const fire = FIRE_COPY[profile.fireStyle] || `${profile.fireStyle || 'standard'} fire`;
  const rarity = profile.unlockLevel <= 4 ? 'Common' : profile.unlockLevel <= 18 ? 'Uncommon' : 'Rare';
  const name = profile.displayName || profile.name || profile.type;
  return {
    id: profile.type,
    category: 'enemies',
    name,
    rarity,
    role: roleLabel,
    description: codexText('enemyDescription', {
      name,
      role: roleLabel.toLowerCase(),
      roleDescription,
      movement,
      fire
    }),
    tip: ROLE_TIPS[profile.role] || 'Destroy it before the formation finishes shaping the lane.',
    art: AssetManifest.generated.enemies?.[profile.spriteIndex] || null,
    accent: profile.accent,
    tint: profile.tint,
    unlockLevel: profile.unlockLevel,
    signalClass: profile.tier
  };
}

function actionEntry(action) {
  const weapon = WEAPON_BY_ID.get(action.weaponId);
  const readWindow = Math.round(action.telegraphMs || 0);
  const budget = action.dangerBudgetCost || 1;
  return {
    id: action.id,
    category: 'attackPatterns',
    name: action.label || action.id,
    rarity: action.minLevel <= 2 ? 'Common' : action.minLevel <= 8 ? 'Uncommon' : 'Rare',
    role: action.tags?.[0] || 'Attack pattern',
    description: codexText('actionDescription', {
      name: action.label || action.id,
      telegraph: action.telegraph || 'visual',
      readWindow,
      budget
    }),
    tip: ACTION_TIPS[action.id] || action.codexTip || 'Read the tell first, then move once with purpose.',
    art: Number.isFinite(weapon?.assetIndex) ? AssetManifest.generated.enemyWeapons?.[weapon.assetIndex] : null,
    accent: weapon?.warningColor || weapon?.color || 0x7dffcc,
    telegraph: action.telegraph,
    signalClass: action.tags?.join(' / ') || 'pattern'
  };
}

function waveEntry([id, name, role, tip]) {
  const seed = hashString(id);
  return {
    id,
    category: 'waveTactics',
    name,
    rarity: 'Common',
    role,
    description: codexText('waveDescription', { name, role }),
    tip,
    art: createWaveTacticArtDataUri(id, name, role),
    accent: 0x37f5ff ^ (seed & 0x3f3fff),
    signalClass: 'formation script'
  };
}

function eliteEntry(profile) {
  const name = profile.displayName || profile.id;
  const ability = String(profile.specialAbility || 'elite pressure').replace(/_/g, ' ');
  return {
    id: profile.id,
    category: 'elites',
    name,
    rarity: profile.minLevel <= 8 ? 'Uncommon' : 'Rare',
    role: profile.role || profile.specialAbility || 'Elite',
    description: codexText('eliteDescription', {
      name,
      movement: profile.movementStyle || 'special',
      fire: profile.fireStyle || 'elite',
      ability
    }),
    tip: profile.designNote || 'Clear nearby fodder, then focus the elite during its cooldown.',
    art: profile.asset || AssetManifest.generated.eliteMiddleShips?.[profile.spriteIndex] || null,
    accent: profile.accent,
    tint: profile.tint,
    unlockLevel: profile.unlockLevel,
    signalClass: profile.specialAbility
  };
}

function bossEntry(profile) {
  return {
    id: profile.id,
    category: 'bosses',
    name: profile.name,
    rarity: 'Boss',
    role: profile.title,
    description: codexText('bossDescription', {
      name: profile.name,
      title: profile.title.toLowerCase(),
      movement: profile.movement,
      attack: profile.attack,
      signature: profile.signature
    }),
    tip: 'Respect the signature tell first. Damage matters after you have a clean lane and the boss has finished being theatrical.',
    art: profile.art,
    accent: profile.accent,
    tint: profile.palette,
    signalClass: profile.archetype
  };
}

function runThemeEntry(theme) {
  const threats = (theme.threatActions || []).map((id) => id.replace(/_/g, ' ')).join(', ') || 'mixed swarm pressure';
  const formations = (theme.primaryFormations || []).join(', ') || 'varied';
  return {
    id: theme.id,
    category: 'runThemes',
    name: theme.label,
    rarity: 'Run Theme',
    role: theme.description || 'Content rotation',
    description: codexText('themeDescription', {
      name: theme.label,
      threats,
      formations
    }),
    tip: theme.codexTip || 'Use the first sector to identify what this run wants you to respect.',
    art: THEME_ART[theme.id] || AssetManifest.generated.gameplayArenaBackdrop,
    accent: 0x7dffcc,
    signalClass: 'director theme'
  };
}

export function getThreatCodexCatalog() {
  return {
    enemies: GENERATED_ENEMY_PROFILES.map(enemyEntry),
    attackPatterns: ENEMY_THREAT_ACTIONS.map(actionEntry),
    waveTactics: WAVE_TACTIC_ENTRIES.map(waveEntry),
    elites: ELITE_MIDDLE_SHIPS.map(eliteEntry),
    bosses: BOSS_ROSTER.map(bossEntry),
    runThemes: RunContentDirectorConfig.runThemes.map(runThemeEntry)
  };
}
