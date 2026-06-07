import { ENEMY_THREAT_ACTIONS } from './EnemyThreatActions.js';
import { WAVE_TACTIC_VARIANTS } from './WaveTacticVariants.js';
import { GENERATED_ENEMY_PROFILES } from './GeneratedEnemyProfiles.js';
import { ELITE_MIDDLE_SHIPS } from './EliteMiddleShips.js';
import { RunContentDirectorConfig } from './RunContentDirectorConfig.js';
import { ENEMY_WEAPON_PROFILES } from './EnemyWeaponProfiles.js';
import { BOSS_ROSTER } from './BossRoster.js';
import { formatSectorLabel, getSectorInfo } from './SectorCatalog.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { translateText } from '../i18n/index.js';
import { getCabinetLogEntries } from '../text/phrasePool.js';

export const CODEX_TEXT_TEMPLATES = Object.freeze({
  enemyDescription: '{name} is a {role}. It brings {roleDescription}, moves with {movement}, and fires {fire}. Read the hull first, then clear it before the formation uses it to close your lane.',
  actionDescription: '{name} is an attack pattern with a {telegraph} tell for about {readWindow} ms. It spends {budget} danger budget on the hit, so the right play is to wait for lock, move once, then return fire.',
  waveDescription: '{name} is a formation script: {role}. It sets entry timing, lane ownership, and synchronized pressure. Break the lead ship or cross the quiet lane before the whole wave starts speaking at once.',
  eliteDescription: '{name} is an elite middle ship with {movement} movement, {fire} fire, and the {ability} system. Clear nearby cover first, then burn the elite during its cooldown before it turns the wave into a priority puzzle.',
  bossDescription: '{name} is the {title} boss profile. Expect {movement} movement, {attack} pressure, and {signature} as the read that matters. Survive the signature tell first; damage is only useful once the lane is clean.',
  themeDescription: '{name} is shaped by the swarm director, the hidden command intelligence that steers each run. This theme leans toward {threats} and wave shapes like {formations}. Watch sector one for that pattern, then {adapt}.',
  cabinetLogDescription: '{name} is a Cabinet Log from live play: joke, field note, and receipt in one. Treat the line as a tiny reminder to make one calmer decision.',
  powerupDescription: '{name} is a {duration} powerup. It changes {effect}. Read it as {read}; pick it when {when}.',
  sectorDescriptionA: '{name} opens on {feel}. It matters because {stakes}; the waves, boss gate, and spare lives all start from that rhythm. Lore note: {flavor}. Gameplay clue: {clue}.',
  sectorDescriptionB: '{name} runs through {feel}. This stretch matters because {stakes}; waves, boss pressure, and life routing all punish sloppy positioning. Tiny threat flavor: {flavor}. Gameplay clue: {clue}.',
  sectorDescriptionC: '{name} feels like {feel}. The run uses it for {stakes}, so every wave cleared cleanly buys safer boss-gate lives later. Local rumor: {flavor}. Gameplay clue: {clue}.',
  sectorDescriptionD: '{name} is {feel}. It matters because {stakes}; the waves test patience before the boss gate asks what lives you kept. Field detail: {flavor}. Gameplay clue: {clue}.',
  runtimeDescription: 'The archive has seen this signal, but not enough times to file a clean note. Expect a visible tell, a repeatable behavior, and a sharper entry once the swarm shows it again.'
});

function codexText(key, vars = {}) {
  return translateText(CODEX_TEXT_TEMPLATES[key] || '', vars);
}

