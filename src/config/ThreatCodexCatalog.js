import { ENEMY_THREAT_ACTIONS } from './EnemyThreatActions.js';
import { WAVE_TACTIC_VARIANTS } from './WaveTacticVariants.js';
import { GENERATED_ENEMY_PROFILES } from './GeneratedEnemyProfiles.js';
import { ELITE_MIDDLE_SHIPS } from './EliteMiddleShips.js';
import { RunContentDirectorConfig } from './RunContentDirectorConfig.js';
import { ENEMY_WEAPON_PROFILES } from './EnemyWeaponProfiles.js';
import { BOSS_ROSTER } from './BossRoster.js';
import { DANGER_MID_SHIPS } from './DangerMidShips.js';
import { BOSS_SUPPORT_SHIPS } from './BossSupportShips.js';
import { formatSectorLabel, getSectorInfo } from './SectorCatalog.js';
import { POWERUP_CODEX_ENTRIES as CATALOG_POWERUP_CODEX_ENTRIES } from './PowerupCatalog.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { translateText } from '../i18n/index.js';
import { getCabinetLogEntries } from '../text/phrasePool.js';
import {
  getAllRankTitles,
  getPilotXpThreshold,
  getRankLevelThreshold,
  getRankLore
} from '../shared/RankPolicy.js';

export const CODEX_TEXT_TEMPLATES = Object.freeze({
  enemyDescription: '{name} is a {role}. It brings {roleDescription}, moves with {movement}, and fires {fire}. Read the hull first, then clear it before the formation uses it to close your lane.',
  actionDescription: '{name} is an attack pattern with a {telegraph} tell for about {readWindow} ms. It spends {budget} danger budget on the hit, so the right play is to wait for lock, move once, then return fire.',
  waveDescription: '{name} is a formation script: {role}. It sets entry timing, lane ownership, and synchronized pressure. Break the lead ship or cross the quiet lane before the whole wave starts speaking at once.',
  eliteDescription: '{name} is an elite middle ship with {movement} movement, {fire} fire, and the {ability} system. Clear nearby cover first, then burn the elite during its cooldown before it turns the wave into a priority puzzle.',
  bossDescription: '{name} is the {title} boss profile. Expect {movement} movement, {attack} pressure, and {signature} as the read that matters. Survive the signature tell first; damage is only useful once the lane is clean.',
  themeDescription: '{name} is shaped by the swarm director, the hidden command intelligence that steers each run. This theme leans toward {threats} and wave shapes like {formations}. Watch sector one for that pattern, then {adapt}.',
  cabinetLogDescription: '{name} is a Cabinet Log from live play: joke, field note, and receipt in one. Treat the line as a tiny reminder to make one calmer decision.',
  powerupDescription: '{name} is a {duration} powerup. It changes {effect}. Read it as {read}; pick it when {when}.',
  fuelShipDescription: '{name} is boss support. It is unarmed, fast, bright, and carrying enough fuel to heal the boss if it reaches the hull. Kill it early or route around the boss getting paid.',
  dangerMidTip: 'Kill {name} before it turns a normal wave into a priority problem.',
  rankDescription: 'Rank {rank}: {name}. Level marker {level}, career XP marker {xp}. {lore}',
  sectorDescriptionA: '{name} opens on {feel}. It matters because {stakes}; the waves, boss gate, and spare lives all start from that rhythm. Lore note: {flavor}. Gameplay clue: {clue}.',
  sectorDescriptionB: '{name} runs through {feel}. This stretch matters because {stakes}; waves, boss pressure, and life routing all punish sloppy positioning. Tiny threat flavor: {flavor}. Gameplay clue: {clue}.',
  sectorDescriptionC: '{name} feels like {feel}. The run uses it for {stakes}, so every wave cleared cleanly buys safer boss-gate lives later. Local rumor: {flavor}. Gameplay clue: {clue}.',
  sectorDescriptionD: '{name} is {feel}. It matters because {stakes}; the waves test patience before the boss gate asks what lives you kept. Field detail: {flavor}. Gameplay clue: {clue}.',
  runtimeDescription: 'The archive has seen this signal, but not enough times to file a clean note. Expect a visible tell, a repeatable behavior, and a sharper entry once the swarm shows it again.'
});

function codexText(key, vars = {}) {
  return translateText(CODEX_TEXT_TEMPLATES[key] || '', vars);
}

