export const CODEX_LORE_VERSION = 'nova-cabinet-black-box-v1';

const AUGMENT_CODEX_NAMES = Object.freeze({
  damage_up: "MARA'S WARRANTY VOIDERS",
  rapid_fire: "AUNTIE GLITCH'S REDLINE TEETH",
  rail_surge: 'BERGET THUNDER RAIL',
  double_shot: 'THE TWO-WITNESS CLAUSE',
  pierce: "SAINT RIVET'S LONG NEEDLE",
  target_paint: "CLERK NULL'S KILL STAMP",
  plasma_lance: 'VERONA SUNSPEAR',
  chain_lightning: 'NINE-MOON STORM COURT',
  speed_up: "JUNO'S STOLEN COMET",
  blink_drive: "THE DOOR THAT WASN'T THERE",
  vector_boost: 'ROOK VECTOR VANES',
  shield: 'BAY SIX BORROWED HALO',
  ghost: 'DEAD-CHANNEL WRAITHSKIN',
  point_defense: "KNUCKLE'S AEGIS CHOIR",
  nano_patch: 'EMERGENCY SOUP & HULL PASTE',
  magnet: 'NULL MARKET GRAVITY RAKE',
  drones: 'THE TINY GUN UNION',
  bomb: 'BERGET SIEGE LUNCHBOX',
  orbital_strike: 'THE UPSTAIRS ARGUMENT',
  phase_reactor: "CAUSALITY'S UNPAID INTERN",
  focus_lens: 'THE EXPENSIVE GLASS',
  inertial_dampers: 'MUNICIPAL MOON CUPHOLDER',
  phase_wake: 'THE APOLOGY HOLE',
  slipstream_coils: 'CONTRABAND TAILWIND',
  emergency_bulkhead: 'EVERYBODY IMPORTANT GETS IN',
  impact_foam: 'FLUORESCENT REGRET CUSTARD',
  graze_plating: 'SIX BAD IDEAS, ONE SHIELD',
  last_light: 'THE LAMP THAT LEARNED TO SCREAM',
  combo_anchor: '650 MILLISECONDS OF BUREAUCRACY',
  salvage_clock: "ALMOST-LOST O'CLOCK",
  power_saver: 'DANGEROUS LOW-POWER MODE',
  drone_link: 'THE RESTAURANT RECOMMENDATION WAR'
});

const WITNESSES = Object.freeze([
  'Mara Voss, warranty arsonist',
  'Auntie Glitch on pirate radio',
  'Clerk Null, deceased but punctual',
  'Brother Torque of the Loose Bolt',
  'Juno Vale, courier and known shortcut',
  'Dockmaster Pea, undefeated at paperwork',
  'The kid in Bay Six',
  'Dr. Morrow and her emotional wrench',
  'Professor Knuckle, applied theologian',
  'The Nine-Moon Choir',
  'Saint Rivet of the Last Repair',
  'An unnamed pilot with excellent eyebrows',
  'Captain Velcro, enemy of smooth exits',
  'Sister Brakecheck of the Sudden Order',
  'Radio Plumber Nix',
  'Widow Current, licensed storm',
  'Old Madsen, legally a comet',
  'Sergeant Parsnip and his parade spoon',
  'Vicar Zero of the Empty Magazine',
  'Knifey Pete, owner of two knives',
  'Madam Afterburner',
  'the Small Claims Oracle',
  'Moon-Dog Bex',
  'Cora Flange, freelance bad example'
]);

const PLACES = Object.freeze([
  'Dock Verona',
  'Berget-9',
  'Nine-Moon Customs',
  'Ash Chapel',
  'Dead Comet Laundromat',
  'Gutter Halo',
  'Quiet Arcade',
  'Null Market',
  'Bay Six and a Half',
  'Last Honest Fuel Pump',
  'Saint Vacuum Hospital',
  'Toll Road Behind the Sun',
  'Invoice Nebula',
  'Chapel of Misfired Salvos',
  'Verona Underpass',
  'Berget Canteen',
  'Moon Nine impound',
  'Antimatter Petting Zoo',
  'Nadir Bingo Hall',
  'Cobalt Ferry',
  'Broken Saint Observatory',
  'Deep Circuit Bus Stop',
  'Red Choir Motel',
  'Last Exit Before Physics'
]);

const EPITHET_ADJECTIVES = Object.freeze([
  'Verona', 'Berget', 'Nine-Moon', 'Ash-Chapel', 'Gutter-Halo', 'Bay-Six',
  'Dead-Comet', 'Null-Market', 'Red-Receipt', 'Quiet-Arcade', 'Last-Fuel', 'Saint-Vacuum'
]);

const EPITHET_NOUNS = Object.freeze([
  'Witness', 'Heretic', 'Receipt', 'Saint', 'Problem', 'Oath',
  'Alibi', 'Miracle', 'Debtor', 'Ghost', 'Rumor', 'Knife'
]);

const ENGLISH_FACTS = Object.freeze({
  enemy: Object.freeze({
    normal: [
      'The flight card calls it a {role}: {roleDescription}. It enters on {movement}, fires {fire}, and starts collecting bad habits around sector {unlock}.',
      'Under the paint sits a {role}. Its lane rhythm is {movement}; its preferred punctuation is {fire}. Sector {unlock} is where the Swarm begins trusting it with live ammunition.',
      'Mara\'s grease-pencil note says “{role},” then underlines {movement} twice. The gun answers in {fire}, usually from sector {unlock} onward and never after saying excuse me.',
      'Treat the silhouette as a traffic sign with a grudge. This {role} uses {movement} to claim space and {fire} to charge rent; the lease begins near sector {unlock}.',
      'The cheap summary is {role}. The useful summary is {movement} on approach, {fire} after commitment, and one narrowing lane once sector {unlock} puts it on duty.',
      'Its mechanic swears the hull was built for weddings. The evidence says {role}, {movement}, and {fire}; by sector {unlock}, even the confetti has a hitbox.',
      'This contact earns its {role} badge by pairing {movement} with {fire}. It joins the roster around sector {unlock}, where hesitation becomes a shared resource for the enemy.',
      'A {role} in theory, a closing door with engines in practice. Watch {movement}, expect {fire}, and remember that sector {unlock} is when the joke receives ammunition.',
      'The nose points one way; the danger arrives another. Its {movement} approach sets up {fire}, making this {role} a priority from sector {unlock} onward.',
      'Someone at Null Market sold the Swarm a {role}. It came with {movement}, {fire}, and a warranty that expires precisely at sector {unlock}.',
      'The hull performs {movement} like a dance learned from a warning label. Then comes {fire}. That combination makes the {role} useful to formations after sector {unlock}.',
      'Its black-box résumé lists {role}, {movement}, and {fire}. The references are all craters, and the earliest available interview begins in sector {unlock}.',
      'Do not be fooled by the paint. The ship is hired as a {role}; {movement} gets it into position, {fire} makes the position everybody\'s problem, and sector {unlock} signs the cheque.',
      'This is what happens when a {role} is allowed to choose its own entrance music. The rhythm is {movement}, the chorus is {fire}, and sector {unlock} is opening night.',
      'The formation uses it as punctuation: {movement} to start the sentence, {fire} to end your lane. Its formal job is {role}, active from sector {unlock}.',
      'Brother Torque identified a {role} by listening to the bolts complain. They complained in {movement}, followed by {fire}, beginning around sector {unlock}.',
      'It flies {movement} with the confidence of forged paperwork. The {fire} system backs up the lie, turning this {role} into a real concern after sector {unlock}.',
      'The combat manual calls it {role}. Pilots call it the thing doing {movement} just before {fire} occupies the good lane. Both names become relevant at sector {unlock}.',
      'Its plan has only two verbs: approach by {movement}, then argue with {fire}. That is enough to earn the title {role} and a place in sector {unlock}.',
      'A warning stencil under the cockpit reads “{role}.” Beneath that, smaller print explains {movement}, {fire}, and why sector {unlock} should not accept collect calls.',
      'The Swarm gives this {role} one useful trick and one loud one. {movement} is the useful trick; {fire} is the loud one; sector {unlock} introduces them without supervision.',
      'Its route through the formation follows {movement}. Its weapon replies with {fire}. Together they make a {role} that starts troubling pilots near sector {unlock}.',
      'Bay Six children draw this {role} as a mouth with engines. Fair: {movement} opens the mouth, {fire} supplies the teeth, and sector {unlock} pays the dental bill.',
      'The ship enters the payroll at sector {unlock} as a {role}. It clocks in with {movement}, clocks out with {fire}, and steals your lane during lunch.'
    ],
    dangerMid: [
      'This is a midweight enforcer, the awkward cousin between fodder and royalty. It moves by {movement}, fires {fire}, and arrives from sector {unlock} onward to turn target priority into a public examination.',
      'The hull is too stubborn to ignore and too honest to blame. Expect {movement} movement, {fire} pressure, and a first appearance near sector {unlock}; remove it before the ordinary wave borrows its confidence.'
    ],
    rareChaos: [
      'The gold crown means the joke is armed. Its {loadout} rig marries {movement} movement to {fire} fire; break the hull and the wreck coughs up a guaranteed {reward}.',
      'Only three waves in a hundred invite this idiot. {loadout} supplies the bullets and lasers, {movement} supplies the bad manners, and {reward} is the apology sealed inside the wreck.'
    ],
    bossSupport: [
      'It is unarmed boss support carrying a repair tank bright enough to insult the dark. The ship will not shoot; it will reach the boss, heal the hull, and make your excellent damage somebody else\'s memory.',
      'No gun, no bluff: this support craft is a flying second health bar. Its glowing tank goes straight to the boss unless you interrupt the delivery with several firm objections.'
    ]
  }),
  attackPatterns: Object.freeze([
    'The warning uses a {telegraph} tell for roughly {readWindow} ms, then spends {budget} danger budget on the hit. That is enough time for one decision and absolutely no committee meeting.',
    'This pattern signs its crime in {telegraph} light. You get about {readWindow} ms before {budget} units of danger arrive; wait for the lock, move once, and make the return fire personal.'
  ]),
  waveTactics: Object.freeze([
    'The formation rehearses {role}. It owns entry timing first, lane pressure second, and your favorite escape route shortly after; break the lead ship before the chorus finds harmony.',
    '{role} is the opening argument. Ordinary hulls arrive on a shared clock, borrow each other\'s firing lanes, and become much less impressive when the first row loses its nerve.'
  ]),
  powerups: Object.freeze([
    'For {duration}, this pickup changes {effect}. Treat it as {read}; take it when {when}. The glow is free. The timing is your problem.',
    'The bright capsule offers {effect} for {duration}. It reads as {read}. Grab it when {when}; every other moment is an audition for a bad replay.'
  ]),
  augments: Object.freeze([
    '{detail} The stamped effect is {effect}. This hardware lasts for the run, smells faintly of ozone, and voids a warranty belonging to somebody else.',
    'Mechanically, the rig grants {effect}. The engineer\'s note says: {detail} Nobody at Dock Verona admits approving the invoice.'
  ]),
  sectors: Object.freeze([
    'The route opens on {feel}. It matters because {stakes}. Lore note: {flavor}. Practical clue: {clue}.',
    'The traffic lights remember {feel}. Out here, {stakes}. Local rumor: {flavor}. Pilot\'s clue: {clue}.'
  ]),
  elites: Object.freeze([
    'This elite combines {movement} movement, {fire} fire, and the {ability} system. Its escort screen is borrowed courage; clear the audience, then punish the cooldown.',
    'The expensive hull carries {ability}, flies {movement}, and argues with {fire}. Fodder makes it look clever. Remove the witnesses and the elite becomes a very large scheduling error.'
  ]),
  bosses: Object.freeze([
    '{title} is the title on the threat poster. The boss moves by {movement}, attacks through {attack}, and signs the room with {signature}; survive that signature before trying to look heroic.',
    'The crown file lists {movement} movement, {attack} pressure, and {signature} as the signature tell. Damage after the tell. Breathing before the damage. Autographs never.'
  ]),
  runThemes: Object.freeze([
    'The Swarm Director, a hidden command intelligence with theater-kid energy, loads {threats} into shapes such as {formations}. Watch sector one, name the pressure, then {adapt}.',
    'This is one of the Swarm Director\'s favorite lies: a hidden command intelligence arranges {threats} inside {formations} and calls it variety. Watch sector one; after that, {adapt}.'
  ]),
  cabinetLogs: Object.freeze([
    'The surviving line reads: “{line}” Context: {context} The advice underneath is practical, which is how we know the joke was written under duress.',
    'Black-box audio preserved one useful sentence: “{line}” The flight note adds: {context} Somebody laughed, somebody learned, and the repair bill declined to comment.'
  ]),
  pilotRanks: Object.freeze([
    'Rank {rank} unlocks at level {level} and {xp} career XP. The old inscription says: “{rankLore}” A rank is a scar with typography; wear it, then keep moving.',
    'The Cabinet awards rank {rank} after level {level} and {xp} career XP. Its ceremonial text is “{rankLore}” The ceremony consists of three sparks and no refund.'
  ])
});

