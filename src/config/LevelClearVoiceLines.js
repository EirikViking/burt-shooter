export const LEVEL_CLEAR_VOICE_COUNT = 200;
export const LEVEL_CLEAR_DEFAULT_VOICE_ID = 'pFZP5JQG7iQjIQuC4Bku';
export const LEVEL_CLEAR_DEFAULT_VOICE_NAME = 'Lily - Velvety Actress';
export const LEVEL_CLEAR_MODEL_ID = 'eleven_v3';

const LEVEL_CLEAR_OPENERS = [
  'Well done, ace.',
  "You're the man, pilot.",
  'That was dangerously competent.',
  'Look at you, making space nervous.',
  'Clean work. Very clean.',
  "I saw that. Don't act modest.",
  'Sector cleared. The console is blushing.',
  "You're flying like trouble with headlights.",
  'Nice hands, captain.',
  'The swarm blinked first.',
  'That was smooth enough to need a license.',
  'Mission control felt that one.',
  'Pilot, that was indecently tidy.',
  'You made the stars sit up straight.',
  'Hot shot, sector is done.',
  'The ship likes you now.',
  'That clear had swagger.',
  "You're making the void nervous.",
  'Keep that up and the leaderboard will call you back.',
  'Well done. I almost spilled my stardust.'
];

const LEVEL_CLEAR_TAGS = [
  'Next sector is pretending it is not scared.',
  'The swarm has requested a quieter genius.',
  'Your ego has been cleared for takeoff.',
  'I will deny smiling in the report.',
  'Somewhere, a boss just tightened a bolt.',
  'The cabinet made a little approving noise.',
  'Do not waste that rhythm.',
  'That score counter is flirting back.',
  'Proceed before the universe recovers.',
  'That was a crime scene with better lighting.'
];

export const levelClearVoiceLines = LEVEL_CLEAR_OPENERS.flatMap((opener) =>
  LEVEL_CLEAR_TAGS.map((tag) => `${opener} ${tag}`)
).map((text, index) => ({
  id: `level_clear_flirt_${String(index + 1).padStart(3, '0')}`,
  text
}));