const BOSS_EPIC_CODEX_LORE = Object.freeze({
  nova_boss_01: {
    signalClass: 'Czechia class forbidden signal',
    description: `Sonia came from Czechia, or from the bright old Earth memory of it: winter roofs, tram wires, cheap coffee, and a language that could make a warning sound like a dare. The archive says she was raised in Dock Verona, a binary city split between House Nova and House Swarm by a customs dispute, three bad funerals, and one spectacularly stupid antenna. Both records are true enough. People are allowed more than one origin when the stars start lying.

She was supposed to inherit the left star and aim it like a court weapon. Then the pilot found her voice in a side channel during a meteor blackout. No music, no moon, just two ships pretending the comms were broken and two people refusing to stop talking. They loved to chat. Not strategically. Not usefully. They sent each other jokes, tiny confessions, bad translations, and midnight pings that should have been deleted before the black box woke up. She made the war feel briefly negotiable, which is the most dangerous thing a person can do.

The pilot adored her. Wanted her, in the way a signal wants an answer before the static eats it. But his home orbit already carried a vow, and some doors stay closed because opening them would burn everyone standing near the light. So Sonia became the impossible thing kept at a respectful distance: not conquest, not trophy, not secret shame, but a star you do not steer toward because you remember who is waiting at your dock.

Now Sonia fights like a love letter locked behind a safety glass. Her movement traces careful Czech glasswork arcs, all elegance until the angle cuts. Her pressure arrives as conversational bursts, questions turning into cannon fire before you can answer honestly. Her signature tell is the balcony beam: three violet lines, a pause, then the path you wish existed but cannot take. Defeat her and the archive records no villain, only a woman from Czechia who made the pilot want the impossible and then taught the fleet that restraint can hurt louder than impact.`,
    tip: 'Sonia is all signal and boundary. Read the balcony beam, cross once, and fire before the conversation gets expensive.'
  },
  nova_boss_03: {
    signalClass: 'Berget class authority hangover',
    description: `KurtBossEdgar began as Kurt Edgar, deckhand third class on Mining Rock Berget-9, where the gravity sagged, the coffee argued back, and every supervisor believed morale was a wrench you hit people with. Kurt dodged work with heroic consistency. He blamed the drills, the stars, his boots, and once a lunch tray that had already filed a complaint.

One payday he drank reactor gin beside an ore chute and woke in the admiral throne of a stolen dreadnought. The officers had found him snoring, thought it would be funny, and dressed him in a cape with too many medals. Kurt looked at the bridge, accepted the evidence, and became awful in under twelve seconds. He promoted a mop. He taxed the moon for looking smug. He ordered the ship's doctor to diagnose everyone else with being insufficiently Kurt.

Then the joke reversed. They dumped him back on Berget-9 with a headache, a fake execution notice, and just enough memory to become dangerous. Kurt decided the universe had briefly confessed its secret: power is a chair, and whoever wakes in it gets to shout. He bolted a throne to a gunship and kept the paperwork error as his name. His movement lurches like borrowed authority, his pressure comes in pompous barrages, and his signature tell is the royal hangover cannon. Let him posture. When the crown light blinks, move. Every tyrant has a recovery animation.`,
    tip: 'KurtBossEdgar is funniest before the cannon fires. Let the throne wobble, dodge the royal hangover shot, then revoke his chair privileges.'
  }
});