const ENGLISH_TIPS = Object.freeze({
  enemies: [
    '{name}: read the hull before the bullets, remove the lane-maker first, then {maneuver}.',
    'Do not duel {name} for honor; it has none. Cut it out of the formation and {maneuver}.',
    'Let {name} show its route before you spend the dodge. Break the dangerous job first and {maneuver}.',
    '{name} is not the whole wave, merely the part making it worse. Delete that part, then {maneuver}.',
    'Track {name} by the nose, not the noise. Fire through its commitment and {maneuver}.',
    'When {name} enters, keep one lane boring. Boring is where survival keeps the spare key; {maneuver}.',
    'Give {name} exactly one clean read. After that, take its space, take its score, and {maneuver}.',
    '{name} wants your eyes while the formation steals your exit. Watch both, shoot the organizer, and {maneuver}.',
    'The safe answer to {name} is rarely a long drift. Hold position until the hull commits, then {maneuver}.',
    'Make {name} cross your fire instead of chasing it across the screen. Keep the return lane open and {maneuver}.',
    '{name} grows brave inside company. Remove its cheapest friends, punish the exposed route, and {maneuver}.',
    'Read {name} from silhouette to muzzle. The moment those stories disagree, trust the muzzle and {maneuver}.',
    'Against {name}, target priority is worth more than furious accuracy. Solve the lane-maker, then {maneuver}.',
    '{name} has a recovery path even when it pretends otherwise. Meet it there with fire and {maneuver}.',
    'Do not surrender center space to {name} for free. Make the hull earn every lane, then {maneuver}.',
    '{name} is easier before the wave settles around it. Intercept the entrance, clear the knot, and {maneuver}.',
    'The first shot from {name} is information. The second should find you elsewhere; {maneuver}.',
    'Use {name} as the clock for the surrounding formation. Move on its commitment, not its costume, and {maneuver}.',
    '{name} punishes automatic movement. Keep your hands quiet until the tell becomes a promise, then {maneuver}.',
    'If {name} owns the lane, stop negotiating with the lane. Change the angle, keep firing, and {maneuver}.',
    'Treat {name} like hostile furniture: route around the shape, remove it when practical, and {maneuver}.',
    '{name} cannot close every exit at once. Find the unstaffed door, shoot through it, and {maneuver}.',
    'Let the formation advertise {name}; advertisements reveal what the Swarm cannot afford to lose. Break it and {maneuver}.',
    'Your job around {name} is not elegance. Preserve room, remove pressure, and {maneuver}.'
  ],
  attackPatterns: [
    'Against {name}, let the warning finish its sentence. Move once after lock, return fire, and {maneuver}.',
    '{name} wants an early panic dodge. Refuse, cross the final geometry, then {maneuver}.'
  ],
  waveTactics: [
    'Break {name} at the leading edge. A formation without its first beat is just traffic; {maneuver}.',
    '{name} borrows courage from synchronization. Ruin the clock, keep one exit boring, and {maneuver}.'
  ],
  powerups: [
    '{name} is timing with better lighting. Collect it from a safe lane, use the whole window, and {maneuver}.',
    'Take {name} for the problem already on screen, not the fantasy problem three waves away; then {maneuver}.'
  ],
  augments: [
    'Choose {name} only if it changes your next decision. Build around the effect, not the souvenir, and {maneuver}.',
    '{name} is permanent for this run. Give it a job before taking it, then {maneuver}.'
  ],
  sectors: [
    '{name} pays pilots who arrive at the boss gate with room to breathe. Preserve an exit, bank the hulls, and {maneuver}.',
    'In {name}, the shiny lane is often a sales pitch. Make the route prove itself, then {maneuver}.'
  ],
  elites: [
    'Strip the escort from {name}, wait for the expensive system to cool, then focus fire and {maneuver}.',
    '{name} becomes mortal when nobody is covering it. Clear the cheap hulls, punish the pause, and {maneuver}.'
  ],
  bosses: [
    '{name} gets the stage; you get the tell. Survive the signature, damage the recovery, and {maneuver}.',
    'Never race {name}\'s health bar through a dirty lane. Read the crown move first, then {maneuver}.'
  ],
  runThemes: [
    'Use sector one to catch {name} lying. Name the repeated pressure, route around it, and {maneuver}.',
    '{name} changes the run\'s habits, not the laws of survival. Keep an exit, test the rhythm, and {maneuver}.'
  ],
  cabinetLogs: [
    '{name} is a receipt, not scripture. Take the useful read into the next live pattern and {maneuver}.',
    'The joke in {name} is optional; the survival note is not. Try it once, stay calm, and {maneuver}.'
  ],
  pilotRanks: [
    '{name} is proof of flights survived, not permission to get decorative. Chase the next rank after the clear and {maneuver}.',
    'Wear {name} proudly and fly like nobody cares. The next pattern has not read your résumé; {maneuver}.'
  ]
});