export const THREAT_CODEX_CATEGORIES = Object.freeze([
  { id: 'enemies', label: 'Enemies' },
  { id: 'attackPatterns', label: 'Attack Patterns' },
  { id: 'waveTactics', label: 'Wave Tactics' },
  { id: 'powerups', label: 'Powerups' },
  { id: 'sectors', label: 'Sectors' },
  { id: 'elites', label: 'Elites' },
  { id: 'bosses', label: 'Bosses' },
  { id: 'runThemes', label: 'Run Themes' },
  { id: 'cabinetLogs', label: 'Cabinet Logs' }
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

const POWERUP_CODEX_ENTRIES = Object.freeze([
  {
    id: 'triple_beam',
    name: 'TRIPLE BEAM',
    duration: '12 second',
    effect: 'your main gun to at least three lanes',
    read: 'lane coverage, not raw burst damage',
    when: 'a wave spreads wide or pins both sides',
    tip: 'Hold center lanes and let the side beams clean stragglers.',
    accent: 0xffaa00
  },
  {
    id: 'vector_boost',
    name: 'VECTOR BOOST',
    duration: '12 second',
    effect: 'movement speed by 50 percent while the profile is active',
    read: 'a reposition tool',
    when: 'you need to cross a boss lane or escape a bad corner',
    tip: 'Move with intent; the boost also makes over-dodging easier.',
    accent: 0xff6666
  },
  {
    id: 'rapid_cabinet',
    name: 'RAPID CABINET',
    duration: '12 second',
    effect: 'reload speed and main-shot damage, with damage floored at 3',
    read: 'a short burn window',
    when: 'an elite or boss is exposed',
    tip: 'Commit damage while the lane is clean; the timer is the whole deal.',
    accent: 0xff00ff
  },
  {
    id: 'overdrive_core',
    name: 'OVERDRIVE CORE',
    duration: '12 second',
    effect: 'your gun to at least five shots and damage to at least 2',
    read: 'the loudest screen-control pickup',
    when: 'the wave is dense and you can stay alive long enough to cash it in',
    tip: 'Do not chase every target. Park in a safe lane and erase the shape.',
    accent: 0x00ff00
  },
  {
    id: 'slow_time',
    name: 'SLOW TIME',
    duration: '8 second',
    effect: 'the global play speed while your ship keeps readable control',
    read: 'a bullet-pattern reset',
    when: 'shots are already on screen and the next dodge matters',
    tip: 'Use the slow window to choose a lane, not to drift across the whole board.',
    accent: 0x00cccc
  },
  {
    id: 'ghost',
    name: 'GHOST MODE',
    duration: '8 second',
    effect: 'invincibility with a faded ship sprite',
    read: 'a safe passage through danger',
    when: 'you are boxed in or need to pass through a boss pattern',
    tip: 'Ghost buys survival. It does not clear the wave for you.',
    accent: 0xeeeeee
  },
  {
    id: 'shield',
    name: 'SHIELD',
    duration: 'instant defensive',
    effect: 'a shield layer that absorbs the next hit',
    read: 'insurance, not a damage buff',
    when: 'you can afford to trade the current timed pickup for safety',
    tip: 'Shield is strongest before an elite or boss gate, when one mistake would end the run.',
    accent: 0x00aaaa
  },
  {
    id: 'life',
    name: 'EXTRA LIFE',
    duration: 'instant sustain',
    effect: 'one life if you are below the max, or score if you are already capped',
    read: 'run survival first and score value second',
    when: 'the overrun push needs another hull',
    tip: 'At max lives it becomes a bonus, so take it only if the path is safe.',
    accent: 0xff0000
  },
  {
    id: 'rapid_fire',
    name: 'RAPID FIRE',
    duration: '8 second',
    effect: 'reload time by half',
    read: 'more shots, same lane discipline',
    when: 'small enemies need to disappear before they form a wall',
    tip: 'Rapid Fire stacks well in your hands, not in the save file; keep shooting.',
    accent: 0xffcc00
  },
  {
    id: 'double_shot',
    name: 'DOUBLE SHOT',
    duration: '8 second',
    effect: 'your gun to at least two bullets per volley',
    read: 'reliable extra coverage',
    when: 'single-lane ships need help clearing sides',
    tip: 'Double Shot is simple. Use the wider pattern to break anchors first.',
    accent: 0x66ccff
  },
  {
    id: 'damage_up',
    name: 'DAMAGE UP',
    duration: '8 second',
    effect: 'main-shot damage, floored at 2 after a 1.6x bump',
    read: 'single-target pressure',
    when: 'tanks, elites, or boss phases need to end quickly',
    tip: 'Damage Up is strongest when you stop dodging for a clean half-second.',
    accent: 0xff6666
  },
  {
    id: 'speed_up',
    name: 'SPEED UP',
    duration: '8 second',
    effect: 'ship movement by 30 percent',
    read: 'a control pickup with a real oversteer risk',
    when: 'wide patterns demand fast lane changes',
    tip: 'Tap movement instead of holding the stick; speed makes tiny mistakes larger.',
    accent: 0x66ff66
  },
  {
    id: 'pierce',
    name: 'PIERCE',
    duration: '7 second',
    effect: 'bullets so they pass through enemies',
    read: 'line-clearing pressure',
    when: 'ships stack in columns or a boss hides behind adds',
    tip: 'Aim through the crowd. Pierce wastes value if you fire at empty side lanes.',
    accent: 0xcc66ff
  },
  {
    id: 'score_x2',
    name: 'SCORE x2',
    duration: '10 second',
    effect: 'score gain with a 2x multiplier',
    read: 'a greed window',
    when: 'you can kill safely instead of just surviving',
    tip: 'If the screen is unsafe, live first. A multiplier cannot submit a score after a crash.',
    accent: 0xffff00
  },
  {
    id: 'magnet',
    name: 'MAGNET FIELD',
    duration: '8 second',
    effect: 'pickup pull so nearby drops drift into you',
    read: 'collection help',
    when: 'a good drop is falling through a risky lane',
    tip: 'Magnet helps pickups; it does not move bullets or enemies.',
    accent: 0x99ffcc
  },
  {
    id: 'drones',
    name: 'SIDE DRONES',
    duration: '8 second',
    effect: 'temporary side drones that add extra fire',
    read: 'free side pressure',
    when: 'you need enemies cleared while your ship stays centered',
    tip: 'Let drones work the edges while you aim the main gun at priority targets.',
    accent: 0x66ccff
  },
  {
    id: 'shockwave',
    name: 'SHOCKWAVE',
    duration: 'instant clear',
    effect: 'enemy bullets and nearby enemies without taking your timed slot',
    read: 'a panic button',
    when: 'the board is already bad',
    tip: 'Shockwave is strongest after the bullets are out, not before the threat starts.',
    accent: 0xff9966
  },
  {
    id: 'point_defense',
    name: 'POINT DEFENSE',
    duration: '10 second',
    effect: 'a defensive ring that helps against nearby shots',
    read: 'bullet insurance around the hull',
    when: 'dense patterns keep clipping your escape lane',
    tip: 'Stay readable. Point Defense helps close threats, but it is not a license to park in fire.',
    accent: 0x00ddff
  },
  {
    id: 'bomb',
    name: 'BOMB',
    duration: 'three shots',
    effect: 'your next three shots into bomb shots',
    read: 'burst cleanup with limited charges',
    when: 'a wave or boss phase needs immediate area damage',
    tip: 'Do not spray Bomb into empty lanes. Each shot is one of the three.',
    accent: 0xff3300
  },
  {
    id: 'chain_lightning',
    name: 'CHAIN LIGHTNING',
    duration: '12 second',
    effect: 'lightning arcs that can chain to up to three targets',
    read: 'multi-target punishment',
    when: 'enemies are close enough for arcs to jump',
    tip: 'Chain Lightning loves clusters. Thin isolated enemies reduce its value.',
    accent: 0xffff00
  },
  {
    id: 'orbital_strike',
    name: 'ORBITAL STRIKE',
    duration: '15 second',
    effect: 'five orbital strike charges with a cooldown',
    read: 'stored burst pressure',
    when: 'priority targets need help from outside your firing lane',
    tip: 'Spend charges on elites, boss windows, or formations that would otherwise waste time.',
    accent: 0xff00ff
  },
  {
    id: 'vampire',
    name: 'VAMPIRE DRAIN',
    duration: '20 second',
    effect: 'kill-count drain progress that can restore life after enough kills',
    read: 'a comeback engine',
    when: 'there are enough enemies on screen to feed it',
    tip: 'Vampire needs kills. Boss-only downtime can leave the drain hungry.',
    accent: 0xff0066
  }
]);

const SECTOR_CODEX_LEVELS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 20]);
const SECTOR_CODEX_COPY = Object.freeze({
  1: {
    template: 'sectorDescriptionA',
    feel: 'a cold launch rail outside Nova Station, all blue runway lights and nervous static',
    stakes: 'the first waves reveal the run theme before score greed gets loud',
    flavor: 'one busted beacon still blinks in Cabinet coin timing',
    clue: 'start near center, read which lane closes first, then chase pickups',
    tip: 'Use Astra Vey as a scouting lap. Learn the theme before spending lives on edge loot.'
  },
  2: {
    template: 'sectorDescriptionB',
    feel: 'a service freight lane where cargo drones left bright scars on the traffic rails',
    stakes: 'the run starts asking for cleaner target priority while pickups are still modest',
    flavor: 'the swarm likes to hide its first real shove inside ordinary-looking waves',
    clue: 'clear the lead ship before the formation turns the safe side into a trap',
    tip: 'Treat Vela Vey as the first discipline check: shoot the lane maker, then move.'
  },
  3: {
    template: 'sectorDescriptionC',
    feel: 'a dim relay pocket with half the signs flickering and none of them apologizing',
    stakes: 'lane discipline under faster wave timing',
    flavor: 'old relay glass throws enemy silhouettes a beat before the shots arrive',
    clue: 'small dodges beat long drifts when the formation is still entering',
    tip: 'In Nyx Vey, resist panic movement. Short corrections keep your return lane open.'
  },
  4: {
    template: 'sectorDescriptionD',
    feel: 'a green maintenance shelf where the swarm has learned to park in your escape route',
    stakes: 'target-priority calls arrive faster before the next boss checkpoint',
    flavor: 'maintenance buoys mark clean lanes, then the swarm immediately argues with them',
    clue: 'delete support ships early so the boss gate does not inherit their mess',
    tip: 'Kairo Vey rewards calm cleanup. Remove helpers before chasing the loud target.'
  },
  5: {
    template: 'sectorDescriptionA',
    feel: 'a red checkpoint throat with warning lamps stacked like a bad decision',
    stakes: 'this is the first boss-sector habit check',
    flavor: 'the route recorder stamps every lost life here in thick Cabinet ink',
    clue: 'save room for the boss gate instead of winning the last regular wave from a corner',
    tip: 'Orin Vey is about arriving intact. Enter the boss gate with space, not pride.'
  },
  6: {
    template: 'sectorDescriptionB',
    feel: 'a quiet repair band where the stars look close enough to cut your gloves',
    stakes: 'mid-run wave pressure starts turning weak positioning into lost lives',
    flavor: 'the swarm sends neat shapes here because neat shapes make greedy pilots lazy',
    clue: 'hold a middle lane until the wave commits, then punish the exposed side',
    tip: 'Lyra Vey is where habits get expensive. Keep an exit lane before firing greedily.'
  },
  7: {
    template: 'sectorDescriptionC',
    feel: 'a neon toll grid with lanes blinking in the wrong order on purpose',
    stakes: 'formation density and pickup timing under less forgiving pacing',
    flavor: 'local toll lights count bullets, not ships',
    clue: 'wait for the formation rhythm before crossing for a pickup',
    tip: 'In Vega Vey, pickups are invitations. Accept only after the lane pattern is readable.'
  },
  8: {
    template: 'sectorDescriptionD',
    feel: 'a fractured signal yard full of clean angles and rude surprises',
    stakes: 'late-run crowd control is the last comfort check before the clear gate comes into view',
    flavor: 'the yard repeats old wave shapes with less patience',
    clue: 'clear clusters from the side that gives you the safest boss approach',
    tip: 'Riven Vey asks for crowd control first. Score comes after the screen breathes.'
  },
  9: {
    template: 'sectorDescriptionA',
    feel: 'a sunlit staging lane where every quiet gap feels borrowed',
    stakes: 'the final setup sector decides how much comfort reaches the clear fight',
    flavor: 'the swarm starts rehearsing clear-gate pressure one sector early',
    clue: 'treat every spare life as boss-gate ammunition, not a license to drift',
    tip: 'Solun Vey is preparation, not victory. Bank lives and keep the route boring.'
  },
  10: {
    template: 'sectorDescriptionB',
    feel: 'a bright clear-gate killbox with the cabinet holding its breath',
    stakes: 'beating the boss marks the run clear and opens overrun',
    flavor: 'the gate lights flip from warning red to overrun gold only after the boss falls',
    clue: 'respect the boss tell first; the medal only matters if the ship survives',
    tip: 'Sector 10 is the clear milestone. Win the boss read, then carry the run forward.'
  },
  11: {
    template: 'sectorDescriptionC',
    feel: 'the first overrun drift, too pretty and a little offended that you survived',
    stakes: 'learning that the run keeps scoring after the clear medal',
    flavor: 'Nadir Vey logs cleared pilots as trespassers with excellent taste',
    clue: 'take stable damage windows instead of chasing side lanes like the run is over',
    tip: 'Nadir Vey starts overrun discipline. Play like the medal happened and the danger did not care.'
  },
  20: {
    template: 'sectorDescriptionD',
    feel: 'a deep-overrun switchyard where every route looks profitable until it moves',
    stakes: 'score chase and survival start pulling in opposite directions',
    flavor: 'Helix Vey keeps a quiet ledger of pilots who mistook confidence for routing',
    clue: 'choose the lane that preserves movement before choosing the lane with points',
    tip: 'Helix Vey is for routing, not flexing. Survival lanes beat pretty detours.'
  }
});

