import { BOSS_DEATH_DEFAULT_VOICE_ID, BOSS_DEATH_DEFAULT_VOICE_NAME, BOSS_DEATH_MODEL_ID } from './BossDeathVoiceLines.js';

export const MAYHEM_SUPER_STORM_WARNING_VOICE_COUNT = 20;
export const MAYHEM_SUPER_STORM_SURVIVED_VOICE_COUNT = 20;
export const MAYHEM_SUPER_STORM_DEFAULT_VOICE_ID = BOSS_DEATH_DEFAULT_VOICE_ID;
export const MAYHEM_SUPER_STORM_DEFAULT_VOICE_NAME = `${BOSS_DEATH_DEFAULT_VOICE_NAME} - Mayhem Super Storm`;
export const MAYHEM_SUPER_STORM_MODEL_ID = BOSS_DEATH_MODEL_ID;

const WARNING_TEXTS = [
  'Pilot, five waves are about to crash the screen. Breathe later.',
  'Super storm warning. Five enemy waves, one tiny ship, excellent television.',
  'Brace yourself. The swarm ordered five servings of bad decisions.',
  'Five waves inbound. The cabinet recommends heroic nonsense immediately.',
  'Mayhem storm incoming. Five formations want the same parking space.',
  'Emergency comedy update. Five waves are arriving with terrible manners.',
  'Pilot, the radar just screamed five times. Move like a legend.',
  'Super storm in three seconds. The swarm has misunderstood moderation.',
  'Five-wave breach detected. This is the part with loud eyebrows.',
  'Incoming Mayhem wall. Five waves, very little chill, maximum opportunity.',
  'Pilot, tighten the dodge muscles. Five waves just kicked open the door.',
  'Super storm declared. Five enemy squads are sharing one terrible idea.',
  'Five waves on approach. The safe lane has filed for vacation.',
  'Mayhem surge incoming. Five waves, one hero, absolutely no committee.',
  'Radar says five waves. Radar is not known for jokes, unfortunately.',
  'Super storm warning. The swarm brought a crowd and forgot the manners.',
  'Pilot, this is not a drill. It is five drills wearing lasers.',
  'Five-wave pileup inbound. Please convert panic into score.',
  'Mayhem storm charging. Five waves will arrive almost at once.',
  'The sector just went feral. Five waves incoming, make history.'
];

const SURVIVED_TEXTS = [
  'You survived the five-wave storm. True hero behavior, very annoying to villains.',
  'That was impossible on paper. Luckily, paper cannot dodge like you.',
  'Five waves entered. One pilot walked out glowing. Disgustingly heroic.',
  'You are a true hero. The swarm is checking the replay for crimes.',
  'Storm survived. I am legally required to shout: magnificent.',
  'Pilot, that dodge work was absurd. The cabinet is applauding internally.',
  'You lived. Five waves are now reconsidering their career choices.',
  'Hero confirmed. The danger meter just fainted with respect.',
  'That storm had teeth. You brought a dentist made of lasers.',
  'Five waves failed the assignment. You passed with unnecessary style.',
  'True hero detected. The scoreboard just sat up straighter.',
  'You survived the big one. I am furious, proud, and very loud.',
  'Storm cleared. The swarm has requested a rematch and a small blanket.',
  'That was beautiful. Terrible for them, spiritually nutritious for us.',
  'Pilot, you just dodged a whole weather system with engines.',
  'Five-wave storm defeated. Please accept this imaginary cape.',
  'You are not normal. Excellent. Normal pilots are bad at this.',
  'Hero moment logged. The cabinet will exaggerate it forever.',
  'The storm broke on you. You absolute neon monument.',
  'Survival confirmed. The sector is now afraid to make eye contact.'
];

export const mayhemSuperStormWarningVoiceLines = WARNING_TEXTS.map((text, index) => ({
  id: `boss_mayhem_super_storm_warning_${String(index + 1).padStart(2, '0')}`,
  event: 'boss_mayhem_super_storm_warning',
  kind: 'warning',
  text,
  generationText: `[huge theatrical alien boss voice, urgent pre-warning, funny but dangerous, shouted arcade callout] ${text}`
}));

export const mayhemSuperStormSurvivedVoiceLines = SURVIVED_TEXTS.map((text, index) => ({
  id: `boss_mayhem_super_storm_survived_${String(index + 1).padStart(2, '0')}`,
  event: 'boss_mayhem_super_storm_survived',
  kind: 'survived',
  text,
  generationText: `[huge theatrical alien boss voice, triumphant and amused, dramatic arcade praise] ${text}`
}));

export const mayhemSuperStormVoiceLines = [
  ...mayhemSuperStormWarningVoiceLines,
  ...mayhemSuperStormSurvivedVoiceLines
];