const ENGLISH_VOICE = Object.freeze({
  frames: Object.freeze([
    '{witness} first met {name} at {place}, halfway through {incident}. Nobody won the argument, but the black box kept this: {fact} {verdict}',
    'The official file on {name} is three redactions and a gravy stain. According to {witness}, the real version begins at {place}, with {incident}. {fact} {verdict}',
    '{name} was never supposed to become a proper noun. Then {incident} happened near {place}, and {witness} charged admission. {fact} {verdict}',
    'Ask {witness} about {name} and you get a drink, a scar, and the same story about {incident} at {place}. {fact} {verdict}',
    'At {place}, children use {name} as a rude word for broken vending machines. This dates back to {incident}; {witness} denies involvement with the confidence of a guilty moon. {fact} {verdict}',
    'There are two records of {name}. The official one says “routine contact.” The other is {witness} yelling about {incident} while {place} loses power. Trust the louder record. {fact} {verdict}',
    'The Nova Cabinet remembers {name} because it cannot forget anything, including {incident}. {witness} dragged the evidence out of {place} in a soup pot. {fact} {verdict}',
    'Clerk Null stamped {name} as “probably survivable” moments before {incident} redecorated {place}; {witness} kept the stamp. {fact} {verdict}',
    'Some signals arrive with a war cry. {name} arrived with a parking ticket, {incident}, and {witness} reversing out of {place} at criminal speed. {fact} {verdict}',
    'The first sketch of {name} was made on a noodle carton by {witness}. The second was carved into {place} during {incident}. The second is more accurate. {fact} {verdict}',
    'By law, nothing happened at {place}. In practice, {incident} happened twice and {witness} named the loudest part {name}. {fact} {verdict}',
    'Listen closely to {name} and you can hear {place} asking for its deposit back. {witness} blames {incident}, which is rude but fair. {fact} {verdict}',
    '{name} appears in the old nav charts as a coffee ring. After {incident}, {witness} added teeth and circled {place} in red. {fact} {verdict}',
    'Nobody remembers who invited {name} to {place}. Everyone remembers {witness} leaving through a window during {incident}. {fact} {verdict}',
    'The museum label for {name} simply says “do not lick.” It was donated by {witness} after {incident} made {place} briefly fashionable. {fact} {verdict}',
    '{witness} insists {name} is not cursed. The curse, apparently, belongs to {place} and only activates during {incident}. {fact} {verdict}',
    'A distress call from {place} described {name} as “the loud one.” That was before {incident} and before {witness} found the larger vocabulary. {fact} {verdict}',
    '{name} owes its reputation to three facts: {place} was uninsured, {incident} was televised, and {witness} knew the camera operator. {fact} {verdict}',
    'The salvage crew found {name} written backwards across {place}. {witness} says {incident} did that. The handwriting says otherwise. {fact} {verdict}',
    'In the ballad, {name} is beautiful and {witness} is sober. The footage from {place} during {incident} supports neither claim. {fact} {verdict}',
    '{name} has been banned from {place} under a law passed six minutes after {incident}. {witness} voted twice and still lost. {fact} {verdict}',
    'The flight school teaches {name} on Fridays, when morale is disposable. The lesson comes from {witness}, {place}, and one surviving frame of {incident}. {fact} {verdict}',
    '{witness} traded the first reliable note on {name} for a sandwich at {place}. The sandwich later testified about {incident}. {fact} {verdict}',
    'Every clock at {place} stopped when {name} arrived. {witness} blamed {incident}; the clocks blamed management. {fact} {verdict}'
  ]),
  incidents: Object.freeze([
    'the Receipt War',
    'the Tuesday Mutiny',
    'a karaoke ceasefire that lasted eleven seconds',
    'the funeral of a cargo saint',
    'the Great Soup Decompression',
    'a customs audit conducted with lasers',
    'the night gravity resigned by email',
    'the unpaid moon incident',
    'a wedding between two incompatible targeting systems',
    'the three-minute republic of Bay Six',
    'a fuel strike led by one furious teapot',
    'the silent disco court-martial',
    'the last legal comet race',
    'an argument over who owned Tuesday',
    'the vending-machine exorcism',
    'a very small coup with excellent catering',
    'the compulsory hat emergency',
    'the day all torpedoes joined the choir',
    'a hostage crisis involving one sandwich',
    'the counterfeit sunrise hearing',
    'a pilgrimage to the wrong airlock',
    'the six-minute ban on Tuesdays',
    'a duel fought entirely through customer support',
    'the midnight auction of a borrowed planet'
  ]),
  verdicts: Object.freeze([
    'Mara calls that engineering. The insurance company calls Mara by a different name.',
    'The Swarm filed an objection. It was returned full of holes.',
    'No prophecy predicted this. One invoice did, but everyone ignored it.',
    'If it looks dignified in the replay, the replay is withholding evidence.',
    'Dock Verona still sells postcards of the crater. The crater receives no royalties.',
    'The lesson is simple, useful, and therefore banned at three officer schools.',
    'Heroism is optional. Being somewhere else when the shot arrives is not.',
    'The Choir calls it fate. Brother Torque calls it a loose connector.',
    'Nobody was promoted. Several people received larger hats anyway.',
    'The Cabinet marked the result “educational” and quietly ordered more glass.',
    'This is why the hangar keeps both a priest and a fire extinguisher.',
    'History remembers the pilot. Accounting remembers the ammunition.',
    'The good news is that it can be read. The bad news has engines.',
    'Juno swears the shortcut still works, provided you redefine “works.”',
    'Remain calm in the specific, violent way practiced by professionals.',
    'Somewhere, a tiny warning light has begun smoking with purpose.',
    'The repair manual skips this chapter and goes straight to prayer.',
    'Officially, the noise is within tolerance. Tolerance has left the building.',
    'The pilot survived. The chair did not, and remains bitter.',
    'Nine-Moon Customs still wants the correct form. Nobody has the heart to tell them.',
    'This knowledge cost three bolts, one eyebrow, and a perfectly good sandwich.',
    'The stars offered no comment, having seen the invoice.',
    'Victory smells like hot copper and somebody else\'s bad plan.',
    'Keep the receipt. Legends are just accidents with documentation.'
  ]),
  maneuvers: Object.freeze([
    'leave through the lane that still looks boring',
    'save the dramatic dodge for a genuinely dramatic problem',
    'make one clean correction instead of three frightened ones',
    'let the dangerous shape finish drawing itself',
    'keep firing from the place your panic wanted to abandon',
    'cross after the threat commits, not after your nerves do',
    'spend movement like the last honest currency',
    'leave enough room for your future self to make one mistake',
    'shoot the job title before shooting the nearest employee',
    'keep the center honest and the edge suspicious',
    'take the ugly safe route and look beautiful in the result screen',
    'make the black box describe you as annoyingly alive',
    'let target priority do the shouting for you',
    'turn the recovery window into a small personal holiday',
    'leave panic unemployed for another three seconds',
    'put the loudest threat at the back of the repair queue',
    'keep one thumb on survival and the other on spite',
    'make the formation regret sharing a calendar',
    'aim where the problem is going, not where its ego currently lives',
    'borrow half a second from fear and spend it on accuracy',
    'refuse the pretty lane until it provides references',
    'treat every warning cone as a signed confession',
    'arrive at the next pattern with your dignity mostly attached',
    'send the Swarm an empty chair and a full damage report',
    'let the safe lane stay unfashionable and useful',
    'give the next bullet a forwarding address',
    'keep the score greedy and the movement cheap',
    'make the boss wait while you finish surviving',
    'leave the fireworks to people with spare hulls',
    'turn one honest dodge into three seconds of control',
    'let the threat miss before explaining why it was wrong',
    'carry the boring decision all the way to the leaderboard'
  ])
});

