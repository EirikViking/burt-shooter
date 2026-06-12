export const BOSS_DEATH_VOICE_COUNT = 100;
export const BOSS_DEATH_DEFAULT_VOICE_ID = 'KLZOWyG48RjZkAAjuM89';
export const BOSS_DEATH_DEFAULT_VOICE_NAME = 'Angry AL - Intense Male Space Misfit';
export const BOSS_DEATH_MODEL_ID = 'eleven_v3';
export const BOSS_DEATH_FORBIDDEN_VOICE_IDS = [
  'SIbt9DJkaY96v2K2fQyQ',
  'N2lVS1w4EtoT3dr4eOWO'
];

const AGONY_OPENERS = [
  'Aaaagh',
  'Nooo',
  'Graaah',
  'Aaargh',
  'Nnngh',
  'Raaagh',
  'Haaagh',
  'Uuuhh',
  'Ghhhaaah',
  'Aaaah'
];

const AGONY_BODIES = [
  'my core is tearing open',
  'the reactor is burning through my ribs',
  'my hull is splitting into fire',
  'the cockpit is full of white heat',
  'my armor is crushing inward',
  'the vacuum is inside my chest',
  'my spine is breaking in the light',
  'the engines are eating me alive',
  'my command deck is collapsing',
  'the pain is flooding every circuit',
  'my bones are ringing in the metal',
  'the stars are cutting through me',
  'my throat is full of plasma',
  'the blast is pulling me apart',
  'my heart is detonating with the ship',
  'the fire is under my skin',
  'my crown is melting into my face',
  'the bridge is folding around me',
  'my lungs are full of sparks',
  'the swarm link is screaming inside me'
];

const AGONY_ENDINGS = [
  'make it stop',
  'it hurts',
  'I can feel everything breaking',
  'I am burning',
  'the pain will not end',
  'I cannot hold the ship',
  'everything is tearing away',
  'I am falling into the reactor',
  'my signal is dying',
  'there is only fire'
];

function buildAgonyLine(index) {
  const opener = AGONY_OPENERS[index % AGONY_OPENERS.length];
  const body = AGONY_BODIES[(index * 7 + Math.floor(index / 3)) % AGONY_BODIES.length];
  const ending = AGONY_ENDINGS[(index * 11 + Math.floor(index / 5)) % AGONY_ENDINGS.length];
  const breath = index % 4 === 0 ? ' Please.' : index % 4 === 1 ? ' No more.' : index % 4 === 2 ? ' It burns.' : ' I am breaking.';
  return `${opener}! ${body}; ${ending}.${breath}`;
}

export const bossDeathVoiceLines = Array.from({ length: BOSS_DEATH_VOICE_COUNT }, (_, index) => ({
  id: `boss_death_agony_${String(index + 1).padStart(3, '0')}`,
  text: buildAgonyLine(index)
}));
