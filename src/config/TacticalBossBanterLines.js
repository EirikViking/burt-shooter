import {
  BOSS_DEATH_DEFAULT_VOICE_ID,
  BOSS_DEATH_DEFAULT_VOICE_NAME,
  BOSS_DEATH_MODEL_ID
} from './BossDeathVoiceLines.js';

export const TACTICAL_BOSS_BANTER_TOTAL_COUNT = 297;
export const TACTICAL_BOSS_BANTER_DEFAULT_VOICE_ID = BOSS_DEATH_DEFAULT_VOICE_ID;
export const TACTICAL_BOSS_BANTER_DEFAULT_VOICE_NAME = `${BOSS_DEATH_DEFAULT_VOICE_NAME} - Tactical Inspector`;
export const TACTICAL_BOSS_BANTER_MODEL_ID = BOSS_DEATH_MODEL_ID;

const sentence = (value) => `${String(value || '').charAt(0).toUpperCase()}${String(value || '').slice(1)}`;

const COMMENT_BUILDERS = Object.freeze([
  (profile) => `${profile.name}! ${profile.benefit}!`,
  (profile) => `${sentence(profile.gear)}? ${profile.absurdity}!`,
  (profile) => `${profile.verdict}!`,
  (profile) => `The manual says ${profile.manual}. Cowardly manual!`,
  (profile) => `${profile.enemy}!`,
  (profile) => `${profile.name}: ${profile.risk}!`,
  (profile) => `${profile.absurdity}!`,
  (profile) => `${sentence(profile.gear)} inspected. ${sentence(profile.manual)}!`,
  (profile) => `${profile.threat}!`
]);

const BONUS_COMMENT_BUILDER = (profile) => (
  `Oh, ${profile.name}! ${sentence(profile.risk)}!`
);

