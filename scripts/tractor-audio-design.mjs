import {TRACTOR_FLEET} from '../src/config/TractorFleet.js';
export const CREATURE_DESIGNS=TRACTOR_FLEET;
export const GENERATION_JOBS=TRACTOR_FLEET.flatMap(p=>[
 {event:'charge',duration_seconds:1.5,ending:'A distinct anticipatory charging rise, no firing yet. Build warning tension with a clear ending.'},
 {event:'active',duration_seconds:3,ending:'The sustained operational tractor field in action. Immediate strong presence, evolving internal movement, no long lead in, controlled ending.'},
 {event:'break',duration_seconds:1,ending:'The field is abruptly severed: a satisfying short energy snap, mechanical release and dissipating charged tail.'}
].map(c=>({...c,id:p.id,text:`Cinematic sci-fi tractor field. ${p.sound}. ${c.ending} Tactile, powerful, detailed. No speech, music, beeps or silence.`})));