export const THREAT_CODEX_CATEGORIES = Object.freeze([
  { id: 'enemies', label: 'Enemies' },
  { id: 'attackPatterns', label: 'Attack Patterns' },
  { id: 'waveTactics', label: 'Wave Tactics' },
  { id: 'powerups', label: 'Powerups' },
  { id: 'sectors', label: 'Sectors' },
  { id: 'elites', label: 'Elites' },
  { id: 'bosses', label: 'Bosses' },
  { id: 'runThemes', label: 'Run Themes' },
  { id: 'cabinetLogs', label: 'Cabinet Logs' },
  { id: 'pilotRanks', label: 'Pilot Ranks' }
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

export const SECTOR_CODEX_ART_FILE_COUNT = 240;
export const SECTOR_CODEX_MILESTONE_LEVELS = Object.freeze([10, 20, 30, 40, 50, 60]);
const SECTOR_CODEX_BASE_LEVELS = Object.freeze([
  ...Array.from({ length: 12 }, (_, index) => index + 1),
  ...SECTOR_CODEX_MILESTONE_LEVELS
]);
const THREAT_DISCOVERY_STORAGE_KEY = 'nova.threatDiscovery.v1';
const HANGAR_PROGRESS_STORAGE_KEY = 'nova.hangarProgress.v1';
const LEGACY_UNLOCK_PROGRESS_STORAGE_KEY = 'burt.shipUnlockProgress.v1';
const SECTOR_ID_PATTERN = /^sector_(\d{3,})$/;
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
    template: 'sectorDescriptionD',
    feel: 'a neon toll grid where every pickup looks like a bribe from a machine that hates you',
    stakes: 'bait control, side-lane patience, and refusing shiny detours until the wave exposes its route',
    flavor: 'local toll lights count bullets, invoices, and pilots who cross on shimmer instead of rhythm',
    clue: 'let the bait blink twice, clear the toll keeper, then cross only when the exit lane stays open',
    tip: 'In Vega Vey, pickups are bait with manners. Make the lane prove it is safe first.'
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
  },
  30: {
    template: 'sectorDescriptionB',
    feel: 'a far-gold relay crown where the swarm stops pretending the overrun is bonus content',
    stakes: 'late-overrun routes begin stacking boss habits with crowd pressure',
    flavor: 'Mira Kor keeps every clean dodge as a witness statement',
    clue: 'save burst damage for the wave that would steal your recovery lane',
    tip: 'Sector 30 is a far-signal routing check. Keep one side boring before chasing the bright score lane.'
  },
  40: {
    template: 'sectorDescriptionC',
    feel: 'a violet pressure shelf with hostile geometry folded into every quiet gap',
    stakes: 'the run tests whether score greed can survive disciplined exits',
    flavor: 'Helix Kor files panic movement under entertainment, not strategy',
    clue: 'watch the support shape that arrives late; it usually owns the next lane',
    tip: 'Sector 40 rewards pilots who leave early. Exit before the pretty trap becomes the only route.'
  },
  50: {
    template: 'sectorDescriptionD',
    feel: 'a white-hot overrun threshold where the cabinet starts taking notes in capital letters',
    stakes: 'boss gates, wave pressure, and life routing all compress into one mistake budget',
    flavor: 'Cobalt Kor has never met a spare life it did not immediately audit',
    clue: 'clear the thing that narrows your dodge before shooting the thing with the loudest health bar',
    tip: 'Sector 50 is deep-overrun audit work. Preserve movement first, damage second, glory eventually.'
  },
  60: {
    template: 'sectorDescriptionA',
    feel: 'a far-signal storm gate with neon static stitched across the route recorder',
    stakes: 'generated sectors beyond the authored gates keep scaling pressure from known rules',
    flavor: 'Riven Nox proves the archive can name the signal even when the swarm keeps remixing it',
    clue: 'read the sector family, then expect a faster version of the last lesson',
    tip: 'Sector 60 is a far-signal marker. Treat familiar patterns as remixes, not solved homework.'
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

const STORY_INCIDENTS = Object.freeze([
  'The first scan arrived with scorch marks on the margins and a pilot note that simply said, "do not admire it."',
  'A junior archivist tried to file it alphabetically. The cabinet rejected the form and blinked three times like a lawsuit.',
  'Old runs remember this signal as a tiny disaster wearing good lighting and very bad intentions.',
  'The black box kept the audio because somebody laughed exactly one second before the lane got expensive.',
  'Mission control called it routine until the replay started pointing at the screen by itself.',
  'The cabinet stores this one in the drawer labeled "avoidable, technically, if you stop being glamorous."',
  'A cleaner found the first report folded under the coin slot, still warm and still judging everyone.',
  'The scanner swears the signal has a mood. The scanner is not paid enough to have opinions, but here we are.'
]);

const STORY_WARNINGS = Object.freeze([
  'Respect the tell, make one clean move, and spend the rest of the second shooting instead of negotiating.',
  'The safe play is boring for half a heartbeat, then suddenly looks brilliant on the replay.',
  'If it seems theatrical, good. Theater has marks on the floor. Stand somewhere else.',
  'Do not chase pride through the bright lane. Pride has no shield meter.',
  'Treat the first flash as a receipt, not a suggestion, and the second flash as your final invoice.',
  'Clear the thing that gives the wave confidence. Most disasters are just morale with projectiles.',
  'The trick is not speed. The trick is refusing the stupid dodge the pattern clearly wants from you.',
  'Keep the center honest, leave yourself an exit, and never let a pretty shape do accounting.'
]);

const STORY_PUNCHLINES = Object.freeze([
  'The cabinet approves, then immediately asks why your score is not higher.',
  'Somewhere in the archive, a tiny alarm puts on sunglasses.',
  'That is not fear in the log. That is professional respect wearing cheap shoes.',
  'The swarm calls it doctrine. Pilots call it Tuesday with teeth.',
  'Mission control denies naming it after an ex, which is exactly what mission control would say.',
  'The replay looks heroic if nobody notices the three panic wiggles.',
  'A sensible pilot learns it once. A leaderboard pilot learns it loudly.',
  'The signal remains rude, but at least now it is rude on file.'
]);

const STORY_MATERIALS = Object.freeze([
  'neon brass',
  'cold glass',
  'dirty starlight',
  'arcade chrome',
  'violet reactor dust',
  'burned circuit lace',
  'tax-office titanium',
  'confession booth alloy'
]);

function storyPick(list, seed, offset = 0) {
  return list[Math.abs((Number(seed) || 0) + offset * 7919) % list.length];
}

function storySeed(...parts) {
  return hashString(parts.filter(Boolean).join(':'));
}

function storySentence(...parts) {
  return parts
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(' ');
}

function makeCodexStory({
  id,
  name,
  role,
  category,
  core,
  read,
  payoff,
  required = ''
}) {
  const seed = storySeed(id, name, category, role);
  const material = storyPick(STORY_MATERIALS, seed, 1);
  const incident = storyPick(STORY_INCIDENTS, seed, 2);
  const warning = storyPick(STORY_WARNINGS, seed, 3);
  const punchline = storyPick(STORY_PUNCHLINES, seed, 4);
  const hook = `${name} enters the archive as ${role || 'a hostile signal'} cut from ${material}.`;
  return storySentence(
    hook,
    incident,
    core,
    read,
    warning,
    payoff,
    required,
    punchline
  );
}

function enemyStory({ profile, name, roleLabel, roleDescription, movement, fire }) {
  const unlock = Number(profile.unlockLevel || 1);
  const core = `It brings ${roleDescription}, moves with ${movement}, and fires ${fire}; that is the polite description, written before the hull started making the wave braver.`;
  const read = unlock >= 10
    ? `After sector ${unlock}, the signal starts arriving with late-run confidence and absolutely no manners.`
    : `Early sectors use it as a lesson with engines: simple enough to read, sharp enough to punish daydreaming.`;
  return makeCodexStory({
    id: profile.type,
    name,
    role: roleLabel.toLowerCase(),
    category: 'enemy',
    core,
    read,
    payoff: 'Read the hull first, cut it out of the formation, and the rest of the wave suddenly remembers it is mortal.'
  });
}

function dangerMidStory(profile, name) {
  return makeCodexStory({
    id: profile.id,
    name,
    role: String(profile.role || 'danger mid ship').toLowerCase(),
    category: 'danger-mid',
    core: `This is the middle child between cannon fodder and elite royalty: too tough to ignore, too readable to excuse. It moves with ${profile.move || 'pressure movement'} and fires ${profile.shot || 'pressure fire'} like it has a meeting with your hitbox.`,
    read: 'It appears after sector 8 because the swarm believes you have learned target priority and would like to test that belief in public.',
    payoff: 'Kill it before it turns a normal wave into paperwork with teeth.',
    required: 'Hard hull, sharp tell, fair read.'
  });
}

function fuelShipStory(name, extra = '') {
  return makeCodexStory({
    id: name,
    name,
    role: 'boss support',
    category: 'fuel',
    core: 'It is unarmed, fast, bright, and carrying enough fuel to heal the boss if it reaches the hull.',
    read: extra || 'Its movement follows a bright lane, never fires, and clears formation space before it reaches the boss.',
    payoff: 'Shoot it early. If the boss drinks the tank, the archive marks that as comedy with a body count.',
    required: 'Boss support. Boss healer. Fuel ship.'
  });
}

function actionStory(action, readWindow, budget) {
  const name = action.label || action.id;
  return makeCodexStory({
    id: action.id,
    name,
    role: 'attack pattern',
    category: 'attack-pattern',
    core: `Its ${action.telegraph || 'visual'} tell lasts about ${readWindow} ms, which is just long enough for a calm pilot and brutally short for a dramatic one.`,
    read: `The hit spends ${budget} danger budget on the lane, so the pattern is less a bullet and more a signed appointment.`,
    payoff: 'Wait for lock, move once, return fire, and let the replay pretend you were calm the whole time.'
  });
}

function waveStory(id, name, role) {
  return makeCodexStory({
    id,
    name,
    role: 'formation script',
    category: 'wave',
    core: `It sets entry timing, lane ownership, and synchronized pressure by using ${String(role || 'formation pressure').toLowerCase()} as the opening argument.`,
    read: 'The lead ship is usually not brave; it is just early. Break it and the chorus loses the lyric.',
    payoff: 'Cross the quiet lane before the whole wave starts speaking at once.'
  });
}

function eliteStory(profile, name, ability) {
  return makeCodexStory({
    id: profile.id,
    name,
    role: profile.role || 'elite middle ship',
    category: 'elite',
    core: `It carries ${profile.movementStyle || 'special'} movement, ${profile.fireStyle || 'elite'} fire, and the ${ability} system like a badge it definitely bought itself.`,
    read: 'Nearby cover makes it look smarter than it is. Remove the audience first.',
    payoff: 'Burn the elite during cooldown before it turns the wave into a priority puzzle.'
  });
}

function bossStory(profile) {
  return makeCodexStory({
    id: profile.id,
    name: profile.name,
    role: `${profile.title} boss profile`,
    category: 'boss',
    core: `Movement comes as ${profile.movement}; pressure arrives through ${profile.attack}.`,
    read: `The signature read is ${profile.signature}, which is the boss politely drawing the place you should not be standing.`,
    payoff: 'Survive the signature tell first; damage is only useful once the lane is clean.',
    required: 'Movement, pressure, and signature are the three truths. Everything else is costume.'
  });
}

function powerupStory(entry) {
  return makeCodexStory({
    id: entry.id,
    name: entry.name,
    role: `${entry.duration} powerup`,
    category: 'powerup',
    core: `This powerup changes ${entry.effect}; in practical terms it is a bright little contract that says the next mistake might be survivable.`,
    read: `Read it as ${entry.read}, then pick it when ${entry.when}.`,
    payoff: 'Defensive sustain, hotter shots, safer pickups, or cleaner boss pressure all count as romance when the screen is armed.',
    required: 'Powerup timing is not greed. It is lane management with better lighting.'
  });
}

function sectorStory(name, copy, level) {
  const base = codexText(copy.template, {
    name,
    feel: copy.feel,
    stakes: copy.stakes,
    flavor: copy.flavor,
    clue: copy.clue
  });
  const seed = storySeed(name, level, copy.feel);
  const extra = storySentence(
    `The route crew calls it ${storyPick(['a nervous doorway', 'a glittering bruise', 'a toll road with stars', 'a rehearsal for bad judgment'], seed, 1)} because every wave here teaches the boss how much nerve you brought.`,
    `Bank lives like contraband, then spend none of them unless the lane truly earns it.`
  );
  return `${base} ${extra}`;
}

function runThemeStory(theme, threats, formations, adapt) {
  const base = codexText('themeDescription', {
    name: theme.label,
    threats,
    formations,
    adapt
  });
  const seed = storySeed(theme.id, theme.label, threats);
  const extra = storySentence(
    `The hidden command intelligence keeps a little theater program for this run and circles your weakest habit in ${storyPick(STORY_MATERIALS, seed, 2)} ink.`,
    `If sector one feels familiar, be suspicious; the swarm director loves a cover song with a knife in it.`
  );
  return `${base} ${extra}`;
}

function rankStory(title, index, level, xp, lore) {
  const displayRank = index + 1;
  const seed = storySeed(title, index, level, xp);
  const ceremony = storyPick([
    'a vending machine salute',
    'three sparks from the coin slot',
    'a scoreboard cough that sounds like applause',
    'mission control pretending this was planned',
    'a brass light blinking like it owes you money',
    'a tiny parade held entirely inside the cabinet'
  ], seed, 1);
  const trouble = storyPick([
    'the swarm writes your name on a missile and underlines it twice',
    'rookie pilots start copying the dangerous part of your replay',
    'the cabinet unlocks a drawer labeled "more trouble, please"',
    'bosses begin arriving with opinions and better lighting',
    'the hangar starts treating your dents as proof of employment',
    'the archive moves your file from cute to concerning'
  ], seed, 2);
  const privateNote = storyPick([
    'Nobody claps for the clean dodge. They notice when it is missing.',
    'A rank is just a scar with typography.',
    'The best pilots look lucky until you slow the footage down.',
    'You did not become safer. You became harder to surprise.',
    'The next run does not care. That is why the next run is beautiful.',
    'Your hands know before your mouth starts bragging.'
  ], seed, 3);
  return `Rank ${displayRank}: ${title}. The level marker is ${level}, the career XP marker is ${Number(xp || 0).toLocaleString('en-US')}, and the ceremony is ${ceremony}. ${lore} From here, ${trouble}. ${privateNote}`;
}

function playerFacingFormationLabel(value = '') {
  return FORMATION_LABELS[value] || titleCaseSignal(String(value).toLowerCase());
}

const ACTION_LABEL_BY_ID = new Map(ENEMY_THREAT_ACTIONS.map((action) => [action.id, action.label || titleCaseSignal(action.id)]));

function playerFacingThreatLabel(value = '') {
  return ACTION_LABEL_BY_ID.get(value) || titleCaseSignal(String(value).toLowerCase());
}

function safeLocalStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readStoredJson(key) {
  try {
    const raw = safeLocalStorage()?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeSectorLevel(value) {
  const level = Math.floor(Number(value) || 0);
  return level > 0 ? level : 0;
}

function sectorIdForLevel(level) {
  return `sector_${String(level).padStart(3, '0')}`;
}

function sectorLevelFromId(id = '') {
  const match = String(id).match(SECTOR_ID_PATTERN);
  return match ? normalizeSectorLevel(match[1]) : 0;
}

function getStoredSectorLevels() {
  const levels = new Set();
  const discovery = readStoredJson(THREAT_DISCOVERY_STORAGE_KEY);
  const sectorItems = discovery?.items?.sectors && typeof discovery.items.sectors === 'object'
    ? discovery.items.sectors
    : {};
  Object.keys(sectorItems).forEach((id) => {
    const level = sectorLevelFromId(id);
    if (level > 0) levels.add(level);
  });

  for (const key of [HANGAR_PROGRESS_STORAGE_KEY, LEGACY_UNLOCK_PROGRESS_STORAGE_KEY]) {
    const progress = readStoredJson(key);
    const highest = Math.max(
      normalizeSectorLevel(progress?.bestSector),
      normalizeSectorLevel(progress?.bestLevel)
    );
    for (let level = 1; level <= highest; level += 1) levels.add(level);
  }
  return levels;
}

export function getSectorCodexLevels(extraLevels = []) {
  const levels = new Set(SECTOR_CODEX_BASE_LEVELS);
  const storedLevels = getStoredSectorLevels();
  for (const level of storedLevels) levels.add(level);
  const normalizedExtraLevels = [];
  for (const level of extraLevels) {
    const normalized = normalizeSectorLevel(level);
    if (normalized > 0) {
      levels.add(normalized);
      normalizedExtraLevels.push(normalized);
    }
  }
  const discoveredHighest = Math.max(0, ...storedLevels, ...normalizedExtraLevels);
  for (let level = 1; level <= discoveredHighest; level += 1) {
    if (level <= 12 || levels.has(level)) continue;
    levels.add(level);
  }
  return [...levels].sort((a, b) => a - b);
}

function sectorBand(level) {
  if (level >= 60) return 'Far Signal';
  if (level >= 50) return 'Deep Overrun';
  if (level >= 30) return 'Late Overrun';
  if (level >= 20) return 'Overrun Route';
  if (level >= 11) return 'Overrun';
  if (level === 10) return 'Clear Gate';
  if (level % 5 === 0) return 'Boss Gate';
  return 'Run Route';
}

function sectorPressureStyle(level) {
  const styles = [
    'lane discipline',
    'crowd control',
    'boss-gate life routing',
    'pickup bait control',
    'support target priority',
    'overrun score restraint',
    'crossfire patience',
    'late-wave recovery'
  ];
  return styles[Math.abs(level - 1) % styles.length];
}

function generatedSectorCopy(level, sector) {
  const band = sectorBand(level).toLowerCase();
  const style = sectorPressureStyle(level);
  const template = ['sectorDescriptionA', 'sectorDescriptionB', 'sectorDescriptionC', 'sectorDescriptionD'][(level - 1) % 4];
  const bossNote = sector.bossCheckpoint
    ? 'a boss checkpoint that measures spare lives before damage'
    : 'wave pressure that borrows boss-gate habits before the gate arrives';
  return {
    template,
    feel: `${sector.name} ${band} space with ${style} painted into the traffic rails`,
    stakes: `${band} ${style}, ${bossNote}, and score choices that can still leave an exit lane`,
    flavor: `the route recorder tags this as ${sector.name} signal family ${Math.ceil(level / 5)}`,
    clue: sector.bossCheckpoint
      ? 'enter the gate from a lane that can dodge twice without crossing panic fire'
      : 'clear the lane-maker before taking the pickup or score detour',
    tip: `${sector.name} is a ${sectorBand(level)} sector. Read ${style} first, then spend movement only when the lane proves it is real.`
  };
}

export function getSectorCodexArt(level = 1) {
  const index = normalizeSectorLevel(level) - 1;
  const generated = Array.isArray(AssetManifest.generated.sectors) ? AssetManifest.generated.sectors[index] : null;
  if (generated) return generated;
  return createSectorSignalArtDataUri(level);
}

export function createSectorSignalArtDataUri(level = 1) {
  const safeLevel = normalizeSectorLevel(level) || 1;
  const hue = (safeLevel * 47) % 360;
  const secondary = (hue + 138 + (safeLevel % 7) * 9) % 360;
  const tertiary = (hue + 266) % 360;
  const spokes = 8 + (safeLevel % 9);
  const rings = 2 + (safeLevel % 4);
  const shard = 18 + (safeLevel % 5) * 4;
  const nodes = Array.from({ length: spokes }, (_, index) => {
    const angle = (index / spokes) * Math.PI * 2;
    const outer = 78 + ((index + safeLevel) % 3) * 6;
    const inner = 30 + ((index * 5 + safeLevel) % 4) * 5;
    const x1 = 128 + Math.cos(angle) * inner;
    const y1 = 128 + Math.sin(angle) * inner;
    const x2 = 128 + Math.cos(angle) * outer;
    const y2 = 128 + Math.sin(angle) * outer;
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="hsl(${(hue + index * 13) % 360} 100% 62%)" stroke-width="${index % 3 === 0 ? 2.6 : 1.4}" stroke-linecap="round"/>`;
  }).join('');
  const ringMarkup = Array.from({ length: rings }, (_, index) => {
    const radius = 32 + index * 20 + (safeLevel % 5);
    const dash = `${7 + ((safeLevel + index) % 9)} ${5 + (index % 4)}`;
    return `<circle cx="128" cy="128" r="${radius}" fill="none" stroke="hsl(${(secondary + index * 20) % 360} 96% 58%)" stroke-width="${index === rings - 1 ? 2.4 : 1.2}" stroke-dasharray="${dash}" opacity="${0.45 + index * 0.11}"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
<defs>
<radialGradient id="g" cx="50%" cy="48%" r="48%"><stop offset="0%" stop-color="hsl(${hue} 100% 72%)"/><stop offset="46%" stop-color="hsl(${secondary} 100% 45%)"/><stop offset="100%" stop-color="#020712"/></radialGradient>
<filter id="glow" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="256" height="256" fill="#020712"/>
<circle cx="128" cy="128" r="100" fill="url(#g)" opacity="0.28"/>
<g filter="url(#glow)">
${ringMarkup}
${nodes}
<path d="M128 ${32 + shard} L${154 + (safeLevel % 11)} 128 L128 ${224 - shard} L${102 - (safeLevel % 11)} 128 Z" fill="none" stroke="hsl(${tertiary} 100% 70%)" stroke-width="3.4"/>
<path d="M128 ${56 + (safeLevel % 18)} L${145 + (safeLevel % 8)} 128 L128 ${200 - (safeLevel % 18)} L${111 - (safeLevel % 8)} 128 Z" fill="hsl(${hue} 100% 56%)" opacity="0.23"/>
<circle cx="128" cy="128" r="${9 + (safeLevel % 8)}" fill="hsl(${hue} 100% 72%)"/>
</g>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function powerupEntry(entry) {
  return {
    id: entry.id,
    category: 'powerups',
    name: entry.name,
    rarity: entry.duration,
    role: 'Powerup',
    description: powerupStory(entry),
    tip: `Pick when safe. ${entry.tip}`,
    art: AssetManifest.generated.powerups?.[entry.id] || AssetManifest.sprites.bonusCore,
    accent: entry.accent,
    signalClass: 'pickup signal',
    codexBodyMode: 'story'
  };
}

function sectorEntry(level) {
  const sector = getSectorInfo(level);
  const name = formatSectorLabel(level, { sectorWord: 'SECTOR', compact: true });
  const copy = SECTOR_CODEX_COPY[level] || generatedSectorCopy(level, sector);
  const milestone = SECTOR_CODEX_MILESTONE_LEVELS.includes(level);
  const band = sectorBand(level);
  const pressure = sectorPressureStyle(level);
  return {
    id: sectorIdForLevel(level),
    category: 'sectors',
    name,
    rarity: milestone ? `${band} Milestone` : band,
    role: milestone ? `${band} milestone route` : `${band} - ${pressure}`,
    description: sectorStory(name, copy, level),
    tip: translateText(copy.tip),
    art: getSectorCodexArt(level),
    accent: level >= 60 ? 0xc77dff : level >= 30 ? 0xffe76a : level >= 11 ? 0x7db7ff : level === 10 ? 0x7dffcc : 0x37f5ff,
    signalClass: 'sector signal',
    sectorNumber: level,
    difficultyBand: band,
    pressureStyle: pressure,
    milestone,
    codexBodyMode: 'story'
  };
}

function cabinetLogEntry(entry) {
  return {
    id: entry.id,
    category: 'cabinetLogs',
    name: entry.title || entry.id,
    rarity: translateText('Cabinet Log'),
    role: entry.role || translateText('Cabinet Log'),
    description: entry.description || makeCodexStory({
      id: entry.id,
      name: entry.title || entry.id,
      role: 'cabinet log',
      category: 'cabinet-log',
      core: 'It is a joke, field note, and receipt from live play, preserved because the cabinet believes embarrassment is a training tool.',
      read: 'The line is short because survival advice gets worse when it starts wearing a lecture hat.',
      payoff: 'Read it, laugh once if you have time, then make one calmer decision.'
    }),
    tip: entry.tip || entry.line || translateText('Read the line, then make one calmer decision.'),
    art: entry.imageAlias
      ? AssetManifest.generated.storyComms?.find((src) => src.includes(entry.imageAlias))
      : AssetManifest.generated.menuCredits,
    accent: entry.accent || 0xffd15c,
    signalClass: 'cabinet-log',
    codexBodyMode: 'story'
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
    description: enemyStory({ profile, name, roleLabel, roleDescription, movement, fire }),
    tip: ROLE_TIPS[profile.role] || 'Destroy it before the formation finishes shaping the lane.',
    art: AssetManifest.generated.enemies?.[profile.spriteIndex] || null,
    accent: profile.accent,
    tint: profile.tint,
    unlockLevel: profile.unlockLevel,
    signalClass: profile.tier,
    codexBodyMode: 'story'
  };
}

function dangerMidEntry(profile) {
  const name = profile.displayName || profile.id;
  return {
    id: profile.id,
    category: 'enemies',
    name,
    rarity: profile.tier || 'Danger Mid',
    role: titleCaseSignal(profile.role || 'danger mid ship'),
    description: dangerMidStory(profile, name),
    tip: codexText('dangerMidTip', { name }),
    art: AssetManifest.generated.enemies?.[Number.isFinite(profile.spriteIndex) ? profile.spriteIndex : ((profile.unlockLevel + profile.id.length) % (AssetManifest.generated.enemies?.length || 1))] || null,
    accent: profile.accent,
    tint: profile.tint,
    unlockLevel: profile.unlockLevel,
    signalClass: 'danger-mid',
    codexBodyMode: 'story'
  };
}

function bossFuelShipEntry() {
  return {
    id: 'boss_fuel_ship',
    category: 'enemies',
    name: translateText('Boss Fuel Ship'),
    rarity: translateText('Boss Support'),
    role: translateText('Boss healer'),
    description: fuelShipStory(translateText('Boss Fuel Ship'), translateText('Its movement follows a bright lane, never fires, and clears formation space before it reaches the boss.')),
    tip: translateText('It does not shoot. That is the trick. Shoot it before the boss drinks the tank.'),
    art: AssetManifest.generated.powerups?.vampire || AssetManifest.sprites.bonusCore,
    accent: 0x7dffcc,
    tint: 0xfff08a,
    unlockLevel: 1,
    signalClass: 'boss-support',
    codexBodyMode: 'story'
  };
}

function bossSupportShipEntry(profile) {
  const name = profile.displayName || profile.id;
  return {
    id: profile.id,
    category: 'enemies',
    name,
    rarity: translateText('Boss Support'),
    role: titleCaseSignal(profile.role || 'boss support'),
    description: fuelShipStory(name, 'Its repair tank flashes bright enough to be fair and rude enough to be memorable.'),
    tip: translateText('It does not shoot. That is the trick. Shoot it before the boss drinks the tank.'),
    art: AssetManifest.generated.enemies?.[profile.spriteIndex] || AssetManifest.generated.powerups?.vampire || AssetManifest.sprites.bonusCore,
    accent: profile.accent,
    tint: profile.tint,
    unlockLevel: 1,
    signalClass: profile.signalClass || 'boss-support',
    codexBodyMode: 'story'
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
    description: actionStory(action, readWindow, budget),
    tip: ACTION_TIPS[action.id] || action.codexTip || 'Read the tell first, then move once with purpose.',
    art: Number.isFinite(weapon?.assetIndex) ? AssetManifest.generated.enemyWeapons?.[weapon.assetIndex] : null,
    accent: weapon?.warningColor || weapon?.color || 0x7dffcc,
    telegraph: action.telegraph,
    signalClass: action.tags?.join(' / ') || 'pattern',
    codexBodyMode: 'story'
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
    description: waveStory(id, name, role),
    tip,
    art: createWaveTacticArtDataUri(id, name, role),
    accent: 0x37f5ff ^ (seed & 0x3f3fff),
    signalClass: 'formation script',
    codexBodyMode: 'story'
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
    description: eliteStory(profile, name, ability),
    tip: profile.designNote || 'Clear nearby fodder, then focus the elite during its cooldown.',
    art: profile.asset || AssetManifest.generated.eliteMiddleShips?.[profile.spriteIndex] || null,
    accent: profile.accent,
    tint: profile.tint,
    unlockLevel: profile.unlockLevel,
    signalClass: profile.specialAbility,
    codexBodyMode: 'story'
  };
}

function bossEntry(profile) {
  const epicLore = BOSS_EPIC_CODEX_LORE[profile.id] || null;
  return {
    id: profile.id,
    category: 'bosses',
    name: profile.name,
    rarity: 'Boss',
    role: profile.title,
    description: epicLore?.description || bossStory(profile),
    tip: epicLore?.tip || 'Respect the signature tell first. Damage matters after you have a clean lane and the boss has finished being theatrical.',
    art: profile.art,
    accent: profile.accent,
    tint: profile.palette,
    signalClass: epicLore?.signalClass || profile.archetype,
    codexBodyMode: epicLore ? 'epic' : 'story'
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
    description: runThemeStory(theme, threats, formations, adapt),
    tip: translateText(THEME_TIPS[theme.id] || theme.codexTip || 'Use the first sector to identify what this run wants you to respect.'),
    art: THEME_ART[theme.id] || AssetManifest.generated.gameplayArenaBackdrop,
    accent: 0x7dffcc,
    signalClass: 'director theme',
    codexBodyMode: 'story'
  };
}

function pilotRankEntry(title, index) {
  const level = getRankLevelThreshold(index);
  const xp = getPilotXpThreshold(index);
  const lore = getRankLore(index);
  return {
    id: `pilot_rank_${String(index).padStart(2, '0')}`,
    category: 'pilotRanks',
    name: title,
    rarity: index >= 20 ? translateText('Hard Rank') : translateText('Pilot Rank'),
    role: translateText('Rank {rank}', { rank: index + 1 }),
    description: rankStory(title, index, level, xp, translateText(lore)),
    tip: index >= 20
      ? translateText('Hard ranks are long-haul bragging rights. Chase them after the clear, not instead of surviving it.')
      : translateText('Career XP comes from ranked runs. Keep flying, keep submitting, keep the receipt.'),
    art: AssetManifest.generated.ranks?.[index] || AssetManifest.generated.leaderboardHall,
    accent: index >= 20 ? 0xffe76a : 0x37f5ff,
    tint: index >= 20 ? 0xfff08a : 0x9cfbff,
    unlockLevel: level,
    signalClass: index >= 20 ? 'hard-rank' : 'rank',
    codexBodyMode: 'story'
  };
}

export function getThreatCodexCatalog() {
  return {
    enemies: [
      bossFuelShipEntry(),
      ...BOSS_SUPPORT_SHIPS.map(bossSupportShipEntry),
      ...GENERATED_ENEMY_PROFILES.map(enemyEntry),
      ...DANGER_MID_SHIPS.map(dangerMidEntry)
    ],
    attackPatterns: ENEMY_THREAT_ACTIONS.map(actionEntry),
    waveTactics: WAVE_TACTIC_ENTRIES.map(waveEntry),
    powerups: CATALOG_POWERUP_CODEX_ENTRIES.map(powerupEntry),
    sectors: getSectorCodexLevels().map(sectorEntry),
    elites: ELITE_MIDDLE_SHIPS.map(eliteEntry),
    bosses: BOSS_ROSTER.map(bossEntry),
    runThemes: RunContentDirectorConfig.runThemes.map(runThemeEntry),
    cabinetLogs: getCabinetLogEntries().map(cabinetLogEntry),
    pilotRanks: getAllRankTitles().map(pilotRankEntry)
  };
}
