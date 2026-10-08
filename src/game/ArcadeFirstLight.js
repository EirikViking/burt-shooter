import { FIRST_LIGHT_DESIGNS } from '../config/FirstLightDesigns.js';
import { GLOBAL_CHALLENGE_TUNING } from '../config/BalanceConfig.js';
import {convoySurpriseOrder,convoySurpriseSector} from '../config/ConvoySurpriseCatalog.js';
import {makeConvoySurprise,hitConvoySurprise,updateConvoySurprise} from './ConvoySurprises.js';
// Run-local encounters. No save writes, score awards or gameplay RNG draws.
const MODES = new Set(['ranked', 'ranked_tactical', 'overrun_pure', 'overrun_tactical', 'scout', 'sector_start']);
export function firstLightEligible(game = {}) {
  return MODES.has(game.runMode) && !game.lateGameExperiment?.active
    && (!game.runPolicy?.prototype || Boolean(game.encounterEvolutionTest));
}
// Initial tuning hypotheses: service finishes first; one eligible combat
// window, one weapon, and no more than 70% of its original health.
export const CONVOY_PAYBACK = Object.freeze({ eligibleSeconds: 90, sectorWindow: 11,
  // Opening observations and real-volley comparisons: launch during the hull's
  // 1.4s approach, then fly in for .8s. Earlier admission needs coordinated aim.
  rivalAdmissionAge: .8, arrival: .8, firingSeconds: 2.4, departure: .8, weaponFraction: .7 });
