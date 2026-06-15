export const BOSS_DEATH_VOICE_COUNT = 100;
export const BOSS_DEATH_DEFAULT_VOICE_ID = 'YO6HUzlgJ0HQvmYejW5c';
export const BOSS_DEATH_DEFAULT_VOICE_NAME = 'Misfit Galaxy Male - Boss Agony';
export const BOSS_DEATH_MODEL_ID = 'eleven_v3';
export const BOSS_DEATH_FORBIDDEN_VOICE_IDS = [
  'KLZOWyG48RjZkAAjuM89',
  'SIbt9DJkaY96v2K2fQyQ',
  'N2lVS1w4EtoT3dr4eOWO'
];

const AGONY_DIRECTIONS = [
  '[screaming in agony, terrified, dark male voice]',
  '[ragged scream, panicked breathing, deep male voice]',
  '[howling in pain, voice breaking, cinematic villain death]',
  '[desperate male scream, choking on fear]',
  '[deep male voice, pure pain, no comedy]',
  '[guttural scream, afraid to die, collapsing]',
  '[violent pain, breathless panic, dark trailer voice]',
  '[final scream, terrified and wounded]'
];

const AGONY_OPENERS = [
  'Aaaagh no',
  'No no no',
  'Graaah it hurts',
  'Aaargh please',
  'Nnngh the pain is everywhere',
  'Raaagh stop',
  'Haaagh my body',
  'Uuuhh no more',
  'Ghhhaaah I can feel it',
  'Aaaah I do not want to die'
];

const AGONY_BODIES = [
  'my core is tearing open and I can feel every wire',
  'the reactor is burning through my ribs',
  'my hull is splitting and the fire is inside me',
  'the cockpit is full of white heat and panic',
  'my armor is crushing inward around my bones',
  'the vacuum is inside my chest',
  'my spine is breaking in the light',
  'the engines are eating me alive',
  'my command deck is collapsing on my lungs',
  'the pain is flooding every circuit',
  'my bones are ringing inside the metal',
  'the stars are cutting through my eyes',
  'my throat is full of plasma',
  'the blast is pulling me apart piece by piece',
  'my heart is detonating with the ship',
  'the fire is under my skin',
  'my crown is melting into my face',
  'the bridge is folding around me',
  'my lungs are full of sparks',
  'the swarm link is screaming inside me',
  'my hands are gone and the controls are still burning',
  'the emergency lights are inside my skull',
  'my armor is peeling away with my skin',
  'the pain is louder than the alarms'
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
  'there is only fire',
  'please do not let the dark take me',
  'I am not ready',
  'I am so afraid',
  'I can still feel the blast',
  'no mercy is coming',
  'my voice is breaking apart'
];

const AGONY_FINAL_CRIES = [
  '[scream]',
  '[long scream]',
  '[gasping scream]',
  '[ragged final scream]',
  '[panicked howl]',
  '[choked cry]',
  '[painful roar]',
  '[shuddering breath]'
];

function buildAgonyLine(index) {
  const opener = AGONY_OPENERS[index % AGONY_OPENERS.length];
  const body = AGONY_BODIES[(index * 7 + Math.floor(index / 3)) % AGONY_BODIES.length];
  const ending = AGONY_ENDINGS[(index * 11 + Math.floor(index / 5)) % AGONY_ENDINGS.length];
  const breath = index % 4 === 0 ? ' Please.' : index % 4 === 1 ? ' No more.' : index % 4 === 2 ? ' It burns.' : ' I am breaking.';
  return `${opener}! ${body}; ${ending}.${breath}`;
}

function buildGenerationText(index, line) {
  const direction = AGONY_DIRECTIONS[index % AGONY_DIRECTIONS.length];
  const finalCry = AGONY_FINAL_CRIES[(index * 5 + Math.floor(index / 2)) % AGONY_FINAL_CRIES.length];
  return `${direction} ${line} ${finalCry}`;
}

export const bossDeathVoiceLines = Array.from({ length: BOSS_DEATH_VOICE_COUNT }, (_, index) => {
  const text = buildAgonyLine(index);
  return {
    id: `boss_death_agony_${String(index + 1).padStart(3, '0')}`,
    text,
    generationText: buildGenerationText(index, text)
  };
});
