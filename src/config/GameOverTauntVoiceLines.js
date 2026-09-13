export const GAME_OVER_TAUNT_VOICE_COUNT = 100;
export const GAME_OVER_TAUNT_DEFAULT_VOICE_ID = 'KLZOWyG48RjZkAAjuM89';
export const GAME_OVER_TAUNT_DEFAULT_VOICE_NAME = 'Angry AL - Intense Male Space Misfit';
export const GAME_OVER_TAUNT_MODEL_ID = 'eleven_v3';

const GAME_OVER_TAUNT_OPENERS = [
  'Game over, pilot.',
  'The swarm has your wreckage.',
  'Your signal just folded.',
  'The cabinet has judged you.',
  'Your ship died loud.',
  'The void is laughing.',
  'Mission failed, bright spark.',
  'The reactor wrote your ending.',
  'The swarm counted your mistake.',
  'Your escape plan exploded.'
];

const GAME_OVER_TAUNT_BODY = [
  'I expected a legend and got a warning label.',
  'That run had courage, then it had debris.',
  'You brought thunder, but forgot survival.',
  'The stars watched, and none of them clapped.',
  'Your cannons argued well. Your hull lost.',
  'That was almost heroic, which is worse.',
  'You found the pattern after it found you.',
  'Your last dodge filed for retirement.',
  'The leaderboard did not feel threatened.',
  'Your ship is now modern art with smoke.'
];

const GAME_OVER_TAUNT_ENDINGS = [
  'Relaunch, if there is anything left of your pride.',
  'Try again before the swarm frames the wreck.',
  'Stand up. The next run wants proof.',
  'Do not let that be the final transmission.',
  'Reset the guns and earn a better obituary.',
  'One more run, unless the explosion convinced you.',
  'Come back meaner, or stay a cautionary tale.',
  'The cockpit is cold. Make it dangerous again.',
  'Your revenge is waiting on the launch button.',
  'Get back in there and make the void nervous.'
];

export const gameOverTauntVoiceLines = GAME_OVER_TAUNT_OPENERS.flatMap((opener, openerIndex) =>
  GAME_OVER_TAUNT_BODY.map((body, bodyIndex) => {
    const ending = GAME_OVER_TAUNT_ENDINGS[(openerIndex * 3 + bodyIndex * 7) % GAME_OVER_TAUNT_ENDINGS.length];
    return `${opener} ${body} ${ending}`;
  })
).map((text, index) => ({
  id: `game_over_taunt_${String(index + 1).padStart(3, '0')}`,
  text,
  audioPath: `/audio/voice/game-over-taunt/game_over_taunt_${String(index + 1).padStart(3, '0')}.mp3`
}));