const FORMATION_LABELS = Object.freeze({
  ARC: 'arc lanes',
  TUTORIAL_ARC: 'starter arc lanes',
  GRID: 'grid walls',
  SCREEN_DOOR: 'closing door waves',
  DOUBLE_ARC: 'paired arc waves',
  STAGGERED_WING: 'staggered wings',
  PINCER: 'pincer lanes',
  DIAGONAL_RAID: 'diagonal raids',
  V_SHAPE: 'V-shaped dives',
  CROSS_STREAM: 'cross-stream fire',
  ORBIT_RING: 'orbit rings',
  BOX: 'box pressure',
  SPIRAL: 'spiral lanes',
  SIDEWINDER: 'sidewinder curves'
});

const THEME_ADAPT_COPY = Object.freeze({
  swarm_lattice: 'break the grid anchor before crossing a closing lane',
  hunter_wing: 'clear a flank early and save your dodge for the real dive',
  minefield_protocol: 'remove denial pieces before mines turn pickups into bait',
  orbit_collapse: 'wait for the rotation to show a gap before moving through it',
  crossfire_doctrine: 'pick one side to silence before the angles overlap',
  glitch_parade: 'hold movement through the fakeout and shoot after the trick resolves',
  receipt_nebula: 'leave space for delayed fragments instead of chasing the first opening',
  paperclip_empire: 'delete support shapes before their logistics own the lane',
  neon_jury_duty: 'clear a side lane before the verdict arrives from both edges',
  lunar_turnpike: 'let the curve pass, then cut behind it instead of racing it',
  static_mandala: 'step off center early before symmetry pins you there',
  cinder_trellis: 'pull hazards out of the route before they grow into a screen tax',
  blackbox_minuet: 'wait through the elegant fake before spending your dodge',
  solar_abacus: 'count the first volley rhythm, then keep shooting through the math',
  hazard_square_dance: 'watch the corner that keeps trading into your lane',
  violet_switchboard: 'dodge against the routed angle instead of following it',
  auction_house: 'ignore the fake bid and move only when the hammer drops',
  overrun_turntable: 'treat familiar patterns as faster remixes, not solved problems'
});

