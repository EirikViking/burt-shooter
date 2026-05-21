const CTA_TEXTS = [
  'One more run. You were just getting warm.',
  'The swarm is still out there. Run it back.',
  'Again. This time, you break them.',
  'That was close. One more run.',
  'Nova Command says: try again.',
  'You saw the pattern. Now punish it.',
  'One more run. The swarm won\'t clear itself.',
  'Not bad. But not enough. Again.',
  'Get back in there, pilot.',
  'The next run is the one.',
  'You adapted. Now finish it.',
  'One more run. No hesitation.',
  'They got lucky. Go again.',
  'Your ship is ready. Are you?',
  'Run it back. The swarm is waiting.',
  'You were seconds from glory.',
  'Again, pilot. Make it count.',
  'The void remembers. So should you.',
  'That boss was beatable. One more.',
  'Almost clean. Try again.',
  'The swarm thinks you\'re done.',
  'One more run. Bigger guns. Better moves.',
  'You learned. Now win.',
  'No shame in exploding. Shame is stopping.',
  'Nova Swarm doesn\'t forgive. Neither should you.',
  'Again. Faster this time.',
  'That death looked personal. Avenge it.',
  'One more run. Make the screen melt.',
  'You\'ve got another fight in you.',
  'Don\'t leave it there. One more run.',
  'Close enough to hurt. Good. Again.',
  'The swarm blinked. You should not.',
  'Your last run was data. This one is revenge.',
  'Systems reset. Pride damaged. Go again.',
  'You made them nervous. Finish the job.',
  'That explosion was educational.',
  'The void is calling you back.',
  'One more launch. One better ending.',
  'You know what got you. Fix it.',
  'That was not defeat. That was scouting.',
  'Pilot down. Ego intact. Relaunch.',
  'The swarm got one. Don\'t let them keep it.',
  'Again. Cleaner. Meaner. Faster.',
  'You are one upgrade away from violence.',
  'The next boss is already sweating.',
  'Run it back before the wreckage cools.',
  'Good pilots retry. Great pilots obsess.',
  'You were warming up the cannons.',
  'Do not end on that explosion.',
  'One more run. Make Nova Command proud.'
];

export const GAME_OVER_CTA_RECENT_HISTORY_KEY = 'novaSwarm.gameOverCta.recent.v1';
export const GAME_OVER_CTA_RECENT_HISTORY_SIZE = 5;

export const gameOverCtaVoiceLines = CTA_TEXTS.map((text, index) => {
  const number = String(index + 1).padStart(2, '0');
  const id = `one_more_run_${number}`;
  return {
    id,
    text,
    audioPath: `/audio/voice/cta/${id}.mp3`
  };
});
