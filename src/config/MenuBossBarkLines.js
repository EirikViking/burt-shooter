import { BOSS_DEATH_DEFAULT_VOICE_ID, BOSS_DEATH_DEFAULT_VOICE_NAME, BOSS_DEATH_MODEL_ID } from './BossDeathVoiceLines.js';

export const MENU_BOSS_BARK_VARIANTS_PER_EVENT = 17;
export const MENU_BOSS_BARK_DEFAULT_VOICE_ID = BOSS_DEATH_DEFAULT_VOICE_ID;
export const MENU_BOSS_BARK_DEFAULT_VOICE_NAME = `${BOSS_DEATH_DEFAULT_VOICE_NAME} - Menu Bark`;
export const MENU_BOSS_BARK_MODEL_ID = BOSS_DEATH_MODEL_ID;

export const menuBossBarkGroups = [
  {
    id: 'launch',
    event: 'boss_menu_bark_launch',
    lines: [
      'Mayhem run! Finally, a button with ambition!',
      'Launch! The cabinet demands bad decisions at full speed!',
      'Mayhem run! Your insurance form just burst into flames!',
      'Launch the ranked run! I have cleared my calendar for screaming!',
      'Mayhem! Put your tiny ship where the danger lives!',
      'Launch! The scoreboard is hungry and it brought a fork!',
      'Ranked run! Excellent, press the bravery rectangle!',
      'Mayhem run! The swarm asked for a polite meeting. I declined!',
      'Launch! Today we convert anxiety into leaderboard paperwork!',
      'Mayhem! Every sensible advisor has left the room!',
      'Ranked run! Your ship is small, your confidence is legally suspicious!',
      'Launch! The boss gate is already practicing your name!',
      'Mayhem run! I love this button. It has consequences!',
      'Launch! Turn that menu confidence into plasma receipts!',
      'Ranked run! I hope your thumbs have a lawyer!',
      'Mayhem! The cabinet lights are blinking like they know something!',
      'Launch! If this goes badly, we blame the button!'
    ]
  },
  {
    id: 'scout',
    event: 'boss_menu_bark_scout',
    lines: [
      'Scout run! Practice mode, but with dramatic posture!',
      'Scout run! Sneak in, learn things, pretend it was the plan!',
      'Practice! The swarm will still judge your steering!',
      'Scout run! A polite little disaster rehearsal!',
      'Practice mode! No ranked shame, only educational panic!',
      'Scout run! Touch danger gently, like a button with teeth!',
      'Practice! Warm up the lasers and the excuses!',
      'Scout run! A training run wearing combat eyeliner!',
      'Practice mode! The leaderboard is not watching. Probably!',
      'Scout run! Get clever before the boss gets theatrical!',
      'Practice! Calibrate your bravery in medium portions!',
      'Scout run! Low pressure, high neon, suspicious noises!',
      'Practice mode! The cabinet calls this professional development!',
      'Scout run! A tiny vacation inside a bullet factory!',
      'Practice! Find the dodge rhythm before it finds you!',
      'Scout run! Stretch those thumbs, hero of paperwork!',
      'Practice mode! The swarm hates confidence, so bring samples!'
    ]
  },
  {
    id: 'sector_start',
    event: 'boss_menu_bark_sector_start',
    lines: [
      'Sector run! Skip the appetizer and bite the lightning!',
      'Sector start! Jump straight to the spicy hallway!',
      'Checkpoint push! Because beginnings are for people with time!',
      'Sector run! Choose your entrance wound with style!',
      'Checkpoint mode! The boss gate kept your seat warm!',
      'Sector start! Time travel, but mostly into trouble!',
      'Checkpoint push! The cabinet loves a shortcut with liability!',
      'Sector run! Pick a sector and insult it personally!',
      'Sector start! The swarm hates fast travel, which is why we do it!',
      'Checkpoint push! Your previous mistakes have become a menu!',
      'Sector run! Select the danger floor and hold the railing!',
      'Sector start! Straight to the part with expensive explosions!',
      'Checkpoint push! Small menu, large consequences!',
      'Sector run! We skip breakfast and eat lasers!',
      'Sector start! Please keep arms inside the catastrophe!',
      'Checkpoint push! The cabinet has filed this under brave-ish!',
      'Sector run! Pick a wound, any wound!'
    ]
  },
  {
    id: 'hangar',
    event: 'boss_menu_bark_hangar',
    lines: [
      'Ship hangar! Go admire the machines that make you overconfident!',
      'Hangar! Choose a hull and call it a personality!',
      'Ship hangar! The shiny one is judging you already!',
      'Hangar! Where tiny ships receive enormous pep talks!',
      'Ship hangar! Upgrade your confidence until it becomes a problem!',
      'Hangar! Pick the craft that best matches your questionable plan!',
      'Ship hangar! The cabinet polished these with fear and coupons!',
      'Hangar! Every hull says hero. Some whisper hospital!',
      'Ship hangar! Fashion, firepower, and a little denial!',
      'Hangar! Select your favorite metal apology!',
      'Ship hangar! This is where dodging becomes interior design!',
      'Hangar! Choose the wings that will carry your bad idea!',
      'Ship hangar! The engines are warm and emotionally unstable!',
      'Hangar! Upgrade, customize, and nod like you understand thrust!',
      'Ship hangar! A gallery of beautiful escape clauses!',
      'Hangar! Your next mistake deserves a fresh paint job!',
      'Ship hangar! Press confidently; the bolts are mostly tight!'
    ]
  },
  {
    id: 'leaderboard',
    event: 'boss_menu_bark_leaderboard',
    lines: [
      'Leaderboard! Behold the wall of magnificent showoffs!',
      'Leaderboard! Numbers wearing little crowns!',
      'Global rankings! Your ego has entered the courtroom!',
      'Leaderboard! Let us measure glory in suspicious digits!',
      'Rankings! Somewhere up there, someone needs less sleep!',
      'Leaderboard! The cabinet keeps score because feelings are expensive!',
      'Global rankings! Time to stare at other peoples miracles!',
      'Leaderboard! Your name wants a taller chair!',
      'Rankings! The top slot is smirking at you!',
      'Leaderboard! A museum of excellent life choices, allegedly!',
      'Global rankings! Every score is a tiny space monument!',
      'Leaderboard! Check the numbers, then blame gravity!',
      'Rankings! The swarm hates being turned into statistics!',
      'Leaderboard! I smell ambition and burnt circuitry!',
      'Global rankings! This is where bragging gets audited!',
      'Leaderboard! Look upon the digits and plot revenge!',
      'Rankings! May your next score need commas!'
    ]
  },
  {
    id: 'threat_codex',
    event: 'boss_menu_bark_threat_codex',
    lines: [
      'Threat codex! Read the enemy menu before it reads you!',
      'Codex! The swarm has footnotes and they are rude!',
      'Threat codex! Study the things trying to rearrange you!',
      'Enemy intel! Knowledge is cheaper than repairs!',
      'Codex! Open the spooky binder of incoming nonsense!',
      'Threat codex! Learn their tricks, then make them regret literacy!',
      'Enemy intel! Every page says dodge better, but with diagrams!',
      'Codex! The cabinet calls this homework with explosions!',
      'Threat codex! Meet the hostile shapes in alphabetical panic!',
      'Enemy intel! If it glows, it probably has opinions!',
      'Codex! Because guessing is just strategy without shoes!',
      'Threat codex! The swarm filed itself for your convenience!',
      'Enemy intel! Read now, scream less later!',
      'Codex! Delicious facts about terrible objects!',
      'Threat codex! The manual for things that dislike you!',
      'Enemy intel! Become annoyingly prepared!',
      'Codex! Open the book. The book is judging your dodge timing!'
    ]
  },
  {
    id: 'achievements',
    event: 'boss_menu_bark_achievements',
    lines: [
      'Achievements! Tiny trophies for surviving nonsense!',
      'Achievements! The sticker museum opens its dramatic doors!',
      'Progress! Look at all your verified button crimes!',
      'Achievements! Proof that the cabinet was watching the whole time!',
      'Trophies! Little medals for large problems!',
      'Achievements! Collectible brag rectangles, freshly polished!',
      'Progress! Your chaos has documentation now!',
      'Achievements! The wall of yes, somehow you did that!',
      'Trophies! Each one says please do that again, but louder!',
      'Achievements! Your accomplishments have formed a committee!',
      'Progress! Numbers, badges, and suspicious applause!',
      'Achievements! The cabinet loves measurable recklessness!',
      'Trophies! Open the vault of certified nonsense!',
      'Achievements! A parade of tiny victory paperwork!',
      'Progress! You broke things so neatly we gave you icons!',
      'Achievements! The badge shelf is hungry!',
      'Trophies! Your past self is filing a noise complaint!'
    ]
  },
  {
    id: 'settings',
    event: 'boss_menu_bark_settings',
    lines: [
      'Settings! Adjust the universe until it stops wobbling!',
      'Settings! The sacred menu of knobs and consequences!',
      'Audio and video! Tune the cabinet, spare the neighbors!',
      'Settings! Make the screen behave or threaten it politely!',
      'Options! Where brave pilots negotiate with brightness!',
      'Settings! Turn the noise down, unless the noise is me!',
      'Audio and video! Finally, a battlefield with sliders!',
      'Settings! The boss respects a properly configured display!',
      'Options! Choose comfort before the lasers choose chaos!',
      'Settings! The cabinet has preferences and strong opinions!',
      'Audio and video! Calibrate the drama per square inch!',
      'Settings! Twist the dials, awaken the responsible adult!',
      'Options! Because even panic deserves customization!',
      'Settings! Your monitor and I demand attention!',
      'Audio and video! Tune it until the future looks expensive!',
      'Settings! This is where volume becomes diplomacy!',
      'Options! Press here to negotiate with reality!'
    ]
  },
  {
    id: 'music',
    event: 'boss_menu_bark_music',
    lines: [
      'Music! Flip the soundtrack switch like a tiny concert tyrant!',
      'Music toggle! The cabinet beat has entered negotiations!',
      'Music! On or off, the drama remains legally binding!',
      'Soundtrack! Make the stars dance or sit quietly!',
      'Music! The menu has rhythm and questionable taste!',
      'Music toggle! Silence is tactical, but less fabulous!',
      'Music! Turn the heroic sauce up or down!',
      'Soundtrack! The boss theme is stretching backstage!',
      'Music! Choose whether the room gets extra neon!',
      'Music toggle! Your ears have requested representation!',
      'Music! The cabinet orchestra awaits orders!',
      'Soundtrack! Less beep, more bossy opera!',
      'Music! Flip it before the bass gets ideas!',
      'Music toggle! The stars are humming through the walls!',
      'Music! The soundtrack has signed the waiver!',
      'Soundtrack! Turn the mood engine, pilot!',
      'Music! Even silence sounds expensive in space!'
    ]
  },
  {
    id: 'how_to_play',
    event: 'boss_menu_bark_how_to_play',
    lines: [
      'How to play! Instructions, the bravest kind of spoiler!',
      'How to play! Read this before the lasers teach aggressively!',
      'Tutorial! The cabinet explains survival without sarcasm. Mostly!',
      'How to play! Learn the buttons before they learn you!',
      'Instructions! A map for your future panic!',
      'How to play! The secret is dodge, shoot, repeat, do not explode!',
      'Tutorial! Knowledge has entered the chat with shoulder pads!',
      'How to play! The manual is short because the lasers are impatient!',
      'Instructions! Read fast; danger hates waiting rooms!',
      'How to play! A tiny school for enormous explosions!',
      'Tutorial! Training wheels, but made of neon!',
      'How to play! The cabinet promises this counts as studying!',
      'Instructions! Every line reduces one future scream!',
      'How to play! Learn now, improvise later, brag eventually!',
      'Tutorial! The button bible with fewer miracles!',
      'How to play! We explain the chaos, then sell you chaos!',
      'Instructions! Read them before your ship becomes punctuation!'
    ]
  },
  {
    id: 'exit',
    event: 'boss_menu_bark_exit',
    lines: [
      'Exit game! Retreat? Dramatic, but permitted!',
      'Exit! Leaving already? I had more yelling prepared!',
      'Exit game! The cabinet will keep your chair warm!',
      'Quit? Bold choice, pilot of the pause dimension!',
      'Exit! Fine, go touch reality. It has worse graphics!',
      'Exit game! I will pretend this was tactical!',
      'Quit! The swarm survives another administrative decision!',
      'Exit! Your bravery is buffering!',
      'Exit game! Close the cabinet, open the snack protocol!',
      'Quit? The boss was just about to say something rude!',
      'Exit! We shall file this under strategic absence!',
      'Exit game! Take your thumbs, they have suffered enough!',
      'Quit! The menu will remember your tiny betrayal!',
      'Exit! I respect a clean escape with paperwork!',
      'Exit game! Retreat has excellent lighting today!',
      'Quit! The stars dim one neon button at a time!',
      'Exit! Until next time, suspiciously mortal pilot!'
    ]
  },
  {
    id: 'sector_select',
    event: 'boss_menu_bark_sector_select',
    lines: [
      'Sector selected! Excellent, you chose a problem with coordinates!',
      'Checkpoint chosen! The danger elevator is listening!',
      'Sector pick! That one looks angry in a professional way!',
      'Selected! The map just coughed nervously!',
      'Checkpoint! A fine vintage of incoming pain!',
      'Sector selected! The cabinet approves this questionable route!',
      'Pick confirmed! The sector has been insulted directly!',
      'Checkpoint chosen! Fast travel to consequences!',
      'Sector pick! Pack courage and maybe a receipt!',
      'Selected! The swarm just updated its complaint file!',
      'Checkpoint! This shortcut smells like voltage!',
      'Sector selected! Your future self is taking notes!',
      'Pick confirmed! A spicy address for a tiny ship!',
      'Checkpoint chosen! The boss gate is clearing its throat!',
      'Sector pick! The map blinks red because it cares!',
      'Selected! Travel advisory: extremely rude lasers!',
      'Checkpoint! Lovely choice, medically ambitious!'
    ]
  },
  {
    id: 'cancel',
    event: 'boss_menu_bark_cancel',
    lines: [
      'Cancel! Wise pause, dramatic eyebrow!',
      'Cancel! The exit door has been denied glory!',
      'Back! Excellent, the menu lives another second!',
      'Cancel! A tactical no with excellent posture!',
      'Back! Retreat from retreat, very advanced!',
      'Cancel! The cabinet appreciates commitment issues!',
      'Back! You have spared the quit button its big speech!',
      'Cancel! That was almost responsible!',
      'Back! The menu exhales in neon relief!',
      'Cancel! Your indecision has texture!',
      'Back! We return to safer nonsense!',
      'Cancel! The dramatic exit has been postponed!',
      'Back! A reverse retreat, rarely seen in nature!',
      'Cancel! The boss voice remains employed!',
      'Back! The button sighs, but professionally!',
      'Cancel! You have chosen more menu. Correct!',
      'Back! Reality can wait in the hallway!'
    ]
  },
  {
    id: 'idle',
    event: 'boss_menu_bark_idle',
    lines: [
      'Still here? Wonderful. The launch button was starting to develop abandonment issues!',
      'Pilot, I respect the menu meditation, but the swarm is not going to explode itself!',
      'One more run. Tiny ship, enormous consequences, excellent use of furniture!',
      'The cabinet is humming because it believes in you, or because a wire is dramatic!',
      'If you start now, I promise to shout encouragement with completely unreasonable confidence!',
      'The leaderboard just whispered your name and then pretended it was stretching!',
      'Idle detected. Converting hesitation into a strongly worded launch recommendation!',
      'Your ship is warmed up, your excuses are refrigerated, and the swarm is available!',
      'Press Mayhem. The button has been doing pushups while you were thinking!',
      'I have counted fourteen menu stars and none of them are as shiny as a new high score!',
      'Pilot, the safest place is not the menu. It is moving very fast through bullets!',
      'The boss gate asked if you were scared. I said probably, but charmingly!',
      'One more run would be medically inadvisable and spiritually excellent!',
      'Your thumbs are just standing there wearing tiny uniforms. Deploy them!',
      'The swarm is rehearsing an entrance. Rude to miss it, honestly!',
      'Menu idling is legal, but the cabinet prefers crimes against enemy geometry!',
      'I made a tiny trophy out of impatience. It says start another run!',
      'The launch deck lights are blinking in Morse code. It says stop browsing!',
      'I can smell a personal best behind that button. It smells like hot neon!',
      'Another run? Yes. The answer arrived wearing a cape and making engine noises!',
      'Your ship has not exploded for several seconds. Suspicious. Correct this!',
      'The menu is lovely, but it contains fewer lasers than science recommends!',
      'Commander, I have prepared a motivational speech and thirty-seven backup insults!',
      'The swarm filed a complaint. It says you are making it wait in formation!',
      'Start one more run and I will pretend this was your idea the whole time!',
      'That Mayhem button is not decoration. It is a dare with excellent typography!',
      'Pilot, breathe in, select courage, breathe out, immediately regret nothing!',
      'The cabinet wants another story, ideally one with score multipliers and panic!',
      'High scores do not happen in menus, except emotionally, and that barely counts!',
      'If you launch now, I will personally overreact to every good dodge!'
    ]
  }
];

export const MENU_BOSS_BARK_EVENT_IDS = menuBossBarkGroups.map((group) => group.event);
export const MENU_BOSS_BARK_EVENT_COUNTS = Object.freeze(Object.fromEntries(
  menuBossBarkGroups.map((group) => [group.event, group.lines.length])
));

export const menuBossBarkLines = menuBossBarkGroups.flatMap((group) =>
  group.lines.map((text, index) => ({
    id: `${group.event}_${String(index + 1).padStart(3, '0')}`,
    event: group.event,
    groupId: group.id,
    text,
    generationText: `[huge theatrical alien boss voice, amused and commanding, shouted menu bark] ${text}`
  }))
);

export const MENU_BOSS_BARK_TOTAL_COUNT = menuBossBarkLines.length;
