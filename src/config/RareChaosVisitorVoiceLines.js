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
  'Unscheduled comedy frigate. It has lasers!',
  'Rare contact! Too many guns and absolutely no adult supervision!',
  'A party crasher has entered the sector. Violently!',
  'That ship is not on the guest list. It brought bullet weather!',
  'Dramatic warning! The tiny lunatic has a laser tantrum!',
  'Rare visitor incoming. Please dodge the entire sky!',
  'The enemy sent a joke ship. The joke is extremely armed!',
  'Chaos vessel detected. Its safety inspector has resigned!',
  'Something rare, loud, and legally questionable just arrived!',
  'Boss voice update: I hate this ship. It has far too many cannons!',
  'Party crasher inbound. Confetti appears to be live ammunition!',
  'This one brought lasers, mines, and an upsetting amount of confidence!'
];

export const rareChaosVisitorVoiceLines = Object.freeze(LINES.map((text, index) => Object.freeze({
  id: `boss_rare_chaos_visitor_warning_${String(index + 1).padStart(2, '0')}`,
  text,
  generationText: `[extremely dramatic arcade villain announcer, delighted panic, funny but dangerous, deep male voice] ${text}`
})));
