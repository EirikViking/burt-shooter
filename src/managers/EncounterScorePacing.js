// Keep special fights competitive with the player's recent ordinary score
// pace. Literal catch-up points go through the existing bonus-score contract.
// No passive timer reward: new, irreversible damage progress is required.
export class EncounterScorePacing {
  constructor(manager) {
    this.manager=manager;this.samples=[];this.group=null;
    this.lastAt=Number(manager.game.runElapsedSeconds)||0;this.lastScore=manager.game.score||0;
  }
  specialTargets() {
    const m=this.manager,d=m.discoveryEncounter;
    const set=new Set((m.enemies||[]).filter(e=>e.active&&!e.root
      && (e.kind==='mystery'||e.kind==='space_snake'||e.kind==='snake_baby'||(e.kind==='boss'&&d?.plan))));
    if(d?.plan&&d.primary?.active)set.add(d.primary);
    return [...set];
  }
  referenceRate() {
    const seconds=this.samples.reduce((n,s)=>n+s.seconds,0),points=this.samples.reduce((n,s)=>n+s.points,0);
    // Continuation/test runs have no preceding combat sample. The seed rate
    // is replaced by measured ordinary earnings once twelve seconds exist.
    return seconds>=12&&points>0 ? points/seconds : 180+Math.min(60,this.manager.level)*14;
  }
  update() {
    const m=this.manager,g=m.game,now=Number(g.runElapsedSeconds)||0,score=Number(g.score)||0;
    const dt=Math.max(0,Math.min(.25,now-this.lastAt)),earned=Math.max(0,score-this.lastScore);
    this.lastAt=now;this.lastScore=score;
    const targets=this.specialTargets();
    if(!this.group&&targets.length){
      this.group={at:now,score,rate:this.referenceRate(),seconds:0,targets:new Map(),lastHit:-Infinity,
        progress:0,paidProgress:0,paid:0,lastPopup:-Infinity};
    }
    const group=this.group;
    if(!group){
      if(dt>0){
        const sample=this.samples.at(-1);
        if(sample&&sample.seconds<1){sample.seconds+=dt;sample.points+=earned;}
        else this.samples.push({seconds:dt,points:earned});
      }
      else if(earned&&this.samples.length)this.samples.at(-1).points+=earned;
      let duration=this.samples.reduce((n,s)=>n+s.seconds,0);
      while(duration>90&&this.samples.length>1)duration-=this.samples.shift().seconds;
      return;
    }
    for(const e of targets)if(!group.targets.has(e))group.targets.set(e,{max:Math.max(1,e.maxHealth||e.health),low:Math.max(0,e.health)});
    let total=0,damage=0;
    for(const [e,entry]of group.targets){entry.low=Math.min(entry.low,Math.max(0,e.health));total+=entry.max;damage+=entry.max-entry.low;}
    const d=m.discoveryEncounter;
    // Reserve future health so damaging the primary does not spend the whole
    // relay's reward budget before the guest has even arrived.
    if(d?.plan&&!d.disposed){
      if(d.plan.kind!=='snake'&&!d.guest&&d.stage!=='failed')total+=d.baseHealth*d.plan.guestHealthRatio;
      if((d.plan.kind==='snake'||d.plan.kind==='relay_snake')&&!d.snake&&!d.snakeTriggered)total+=d.baseHealth*d.plan.snakeHealthRatio;
    }
    group.progress=Math.max(group.progress,Math.min(1,damage/Math.max(1,total)));
    if(now-group.lastHit<=4)group.seconds+=dt;
    const mysteryOnly=[...group.targets.keys()].every(e=>e.kind==='mystery');
    const budgetSeconds=mysteryOnly?40:d?.plan?.kind==='relay_snake'?180:120;
    if(group.progress>group.paidProgress+1e-6){
      const protectedSeconds=Math.min(group.seconds,group.progress*budgetSeconds);
      const deficit=Math.floor(group.rate*protectedSeconds-(score-group.score));
      if(deficit>0){
        const paid=g.addBonusScore(deficit);group.paid+=paid;this.lastScore=g.score;
        if(paid>0&&now-group.lastPopup>=1.5){
          const e=targets[0]||[...group.targets.keys()][0];
          g.scenes?.play?.showScorePopup?.(e.x,e.y,paid,{comboEligible:false});group.lastPopup=now;
        }
      }
      group.paidProgress=group.progress;
    }
    const awaitingGuest=d?.plan&&!d.disposed&&['waiting','warning','loading'].includes(d.stage);
    if(!targets.length&&!awaitingGuest){
      (g.encounterScoreLog||=[]).push({sector:m.level,seconds:now-group.at,engagedSeconds:group.seconds,
        referenceRate:group.rate,compensation:group.paid,totalEarned:g.score-group.score,progress:group.progress,
        enemies:[...group.targets.keys()].map(e=>e.type||e.profile?.id)});
      if(g.encounterScoreLog.length>120)g.encounterScoreLog.shift();this.group=null;
    }
  }
  noteDamage(target,amount) {
    if(!(amount>0))return;
    const root=target.root||target;
    if(this.group?.targets.has(root))this.group.lastHit=Number(this.manager.game.runElapsedSeconds)||0;
  }
  cancel(){this.group=null;this.lastAt=Number(this.manager.game.runElapsedSeconds)||0;this.lastScore=this.manager.game.score||0;}
}