const THEME_TIPS = Object.freeze({
  swarm_lattice: 'Grid themes reward patience. Break the wall-maker, then cross the lane once.',
  hunter_wing: 'Hunter runs punish early dodges. Wait for the dive to commit before you spend movement.',
  minefield_protocol: 'Minefield runs turn space into debt. Clear denial enemies before chasing pickups.',
  orbit_collapse: 'Orbit runs are timing puzzles. Let the ring rotate, then move through the real gap.',
  crossfire_doctrine: 'Crossfire runs stack angles. Silence one flank before the center starts lying.',
  glitch_parade: 'Glitch runs bluff first. Hold steady until the fakeout ends, then answer hard.',
  receipt_nebula: 'Receipt runs punish late fragments. Leave room behind your dodge for the bill.',
  paperclip_empire: 'Paperclip runs look cute and play logistical. Kill helpers before the lane fills.',
  neon_jury_duty: 'Jury runs decide from the edges. Clear a side before both sides vote at once.',
  lunar_turnpike: 'Turnpike runs curve around panic. Let traffic pass, then cut behind it.',
  static_mandala: 'Mandala runs want you centered. Step away from symmetry before it closes.',
  cinder_trellis: 'Cinder runs grow hazards downward. Pull the seedlings early.',
  blackbox_minuet: 'Minuet runs rehearse the ambush. Do not spend your dodge on the pretty part.',
  solar_abacus: 'Abacus runs count volleys. Learn the beat once, then shoot through it.',
  hazard_square_dance: 'Square Dance runs trade corners. Track the partner entering your lane.',
  violet_switchboard: 'Switchboard runs route shots diagonally. Dodge across the call, not with it.',
  auction_house: 'Auction runs sell fake movement. Wait for the hammer drop.',
  overrun_turntable: 'Turntable runs remix old lessons. Respect the familiar pattern as if it got faster.'
});

