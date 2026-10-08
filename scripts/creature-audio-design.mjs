import { BOSS_ROSTER } from '../src/config/BossRoster.js';
import { SPACE_SNAKES } from '../src/config/SpaceSnakes.js';

// Each row is an authored acoustic mechanism and a recognizable phrase, not a pitch preset.
const bosses = [
 'An intelligent crystalline queen: one inhaled glass harmonic followed by two descending, throaty vowel resonances. Brittle crown vibrations and a cold silk breath; regal, intimate, predatory.',
 'An iron-lung furnace organism: two labored bellows compressions, a pause, then a pressure-valve animal bark. Slag crackles inside the chest, blunt hydraulic jaw articulation.',
 'A colony inside mirrored shells: tiny glass mandibles answer each other in three unequal clusters, followed by a reversed hollow vowel. Dry prismatic ticks, unnerving multiplied mouths.',
 'A needle-beaked stalking animal: an almost whispered nasal whistle freezes into silence then a single sudden beak clack and narrow throat rasp. Surgical sparse phrasing, no large roar.',
 'A gravitational cephalopod: slowly rotating hollow suction resonances, an inward gulp, then a rubbery cavernous moan winding down. Wet diaphragm, air pressure folding inward.',
 'A malicious shape-changing mimic: two deliberately mismatched choked chuckles, long silence, then a coarse backwards-sounding inhalation. Not human laughter; small wet palate pops.',
 'A cathedral-sized brood host: resonant honeycomb cavities, many distant larval trills underneath one slow tubular exhalation. A deep three-part antiphonal call, not music or a choir of humans.',
 'A stone-armored rectangular titan: a long tectonic friction groan punctuated by exactly two slow heavy jaw knocks. Dry masonry grit moving inside a living throat.',
 'A light-eating glyph organism: thin glassy resonances bending in opposing directions, fluttering lamellae and a brief broken falsetto yelp. Negative spaces between phrases.',
 'A parasitic clockwork saint: tick-tick pause tick, then a brass throat wheeze. Small mechanical teeth and old pressure reeds, a ritual cadence with organic breath underneath.',
 'An armored swarm commander: a clipped nasal challenge in four descending syllabic bursts, closed-jaw armor chatter. Huge disciplined animal, harsh papery timbre, no actual words.',
 'A missile-bearing banshee: airy duct whistle opens into a two-tone ululation, interrupted by three heavy launch-tube coughs. Strained lung tone, falling air-column resonance.',
 'A quantum parasite: liquid clicking moving between two apparent distances, a sharply inhaled vowel cut into irregular fragments, and a cold fizz. Small articulate sounds implying an impossible large body.',
 'A percussion predator: one low hollow chest knock answered by three dry tongue knocks at accelerating intervals, ending with a short taut membrane creak. Not music.',
 'A stately vacuum ray: sustained breathy contralto croak with a narrow nasal harmonic slowly opening, then two subtle wing-membrane flaps. Slow predatory elegance, not a roar.',
 'A molting phase beast: leathery skin peeling and four overlapping breaths starting at different times, sudden wet snap and an unfinished exhalation. Unstable anatomy.',
 'A void drumming colossus: isolated resonant bone impacts in a long-short-long phrase, with dusty granular throat vibration on each tail. Cavernous body, controlled bass.',
 'An anxious biomechanical engine: a labored uneven cardiac pump, stuttering air intake and an urgent rising gurgling whine. Accelerates then abruptly stops; no alarm.',
 'A crystal crustacean captain: porcelain carapace rubbing, small ringing fracture transients, then an animal screech constrained inside a narrow ceramic chamber. Short-long-short phrase.',
 'An insectoid interrogator: precise alternating left-right mandible clicks, followed by a coarse speech-shaped but completely unintelligible buzzing exhale. Restrained, threatening intelligence.',
 'A buoyant gravitational toad: three deeply hollow throat gulps with rubbery pitch glides, then a sudden dry air spit. Immense pharyngeal sac, unnaturally slow and mocking.',
 'A star-consuming filter feeder: hot granular ingestion rush, huge fluttering baleen, then a low closed-mouth rumble interrupted by swallowed crackles. One long voracious inhalation.',
 'A predatory auditory illusion: a close whispering feather rasp, a distant answering bark, then both abruptly cut off. High airy texture contrasted with a small hollow knock, no voice.',
 'A laser vivisection creature: two sharp chirring stridulations, a resonant surgical-glass moan and a final clipped hiss. Bright but rounded, clinical, no laser shots.',
 'A banner of living teeth: loose enamel chatter sweeping into a fast jaw tremolo, stopping for one blunt bone snap. Dry tactile tooth detail with taut tendon strain.',
 'A hangar-dwelling phantasm: barely voiced reverse breath gathering into a mournful hollow ooh, followed by a rattling exhale through perforated metal. Distant yet surrounding, short reverb.',
 'An enormous spiny amphibian: rough bassoon-like throat pulses, wet cheek vibrations and a sudden double croak. Earthy but alien chest texture, three uneven breath cycles.',
 'A queue of fused organisms: five different tiny apertures opening sequentially with pneumatic plops, joining into a dense nasal rasp and closing in reverse order. No musical notes.',
 'A sound-devouring mollusk: vacuum lip smacks, a drawn-out choked vowel that collapses into a tiny click, then almost silent membrane motion. Dread through restraint.',
 'A circuit empress: delicate copper filament rattles under a controlled serrated hum, three rising resonances then a descending breath. An electric eel-like living nervous system, not a robot voice.',
 'An armored orbital knight: a bowed metal visor creak and a compressed horse-like throat snort, then two widely spaced lung huffs. Heavy articulate plate movement, no hoofbeats.',
 'A living arcade cabinet nightmare: rotten wooden cavity knocks, a wheezing reed trapped inside, and a harsh low throat syllable repeated twice. No coin sounds or game bleeps.',
 'A triangular membrane predator: three violently fluttering skin sails creating a fractured kazoo-like buzz, a pause, and a sharp inward gasp. Alien, threatening, not funny.',
 'An ion priest organism: a narrow harmonic whistle modulated by slow gill shutters, interrupted by two crackling tongue discharges. Ritual organic resonance without music.',
 'A vengeful foundry beast: abrasive chain-like tendon drag, a slow deep jaw grind, then four short hot breaths. Huge old machinery inhabited by a living lung.',
 'A ring-shaped ambush predator: circular fluttering suction, abruptly expanding rubbery throat bark, then a tightening whistle. Recognizable circular stuttering breath with empty pauses.',
 'A warning sentinel animal: a distant hollow horn-like bellow in two unequal pulses, answered by close cold bronchial crackle. Natural chest resonance, no electronic siren.',
 'A rhythm-breaking biomech: a confident sequence of three dry piston coughs is interrupted by a tearing reverse inhale and one heavy palate snap. Lurching cadence, not music.',
 'A deep-space siphon animal: percolating wet gill bubbles, a tiny high squeak, and one huge resonant liquid drain. Slow viscous throat suction, unsettling near-field detail.',
 'A swarm architect: papery nest fibers bending, tiny synchronized joint clicks broadening into a coarse oscillating wing buzz. Living structural creaks, one deliberate crescendo then sudden quiet.',
 'An elegant pattern weaver: two delicate throat chirps followed by one grainy wavering alto exhale, threadlike tendons plucking softly around it. Precise and sinister.',
 'An impossibly elongated beast: breath travels down a long resonant ribbed tube, with three staggered chest shudders and a distant terminal croak. Vast length, no loud sub drop.',
 'An acid-scavenging janitor: wet rasping tongue scrapes, thick bubbling exhalation and a short aspirated hiss. Abrasive moist texture, three isolated scraping strokes.',
 'A many-crowned predator: antler-like hollow bones rubbing produce a tense bowed resonance, then four mouths bite shut at staggered intervals. Noble but inhuman.',
 'An intruder beyond the hull: intimate fingernail-like chitin tapping, a slow inhaled rattling whistle, then an abruptly close soft throat knock. Terrifying proximity, not a generic roar.',
 'A solar jellyfish magistrate: pulsing translucent membranes and hot brittle corona crackle, a breathy radiating vowel blooming then folding shut. Slow expanding one-two pulse.',
 'A hunter tracking by echolocation: three spaced rounded ultrasonic-like clicks, a flutter of dry throat reeds, then a compact challenge trill. Midrange audible, never painfully shrill.',
 'A stellar collector organism: delicate hard objects rolling inside an enormous crop, double throat gulp and a rough satisfied nasal moan. Mineral rattle meets living digestion.',
 'An exhausted immortal creature: a dragging asthmatic breath, a fractured old throat call with a silent break, then an unexpected fierce final cough. Heavy scarred lungs, not human.',
 'A world-sized biomechanical apocalypse: three layered pressure cavities answer at different speeds, deep organic foghorn swell crossed by brittle tectonic clicks, terminating in a vast sucked-in breath. Huge but controlled.'
];
const snakes = [
 'Cinder Maw, a furnace serpent: smoldering throat embers, two coarse bellows huffs and a ripping dry exhale. Low hot breath with sharp crackles; NO long generic monster scream.',
 'Thorn Cathedral, a thorn serpent: hollow seedpod rattle in short-short-long clusters, compressed venom hiss and brittle thorn friction. Almost entirely unvoiced and dry.',
 'Violet Widow, a venomous silk serpent: fine bowed silk whine beating against a breathy low vowel, then a tiny double jaw snap. Thin, intimate, unnervingly calm.',
 'Abyss Crown, a pelagic serpent: rounded underwater-like throat hoots separated by slow gill intake, deep liquid diaphragm wobble and a faint squealing nasal overtone.',
 'Grave eel: hollow skull clacks, dusty wheezing reed breath and an isolated thin inhaled whistle. Dry bone resonance, a hesitant three-tap funeral rhythm, no music.',
 'Hammer viper: explosive short closed-jaw barks, dense chest knocks and compressed blunt air gusts. One-two pause one cadence, muscular and percussive, not sustained.',
 'Mantis serpent: close articulated mandible clicks in a fast five-click burst, serrated insect stridulation and soft leg joint creaks. Delicate precision then abrupt violence.',
 'Sunforge serpent: turbulent solar venting, pressurized chest crackle and a low metallic vowel that blossoms into a hot breath. One slow expansion with two short aftershocks.',
 'Sawtooth serpent: coarse rotating dental rasp, uneven sawing cycles accelerating into a stopped jaw grind. Dry saw-bone contact and a restrained rough throat flutter.',
 'Lamprey serpent: circular suction-lip pops, layered viscous gill gulps and a short hollow liquid moan. Close wet muscular texture, no splashy water ambience.',
 'Stormcoil serpent: rubbery electrical eel chirrs, two sharp static-tongue discharges and tremulous gill breathing. Buzzing organic nerves, no lasers or electronic alarms.',
 'Oracle serpent: a breathy nonhuman two-chamber flute call with descending overtones, interrupted by quiet palate clicks and an inhaled sigh. Prophetic and alien, no singing.',
 'Carrion ribbon serpent: dry leathery neck rubs, rasping carrion-bird croaks in ragged groups, tiny beak taps and dusty exhalation. Scavenger articulation, not reptile growl.',
 'Eclipse dragon: distant throat horn opening into a close velvety subharmonic vowel, then a sudden inward breath and two deep jaw claps. Regal ominous slow phrasing.'
];
export const CREATURE_DESIGNS = [
 ...BOSS_ROSTER.map((p,i)=>({id:p.id,name:p.name,kind:'boss',index:p.index,archetype:p.archetype,description:bosses[i]})),
 ...SPACE_SNAKES.map((p,i)=>({id:p.id,name:p.id.replace('space_snake_',''),kind:'snake',index:i+1,description:snakes[i]}))
];
if(CREATURE_DESIGNS.length!==64||CREATURE_DESIGNS.some(p=>!p.description))throw Error('Incomplete creature art direction');
export const GENERATION_JOBS=CREATURE_DESIGNS.flatMap(p=>['signature','death','aggression','mechanism'].map(event=>({
 id:p.id,event,duration_seconds:{signature:7,death:4,aggression:3.5,mechanism:2.5}[event],
 text:`Sci-fi creature horror. ${p.description} ${{signature:'Three spaced gestures: ominous breath, territorial call, short attack. Preserve pauses.',death:'Fatal strain: its anatomy breaks, loses pressure, expires. Final textured breath.',aggression:'Enraged living challenge: strained forceful call, interrupted breath, ferocious final threat. NOT dying.',mechanism:'Nonvocal anatomy close-up: tense joints, compressed air, short violent strike and material rupture. No roar.'}[event]} Huge alien body, rich mids, restrained bass. Dry detail. No words, music or stock roar.`
})));
// Audition-analysis revision: the first Mantis death was thin, with isolated high-frequency transients.
GENERATION_JOBS.push({id:'space_snake_mantis',event:'death_body',duration_seconds:4,text:'Death of a huge alien mantis serpent. Three chunky mandible cracks, a sustained coarse LOW reed-like stridulation breaking into chest rattles, then a heavy final exhale. Dense audible body from 300 to 1800 Hz, tactile chitin and tearing tendons. Vicious animal distress, no words, music, high insect squeaks or isolated thin ticks. Four-second continuous fatal action with a natural dying tail.'});