const PROFILES = Object.freeze([
  {
    id: 'damage_up', name: 'Damage Up', gear: 'warhead authority dial',
    benefit: 'Your cannon hits twelve percent harder', risk: 'the recoil is applying for a corner office',
    absurdity: 'Every shell now carries a tiny promotion letter', manual: 'aim at the enemy and let confidence do the paperwork',
    enemy: 'Armored targets have started wearing softer trousers', threat: 'Their repair crews will need repair crews',
    verdict: 'This is honesty delivered at muzzle velocity'
  },
  {
    id: 'rapid_fire', name: 'Rapid Fire', gear: 'redline firing assembly',
    benefit: 'The firing schedule has lost its lunch break', risk: 'the barrel may begin smoking in self-defense',
    absurdity: 'The trigger now clocks overtime', manual: 'keep firing until statistics apologize',
    enemy: 'The next formation just heard a stapler at impossible speed', threat: 'They will be perforated alphabetically',
    verdict: 'Quantity has put on a very convincing quality hat'
  },
  {
    id: 'rail_surge', name: 'Rail Surge', gear: 'hyper-rail timetable',
    benefit: 'Your shots arrive early and hit harder', risk: 'the space between you and the target has been downsized',
    absurdity: 'Every projectile has an express ticket and no luggage', manual: 'point once and let distance resign',
    enemy: 'Distant targets are suddenly checking the arrivals board', threat: 'There will be no delay and very little target',
    verdict: 'A punctual disaster is still excellent service'
  },
  {
    id: 'double_shot', name: 'Double Shot', gear: 'twin-verdict splitter',
    benefit: 'Every argument now arrives with a second opinion', risk: 'both opinions are armed',
    absurdity: 'The ammunition has discovered teamwork and immediately abused it', manual: 'send two smaller problems at every larger problem',
    enemy: 'Enemy lanes are trying to stand behind each other', threat: 'Geometry will not save them',
    verdict: 'Two barrels make diplomacy twice as brief'
  },
  {
    id: 'pierce', name: 'Pierce', gear: 'through-hull travel permit',
    benefit: 'Your shots refuse to stop at the first enemy', risk: 'the second enemy was not consulted',
    absurdity: 'Each projectile has packed snacks for the entire formation', manual: 'line them up and let momentum conduct the interview',
    enemy: 'The swarm is reconsidering single-file formation', threat: 'Their back row is now the front row with worse news',
    verdict: 'Stopping after one hull is for sentimental ammunition'
  },
  {
    id: 'target_paint', name: 'Target Paint', gear: 'kill-warrant highlighter',
    benefit: 'Every hostile receives a bright legal suggestion', risk: 'subtlety has been removed from the equipment list',
    absurdity: 'The targeting computer is circling enemies with an angry crayon', manual: 'mark everything and pretend the glow is consent',
    enemy: 'The swarm has become a very nervous art exhibition', threat: 'Every highlighted piece is leaving through the gift shop',
    verdict: 'If it glows it owes you an explosion'
  },
  {
    id: 'plasma_lance', name: 'Plasma Lance', gear: 'sunspear pressure tube',
    benefit: 'One bright line now carries a deeply personal amount of damage', risk: 'the cannon needs a dramatic breath between speeches',
    absurdity: 'A small star has been sharpened and issued office hours', manual: 'wait for the line and then erase the line',
    enemy: 'Heavy targets are moving sideways before you even aim', threat: 'Their caution will merely improve the angle',
    verdict: 'This is not suppressing fire this is a celestial complaint'
  },
  {
    id: 'chain_lightning', name: 'Chain Lightning', gear: 'storm-court introduction coil',
    benefit: 'One successful hit introduces itself to the next target', risk: 'the introductions are extremely conductive',
    absurdity: 'Electricity has started networking professionally', manual: 'hit the crowded enemy and let gossip do the rest',
    enemy: 'Packed formations are quietly unfriending one another', threat: 'Personal space is about to become survival equipment',
    verdict: 'The first target is a fuse with colleagues'
  },
  {
    id: 'speed_up', name: 'Speed Up', gear: 'comet-drive irresponsibility lever',
    benefit: 'Your ship moves ten percent faster', risk: 'the brakes remain a philosophical concept',
    absurdity: 'Momentum has been promoted without a background check', manual: 'change lanes before the mistake files an appointment',
    enemy: 'Enemy gunners are leading a target that has already left', threat: 'Their predictions will arrive fashionably dead',
    verdict: 'Speed is armor for pilots who refuse to be where bullets happen'
  },
  {
    id: 'blink_drive', name: 'Blink Drive', gear: 'nullstep reality disagreement engine',
    benefit: 'Movement improves and Phase returns sooner', risk: 'causality may ask where you went',
    absurdity: 'The ship briefly becomes a rumor with excellent acceleration', manual: 'leave reality early and return after the paperwork',
    enemy: 'Enemy aim computers are buffering your last known existence', threat: 'They cannot hit a scheduling conflict',
    verdict: 'A shorter dodge cooldown is just punctual cowardice'
  },
  {
    id: 'vector_boost', name: 'Vector Boost', gear: 'vector-crown momentum tailor',
    benefit: 'You move faster and remain phased a little longer', risk: 'momentum is now wearing formal clothes',
    absurdity: 'The drive has added shoulder pads to your velocity', manual: 'enter the lane with confidence and leave it before consequences',
    enemy: 'Tracking turrets are requesting a wider swivel budget', threat: 'Their accountants have denied it',
    verdict: 'Elegant speed is still rude to projectiles'
  },
  {
    id: 'shield', name: 'Shield', gear: 'sector-start personal bubble',
    benefit: 'Every new sector begins with one free mistake', risk: 'the shield leaves immediately after correcting it',
    absurdity: 'A glowing circle has volunteered as temporary management', manual: 'spend the shield on danger not on decorative collisions',
    enemy: 'The first hostile bullet has discovered unpaid labor', threat: 'It will work one shift and achieve nothing',
    verdict: 'A disposable miracle is still a miracle with good timing'
  },
  {
    id: 'ghost', name: 'Ghost', gear: 'wraith-shell suggestion filter',
    benefit: 'Each sector opens with one second of polite incorporeality', risk: 'the second ends faster than a heroic monologue',
    absurdity: 'Bullets briefly classify you as an administrative rumor', manual: 'pick a safe lane before matter remembers you',
    enemy: 'Opening volleys are aiming at your previous legal status', threat: 'Their evidence will pass straight through',
    verdict: 'Invulnerability is best served brief cold and confusing'
  },
  {
    id: 'point_defense', name: 'Point Defense', gear: 'aegis-grid bullet doorman',
    benefit: 'Nearby hostile shots are refused entry for four and a half seconds', risk: 'the doorman has no guest list and excellent reflexes',
    absurdity: 'Every incoming bullet is being told the venue is full', manual: 'use the opening to move before security takes lunch',
    enemy: 'The first barrage has arrived without reservations', threat: 'It will be deleted at the velvet rope',
    verdict: 'Hospitality ends exactly where the interception ring begins'
  },
  {
    id: 'nano_patch', name: 'Nano Patch', gear: 'single-use life stapler',
    benefit: 'One life returns immediately', risk: 'the repair crew becomes vapor after clocking out',
    absurdity: 'Nanobots are repairing the hull while arguing about who caused this', manual: 'accept the life and do not inspect the invoice',
    enemy: 'The boss thought the previous damage was permanent', threat: 'Disappointing management is a tactical resource',
    verdict: 'Nothing says resilience like disposable microscopic contractors'
  },
  {
    id: 'magnet', name: 'Magnet', gear: 'gravity-well reward negotiator',
    benefit: 'Loose pickups reconsider their independence from farther away', risk: 'the evasive two-life prize has retained counsel',
    absurdity: 'Nearby loot is being summoned by a very small legal moon', manual: 'fly near opportunity and let gravity become pushy',
    enemy: 'Dropped rewards are trying to unionize against attraction', threat: 'Their orbit clause is unenforceable',
    verdict: 'Collection is easier when distance loses the argument'
  },
  {
    id: 'drones', name: 'Drones', gear: 'permanent support-drone timesheet shredder',
    benefit: 'One more helper copies your firing rhythm', risk: 'it submits no timesheets and asks no useful questions',
    absurdity: 'A tiny armed coworker has joined without completing orientation', manual: 'shoot confidently and let the drone imitate your bad influence',
    enemy: 'The swarm is counting ships and getting a fractional headache', threat: 'Your unpaid intern has live ammunition',
    verdict: 'Teamwork is beautiful when the teammate is mostly cannon'
  },
  {
    id: 'bomb', name: 'Bomb Rack', gear: 'siege-rack structural optimism dispenser',
    benefit: 'Every sector begins with two heavy bomb shots', risk: 'the floor has filed a preemptive complaint',
    absurdity: 'Two enormous answers are waiting for much smaller questions', manual: 'save them for crowds or ignore restraint magnificently',
    enemy: 'Dense formations are suddenly researching open-plan offices', threat: 'Their lease expires on detonation',
    verdict: 'Preparedness is two bombs and no follow-up questions'
  },
  {
    id: 'orbital_strike', name: 'Orbital Strike', gear: 'sky-tribunal priority stamp',
    benefit: 'Every sector begins with two arguments from above', risk: 'space needs a moment to decide where down is',
    absurdity: 'The sky has been given a clipboard and target authority', manual: 'mark the priority target then stand outside the meeting',
    enemy: 'Important hostiles are looking nervously at the ceiling of space', threat: 'The ceiling has accepted their case',
    verdict: 'Delegating violence to orbit is executive thinking'
  },
  {
    id: 'phase_reactor', name: 'Phase Reactor', gear: 'spacetime firing-permit reactor',
    benefit: 'Phasing instantly primes your next volley', risk: 'physics has filed a complaint in the wrong queue',
    absurdity: 'Reality stamps your ammunition while you are briefly absent', manual: 'Phase first then return with something impolite chambered',
    enemy: 'Pursuers expect an escape and receive a loaded reappearance', threat: 'Their surprise will be ballistically documented',
    verdict: 'A dodge that reloads is cowardice with excellent follow-through'
  },
  {
    id: 'focus_lens', name: 'Focus Lens', gear: 'expensive photon discipline glass',
    benefit: 'Focused shots deal eighteen percent more damage', risk: 'the ship must briefly pretend to be deliberate',
    absurdity: 'Every loose photon is being marched through the fancy window', manual: 'hold Focus and make one direction regret existing',
    enemy: 'Straight-ahead targets are practicing curved movement', threat: 'They have misunderstood the assignment',
    verdict: 'Concentration is just anger with optics'
  },
  {
    id: 'inertial_dampers', name: 'Inertial Dampers', gear: 'municipal-moon momentum cup holder',
    benefit: 'Focused movement keeps twenty-two percent more speed', risk: 'the manual insists this was always intentional',
    absurdity: 'Your momentum now has padding cup holders and legal representation', manual: 'weave precisely without towing the entire municipality',
    enemy: 'Aiming solutions expect Focus to make you sluggish', threat: 'They will solve the wrong equation beautifully',
    verdict: 'Control is speed after it learns indoor manners'
  },
  {
    id: 'phase_wake', name: 'Phase Wake', gear: 'causality-hole broom attachment',
    benefit: 'Phasing clears hostile bullets within fifty-eight pixels', risk: 'score remains stubbornly uncleaned',
    absurdity: 'Your exit leaves a tiny hole in causality and a large hole in paperwork', manual: 'Phase through the mess and let reality sweep behind you',
    enemy: 'Nearby bullets are discovering they were never invited', threat: 'The wake will edit them out of the minutes',
    verdict: 'Evasion is better when it tidies the room'
  },
  {
    id: 'slipstream_coils', name: 'Slipstream Coils', gear: 'motion-powered Phase piggy bank',
    benefit: 'Moving recharges Phase eighteen percent faster', risk: 'standing still remains legal and spiritually suspicious',
    absurdity: 'The coils are stealing charge from the trail you already abandoned', manual: 'keep moving and invoice the vacuum for energy',
    enemy: 'The swarm wants you pinned in one place', threat: 'Your recharge schedule has rejected the premise',
    verdict: 'Momentum now pays interest in disappearance'
  },
  {
    id: 'emergency_bulkhead', name: 'Emergency Bulkhead', gear: 'one-life panic architecture',
    benefit: 'At one life each sector opens with six seconds of shield', risk: 'nobody agrees which bits of the ship are important',
    absurdity: 'A bulkhead slams around everything and calls that precision engineering', manual: 'enter danger while the emergency furniture is still deployed',
    enemy: 'The swarm smells one remaining life and expects softness', threat: 'It will bite six seconds of reinforced disappointment',
    verdict: 'Desperation is stronger when it has hinges'
  },
  {
    id: 'impact_foam', name: 'Impact Foam', gear: 'fluorescent crater bureaucracy nozzle',
    benefit: 'Post-hit safety lasts three tenths longer', risk: 'the safety memo may catch fire before you finish reading it',
    absurdity: 'Every fresh hole is filled with foam and aggressive optimism', manual: 'get hit once then use the extra moment to be elsewhere',
    enemy: 'Follow-up shots expect your invulnerability to expire on schedule', threat: 'The schedule has been padded literally',
    verdict: 'Three tenths is a holiday when the hull is already screaming'
  },
  {
    id: 'graze_plating', name: 'Graze Plating', gear: 'near-miss bad-decision collector',
    benefit: 'Six clean grazes weld themselves into one shield per sector', risk: 'five and a half remains an accounting nightmare',
    absurdity: 'Microscopic flakes of danger are being recycled into confidence', manual: 'miss death narrowly six times and demand a loyalty reward',
    enemy: 'Bullets that almost hit you are accidentally funding your defense', threat: 'Their failure has a punch card',
    verdict: 'Close calls are currency if you are reckless with receipts'
  },
  {
    id: 'last_light', name: 'Last Light', gear: 'final-warning-lamp Phase accelerator',
    benefit: 'At one life Phase recharges fifteen percent faster', risk: 'the lamp has stopped blinking and started screaming',
    absurdity: 'Your emergency light is bullying the drive into better performance', manual: 'when the counter says one make absence your profession',
    enemy: 'The swarm thinks one life means fewer escapes', threat: 'Your last light has learned spite',
    verdict: 'Nothing recharges courage like a very specific catastrophe'
  },
  {
    id: 'combo_anchor', name: 'Combo Anchor', gear: 'scoring-clock docking form',
    benefit: 'Combo chains gain six hundred and fifty milliseconds of breathing room', risk: 'time is annoyed but technically compliant',
    absurdity: 'A tiny anchor has been dropped into the concept of hurry', manual: 'keep the chain alive while the clock argues with harbor control',
    enemy: 'A gap in targets expects your combo to collapse', threat: 'The anchor has delayed disappointment',
    verdict: 'You cannot stop time but you can make it queue'
  },
  {
    id: 'salvage_clock', name: 'Salvage Clock', gear: 'almost-lost opportunity wristwatch',
    benefit: 'Dropped pickups linger twenty-two percent longer', risk: 'they may mistake floating for a retirement plan',
    absurdity: 'Every reward has received an extension and a stern calendar invite', manual: 'collect the loot before its second notice becomes embarrassing',
    enemy: 'The battlefield expects abandoned rewards to drift away', threat: 'Your clock has filed for more loitering',
    verdict: 'Opportunity knocks longer when you confiscate its watch'
  },
  {
    id: 'power_saver', name: 'Power Saver', gear: 'heroic low-power danger extender',
    benefit: 'Timed powerups last eighteen percent longer', risk: 'screen brightness remains heroically unchanged',
    absurdity: 'The battery setting has chosen to conserve everything except restraint', manual: 'activate danger efficiently and enjoy the extended warranty',
    enemy: 'The swarm is waiting for your powerup to end', threat: 'It should have brought a longer lunch',
    verdict: 'Efficiency is making the dangerous part overstay politely'
  },
  {
    id: 'drone_link', name: 'Drone Link', gear: 'support-drone restaurant-filter uplink',
    benefit: 'Tactical drone shots deal eighteen percent more damage', risk: 'their restaurant recommendations remain alarmingly specific',
    absurdity: 'The drones have finally shared targeting data instead of noodle reviews', manual: 'let the little machines coordinate something besides lunch',
    enemy: 'Hostiles dismissed the support drones as decorative coworkers', threat: 'The coworkers have upgraded their performance review',
    verdict: 'Networking is useful when every connection carries ammunition'
  }
]);