// Once per arrival, cover the living gun farthest from the player's current
// firing lane. Geometry only: no health/performance adaptation or RNG draws.
export function convoyPaybackTarget(encounter, targets, playerX) {
  if(encounter?.kind!=='rival'||encounter.won)return null;
  let part=encounter.hp.left>0?'left':encounter.hp.right>0?'right':null;
  if(!Number.isFinite(playerX))return part;
  let distance=-1;
  for(const target of targets||[]){
    if(!['left','right'].includes(target.part)||encounter.hp[target.part]<=0||!Number.isFinite(target.x))continue;
    const next=Math.abs(target.x-playerX);
    if(next>distance){distance=next;part=target.part;}
  }
  return part;
}
const WING_CALLSIGNS = [['LARK','KESTREL'],['SWIFT','MERLIN'],['TERN','OSPREY'],['WREN','FALCON']];
export function firstLightEncounterForSector(sector) {
  if (!Number.isInteger(sector) || sector < 1) return null;
  return sector % 10 === 1 ? 'convoy' : sector % 10 === 2 ? 'rival' : null;
}
// A repeatable score target replaces the old shield drop. Hull variety changes
// the base bounty; sector pressure raises it without consuming gameplay RNG.
export function firstLightRivalDroneValue(sector, variant) {
  const level=Math.max(2,Math.floor(Number(sector)||2));
  const hull=Math.max(0,Math.floor(Number(variant)||0))%FIRST_LIGHT_DESIGNS.rival.length;
  return Math.min(50000,Math.round(((650+hull*175)*(1+(level-2)*.07))/50)*50);
}
export function firstLightShotTouches(bullet, target) {
  const ax = Number.isFinite(bullet.previousX) ? bullet.previousX : bullet.x;
  const ay = Number.isFinite(bullet.previousY) ? bullet.previousY : bullet.y;
  const dx = bullet.x - ax, dy = bullet.y - ay;
  const along = Math.max(0, Math.min(1, ((target.x-ax)*dx+(target.y-ay)*dy)/(dx*dx+dy*dy || 1)));
  if(target.halfWidth&&target.halfHeight){
    const expand=Math.min(12,Number(bullet.radius)||0),rx=target.halfWidth+expand,ry=target.halfHeight+expand;
    const nx=(ax-target.x)/rx,ny=(ay-target.y)/ry,ndx=dx/rx,ndy=dy/ry;
    const t=Math.max(0,Math.min(1,-(nx*ndx+ny*ndy)/(ndx*ndx+ndy*ndy||1)));
    return (nx+t*ndx)**2+(ny+t*ndy)**2<=1;
  }
  const radius = target.radius + Math.min(12, Number(bullet.radius) || 0);
  return (ax+along*dx-target.x)**2+(ay+along*dy-target.y)**2 <= radius**2;
}
export class FirstLightModel {
  constructor(seed) {
    this.seed = String(seed || 'first-light'); this.sector = 0; this.clock = 0;
    this.seen = new Set(); this.encounter = null; this.escorts = []; this.rewardCount = 0;
    this.lastEnd = null; this.rescued = 0; this.victories = 0;
    this.payback = null; this.paybackOffered = false;
    this.surpriseOrder=convoySurpriseOrder(this.seed);this.surpriseOrdinal=0;
    this.ordinaryRecovery=15;
  }
  variantFor(sector) {
    let h = 2166136261;
    const kind = firstLightEncounterForSector(sector) || 'rival';
    for (const c of `${this.seed}:first-light:${kind}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return ((h >>> 0) + Math.floor((sector - 1) / 10)) % FIRST_LIGHT_DESIGNS[kind].length;
  }
  nextSurpriseId(){return this.surpriseOrder[this.surpriseOrdinal%this.surpriseOrder.length];}
  update(seconds, { sector, safe, combat = safe, present = safe, paused = false, ordinary = false, allowSurprise = true, paybackPart = null }) {
    if (paused) return;
    const dt = Math.max(0, Math.min(.1, Number(seconds) || 0));
    // A transition cannot confiscate a rescue or an unfinished encounter.
    // Service and encounter clocks count playable combat, not briefings.
    if (sector !== this.sector) { this.sector = sector; this.clock = 0; }
    this.supportActive = Boolean(combat);
    for (const escort of this.escorts) { escort.joinAge=(escort.joinAge||0)+dt; if (combat) escort.age += dt; }
    this.escorts = this.escorts.filter(e => e.age < 10);
    this.updatePayback(dt, {sector, safe, combat, paybackPart});
    if (this.encounter) {
      this.ordinaryRecovery=0;
      this.encounter.suspended = !present;
      // Finished rivals have no attacks or remaining choice to suspend.
      // Let their bounded breakup finish even when the next warning begins.
      if (safe || this.encounter.won) this.encounter.age += dt;
      updateConvoySurprise(this.encounter,dt,{safe});
      if (this.encounter.age >= this.encounter.duration) this.cancel('departed', false);
      return;
    }
    if (!safe) { this.clock = 0; return; }
    if(combat&&ordinary)this.ordinaryRecovery+=dt;
    if (this.seen.has(sector)) return;
    const existing=firstLightEncounterForSector(sector);
    const surprise=!existing&&convoySurpriseSector(sector);
    if(surprise&&(!ordinary||!combat||!allowSurprise||this.ordinaryRecovery<15||this.escorts.length||this.payback?.status==='active')){this.clock=0;return;}
    this.clock += dt;
    const kind = existing||(surprise?'convoy':null);
    if (!kind || this.clock < (kind === 'convoy' ? 5 : 4)) return;
    this.seen.add(sector);
    const scale = 1 + Math.min(4, (sector - 1) / 25);
    const rivalHealth = kind === 'rival' && sector >= 11 ? GLOBAL_CHALLENGE_TUNING.rivalHealth : 1;
    this.encounter = { kind, sector, variant: this.variantFor(sector), age: 0,
      duration: kind === 'convoy' ? 12 : 18,
      hp: { left: (kind === 'convoy' ? 3 : 6) * scale * rivalHealth, right: (kind === 'convoy' ? 3 : 6) * scale * rivalHealth, core: 10 * scale * rivalHealth },
      maxHp: { side: (kind === 'convoy' ? 3 : 6) * scale * rivalHealth, core: 10 * scale * rivalHealth },
      hitProjectiles: new WeakSet(), won: false, suspended: false };
    if(surprise){Object.assign(this.encounter,makeConvoySurprise(this.nextSurpriseId(),scale));this.surpriseOrdinal++;}
  }
  hit(part, amount, projectile) {
    const e = this.encounter;
    if(e?.surprise){
      const result=hitConvoySurprise(e,part,amount,projectile);
      if(result?.type==='rescue')this.rescuePilot(result.rescues[0]);
      return result;
    }
    if (!e || e.won || e.suspended || !['left', 'right', 'core'].includes(part) || !projectile || typeof projectile !== 'object'
      || !Number.isFinite(amount) || amount <= 0 || e.hp[part] <= 0 || e.hitProjectiles.has(projectile)) return null;
    if (part === 'core' && (e.kind === 'convoy' || e.hp.left > 0 || e.hp.right > 0)) return null;
    e.hitProjectiles.add(projectile);
    e.hp[part] = Math.max(0, e.hp[part] - amount);
    if (e.hp[part] > 0) return { type: 'hit', part };
    if (e.kind === 'convoy') {
      this.rescuePilot(part);
      return { type: 'rescue', part };
    }
    if (part !== 'core') return { type: 'weapon', part };
    e.won = true; e.wonAt = e.age; e.duration = e.age + 1.8;
    this.rewardCount++; this.victories++;
    return { type: 'victory', part };
  }
  rescuePilot(part){
      const e=this.encounter;
      this.escorts=this.escorts.filter(ally=>ally.side!==(part==='left'?-1:1));
      const index=part==='left'?0:1, design=FIRST_LIGHT_DESIGNS.convoy[e.variant];
      const identity={side:index?1:-1,rank:design.escortRanks[index],callsign:WING_CALLSIGNS[e.variant][index]};
      (e.rescueWing ||= []).push(identity);
      this.escorts.push({ ...identity, age: 0, shotTimer: 0, origin: null });
      this.rescued++;
      // Both pilots get time to launch before the emptied transport accelerates away.
      if(e.hp.left<=0&&e.hp.right<=0){
        e.duration=e.age+3.2;
        if(!this.paybackOffered){
          this.paybackOffered=true;
          this.payback={family:'convoy-payback',status:'serving',sector:e.sector,eligibleSeconds:0,
            identity:e.rescueWing.map(a=>({...a})),escorts:[],age:0,spentDamage:0};
        }
      }
  }
  hitRescueSupport(part,amount,projectile){return hitConvoySurprise(this.encounter,part,amount,projectile,'ally');}
  attackEnabled(part) { return Boolean(this.encounter?.kind === 'rival' && !this.encounter.won && this.encounter.hp[part] > 0); }
  updatePayback(dt, {sector, safe, combat, paybackPart}) {
    const p=this.payback,e=this.encounter;
    if(!p||['spent','expired'].includes(p.status))return;
    if(p.status==='serving'){
      if(!this.escorts.length)p.status='ready';else return;
    }
    if(p.status==='ready'){
      if(combat)p.eligibleSeconds+=dt;
      if(sector>p.sector+CONVOY_PAYBACK.sectorWindow||p.eligibleSeconds>=CONVOY_PAYBACK.eligibleSeconds){p.status='expired';return;}
      if(!safe||!e||e.kind!=='rival'||e.sector<=p.sector||e.won||e.age<CONVOY_PAYBACK.rivalAdmissionAge||e.duration-e.age<4.2)return;
      const part=['left','right'].includes(paybackPart)&&e.hp[paybackPart]>0?paybackPart
        :e.hp.left>0?'left':e.hp.right>0?'right':null;if(!part)return;
      p.status='active';p.encounter=e;p.part=part;p.budget=e.maxHp.side*CONVOY_PAYBACK.weaponFraction;p.age=0;
      p.escorts=p.identity.map(a=>({...a,age:0,shotTimer:0,payback:true}));
    }
    if(p.status==='active'){
      if(e!==p.encounter||e?.won||e?.hp[p.part]<=0)p.departAt??=p.age;
      if(!safe)return;
      p.age+=dt;
      for(const a of p.escorts){a.age=p.age;a.shotTimer=Math.max(0,a.shotTimer-dt);}
      const end=p.departAt!=null?p.departAt+CONVOY_PAYBACK.departure
        :CONVOY_PAYBACK.arrival+CONVOY_PAYBACK.firingSeconds+CONVOY_PAYBACK.departure;
      if(p.age>=end){p.status='spent';p.escorts=[];p.encounter=null;}
    }
  }
  hitPayback(part, amount, projectile) {
    const p=this.payback,e=this.encounter;
    if(p?.status!=='active'||e!==p.encounter||part!==p.part||part==='core'
      ||p.departAt!=null||p.age<CONVOY_PAYBACK.arrival||p.age>=CONVOY_PAYBACK.arrival+CONVOY_PAYBACK.firingSeconds
      ||!Number.isFinite(amount)||amount<=0)return null;
    const damage=Math.min(amount,Math.max(0,p.budget-p.spentDamage),e.hp[part]);
    if(!(damage>0))return null;
    const before=e.hp[part],result=this.hit(part,damage,projectile);
    if(result)p.spentDamage+=before-e.hp[part];
    return result;
  }
  cancel(reason, clearEscorts = true) {
    if (this.encounter) this.lastEnd = { kind: this.encounter.kind, surprise:this.encounter.surprise, sector: this.encounter.sector, reason, won: this.encounter.won };
    this.encounter = null;
    if (clearEscorts) {this.escorts = [];this.payback=null;}
  }
  snapshot() {
    const e = this.encounter;
    return { sector: this.sector, encounter: e ? { kind: e.kind, surprise:e.surprise, age: e.age, variant: e.variant, hp: { ...e.hp }, won: e.won, ...(e.reactor?{reactor:{...e.reactor}}:{}),...(e.counterweight?{counterweight:{...e.counterweight}}:{}) } : null,
      escorts: this.escorts.map(a => ({ side: a.side, rank:a.rank, callsign:a.callsign, remaining: Math.max(0, 10 - a.age) })),
      payback:this.payback?{status:this.payback.status,part:this.payback.part,age:this.payback.age,
        budget:this.payback.budget,spentDamage:this.payback.spentDamage,eligibleSeconds:this.payback.eligibleSeconds,
        identity:this.payback.identity.map(a=>({...a}))}:null,
      rescued: this.rescued, victories: this.victories, lastEnd: this.lastEnd };
  }
}
