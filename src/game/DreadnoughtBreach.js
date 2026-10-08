export const BREACH_LAYOUTS=Object.freeze([
  {id:'split_battery',guns:[[.23,.36],[.77,.36]],relays:[[.36,.27],[.64,.27]],hull:[.5,.34],reactor:[.5,.31]},
  {id:'diagonal_battery',guns:[[.20,.28],[.70,.44]],relays:[[.34,.39],[.80,.25]],hull:[.52,.32],reactor:[.54,.29]}
]);
export class BreachModel{
  constructor(health,layout=0){this.maxHealth=health;this.layout=BREACH_LAYOUTS[layout%2];this.stage='battery';this.defeated=false;
    this.parts=[...this.layout.guns.map((pos,i)=>({id:`gun_${i}`,role:'gun',pos,health:health*.12,max:health*.12,link:`relay_${i}`})),
      ...this.layout.relays.map((pos,i)=>({id:`relay_${i}`,role:'relay',pos,health:health*.08,max:health*.08})),
      {id:'hull',role:'hull',pos:this.layout.hull,health:health*.25,max:health*.25},
      {id:'reactor',role:'reactor',pos:this.layout.reactor,health:health*.35,max:health*.35}];}
  targetable(part){return !this.defeated&&part.health>0&&(part.role==='gun'||part.role==='relay'||part.role==='hull'&&this.stage!=='battery'||part.role==='reactor'&&this.stage==='reactor');}
  powered(part){return part.health>0&&this.parts.find(p=>p.id===part.link)?.health>0;}
  hit(id,amount){const p=this.parts.find(p=>p.id===id);if(!p||!this.targetable(p))return 0;
    const armor=p.role==='gun'&&this.powered(p)?.45:1;
    const spent=Math.min(p.health,Math.max(0,Number(amount)||0)*armor);p.health=Math.max(0,p.health-spent);
    if(this.stage==='battery'&&(this.parts.filter(p=>p.role==='gun').every(p=>p.health===0)||this.parts.filter(p=>p.role==='relay').every(p=>p.health===0)))this.stage='hull';
    if(this.parts.find(p=>p.id==='hull').health===0)this.stage='reactor';
    if(this.parts.find(p=>p.id==='reactor').health===0){this.defeated=true;this.stage='collapse';}
    return spent;}
  get health(){return this.defeated?0:this.parts.reduce((n,p)=>n+p.health,0);}
}