export const tacticalBossBanterGroups = Object.freeze(PROFILES.map((profile, profileIndex) => {
  const event = `boss_tactical_inspect_${profile.id}`;
  const comments = COMMENT_BUILDERS.map((build) => build(profile));
  if (profileIndex < 9) comments.push(BONUS_COMMENT_BUILDER(profile));
  return Object.freeze({
    id: profile.id,
    event,
    comments: Object.freeze(comments)
  });
}));

export const TACTICAL_BOSS_BANTER_EVENT_IDS = Object.freeze(tacticalBossBanterGroups.map((group) => group.event));
export const TACTICAL_BOSS_BANTER_EVENT_COUNTS = Object.freeze(Object.fromEntries(
  tacticalBossBanterGroups.map((group) => [group.event, group.comments.length])
));

export const tacticalBossBanterLines = Object.freeze(tacticalBossBanterGroups.flatMap((group) => (
  group.comments.map((text, index) => Object.freeze({
    id: `${group.event}_${String(index + 1).padStart(3, '0')}`,
    event: group.event,
    augmentId: group.id,
    text,
    generationText: `[huge theatrical alien boss voice, amused, silly but clear, quick tactical aside] ${text}`
  }))
)));

const EVENT_BY_AUGMENT = new Map(tacticalBossBanterGroups.map((group) => [group.id, group.event]));

export function getTacticalBossBanterEvent(augmentId) {
  return EVENT_BY_AUGMENT.get(String(augmentId || '')) || null;
}