const TRANSLATED_VOICES = Object.freeze({
  de: {
    frames: [
      '{witness} traf {name} erstmals bei {place}, während des Zwischenfalls „{incident}“. Gewonnen hat niemand; die Blackbox behielt nur dies: {fact} {verdict}',
      'Die offizielle Akte zu {name} besteht aus drei Schwärzungen und einem Soßenfleck. {witness} beginnt die Geschichte bei {place}, mit dem Vorfall „{incident}“. {fact} {verdict}',
      '{name} sollte nie ein Eigenname werden. Dann geschah {incident} nahe {place}, und {witness} verlangte Eintritt. {fact} {verdict}',
      'Frag {witness} nach {name}, und du bekommst einen Drink, eine Narbe und dieselbe Geschichte über den Vorfall „{incident}“ bei {place}. {fact} {verdict}',
      'Laut Gesetz geschah bei {place} nichts. Tatsächlich geschah {incident} zweimal, und {witness} nannte den lautesten Teil {name}. {fact} {verdict}',
      'Hör {name} genau zu: Man hört {place} um die Kaution bitten. {witness} gibt dem Vorfall „{incident}“ die Schuld. Unhöflich, aber fair. {fact} {verdict}'
    ],
    incidents: ['der Quittungskrieg', 'die Dienstagsmeuterei', 'ein elf Sekunden langer Karaoke-Waffenstillstand', 'die Beerdigung eines Fracht-Heiligen', 'die große Suppen-Dekompression', 'eine Zollprüfung mit Lasern', 'die Nacht, in der die Schwerkraft per Mail kündigte', 'ein sehr kleiner Putsch mit gutem Catering'],
    verdicts: ['Mara nennt das Technik. Die Versicherung nennt Mara anders.', 'Der Schwarm legte Einspruch ein. Er kam voller Löcher zurück.', 'Wenn es im Replay würdevoll aussieht, unterschlägt das Replay Beweise.', 'Heldentum ist optional. Beim Schuss woanders zu sein nicht.', 'Das Cabinet markierte alles als „lehrreich“ und bestellte neues Glas.', 'Die gute Nachricht: Es ist lesbar. Die schlechte hat Triebwerke.', 'Bleib ruhig, auf jene besondere gewalttätige Art der Profis.', 'Irgendwo raucht eine winzige Warnlampe mit Absicht.'],
    maneuvers: ['verlass den Kampf durch die noch langweilige Lane', 'heb dir das dramatische Ausweichen für echte Dramatik auf', 'mach eine saubere Korrektur statt drei ängstlicher', 'lass die gefährliche Form erst fertig zeichnen', 'wechsle erst, wenn die Gefahr sich festgelegt hat', 'gib Bewegung aus wie die letzte ehrliche Währung', 'lass deinem zukünftigen Ich Platz für einen Fehler', 'sorge dafür, dass die Blackbox dich als lästig lebendig beschreibt']
  },
  es: {
    frames: [
      '{witness} conoció a {name} en {place}, en mitad de {incident}. Nadie ganó la discusión; la caja negra guardó esto: {fact} {verdict}',
      'El expediente oficial de {name} tiene tres tachones y una mancha de salsa. La versión de {witness} empieza en {place}, con {incident}. {fact} {verdict}',
      '{name} nunca debió convertirse en nombre propio. Entonces ocurrió {incident} cerca de {place}, y {witness} cobró entrada. {fact} {verdict}',
      'Pregunta a {witness} por {name} y recibirás una copa, una cicatriz y la misma historia sobre {incident} en {place}. {fact} {verdict}',
      'Por ley no pasó nada en {place}. En realidad, {incident} pasó dos veces y {witness} llamó {name} a la parte más ruidosa. {fact} {verdict}',
      'Escucha bien a {name}: se oye a {place} pidiendo que le devuelvan la fianza. {witness} culpa a {incident}. Grosero, pero justo. {fact} {verdict}'
    ],
    incidents: ['la Guerra del Recibo', 'el Motín del Martes', 'un alto el fuego de karaoke de once segundos', 'el funeral de un santo de carga', 'la Gran Descompresión de Sopa', 'una inspección de aduanas con láseres', 'la noche en que la gravedad dimitió por correo', 'un golpe diminuto con un catering excelente'],
    verdicts: ['Mara lo llama ingeniería. La aseguradora llama a Mara de otra manera.', 'El Enjambre presentó una queja. Volvió llena de agujeros.', 'Si parece digno en la repetición, la repetición oculta pruebas.', 'El heroísmo es opcional. No estar allí cuando llega el disparo, no.', 'El Cabinet lo marcó como «educativo» y pidió más cristal.', 'La buena noticia es que se puede leer. La mala tiene motores.', 'Mantén la calma de esa forma concreta y violenta que usan los profesionales.', 'En algún lugar, una lucecita de aviso ha empezado a humear con intención.'],
    maneuvers: ['sal por el carril que todavía parece aburrido', 'guarda la esquiva dramática para un problema dramático de verdad', 'haz una corrección limpia en lugar de tres asustadas', 'deja que la forma peligrosa termine de dibujarse', 'cruza después de que la amenaza se comprometa', 'gasta movimiento como la última moneda honrada', 'deja sitio para que tu yo futuro cometa un error', 'haz que la caja negra te describa como irritantemente vivo']
  },
  ru: {
    frames: [
      '{witness} впервые встретил {name} у {place}, прямо во время происшествия «{incident}». Спор не выиграл никто; чёрный ящик сохранил вот что: {fact} {verdict}',
      'Официальное дело {name} — три зачёркнутые строки и пятно соуса. Версия {witness} начинается у {place}, с происшествия «{incident}». {fact} {verdict}',
      '{name} вообще не должно было стать именем. Потом рядом с {place} случилось {incident}, и {witness} начал брать плату за вход. {fact} {verdict}',
      'Спроси {witness} про {name} — получишь выпивку, шрам и ту же историю о происшествии «{incident}» у {place}. {fact} {verdict}',
      'По закону у {place} ничего не произошло. На деле {incident} случилось дважды, а {witness} назвал самый громкий кусок {name}. {fact} {verdict}',
      'Прислушайся к {name}: слышно, как {place} просит вернуть залог. {witness} винит {incident}. Грубо, но справедливо. {fact} {verdict}'
    ],
    incidents: ['Война Квитанций', 'Вторничный мятеж', 'караоке-перемирие длиной одиннадцать секунд', 'похороны грузового святого', 'Великая суповая декомпрессия', 'таможенная проверка лазерами', 'ночь, когда гравитация уволилась по почте', 'крошечный переворот с отличной едой'],
    verdicts: ['Мара зовёт это инженерией. Страховая зовёт Мару иначе.', 'Рой подал протест. Протест вернулся весь в дырках.', 'Если на повторе всё выглядит достойно, повтор скрывает улики.', 'Героизм необязателен. Не стоять там, куда летит выстрел, обязательно.', 'Cabinet отметил результат как «учебный» и заказал новое стекло.', 'Хорошая новость: это можно прочитать. Плохая — с двигателями.', 'Сохраняй спокойствие тем особым, яростным способом профессионалов.', 'Где-то маленькая сигнальная лампа задымилась со смыслом.'],
    maneuvers: ['уходи через полосу, которая всё ещё выглядит скучно', 'сбереги эффектный рывок для по-настоящему эффектной беды', 'сделай одну точную поправку вместо трёх испуганных', 'дай опасной фигуре дорисовать себя', 'пересекай линию после того, как угроза выбрала путь', 'расходуй движение как последнюю честную валюту', 'оставь будущему себе место на одну ошибку', 'заставь чёрный ящик записать, что ты раздражающе жив']
  },
  'pt-BR': {
    frames: [
      '{witness} encontrou {name} em {place}, durante {incident}. Ninguém venceu a discussão; a caixa-preta guardou isto: {fact} {verdict}',
      'O arquivo oficial de {name} tem três tarjas e uma mancha de molho. A versão de {witness} começa em {place}, com {incident}. {fact} {verdict}',
      '{name} nunca deveria virar nome próprio. Então {incident} aconteceu perto de {place}, e {witness} começou a cobrar ingresso. {fact} {verdict}',
      'Pergunte a {witness} sobre {name} e você ganha uma bebida, uma cicatriz e a mesma história sobre {incident} em {place}. {fact} {verdict}',
      'Por lei, nada aconteceu em {place}. Na prática, {incident} aconteceu duas vezes, e {witness} chamou a parte mais barulhenta de {name}. {fact} {verdict}',
      'Escute {name} de perto: dá para ouvir {place} pedindo o depósito de volta. {witness} culpa {incident}. Grosso, mas justo. {fact} {verdict}'
    ],
    incidents: ['a Guerra do Recibo', 'o Motim de Terça-Feira', 'um cessar-fogo de karaokê que durou onze segundos', 'o funeral de um santo da carga', 'a Grande Descompressão da Sopa', 'uma fiscalização alfandegária com lasers', 'a noite em que a gravidade pediu demissão por e-mail', 'um golpe minúsculo com buffet excelente'],
    verdicts: ['Mara chama isso de engenharia. A seguradora chama Mara de outra coisa.', 'O Enxame reclamou. A reclamação voltou cheia de furos.', 'Se parece digno no replay, o replay está escondendo provas.', 'Heroísmo é opcional. Não estar onde o tiro chega não é.', 'O Cabinet marcou como “educativo” e pediu mais vidro.', 'A boa notícia é que dá para ler. A ruim tem motores.', 'Fique calmo daquele jeito específico e violento dos profissionais.', 'Em algum lugar, uma luzinha de alerta começou a fumar com propósito.'],
    maneuvers: ['saia pela pista que ainda parece sem graça', 'guarde a esquiva dramática para um problema realmente dramático', 'faça uma correção limpa em vez de três assustadas', 'deixe a forma perigosa terminar de se desenhar', 'atravesse depois que a ameaça escolher o caminho', 'gaste movimento como a última moeda honesta', 'deixe espaço para seu eu do futuro errar uma vez', 'faça a caixa-preta descrevê-lo como irritantemente vivo']
  },
  'zh-CN': {
    frames: [
      '{witness}第一次在{place}见到{name}，当时正赶上{incident}。争论没有赢家，黑匣子只留下了这段：{fact} {verdict}',
      '{name}的官方档案只有三处涂黑和一块酱汁印。{witness}的版本从{place}和{incident}讲起。{fact} {verdict}',
      '{name}本来不该成为专有名词。后来{place}附近发生了{incident}，{witness}甚至开始卖门票。{fact} {verdict}',
      '问{witness}关于{name}的事，你会得到一杯酒、一条疤，以及同一个{place}的{incident}故事。{fact} {verdict}',
      '按法律说，{place}什么也没发生。实际上{incident}发生了两次，{witness}把最响的那部分叫作{name}。{fact} {verdict}',
      '仔细听{name}，你能听见{place}要求退还押金。{witness}怪罪{incident}。无礼，但公平。{fact} {verdict}'
    ],
    incidents: ['收据战争', '星期二兵变', '持续十一秒的卡拉OK停火', '货运圣人的葬礼', '伟大的汤汁失压事故', '用激光进行的海关审计', '重力通过邮件辞职的那一夜', '一场餐饮极佳的小型政变'],
    verdicts: ['Mara称这叫工程学。保险公司对Mara另有称呼。', '虫群提出异议，异议书回来时满是弹孔。', '如果回放看起来很体面，那回放一定藏了证据。', '英雄主义可以不要，炮火抵达时站在别处不可以。', 'Cabinet把结果标为“有教育意义”，然后订了更多玻璃。', '好消息是它能被读懂，坏消息是它有引擎。', '保持冷静——要用职业人士那种精准而凶狠的冷静。', '某处，一盏小警示灯正带着使命感冒烟。'],
    maneuvers: ['从仍然显得无聊的航道离开', '把戏剧性的闪避留给真正戏剧性的麻烦', '做一次干净修正，不要做三次惊慌修正', '让危险图形先把自己画完', '等威胁选定路线后再穿越', '把移动当成最后一种诚实货币来花', '给未来的自己留出一次犯错空间', '让黑匣子把你记录成“烦人地活着”']
  },
  ko: {
    frames: [
      '{witness}이 {place}에서 {name}을 처음 본 건 {incident} 한복판이었다. 논쟁은 아무도 못 이겼고, 블랙박스는 이것만 남겼다. {fact} {verdict}',
      '{name}의 공식 기록은 검은 줄 세 개와 소스 얼룩 하나다. {witness}의 이야기는 {place}의 {incident}부터 시작한다. {fact} {verdict}',
      '{name}은 원래 고유명사가 될 물건이 아니었다. 하지만 {place} 근처에서 {incident}이 벌어졌고, {witness}은 입장료를 받기 시작했다. {fact} {verdict}',
      '{witness}에게 {name}을 물으면 술 한 잔, 흉터 하나, 그리고 {place}의 {incident} 이야기를 듣게 된다. {fact} {verdict}',
      '법적으로 {place}에서는 아무 일도 없었다. 실제로는 {incident}이 두 번 있었고, {witness}은 가장 시끄러운 부분을 {name}이라 불렀다. {fact} {verdict}',
      '{name}을 잘 들으면 {place}가 보증금을 돌려 달라고 하는 소리가 난다. {witness}은 {incident} 탓이라 한다. 무례하지만 공정하다. {fact} {verdict}'
    ],
    incidents: ['영수증 전쟁', '화요일 반란', '11초짜리 노래방 휴전', '화물 성인의 장례식', '위대한 수프 감압 사고', '레이저로 진행된 세관 감사', '중력이 이메일로 사직한 밤', '음식만 훌륭했던 아주 작은 쿠데타'],
    verdicts: ['Mara는 이걸 공학이라 부른다. 보험사는 Mara를 다른 이름으로 부른다.', '군단이 이의를 냈다. 이의서는 구멍투성이로 돌아왔다.', '리플레이가 품위 있어 보인다면 증거를 숨기고 있는 것이다.', '영웅심은 선택이다. 총알이 올 때 다른 곳에 있는 건 필수다.', 'Cabinet은 결과를 “교육적”이라 적고 유리를 더 주문했다.', '좋은 소식은 읽을 수 있다는 것. 나쁜 소식에는 엔진이 있다.', '전문가 특유의 정확하고 폭력적인 방식으로 침착하라.', '어딘가에서 작은 경고등이 목적의식을 갖고 연기를 낸다.'],
    maneuvers: ['아직 지루해 보이는 레인으로 빠져나가라', '진짜 극적인 문제를 위해 극적인 회피를 아껴라', '겁먹은 세 번 대신 정확한 한 번을 움직여라', '위험한 모양이 끝까지 그려지게 기다려라', '위협이 경로를 정한 뒤에 가로질러라', '이동을 마지막 정직한 화폐처럼 써라', '미래의 자신이 한 번 실수할 공간을 남겨라', '블랙박스가 당신을 “짜증 나게 살아 있음”이라 기록하게 하라']
  },
  ja: {
    frames: [
      '{witness}が{place}で{name}に初めて会ったのは、{incident}の真っ最中だった。議論に勝者はなく、ブラックボックスにはこれだけが残った。{fact} {verdict}',
      '{name}の公式記録は、三つの黒塗りとソースの染み一つ。{witness}の話は{place}の{incident}から始まる。{fact} {verdict}',
      '{name}は本来、固有名詞になるはずではなかった。ところが{place}の近くで{incident}が起き、{witness}は入場料まで取り始めた。{fact} {verdict}',
      '{witness}に{name}を尋ねると、酒一杯、傷跡一つ、そして{place}での{incident}の話が返ってくる。{fact} {verdict}',
      '法律上、{place}では何も起きていない。実際には{incident}が二度起き、{witness}は一番うるさい部分を{name}と名付けた。{fact} {verdict}',
      '{name}に耳を澄ますと、{place}が保証金を返せと叫んでいる。{witness}は{incident}のせいだと言う。失礼だが正しい。{fact} {verdict}'
    ],
    incidents: ['領収書戦争', '火曜日の反乱', '十一秒だけ続いたカラオケ停戦', '貨物聖人の葬式', '大スープ減圧事故', 'レーザーで行われた税関監査', '重力がメールで辞職した夜', '料理だけは立派だった小さなクーデター'],
    verdicts: ['Maraはこれを工学と呼ぶ。保険会社はMaraを別の名で呼ぶ。', 'スウォームは異議を出した。書類は穴だらけで戻った。', 'リプレイが立派に見えるなら、証拠を隠している。', '英雄行為は任意。弾が来る場所にいないことは必須。', 'Cabinetは結果を「教育的」と記し、ガラスを追加注文した。', '良い知らせは読めること。悪い知らせにはエンジンがある。', 'プロ特有の、正確で暴力的な落ち着きを保て。', 'どこかで小さな警告灯が使命感を持って煙を出している。'],
    maneuvers: ['まだ退屈に見えるレーンから出ろ', '本当に劇的な問題まで劇的な回避を取っておけ', '怯えた三回より正確な一回を選べ', '危険な形が描き終わるまで待て', '脅威が進路を決めてから横切れ', '移動を最後の正直な通貨として使え', '未来の自分が一度だけ失敗できる場所を残せ', 'ブラックボックスに「腹立たしいほど生存」と書かせろ']
  }
});

