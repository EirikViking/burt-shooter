// Cinder only. The transformation spends existing health; plates are cover,
// never enemies/objectives/rewards. Initial tuning hypotheses live here.
export const SERPENT_MOLT = Object.freeze({ profileId:'space_snake_cinder', threshold:.62,
  fractureSeconds:.65, maxPlates:2, plateSeconds:6, durabilityFraction:.18,
  recoveryWaves:3, droughtWaves:12, maximumEligibleGap:24 });
export function serpentMoltDue(ordinal,lastMolt,standalone){
  return standalone===true&&ordinal-(lastMolt??-SERPENT_MOLT.droughtWaves)>=SERPENT_MOLT.maximumEligibleGap;
}
const MODES=new Set(['ranked','ranked_tactical','overrun_pure','overrun_tactical','scout','sector_start']);
export function serpentMoltEligible({profileId,sector,runMode,standalone}) {
  return profileId===SERPENT_MOLT.profileId&&sector>=6&&MODES.has(runMode)&&standalone===true;
}
export class SerpentMoltModel {
  constructor(health){this.initialHealth=Math.max(1,Number(health)||1);this.phase='armoured';this.age=0;this.plates=[];}
  update(seconds,{age,health,living,paused=false}) {
    if(paused||this.phase==='ended')return;
    if(living<=0||health<=0){this.end();return;}
    const dt=Math.max(0,Math.min(1,Number(seconds)||0));
    if(this.phase==='armoured'&&age>=3&&living>=2&&health/this.initialHealth<=SERPENT_MOLT.threshold){
      this.phase='fracturing';this.age=0;return;
    }
    if(this.phase==='fracturing'){
      this.age+=dt;
      if(this.age>=SERPENT_MOLT.fractureSeconds){
        this.phase='exposed';this.age=0;
        this.plates=Array.from({length:SERPENT_MOLT.maxPlates},(_,index)=>({index,active:true,age:0,
          health:this.initialHealth*SERPENT_MOLT.durabilityFraction/SERPENT_MOLT.maxPlates,hitProjectiles:new WeakSet()}));
      }
      return;
    }
    if(this.phase==='exposed'){
      this.age+=dt;
      for(const p of this.plates){p.age+=dt;if(p.age>=SERPENT_MOLT.plateSeconds)p.active=false;}
    }
  }
  hitPlate(plate,damage,projectile){
    if(!plate?.active||!projectile||typeof projectile!=='object'||plate.hitProjectiles.has(projectile)
      ||!Number.isFinite(damage)||damage<=0)return false;
    plate.hitProjectiles.add(projectile);plate.health=Math.max(0,plate.health-damage);
    if(plate.health<=0)plate.active=false;return true;
  }
  end(){this.phase='ended';for(const p of this.plates)p.active=false;this.plates=[];}
}
