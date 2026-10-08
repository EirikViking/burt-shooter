import {CONVOY_SURPRISES} from './ConvoySurpriseCatalog.js';
// Source-server only, loopback only. Classified before run persistence and
// leaderboard work; ordinary packaged/Steam URLs cannot activate this route.
export function getEncounterEvolutionTest({development=import.meta.env?.DEV,location=globalThis.location}={}){
  if(!development||!['localhost','127.0.0.1','::1'].includes(location?.hostname))return null;
  const params=new URLSearchParams(location.search||'');
  if(params.get('desktop')==='1'||globalThis.window?.__NOVA_SWARM_DESKTOP__)return null;
  const id=params.get('encounterEvolution');
  return ['molt','payback','natural','reassembly','crossover','breach','breach-diagonal','planetfall','graveyard','siege','migration','fusions','orbit-breaker','reactor-tow','counterweight',...CONVOY_SURPRISES.map(row=>`rescue-${row.id}`)].includes(id)?Object.freeze({id,seed:'encounter-evolution-local-v1'}):null;
}
