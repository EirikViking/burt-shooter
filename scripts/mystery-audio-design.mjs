import fs from 'node:fs';
export const MYSTERY_SOUND_DESIGNS = JSON.parse(fs.readFileSync('docs/mysteries/production-roster.json', 'utf8')).entries;
const events = [
  { event: 'arrival', duration_seconds: 3.5, direction: 'One commanding arrival reveal. Immediate readable onset, a distinctive creature identity, then a controlled tail.' },
  { event: 'presence', duration_seconds: 4, direction: 'A living operational presence phrase: richly evolving movement and character, not a static drone. Space between details.' },
  { event: 'warning', duration_seconds: 2, direction: 'A clearly anticipatory attack windup, three increasingly tense articulation beats ending in a tight inhale or mechanical lock. No discharge yet.' },
  { event: 'attack', duration_seconds: 2, direction: 'A strong attack release, immediate punch and clearly articulated high-mid detail with weight beneath it. No windup or long silence.' },
  { event: 'break', duration_seconds: 1.2, direction: 'One precise functional component snapping and failing, a short satisfying material fracture with a very short tail.' },
  { event: 'death', duration_seconds: 4.2, direction: 'A unique large creature defeat: structural collapse, a recognizable final cry or engine failure, decaying fragments and an elegant final fade.' }
];
export const MYSTERY_SOUND_JOBS = MYSTERY_SOUND_DESIGNS.flatMap(design => events.map(event => ({
  ...event, id: design.id,
  text: `Cinematic sci-fi ${design.name}: ${design.sound} ${event.direction} Full-sized weight, tactile material, vivid midrange. No speech, music or UI beeps.`
})));
// The seven singers have separate original calls. Removing a singer removes
// its audible part as well as its attack, without pitch-shifting one sample.
const choirMotifs = [
  'An airy three-note soprano cry, frost-glass throat resonance, one clear short rising phrase.',
  'A warm contralto descending two-note call, velvet breath and a restrained brass-like chest resonance.',
  'A deep bass throat pulse, two compact articulated notes with resonant stone-like weight.',
  'A whispering alto trill, fluttering silver breath followed by one clear sustained syllable without words.',
  'A hollow tenor call, three gently falling tones with a haunting ceramic-mouth resonance.',
  'A rasping low choral exhalation, one upward bend followed by a tight clean stop.',
  'The conductor: a powerful pure low-to-high vowel swell, luminous layered alien vocal body and a clean release.'
];
MYSTERY_SOUND_JOBS.push(...choirMotifs.map((direction, i) => ({ id: 'choir_unbound', event: `motif_${i}`, duration_seconds: 1.2,
  text: `Original cinematic alien creature vocal call for Choir Unbound. ${direction} One nonverbal rhythmic sound effect, immediate onset. No words, percussion, score, accompaniment or background drone.`
})));
for (const job of MYSTERY_SOUND_JOBS) if (job.text.length > 450) throw Error(`Sound prompt exceeds provider limit: ${job.id}/${job.event}`);