const TRANSLATED_CATEGORY_COPY = Object.freeze({
  de: {
    facts: {
      enemies: '{name} ist ein feindliches Schiff ab Sektor {unlock}. Sein Flug- und Feuerrhythmus will die sicherste Lane schließen; lies erst die Silhouette, dann die Formation.',
      attackPatterns: 'Das Warnsignal bleibt ungefähr {readWindow} ms sichtbar und verbraucht {budget} Gefahrenbudget. Warte auf die Festlegung, bewege dich einmal und antworte.',
      waveTactics: 'Diese Formation kontrolliert Eintrittstiming, Lane-Druck und synchrones Feuer. Nimm das Führungsschiff heraus, bevor die Welle einen gemeinsamen Takt findet.',
      powerups: 'Für {duration} verändert dieses Powerup {effect}. Lies es als {read}; nimm es, wenn {when}.',
      augments: '{detail} Der gestempelte Effekt lautet {effect}; die Hardware bleibt für diesen Run.',
      sectors: 'Diese Route verändert Lane-Rhythmus, Bossdruck und die Verwendung deiner Leben. Praktischer Hinweis: {clue}.',
      elites: 'Diese Elite verbindet Spezialbewegung, schweres Feuer und das System {ability}. Entferne zuerst die Eskorte, dann bestrafe die Abkühlzeit.',
      bosses: '{title} bewegt sich nach eigenem Rhythmus und baut Druck bis zum Signalmuster {signature} auf. Überlebe das Signal, dann nutze die Pause.',
      runThemes: 'Der Swarm Director, eine verborgene Kommando-Intelligenz, ordnet für diesen Run neue Druckmuster. Beobachte Sektor eins und passe danach deine Route an.',
      cabinetLogs: 'Die erhaltene Zeile lautet: „{line}“ Die Akte ergänzt: {context} Der Witz ist optional, der Überlebenshinweis nicht.',
      pilotRanks: 'Rang {rank} beginnt bei Level {level} und {xp} Karriere-XP. Die alte Inschrift sagt: „{rankLore}“'
    },
    tips: {
      enemies: '{name}: Lies zuerst die Hülle, entferne den Lane-Macher und {maneuver}.', attackPatterns: '{name}: Lass das Warnsignal enden, weiche nach der Festlegung aus und {maneuver}.', waveTactics: '{name}: Brich den ersten Takt, halte einen Ausgang frei und {maneuver}.', powerups: '{name} ist Timing mit besserem Licht. Sammle es sicher, nutze das ganze Fenster und {maneuver}.', augments: '{name} bleibt für diesen Run. Gib dem Effekt vor der Wahl eine Aufgabe und {maneuver}.', sectors: '{name} belohnt Platz und Geduld. Bewahre einen Ausgang, spare Leben und {maneuver}.', elites: '{name}: Entferne die Eskorte, warte auf die Abkühlzeit und {maneuver}.', bosses: '{name} bekommt die Bühne, du bekommst das Signal. Überlebe es, bestrafe die Pause und {maneuver}.', runThemes: 'Nutze Sektor eins, um {name} zu lesen. Erkenne den wiederkehrenden Druck und {maneuver}.', cabinetLogs: '{name} ist eine Quittung, keine Schriftrolle. Nimm den nützlichen Hinweis mit und {maneuver}.', pilotRanks: '{name} beweist überlebte Flüge, nicht Unsterblichkeit. Jage den nächsten Rang nach dem Clear und {maneuver}.'
    }
  },
  es: {
    facts: {
      enemies: '{name} es una nave hostil que aparece desde el sector {unlock}. Su vuelo y su fuego intentan cerrar el carril seguro; lee primero la silueta y luego la formación.', attackPatterns: 'La señal dura unos {readWindow} ms y gasta {budget} de peligro. Espera el bloqueo, muévete una vez y responde.', waveTactics: 'Esta formación controla la entrada, la presión de carril y el fuego sincronizado. Rompe la nave guía antes de que la oleada encuentre el compás.', powerups: 'Durante {duration}, este powerup cambia {effect}. Léelo como {read}; recógelo cuando {when}.', augments: '{detail} El efecto sellado es {effect}; el hardware dura toda esta partida.', sectors: 'Esta ruta cambia el ritmo de carriles, la presión del jefe y el uso de vidas. Pista práctica: {clue}.', elites: 'Esta élite combina movimiento especial, fuego pesado y el sistema {ability}. Quita la escolta y castiga el enfriamiento.', bosses: '{title} acumula presión hasta la señal {signature}. Sobrevive a esa firma y ataca durante la pausa.', runThemes: 'El Swarm Director, una inteligencia de mando oculta, reorganiza la presión de esta partida. Observa el sector uno y adapta la ruta.', cabinetLogs: 'La línea conservada dice: «{line}» La nota añade: {context} El chiste es opcional, la lección de supervivencia no.', pilotRanks: 'El rango {rank} comienza en el nivel {level} y {xp} XP de carrera. La inscripción antigua dice: «{rankLore}»'
    },
    tips: {
      enemies: '{name}: lee primero el casco, elimina al dueño del carril y {maneuver}.', attackPatterns: '{name}: deja acabar la señal, esquiva después del bloqueo y {maneuver}.', waveTactics: '{name}: rompe el primer compás, guarda una salida y {maneuver}.', powerups: '{name} es ritmo con mejor iluminación. Recógelo con seguridad, usa toda la ventana y {maneuver}.', augments: '{name} dura toda la partida. Dale un trabajo antes de elegirlo y {maneuver}.', sectors: '{name} premia el espacio y la paciencia. Conserva una salida, guarda vidas y {maneuver}.', elites: '{name}: quita la escolta, espera el enfriamiento y {maneuver}.', bosses: '{name} tiene el escenario; tú tienes la señal. Sobrevive, castiga la pausa y {maneuver}.', runThemes: 'Usa el sector uno para leer {name}. Nombra la presión repetida y {maneuver}.', cabinetLogs: '{name} es un recibo, no una escritura sagrada. Lleva la lección al combate y {maneuver}.', pilotRanks: '{name} demuestra vuelos sobrevividos, no inmortalidad. Busca el siguiente rango tras completar y {maneuver}.'
    }
  },
  ru: {
    facts: {
      enemies: '{name} — вражеский корабль, встречающийся с сектора {unlock}. Его полёт и огонь закрывают безопасную линию; сначала читай силуэт, потом строй.', attackPatterns: 'Сигнал виден около {readWindow} мс и тратит {budget} единиц опасности. Дождись фиксации, сдвинься один раз и ответь.', waveTactics: 'Этот строй управляет входом, давлением на линии и общим залпом. Убери ведущий корабль, пока волна не поймала ритм.', powerups: 'На {duration} это усиление меняет {effect}. Считай его {read}; бери, когда {when}.', augments: '{detail} Указанный эффект: {effect}; оборудование остаётся до конца забега.', sectors: 'Этот маршрут меняет ритм линий, давление босса и цену жизней. Практическая подсказка: {clue}.', elites: 'Элита сочетает особое движение, тяжёлый огонь и систему {ability}. Сначала убери сопровождение, затем накажи откат.', bosses: '{title} наращивает давление до сигнала {signature}. Переживи сигнатуру и стреляй в паузе.', runThemes: 'Swarm Director — скрытый командный разум — перестраивает давление забега. Наблюдай первый сектор и меняй маршрут.', cabinetLogs: 'Сохранилась строка: «{line}» Примечание добавляет: {context} Шутка необязательна, совет по выживанию — нет.', pilotRanks: 'Ранг {rank} начинается на уровне {level} и {xp} карьерного XP. Старая надпись: «{rankLore}»'
    },
    tips: {
      enemies: '{name}: сначала читай корпус, убери хозяина линии и {maneuver}.', attackPatterns: '{name}: дай сигналу закончиться, уклоняйся после фиксации и {maneuver}.', waveTactics: '{name}: сбей первый такт, оставь выход и {maneuver}.', powerups: '{name} — это тайминг с красивым светом. Бери безопасно, используй всё окно и {maneuver}.', augments: '{name} остаётся на весь забег. Дай эффекту работу до выбора и {maneuver}.', sectors: '{name} награждает пространство и терпение. Сохрани выход, береги жизни и {maneuver}.', elites: '{name}: убери сопровождение, дождись отката и {maneuver}.', bosses: '{name} получает сцену, ты получаешь сигнал. Переживи его, накажи паузу и {maneuver}.', runThemes: 'Используй первый сектор, чтобы прочитать {name}. Назови повторяющуюся угрозу и {maneuver}.', cabinetLogs: '{name} — квитанция, а не писание. Возьми полезный совет в бой и {maneuver}.', pilotRanks: '{name} доказывает пережитые полёты, а не бессмертие. Гонись за следующим рангом после победы и {maneuver}.'
    }
  },
  'pt-BR': {
    facts: {
      enemies: '{name} é uma nave hostil que aparece a partir do setor {unlock}. O voo e o fogo tentam fechar a pista segura; leia primeiro a silhueta e depois a formação.', attackPatterns: 'O aviso fica visível por cerca de {readWindow} ms e gasta {budget} de perigo. Espere travar, mova uma vez e responda.', waveTactics: 'Esta formação controla entrada, pressão de pista e fogo sincronizado. Derrube a nave líder antes que a onda encontre o ritmo.', powerups: 'Por {duration}, este powerup muda {effect}. Leia como {read}; pegue quando {when}.', augments: '{detail} O efeito carimbado é {effect}; o hardware dura a partida inteira.', sectors: 'Esta rota muda o ritmo das pistas, a pressão do chefe e o uso das vidas. Dica prática: {clue}.', elites: 'Esta elite combina movimento especial, fogo pesado e o sistema {ability}. Tire a escolta e castigue a recarga.', bosses: '{title} aumenta a pressão até o sinal {signature}. Sobreviva à assinatura e ataque na pausa.', runThemes: 'O Swarm Director, uma inteligência de comando oculta, reorganiza a pressão da partida. Observe o setor um e ajuste a rota.', cabinetLogs: 'A linha preservada diz: “{line}” A nota acrescenta: {context} A piada é opcional, a lição de sobrevivência não.', pilotRanks: 'A patente {rank} começa no nível {level} e {xp} XP de carreira. A inscrição antiga diz: “{rankLore}”'
    },
    tips: {
      enemies: '{name}: leia o casco, remova quem fecha a pista e {maneuver}.', attackPatterns: '{name}: deixe o aviso terminar, desvie depois da trava e {maneuver}.', waveTactics: '{name}: quebre o primeiro compasso, guarde uma saída e {maneuver}.', powerups: '{name} é timing com luz melhor. Pegue em segurança, use a janela inteira e {maneuver}.', augments: '{name} dura a partida toda. Dê um trabalho ao efeito antes de escolher e {maneuver}.', sectors: '{name} recompensa espaço e paciência. Preserve uma saída, guarde vidas e {maneuver}.', elites: '{name}: tire a escolta, espere a recarga e {maneuver}.', bosses: '{name} ganha o palco; você ganha o aviso. Sobreviva, castigue a pausa e {maneuver}.', runThemes: 'Use o setor um para ler {name}. Dê nome à pressão repetida e {maneuver}.', cabinetLogs: '{name} é recibo, não escritura sagrada. Leve a dica útil para a luta e {maneuver}.', pilotRanks: '{name} prova voos sobrevividos, não imortalidade. Busque a próxima patente depois da vitória e {maneuver}.'
    }
  },
  'zh-CN': {
    facts: {
      enemies: '{name}是从第{unlock}区开始出现的敌舰。它的飞行与火力会封住安全航道；先读轮廓，再读编队。', attackPatterns: '警告大约持续{readWindow}毫秒，并消耗{budget}点危险预算。等锁定完成，只移动一次，然后还击。', waveTactics: '这套编队控制入场节奏、航道压力和同步射击。先击破领舰，别让整波敌人找到共同节拍。', powerups: '在{duration}内，这个强化会改变{effect}。把它当成{read}；当{when}时再拾取。', augments: '{detail} 标注效果为{effect}；这件硬件会持续整个本局。', sectors: '这条航线会改变航道节奏、Boss压力和生命分配。实用提示：{clue}。', elites: '这艘精英舰结合特殊移动、重火力和{ability}系统。先清护航，再惩罚冷却空档。', bosses: '{title}会持续施压，直到出现{signature}信号。先活过招牌攻击，再利用空档输出。', runThemes: 'Swarm Director是一种隐藏指挥智能，会重排本局压力。观察第一区，再调整路线。', cabinetLogs: '保存下来的句子是：“{line}” 记录补充：{context} 笑话可以不听，生存建议不行。', pilotRanks: '第{rank}阶在等级{level}、生涯XP {xp}时开启。旧铭文写着：“{rankLore}”'
    },
    tips: {
      enemies: '{name}：先读舰体，先拆封路者，然后{maneuver}。', attackPatterns: '{name}：让警告说完，锁定后闪避，然后{maneuver}。', waveTactics: '{name}：打断第一拍，保留出口，然后{maneuver}。', powerups: '{name}只是换了更漂亮灯光的时机题。安全拾取，用完整个窗口，然后{maneuver}。', augments: '{name}会持续整局。选择前先给它安排工作，然后{maneuver}。', sectors: '{name}奖励空间与耐心。保留出口，存好生命，然后{maneuver}。', elites: '{name}：先清护航，等冷却，再{maneuver}。', bosses: '{name}拿舞台，你拿预警。活过招牌攻击，惩罚空档，然后{maneuver}。', runThemes: '用第一区读懂{name}。认出重复压力，然后{maneuver}。', cabinetLogs: '{name}是收据，不是圣经。把有用建议带进实战，然后{maneuver}。', pilotRanks: '{name}证明你活过许多航次，不证明你不死。通关后再追下一阶，并{maneuver}。'
    }
  },
  ko: {
    facts: {
      enemies: '{name}은 섹터 {unlock}부터 나타나는 적 함선이다. 비행과 사격은 안전한 레인을 닫으려 한다. 먼저 실루엣을 읽고, 다음에 편대를 읽어라.', attackPatterns: '경고는 약 {readWindow}ms 동안 보이고 위험 예산 {budget}을 쓴다. 고정될 때까지 기다리고 한 번 움직인 뒤 반격하라.', waveTactics: '이 편대는 진입 타이밍, 레인 압박, 동시 사격을 장악한다. 선두 함선을 먼저 부숴 리듬을 끊어라.', powerups: '{duration} 동안 이 파워업은 {effect}을 바꾼다. {read}로 이해하고, {when} 때 집어라.', augments: '{detail} 표시된 효과는 {effect}이며 이번 런 내내 유지된다.', sectors: '이 항로는 레인 리듬, 보스 압박, 생명 운용을 바꾼다. 실전 힌트: {clue}.', elites: '이 엘리트는 특수 이동, 중화력, {ability} 시스템을 결합한다. 호위를 먼저 치우고 재사용 대기시간을 노려라.', bosses: '{title}은 {signature} 신호까지 압박을 키운다. 시그니처를 살아남고 빈틈에 공격하라.', runThemes: 'Swarm Director는 숨은 지휘 지능으로 이번 런의 압박을 재배치한다. 첫 섹터를 보고 항로를 조정하라.', cabinetLogs: '남은 문장은 “{line}”이다. 기록 메모: {context} 농담은 선택이지만 생존 조언은 아니다.', pilotRanks: '랭크 {rank}은 레벨 {level}, 커리어 XP {xp}에서 시작한다. 옛 문구는 “{rankLore}”이다.'
    },
    tips: {
      enemies: '{name}: 선체를 먼저 읽고 레인을 막는 적부터 없앤 뒤 {maneuver}.', attackPatterns: '{name}: 경고가 끝날 때까지 기다리고 고정 뒤 피한 다음 {maneuver}.', waveTactics: '{name}: 첫 박자를 깨고 출구 하나를 남긴 뒤 {maneuver}.', powerups: '{name}은 조명만 더 멋진 타이밍 문제다. 안전하게 먹고 시간을 전부 쓴 뒤 {maneuver}.', augments: '{name}은 이번 런 내내 간다. 선택 전에 역할을 정하고 {maneuver}.', sectors: '{name}은 공간과 인내를 보상한다. 출구를 남기고 생명을 아낀 뒤 {maneuver}.', elites: '{name}: 호위를 치우고 재사용 대기시간을 기다린 뒤 {maneuver}.', bosses: '{name}은 무대를 갖고, 당신은 신호를 갖는다. 살아남고 빈틈을 벌한 뒤 {maneuver}.', runThemes: '첫 섹터에서 {name}을 읽어라. 반복되는 압박을 찾고 {maneuver}.', cabinetLogs: '{name}은 영수증이지 성서가 아니다. 유용한 조언을 실전에 가져가 {maneuver}.', pilotRanks: '{name}은 살아남은 비행의 증거지 불사의 증거가 아니다. 클리어 뒤 다음 랭크를 노리며 {maneuver}.'
    }
  },
  ja: {
    facts: {
      enemies: '{name}はセクター{unlock}から現れる敵艦だ。飛行と射撃で安全レーンを閉じる。まず輪郭を読み、次に編隊を読め。', attackPatterns: '警告は約{readWindow}ms表示され、危険予算{budget}を使う。ロックを待ち、一度だけ動いて撃ち返せ。', waveTactics: 'この編隊は進入タイミング、レーン圧力、同時射撃を支配する。先頭艦を壊し、波が拍子をつかむ前に崩せ。', powerups: '{duration}の間、このパワーアップは{effect}を変える。{read}として読み、{when}ときに取れ。', augments: '{detail} 表示効果は{effect}。この装備は今回のラン中ずっと残る。', sectors: 'この航路はレーンのリズム、ボス圧力、残機の使い方を変える。実戦ヒント：{clue}。', elites: 'このエリートは特殊移動、重火力、{ability}システムを組み合わせる。護衛を先に消し、クールダウンを罰せ。', bosses: '{title}は{signature}の合図まで圧力を高める。シグネチャーを生き延び、隙に攻撃しろ。', runThemes: 'Swarm Directorは隠れた指揮知性で、今回の圧力を組み替える。セクター1を観察し、航路を変えろ。', cabinetLogs: '残った一文は「{line}」。記録メモ：{context} 冗談は任意、生存の助言は必須。', pilotRanks: 'ランク{rank}はレベル{level}、キャリアXP {xp}で始まる。古い銘文は「{rankLore}」。'
    },
    tips: {
      enemies: '{name}：船体を先に読み、レーンを作る敵を消してから{maneuver}。', attackPatterns: '{name}：警告を最後まで見て、ロック後に避け、{maneuver}。', waveTactics: '{name}：最初の拍を壊し、出口を一つ残して{maneuver}。', powerups: '{name}は照明が派手なタイミング問題だ。安全に取り、時間を使い切って{maneuver}。', augments: '{name}は今回のラン中ずっと残る。選ぶ前に役目を決め、{maneuver}。', sectors: '{name}は空間と忍耐に報いる。出口を残し、残機を守って{maneuver}。', elites: '{name}：護衛を消し、クールダウンを待って{maneuver}。', bosses: '{name}が舞台を取り、こちらは合図を取る。生き延び、隙を罰し、{maneuver}。', runThemes: 'セクター1で{name}を読め。繰り返す圧力を見つけ、{maneuver}。', cabinetLogs: '{name}は領収書であって聖典ではない。使える助言を実戦へ持ち込み、{maneuver}。', pilotRanks: '{name}は生き延びた証であって不死の証ではない。クリア後に次を狙い、{maneuver}。'
    }
  }
});