function playerFacingFormationLabel(value = '') {
  return FORMATION_LABELS[value] || titleCaseSignal(String(value).toLowerCase());
}

const ACTION_LABEL_BY_ID = new Map(ENEMY_THREAT_ACTIONS.map((action) => [action.id, action.label || titleCaseSignal(action.id)]));

function playerFacingThreatLabel(value = '') {
  return ACTION_LABEL_BY_ID.get(value) || titleCaseSignal(String(value).toLowerCase());
}

function powerupEntry(entry) {
  return {
    id: entry.id,
    category: 'powerups',
    name: entry.name,
    rarity: entry.duration,
    role: 'Powerup',
    description: codexText('powerupDescription', {
      name: entry.name,
      duration: entry.duration,
      effect: entry.effect,
      read: entry.read,
      when: entry.when
    }),
    tip: entry.tip,
    art: AssetManifest.generated.powerups?.[entry.id] || AssetManifest.sprites.bonusCore,
    accent: entry.accent,
    signalClass: 'pickup signal'
  };
}

function sectorEntry(level) {
  const sector = getSectorInfo(level);
  const name = formatSectorLabel(level, { sectorWord: 'SECTOR', compact: true });
  const copy = SECTOR_CODEX_COPY[level] || {
    template: 'sectorDescriptionA',
    feel: `${sector.name} routing space with fresh swarm markings`,
    stakes: `sector ${sector.number} wave routing and boss-gate life planning`,
    flavor: 'the archive marks this route as active and rude',
    clue: 'keep a safe lane before chasing score',
    tip: 'Clear the wave shape first, then take the points the sector actually gives you.'
  };
  return {
    id: `sector_${String(level).padStart(3, '0')}`,
    category: 'sectors',
    name,
    rarity: level >= 11 ? 'Overrun' : level === 10 ? 'Clear Gate' : 'Sector',
    role: level >= 11 ? 'Overrun route' : sector.bossCheckpoint ? 'Boss gate route' : 'Run route',
    description: codexText(copy.template, {
      name,
      feel: copy.feel,
      stakes: copy.stakes,
      flavor: copy.flavor,
      clue: copy.clue
    }),
    tip: translateText(copy.tip),
    art: level >= 10 ? AssetManifest.generated.vfx?.overrunVictorySeal || AssetManifest.generated.bossArenaBackdrop : AssetManifest.generated.gameplayArenaBackdrop,
    accent: level >= 11 ? 0xffe76a : level === 10 ? 0x7dffcc : 0x37f5ff,
    signalClass: 'sector signal'
  };
}

