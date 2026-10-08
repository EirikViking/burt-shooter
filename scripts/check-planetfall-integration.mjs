import assert from 'node:assert/strict';
import {getEncounterEvolutionTest} from '../src/config/EncounterEvolutionTest.js';
const location={hostname:'127.0.0.1',search:'?encounterEvolution=planetfall'};
assert.equal(getEncounterEvolutionTest({development:true,location})?.id,'planetfall');
assert.equal(getEncounterEvolutionTest({development:false,location}),null);
assert.equal(getEncounterEvolutionTest({development:true,location:{...location,hostname:'example.com'}}),null);
assert.equal(getEncounterEvolutionTest({development:true,location:{...location,search:location.search+'&desktop=1'}}),null);
console.log('[planetfall] PASS loopback DEV admission and production/remote/desktop rejection');
