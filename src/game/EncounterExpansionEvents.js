const HIGHLIGHTS=Object.freeze({breach:'Dreadnought breached',reassembly:'Reassembly interrupted',
  crossover:'Serpent armour reclaimed',salvage:'Captured weapon spent',rift:'Rift echoes connected'});
export function recordExpansionEvent(game,id,extra={}){
  if(!HIGHLIGHTS[id])return;
  const log=game.encounterExpansionEvents||=[];log.push({id,sector:game.level,at:Number(game.runElapsedSeconds)||0,...extra});
  if(log.length>24)log.shift();
}
export function encounterHighlight(events=[]){
  for(const id of ['breach','crossover','reassembly','salvage','rift']){
    const event=events.find(e=>e.id===id);if(event)return {id,sector:event.sector,label:HIGHLIGHTS[id]};
  }return null;
}
