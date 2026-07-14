import {
  BOSS_DEATH_DEFAULT_VOICE_ID,
  BOSS_DEATH_DEFAULT_VOICE_NAME,
  BOSS_DEATH_MODEL_ID
} from './BossDeathVoiceLines.js';

export const RARE_CHAOS_VISITOR_VOICE_COUNT = 12;
export const RARE_CHAOS_VISITOR_DEFAULT_VOICE_ID = BOSS_DEATH_DEFAULT_VOICE_ID;
export const RARE_CHAOS_VISITOR_DEFAULT_VOICE_NAME = `${BOSS_DEATH_DEFAULT_VOICE_NAME} - Chaos Visitor Announcer`;
export const RARE_CHAOS_VISITOR_MODEL_ID = BOSS_DEATH_MODEL_ID;

const LINES = [
  'Rare contact. Extinction signature confirmed.',
  'Do not chase it. Do not let it face you.',
  'Unknown vessel. Every weapon system is awake.',
  'Pilot, this contact has erased entire sectors.',
  'The signal is inside our warning channel.',
  'Three armor seals. Each one contains something worse.',
  'It is counting your shots. Break line of fire.',
  'Rare contact inbound. Survive the escalation.',
  'No registry. No crew. Only the weapons answered.',
  'The hull is opening. Pilot, move now.',
  'Final phase approaching. Do not stop firing.',
  'Extinction contact. This is not a drill.'
];

export const rareChaosVisitorVoiceLines = Object.freeze(LINES.map((text, index) => Object.freeze({
  id: `boss_rare_chaos_visitor_warning_${String(index + 1).padStart(2, '0')}`,
  text,
  generationText: `[deep restrained military emergency announcer, slow and intimate, controlled terror, ominous pauses, no comedy, cinematic science-fiction dread] ${text}`
})));