function cabinetLogEntry(entry) {
  return {
    id: entry.id,
    category: 'cabinetLogs',
    name: entry.title || entry.id,
    rarity: translateText('Cabinet Log'),
    role: entry.role || translateText('Cabinet Log'),
    description: entry.description || codexText('cabinetLogDescription', {
      name: entry.title || entry.id
    }),
    tip: entry.tip || entry.line || translateText('Read the line, then make one calmer decision.'),
    art: entry.imageAlias
      ? AssetManifest.generated.storyComms?.find((src) => src.includes(entry.imageAlias))
      : AssetManifest.generated.menuCredits,
    accent: entry.accent || 0xffd15c,
    signalClass: 'cabinet-log'
  };
}

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
  const threats = (theme.threatActions || []).map(playerFacingThreatLabel).join(', ') || 'mixed swarm pressure';
  const formations = (theme.primaryFormations || []).map(playerFacingFormationLabel).join(', ') || 'varied wave shapes';
  const adapt = THEME_ADAPT_COPY[theme.id] || 'use the first sector to name the pressure before chasing score';
  return {
    id: theme.id,
    category: 'runThemes',
    name: theme.label,
    rarity: 'Run Theme',
    role: theme.description || 'Content rotation',
    description: codexText('themeDescription', {
      name: theme.label,
      threats,
      formations,
      adapt
    }),
    tip: translateText(THEME_TIPS[theme.id] || theme.codexTip || 'Use the first sector to identify what this run wants you to respect.'),
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
    powerups: POWERUP_CODEX_ENTRIES.map(powerupEntry),
    sectors: SECTOR_CODEX_LEVELS.map(sectorEntry),
    elites: ELITE_MIDDLE_SHIPS.map(eliteEntry),
    bosses: BOSS_ROSTER.map(bossEntry),
    runThemes: RunContentDirectorConfig.runThemes.map(runThemeEntry),
    cabinetLogs: getCabinetLogEntries().map(cabinetLogEntry)
  };
}