const RUNTIME_DESCRIPTIONS = Object.freeze({
  en: 'The Cabinet caught the silhouette, then the evidence drawer bit the clerk. Expect a readable tell and an attitude problem; one more live sighting unlocks the useful part.',
  de: 'Das Cabinet fing die Silhouette ein, dann biss die Beweisschublade den Sachbearbeiter. Erwarte ein lesbares Signal und ein Haltungsproblem; eine weitere Sichtung schaltet den nützlichen Teil frei.',
  es: 'El Cabinet captó la silueta y luego el cajón de pruebas mordió al funcionario. Espera una señal legible y mala actitud; otro encuentro desbloquea la parte útil.',
  ru: 'Cabinet поймал силуэт, после чего ящик с уликами укусил клерка. Жди читаемый сигнал и дурной характер; ещё одна встреча откроет полезную часть.',
  'pt-BR': 'O Cabinet captou a silhueta, e então a gaveta de provas mordeu o funcionário. Espere um aviso legível e má atitude; mais um encontro libera a parte útil.',
  'zh-CN': 'Cabinet拍到了轮廓，随后证物抽屉咬了办事员。它的预警能读懂，脾气不能；再目击一次就能解锁有用记录。',
  ko: 'Cabinet은 실루엣을 잡았고, 증거 서랍은 직원을 물었다. 읽을 수 있는 신호와 못된 태도를 예상하라. 한 번 더 만나면 쓸모 있는 기록이 열린다.',
  ja: 'Cabinetは輪郭を捉えたが、証拠の引き出しが係員を噛んだ。読める合図と悪い態度を想定しろ。もう一度遭遇すれば役立つ記録が開く。'
});

