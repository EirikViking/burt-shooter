import { ENEMY_THREAT_ACTIONS } from './EnemyThreatActions.js';
import { GENERATED_ENEMY_PROFILES } from './GeneratedEnemyProfiles.js';
import { ELITE_MIDDLE_SHIPS } from './EliteMiddleShips.js';
import { RunContentDirectorConfig } from './RunContentDirectorConfig.js';

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

const WAVE_TACTIC_ENTRIES = Object.freeze([
  ['strafe_sweep', 'Strafe Sweep', 'Sweeping formation pressure', 'Track the formation edge before committing to a lane.'],
  ['crossfire_pincer', 'Crossfire Pincer', 'Flank pressure', 'Watch both wings; the crossing shots arrive after the turn.'],
  ['dive_chain', 'Dive Chain', 'Aggressive dive sequence', 'Move sideways early and keep a return lane open.'],
  ['pulse_net', 'Pulse Net', 'Pulse spacing drill', 'Wait for the net rhythm, then cross between beats.'],
  ['orbit_snare', 'Orbit Snare', 'Orbiting space control', 'Do not chase the first gap; it rotates.'],
  ['needle_stagger', 'Needle Stagger', 'Staggered precision fire', 'Small nudges beat big panic dodges.'],
  ['weave_wall', 'Weave Wall', 'Lane weave pressure', 'Read the wall direction and move with it.'],
  ['rush_feint', 'Rush Feint', 'Fake-out rush', 'Hold your dodge until the feint resolves.']
]);

const BOSS_ENTRIES = Object.freeze([
  ['formation_foreman', 'Formation Foreman', 'Opening boss', 'Clear escorts quickly so the boss pattern stays readable.'],
  ['quarter_eater', 'Quarter Eater', 'Score-check boss', 'Stay calm through the second volley.'],
  ['hyper_popcorn', 'Hyper Popcorn', 'Burst boss', 'Use the outer lanes when the center pops.'],
  ['neon_overlord', 'Neon Overlord', 'Late pressure boss', 'Respect the telegraph, then punish recovery.'],
  ['bullet_auditor_prime', 'Bullet Auditor Prime', 'Climax boss', 'Count the pattern beats instead of staring at the boss.'],
  ['giga_hitbox', 'Giga Hitbox', 'Overrun boss', 'Survival beats greed after the safe lane narrows.']
]);

function enemyEntry(profile) {
  return {
    id: profile.type,
    category: 'enemies',
    name: profile.name || profile.type,
    rarity: profile.unlockLevel <= 4 ? 'Common' : profile.unlockLevel <= 18 ? 'Uncommon' : 'Rare',
    role: profile.role || profile.movementStyle || 'Enemy',
    description: `${profile.movementStyle || 'Arcade'} movement with ${profile.fireStyle || 'standard'} fire.`,
    tip: 'Destroy it before the formation finishes shaping the lane.'
  };
}

function actionEntry(action) {
  return {
    id: action.id,
    category: 'attackPatterns',
    name: action.label || action.id,
    rarity: action.minLevel <= 2 ? 'Common' : action.minLevel <= 8 ? 'Uncommon' : 'Rare',
    role: action.tags?.[0] || 'Attack pattern',
    description: action.description || `${action.label || action.id} uses a readable ${action.telegraph || 'visual'} tell.`,
    tip: ACTION_TIPS[action.id] || action.codexTip || 'Read the tell first, then move once with purpose.'
  };
}

function waveEntry([id, name, role, tip]) {
  return {
    id,
    category: 'waveTactics',
    name,
    rarity: 'Common',
    role,
    description: `${name} changes formation movement and shot timing.`,
    tip
  };
}

function eliteEntry(profile) {
  return {
    id: profile.id,
    category: 'elites',
    name: profile.displayName || profile.id,
    rarity: profile.minLevel <= 8 ? 'Uncommon' : 'Rare',
    role: profile.role || profile.specialAbility || 'Elite',
    description: profile.designNote || `${profile.displayName || profile.id} adds a priority target to the wave.`,
    tip: profile.designNote || 'Clear nearby fodder, then focus the elite during its cooldown.'
  };
}

function bossEntry([id, name, role, tip]) {
  return {
    id,
    category: 'bosses',
    name,
    rarity: 'Boss',
    role,
    description: `${name} is part of the current arcade run boss ladder.`,
    tip
  };
}

function runThemeEntry(theme) {
  return {
    id: theme.id,
    category: 'runThemes',
    name: theme.label,
    rarity: 'Run Theme',
    role: theme.description || 'Content rotation',
    description: theme.description || `${theme.label} changes enemy and attack weights for a run.`,
    tip: theme.codexTip || 'Use the first sector to identify what this run wants you to respect.'
  };
}

export function getThreatCodexCatalog() {
  return {
    enemies: GENERATED_ENEMY_PROFILES.slice(0, 60).map(enemyEntry),
    attackPatterns: ENEMY_THREAT_ACTIONS.map(actionEntry),
    waveTactics: WAVE_TACTIC_ENTRIES.map(waveEntry),
    elites: ELITE_MIDDLE_SHIPS.map(eliteEntry),
    bosses: BOSS_ENTRIES.map(bossEntry),
    runThemes: RunContentDirectorConfig.runThemes.map(runThemeEntry)
  };
}
