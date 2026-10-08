export const PLANETFALL=Object.freeze({arrivalSeconds:3.2,irisPeriod:7,irisOpenSeconds:3.2,warningSeconds:1.4});
const EPSILON=1e-8;

export class PlanetfallModel{
  constructor(health){
    if(!Number.isFinite(health)||health<=0)throw new RangeError('Planetfall requires finite positive health');
    this.maxHealth=health;this.age=0;this.stage='arrival';this.defeated=false;this.warning=null;this.nextAttack=PLANETFALL.arrivalSeconds;
    this.parts=[...Array.from({length:4},(_,i)=>({id:`anchor_${i}`,role:'anchor',health:health*.08,max:health*.08})),
      {id:'core',role:'core',health:health*.68,max:health*.68}];
  }
  get irisOpen(){return !this.defeated&&this.age+EPSILON>=PLANETFALL.arrivalSeconds&&
    (this.parts.slice(0,4).every(p=>p.health===0)||(this.age-PLANETFALL.arrivalSeconds+EPSILON)%PLANETFALL.irisPeriod<PLANETFALL.irisOpenSeconds);}
  get health(){return this.defeated?0:Math.min(this.maxHealth,this.parts.reduce((n,p)=>n+p.health,0));}
  targetable(part){return !this.defeated&&this.age+EPSILON>=PLANETFALL.arrivalSeconds&&part?.health>0&&(part.role==='anchor'||this.irisOpen);}
  update(seconds,{paused=false}={}){
    if(paused){this.interrupt();return;}
    if(this.defeated||!Number.isFinite(seconds)||seconds<=0)return;
    this.age+=Math.min(.1,seconds);
    if(this.stage==='arrival'&&this.age+EPSILON>=PLANETFALL.arrivalSeconds)this.stage='orbit';
  }
  hit(id,amount){
    const part=this.parts.find(p=>p.id===id);
    if(!Number.isFinite(amount)||amount<=0||!this.targetable(part))return 0;
    const spent=Math.min(part.health,amount);part.health=Math.max(0,part.health-spent);
    const core=this.parts[4];
    if(core.health===0){this.defeated=true;this.stage='collapse';this.warning=null;}
    else if(core.health<=core.max*.5)this.stage='rupture';
    return spent;
  }
  beginWarning(aims){
    if(this.defeated||this.warning||this.age+EPSILON<this.nextAttack||!Array.isArray(aims))return false;
    const seen=new Set(),origins=[];
    for(const aim of aims){
      const part=this.parts.find(p=>p.id===aim?.part);
      if(!part||part.health<=0||seen.has(part.id)||![aim.x,aim.y,aim.angle].every(Number.isFinite))continue;
      seen.add(part.id);origins.push(Object.freeze({part:part.id,x:aim.x,y:aim.y,angle:aim.angle,count:part.role==='core'?2:1}));
    }
    if(!origins.length)return false;
    this.warning=Object.freeze({at:this.age,origins:Object.freeze(origins)});return true;
  }
  consumeVolley(){
    if(this.defeated||!this.warning||this.age-this.warning.at+EPSILON<PLANETFALL.warningSeconds)return [];
    const origins=this.warning.origins.filter(aim=>this.parts.find(p=>p.id===aim.part)?.health>0);
    this.warning=null;this.nextAttack=this.age+(this.stage==='rupture'?1.9:2.4);return origins;
  }
  interrupt(){this.warning=null;this.nextAttack=Math.max(PLANETFALL.arrivalSeconds,this.age+.25);}
}