const RUNTIME_TIP_TEMPLATES = Object.freeze({
  en: '{name}: let the tell finish, keep one exit, and make the second sighting somebody else’s paperwork.',
  de: '{name}: Lass das Signal enden, halte einen Ausgang frei und mach die zweite Sichtung zum Papierkram eines anderen.',
  es: '{name}: deja terminar la señal, guarda una salida y convierte el segundo encuentro en papeleo ajeno.',
  ru: '{name}: дождись конца сигнала, оставь один выход и преврати вторую встречу в чужую бумажную работу.',
  'pt-BR': '{name}: deixe o aviso terminar, guarde uma saída e transforme o segundo encontro em papelada alheia.',
  'zh-CN': '{name}：等预警说完，留好一个出口，把第二次目击变成别人的文书工作。',
  ko: '{name}: 경고가 끝날 때까지 기다리고 출구 하나를 남겨 두 번째 목격을 남의 서류 작업으로 만들어라.',
  ja: '{name}：合図を最後まで見て、出口を一つ残し、二度目の遭遇を他人の書類仕事に変えろ。'
});

const CODEX_UI_COPY = Object.freeze({
  en: {
    subtitle: 'BLACK-BOX GOSSIP, SURVIVAL RECEIPTS, AND THINGS WITH TEETH',
    lockedDescription: 'The Cabinet has the silhouette and absolutely no useful details. Meet this thing alive, leave it dead, and the drawer will stop hissing.',
    lockedTip: 'MEET IT IN A RUN. KEEP THE RECEIPT.'
  },
  de: {
    subtitle: 'BLACKBOX-KLATSCH, ÜBERLEBENSQUITTUNGEN UND DINGE MIT ZÄHNEN',
    lockedDescription: 'Das Cabinet hat die Silhouette und keinerlei nützliche Details. Triff das Ding lebend, hinterlass es tot, dann hört die Schublade auf zu fauchen.',
    lockedTip: 'TRIFF ES IM RUN. BEHALT DIE QUITTUNG.'
  },
  es: {
    subtitle: 'RUMORES DE CAJA NEGRA, RECIBOS DE SUPERVIVENCIA Y COSAS CON DIENTES',
    lockedDescription: 'El Cabinet tiene la silueta y ningún detalle útil. Encuentra esta cosa viva, déjala muerta y el cajón dejará de sisear.',
    lockedTip: 'ENCUÉNTRALO EN UNA PARTIDA. GUARDA EL RECIBO.'
  },
  ru: {
    subtitle: 'СПЛЕТНИ ЧЁРНОГО ЯЩИКА, КВИТАНЦИИ О ВЫЖИВАНИИ И ЗУБАСТЫЕ ШТУКИ',
    lockedDescription: 'У Cabinet есть силуэт и ни одной полезной детали. Встреть эту штуку живой, оставь мёртвой — и ящик перестанет шипеть.',
    lockedTip: 'ВСТРЕТЬ В ЗАБЕГЕ. СОХРАНИ КВИТАНЦИЮ.'
  },
  'pt-BR': {
    subtitle: 'FOFOCA DE CAIXA-PRETA, RECIBOS DE SOBREVIVÊNCIA E COISAS COM DENTES',
    lockedDescription: 'O Cabinet tem a silhueta e nenhum detalhe útil. Encontre a coisa viva, deixe-a morta e a gaveta vai parar de chiar.',
    lockedTip: 'ENCONTRE NA PARTIDA. GUARDE O RECIBO.'
  },
  'zh-CN': {
    subtitle: '黑匣子八卦、生存收据，以及长牙的东西',
    lockedDescription: 'Cabinet只拿到了轮廓，完全没有有用细节。见到它时让它活着，离开时别让它活着，抽屉就会停止嘶叫。',
    lockedTip: '在本局遇见它。收好收据。'
  },
  ko: {
    subtitle: '블랙박스 소문, 생존 영수증, 그리고 이빨 달린 것들',
    lockedDescription: 'Cabinet에는 실루엣만 있고 쓸모 있는 정보는 전혀 없다. 살아 있는 채로 만나고 죽은 채로 남기면 서랍이 쉿쉿대는 걸 멈춘다.',
    lockedTip: '런에서 만나라. 영수증을 챙겨라.'
  },
  ja: {
    subtitle: 'ブラックボックスの噂、生存の領収書、そして歯のあるもの',
    lockedDescription: 'Cabinetが持っているのは輪郭だけで、役立つ情報は皆無だ。生きた状態で出会い、倒して帰れば、引き出しも威嚇をやめる。',
    lockedTip: 'ランで遭遇しろ。領収書を残せ。'
  }
});

const FRESH_SIGNAL_LABELS = Object.freeze({
  en: 'a fresh signal',
  de: 'ein frisches Signal',
  es: 'una señal nueva',
  ru: 'новый сигнал',
  'pt-BR': 'um sinal novo',
  'zh-CN': '一个新信号',
  ko: '새 신호',
  ja: '新しい信号'
});

function hashText(value = '') {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(list, seed, salt = 0) {
  if (!Array.isArray(list) || !list.length) return '';
  return list[(seed + salt * 7919) % list.length];
}

function fill(template, vars = {}) {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  ));
}

const WINDOWS_1252_BYTES = Object.freeze({
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
  'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91,
  '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98,
  '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f
});

function repairMojibake(value) {
  const source = String(value ?? '');
  if (!/[ÃÂ]/.test(source) || typeof TextDecoder === 'undefined') return source;
  const bytes = [];
  for (const char of source) {
    const code = char.codePointAt(0);
    if (code <= 0xff) bytes.push(code);
    else if (Object.prototype.hasOwnProperty.call(WINDOWS_1252_BYTES, char)) bytes.push(WINDOWS_1252_BYTES[char]);
    else return source;
  }
  try {
    const repaired = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    return /[ÃÂ]/.test(repaired) ? source : repaired;
  } catch {
    return source;
  }
}

function cleanText(value, fallback = '') {
  return repairMojibake(String(value ?? fallback)).replace(/\s+/g, ' ').trim();
}

function localeVoice(locale) {
  if (locale === 'en' || !TRANSLATED_VOICES[locale]) return ENGLISH_VOICE;
  return TRANSLATED_VOICES[locale];
}

function localizedValue(value, translate) {
  const source = cleanText(value);
  return source ? cleanText(translate(source)) : '';
}

function referencedName(name, locale) {
  const value = cleanText(name);
  if (locale === 'de') return `„${value}“`;
  if (locale === 'es' || locale === 'ru') return `«${value}»`;
  if (locale === 'pt-BR' || locale === 'zh-CN') return `“${value}”`;
  if (locale === 'ko') return `‘${value}’`;
  if (locale === 'ja') return `「${value}」`;
  return value;
}

function preferredName(entry, translate) {
  const facts = entry.loreFacts || {};
  if (entry.category === 'augments' && AUGMENT_CODEX_NAMES[entry.id]) return AUGMENT_CODEX_NAMES[entry.id];
  const base = localizedValue(entry.name || entry.id, translate) || String(entry.id);
  if (facts.kind === 'rareChaos' && facts.loadout) return `${base} // ${localizedValue(facts.loadout, translate)}`;
  return base;
}

function epithetFor(entry, seed, salt = 0) {
  const adjective = pick(EPITHET_ADJECTIVES, seed, salt + 1);
  const noun = pick(EPITHET_NOUNS, seed, salt + 7);
  return `${adjective} ${noun}`;
}

function assignUniqueNames(catalog, translate) {
  const flat = Object.values(catalog).flat();
  const preferred = flat.map((entry) => preferredName(entry, translate));
  const counts = new Map();
  preferred.forEach((name) => {
    const key = name.toLocaleLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const used = new Set();
  const names = new Map();
  flat.forEach((entry, index) => {
    const base = preferred[index];
    const seed = hashText(`${entry.category}:${entry.id}:${base}`);
    let candidate = counts.get(base.toLocaleLowerCase()) > 1 ? `${base} — ${epithetFor(entry, seed)}` : base;
    let attempt = 0;
    while (used.has(candidate.toLocaleLowerCase())) {
      attempt += 1;
      candidate = `${base} — ${epithetFor(entry, seed, attempt * 11)}`;
    }
    used.add(candidate.toLocaleLowerCase());
    names.set(entry, candidate);
  });
  return names;
}

function englishFact(entry, vars, seed) {
  const category = entry.category;
  if (category === 'enemies') {
    const kind = vars.kind || 'normal';
    const pool = ENGLISH_FACTS.enemy[kind] || ENGLISH_FACTS.enemy.normal;
    return fill(pick(pool, seed, 31), vars);
  }
  const pool = ENGLISH_FACTS[category] || ENGLISH_FACTS.cabinetLogs;
  return fill(pick(pool, seed, 31), vars);
}

function translatedFact(entry, vars, locale) {
  const template = TRANSLATED_CATEGORY_COPY[locale]?.facts?.[entry.category]
    || TRANSLATED_CATEGORY_COPY.de.facts[entry.category]
    || '{name}: {context}';
  return fill(template, vars);
}

function descriptionFor(entry, displayName, locale, translate) {
  const facts = entry.loreFacts || {};
  if (locale === 'en' && facts.epicDescription) return cleanText(facts.epicDescription);
  const seed = hashText(`${CODEX_LORE_VERSION}:${entry.category}:${entry.id}:${displayName}`);
  const voice = localeVoice(locale);
  const localizedLine = localizedValue(facts.line || facts.originalTip || displayName, translate)
    .replace(/\{name\}/g, FRESH_SIGNAL_LABELS[locale] || FRESH_SIGNAL_LABELS.en);
  const vars = {
    ...Object.fromEntries(Object.entries(facts).map(([key, value]) => [key, localizedValue(value, translate)])),
    name: referencedName(displayName, locale),
    role: localizedValue(facts.role || entry.role || 'hostile signal', translate),
    roleDescription: localizedValue(facts.roleDescription || 'a readable hostile pattern', translate),
    movement: localizedValue(facts.movement || 'pressure movement', translate),
    fire: localizedValue(facts.fire || 'pressure fire', translate),
    telegraph: localizedValue(facts.telegraph || 'visual', translate),
    readWindow: Math.max(0, Math.round(Number(facts.readWindow) || 0)),
    budget: Math.max(1, Math.round(Number(facts.budget) || 1)),
    unlock: Math.max(1, Math.round(Number(facts.unlock) || 1)),
    rank: Math.max(1, Math.round(Number(facts.rank) || 1)),
    level: Math.max(1, Math.round(Number(facts.level) || 1)),
    xp: Number(facts.xp || 0).toLocaleString(locale === 'en' ? 'en-US' : locale),
    context: localizedValue(facts.context || facts.originalDescription || 'a live run', translate),
    line: localizedLine,
    detailLower: localizedValue(facts.detail || 'somebody taught a reactor to ignore good advice', translate).replace(/^./, (char) => char.toLowerCase())
  };
  const fact = locale === 'en' ? englishFact(entry, vars, seed) : translatedFact(entry, vars, locale);
  return fill(pick(voice.frames, seed, 3), {
    ...vars,
    fact,
    witness: pick(WITNESSES, seed, 5),
    place: pick(PLACES, seed, 7),
    incident: pick(voice.incidents, seed, 11),
    verdict: pick(voice.verdicts, seed, 13)
  });
}

function tipFor(entry, displayName, locale, translate) {
  const facts = entry.loreFacts || {};
  if (locale === 'en' && facts.epicTip) return cleanText(facts.epicTip);
  const seed = hashText(`tip:${CODEX_LORE_VERSION}:${entry.category}:${entry.id}:${displayName}`);
  const voice = localeVoice(locale);
  const vars = {
    name: referencedName(displayName, locale),
    maneuver: pick(voice.maneuvers, seed, 17),
    originalTip: localizedValue(facts.originalTip || entry.tip || '', translate)
  };
  if (locale === 'en') {
    const pool = ENGLISH_TIPS[entry.category] || ENGLISH_TIPS.cabinetLogs;
    return fill(pick(pool, seed, 19), vars);
  }
  const template = TRANSLATED_CATEGORY_COPY[locale]?.tips?.[entry.category]
    || TRANSLATED_CATEGORY_COPY.de.tips[entry.category]
    || '{name}: {maneuver}.';
  return fill(template, vars);
}

export function applyCodexLore(rawCatalog, { locale = 'en', translate = (value) => value } = {}) {
  const uniqueNames = assignUniqueNames(rawCatalog, translate);
  return Object.fromEntries(Object.entries(rawCatalog).map(([category, entries]) => [
    category,
    entries.map((entry) => {
      const displayName = uniqueNames.get(entry) || preferredName(entry, translate);
      const { loreFacts, ...publicEntry } = entry;
      return {
        ...publicEntry,
        name: displayName,
        rarity: localizedValue(entry.rarity, translate),
        role: localizedValue(entry.role, translate),
        signalClass: localizedValue(entry.signalClass, translate),
        description: descriptionFor(entry, displayName, locale, translate),
        tip: tipFor(entry, displayName, locale, translate),
        loreVersion: CODEX_LORE_VERSION
      };
    })
  ]));
}

export function getCodexRuntimeDescription(locale = 'en', identity = '') {
  const description = cleanText(RUNTIME_DESCRIPTIONS[locale] || RUNTIME_DESCRIPTIONS.en);
  const name = cleanText(identity);
  return name ? `${name}: ${description}` : description;
}

export function getCodexRuntimeTip(locale = 'en', identity = '') {
  const name = cleanText(identity) || cleanText(FRESH_SIGNAL_LABELS[locale] || FRESH_SIGNAL_LABELS.en);
  return cleanText(fill(RUNTIME_TIP_TEMPLATES[locale] || RUNTIME_TIP_TEMPLATES.en, { name }));
}

export function getCodexUiText(key, locale = 'en') {
  return cleanText(CODEX_UI_COPY[locale]?.[key] || CODEX_UI_COPY.en[key] || key);
}

export function getCodexAugmentDisplayName(id) {
  return AUGMENT_CODEX_NAMES[id] || null;
}
