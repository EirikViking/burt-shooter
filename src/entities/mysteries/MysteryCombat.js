import { claimMajorTelegraph } from '../../config/EncounterPacing.js';
import { MYSTERY_COMBAT } from '../../config/MysteryCombatProfiles.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export class MysteryCombat {
  constructor(actor) {
    this.a=actor; this.p=MYSTERY_COMBAT[actor.type]; this.next=.35; this.step=0; this.queue=[];
    this.phase=this.p.index*2.399; this.motionClock=0; this.charge=null; this.drones=[];
  }
  setup() {
    const a=this.a;
    for(const part of a.parts){part.restX=part.localX;part.restY=part.localY;part.restScale=part.sprite.scale.x;}
    // Only selected designs can be dismantled. Use their authored appendages,
    // never a random crop of the hull or an invisible damage threshold target.
    if(this.p.breakup!=='none'){
      let targets=a.parts.filter(p=>p.maxHealth>0);
      if(!targets.length)targets=a.parts.filter(p=>p!==a.body && !/core|engine|fang|clock/.test(p.name)).slice(0,6);
      for(const part of targets){
        if(!part.maxHealth){part.health=part.maxHealth=20;part.radius=24*a.scale;}
        part.health=part.maxHealth=a.definition.durability.component;part.structural=true;part.hitRadius=part.radius;
      }
      this.structural=targets;
    }else{
      // A non-dismantling design has one honest hull hitbox, no invisible armor.
      for(const p of a.parts){p.health=p.maxHealth=p.radius=p.hitRadius=0;}
      this.structural=[];
    }
    if(a.shells)a.shells.forEach((p,i)=>{p.restX=(i-1)*130;p.restY=Math.abs(i-1)*38;});
    if(a.shoal)a.shoal.forEach((p,i)=>{p.restX=Math.sin(i*2.4)*130;p.restY=Math.cos(i*2.4)*65;});
  }
  update(dt) {
    const a=this.a,p=this.p;
    // Heavy discharges commit to a firing position. The weapon remains dangerous,
    // but shots already in flight get a readable interception window.
    if(a.age>=(this.braceUntil||0))this.motionClock+=dt*(this.paceBoost||1);
    this.fly(dt);this.animate(dt);
    if(a.canAttack() && a.age>=this.next){
      const weapon=p.weapons[this.step%p.weapons.length];
      const fired=this.attack(weapon,this.step);
      if(fired)this.step++;
      const mixed=a.manager.enemies.some(e=>e.active&&e!==a&&!e.root&&(e.kind==='boss'||e.kind==='space_snake'));
      const exposed=this.structural.length>0&&!this.ports().length;
      this.next=a.age+(fired?p.cadence*(mixed?1.24:1)*(exposed?.88:1):.18);
    }
    const due=this.queue.filter(q=>q.at<=a.age);this.queue=this.queue.filter(q=>q.at>a.age);
    for(const q of due)if(a.canAttack()&&(!q.owner||q.owner.active))q.fire();
    this.drones=this.drones.filter(d=>{
      if(!d.active)return false;const life=a.age-d.born;
      d.localX=d.restX+Math.sin(life*2+d.phase)*70;
      d.localY=d.restY+life*115;
      if(life>1.1&&!d.fired){d.fired=true;this.fire(d,Math.atan2(a.player().y-d.y,a.player().x-d.x),3,.19,p.speed,'needle');}
      if(life>3.8){d.active=false;d.sprite.visible=false;return false;}return true;
    });
  }
  fly(dt) {
    const a=this.a,t=this.motionClock,ph=this.phase,p=this.p;
    if(a.age<(this.braceUntil||0)&&!this.charge){a.bank=lerp(a.bank||0,0,Math.min(1,dt*6));return;}
    let x=.5,y=.29,rate=4;
    switch(p.motion){
      case 'strafe':x=.5+Math.sin(t*1.25+ph)*.32;y=.28+Math.sin(t*2.1+ph)*.085;break;
      case 'weave':x=.5+Math.sin(t*.92+ph)*.28;y=.30+Math.sin(t*1.84+ph)*.12;break;
      case 'swoop':x=.5+Math.sin(t*.85+ph)*.32;y=.24+(1-Math.cos(t*1.7+ph))*.105;break;
      case 'orbit':x=.5+Math.cos(t*1.12+ph)*.27;y=.33+Math.sin(t*1.12+ph)*.14;break;
      case 'bomber':x=.5+Math.sin(t*.8+ph)*.31;y=.26+Math.sin(t*1.2)*.055;rate=3;break;
      case 'convoy':x=.5+Math.sin(t*.9+ph)*.23;y=.29+Math.sin(t*1.4)*.085;break;
      case 'scissor':x=.39+Math.sin(t*1.05)*.17;y=.32+Math.cos(t*1.3)*.1;break;
      case 'hunt':x=clamp(a.player().x/a.width+Math.sin(t*1.8+ph)*.19,.16,.84);y=.29+Math.sin(t*1.3+ph)*.12;rate=2.1;break;
      case 'phase':x=.5+Math.sin(t*1.22+ph)*.33;y=.25+Math.sin(t*2.44+ph)*.11;rate=7;break;
      case 'pounce':case 'dive':x=.5+Math.sin(t*1.1+ph)*.3;y=.25+Math.sin(t*1.7)*.08;break;
    }
    if(this.charge){
      const c=this.charge,age=a.age-c.born;
      if(age<c.warning){x=c.from.x/a.width;y=c.from.y/a.height;}
      else if(age<c.warning+c.duration){
        const u=(age-c.warning)/c.duration,s=u*u*(3-2*u);a.x=lerp(c.from.x,c.to.x,s);a.y=lerp(c.from.y,c.to.y,s);
        a.bank=angleDelta(Math.PI/2,Math.atan2(c.to.y-c.from.y,c.to.x-c.from.x))*.15;return;
      }else{this.charge=null;this.next=Math.max(this.next,a.age+.45);}
    }
    // Stay below the HUD after entry, even during a fast phase/strafe.
    y=clamp(y,this.p.index>=49?.31:.28,.58);
    const oldX=a.x;a.move(a.width*x,a.height*y,dt,rate);
    a.bank=lerp(a.bank||0,clamp((a.x-oldX)/Math.max(dt,1e-4)/a.width*.45,-.18,.18),Math.min(1,dt*9));
  }
  animate() {
    const a=this.a,t=a.age,p=this.p,recoil=Math.exp(-Math.max(0,t-(this.firedAt||-10))*16);
    if(a.type==='chrysalis_hunter'&&!a.transformed&&(a.health<a.maxHealth*.68||t>6)){
      a.fx.breakPart(a.body);a.transformed=true;this.paceBoost=1.3;
      a.body.sprite.texture=a.lease.frames.bottomRight;a.body.sprite.height=205*a.scale;a.body.sprite.scale.x=a.body.sprite.scale.y;
      a.wings.forEach(w=>{w.sprite.visible=w.active;});a.sound('break');
    }
    if(a.type==='lantern_mimic')a.jaws.forEach(j=>{j.sprite.visible=t>1.5;});
    for(const [i,part]of a.parts.entries()){
      if(!part.active||part===a.body||part.drone)continue;
      const side=Math.sign(part.restX)||((i%2)*2-1),n=part.name;
      part.localX=part.restX;part.localY=part.restY;
      part.sprite.rotation=part.baseAngle;
      if(/leg|jaw|fang|blade/.test(n)){part.sprite.rotation+=side*Math.sin(t*5.5+i*.9)*.14;part.localY+=recoil*12;}
      else if(/wing|foil|mantle|sail|vane|membrane|fin/.test(n)){part.sprite.rotation+=side*(Math.sin(t*3.2+i)*.09+(a.bank||0)*.3);part.localX+=side*Math.sin(t*2)*4;}
      else if(/gun|barrel|lance|weapon|cannon|turret/.test(n)){part.localY-=recoil*18;part.sprite.rotation+=clamp((a.player().x-a.x)/a.width,-.18,.18);}
      else if(/core|iris|chronometer|magnet|furnace|aperture|sensor/.test(n)){part.sprite.rotation+=Math.sin(t*1.8)*.16;part.sprite.alpha=.85+Math.sin(t*4)*.12;}
      else {part.localY+=Math.sin(t*2.6+i)*6;part.sprite.rotation+=Math.sin(t*2+i)*.06;}
      if(/echo/.test(n)){part.localX=side*(115+Math.sin(t*2)*45);part.localY=-20;part.sprite.alpha=.17+Math.sin(t*5+i)*.06;}
      if(n==='red_twin'){part.localX=180+Math.sin(t*2)*90;part.localY=Math.cos(t*2)*60;}
      if(n==='right_blade'&&a.twin){part.localX=a.twin.localX-10;part.localY=a.twin.localY+74;part.sprite.visible=a.twin.active;}
      if(/singer|recording|shell_/.test(n)){part.localX=part.restX+Math.sin(t*1.8+i)*12;part.localY=part.restY+Math.cos(t*2+i)*16;}
    }
    if(a.cables&&a.anchors)a.cables.forEach((c,i)=>{
      const h=a.anchors[i];c.sprite.visible=h.active;if(!h.active)return;
      const dx=h.localX-c.localX,dy=h.localY-c.localY,aspect=c.sprite.texture.orig.width/c.sprite.texture.orig.height;
      c.sprite.height=Math.hypot(dx,dy)*a.scale/Math.hypot(.7*aspect,.83);c.sprite.scale.x=c.sprite.scale.y;
      c.sprite.rotation=Math.atan2(dy,dx)-Math.atan2(.83,.7*aspect);
    });
    if(p.motion==='phase'&&Math.sin(t*6)> .6)a.fx.afterimage(a.body,a.x,a.y,a.bank||0);
  }
  later(delay,fire,owner=null){if(this.queue.length<24)this.queue.push({at:this.a.age+delay,fire,owner});}
  ports(){const a=this.a;return this.structural?.filter(p=>p.active)||[];}
  muzzle(origin=this.a){const a=this.a;this.firedAt=a.age;a.fx.burst(origin.x,origin.y,7,.6,'muzzle');}
  fire(origin,angle,count,spacing,speed,style='needle',custom={}){
    const a=this.a;this.muzzle(origin);
    return a.volley(origin.x,origin.y,angle,count,spacing,speed,{radius:(/bomb|comet|mine/.test(style)?10:6)*a.scale,
      animationStyle:style,weaponProfileId:`mystery_${a.type}_${style}`,warningColor:[0xff656a,0xff9765,0xff79c1][(this.p.index+this.step)%3],maxLifetimeMs:6500,...custom});
  }
  shot(weapon,step,origin=this.a){
    const a=this.a,p=this.p,target=a.player(),angle=Math.atan2(target.y-origin.y,target.x-origin.x),v=p.speed;
    switch(weapon){
      case 'needle':for(let i=0;i<3;i++)this.later(i*.14,()=>this.fire(a,angle+(i-1)*.09,2,.075,v+1.5,'needle'));break;
      case 'fan':this.fire(origin,angle,7,.19,v,'plasma');break;
      case 'barrage':for(let i=0;i<3;i++)this.later(i*.23,()=>this.fire(a,angle+(i-1)*.22,4,.12,v,'lance'));break;
      case 'flame':for(let i=0;i<4;i++)this.later(i*.17,()=>this.fire(a,angle+Math.sin(i)*.24,3,.18,v*.85,'ember',{accel:.018}));break;
      case 'braid':this.fire(origin,angle,6,.18,v,'crescent').forEach((b,i)=>this.modify(b,'curve',i%2?1:-1));break;
      case 'split':this.fire(origin,angle,3,.32,v*.8,'seed').forEach(b=>this.modify(b,'split'));break;
      case 'homing':this.fire(origin,angle,3,.46,v*.9,'dart').forEach(b=>this.modify(b,'homing'));break;
      case 'ricochet':this.fire(origin,Math.PI/2,6,.39,v,'shard').forEach(b=>this.modify(b,'bounce'));break;
      case 'petals':this.fire(origin,angle+Math.sin(step)*.22,9,.22,v*.72,'crescent').forEach((b,i)=>this.modify(b,'curve',(i%2?1:-1)*.6));break;
      case 'orbit':this.fire(origin,angle,7,.20,v,'star',{behavior:'orbit_then_release',orbitCenter:{x:origin.x,y:origin.y},orbitRadius:42*a.scale,orbitSpeed:.075,releaseAfterMs:650,releaseSpeed:v*a.scale,releaseAngle:angle}).forEach((b,i)=>{b.releaseAngle=angle+(i-3)*.22;});break;
      case 'bomb':case 'comet':this.fire(origin,angle,weapon==='bomb'?2:3,.36,v*.77,weapon).forEach(b=>this.modify(b,weapon));break;
      case 'mines':for(const side of [-1,1])this.fire(origin,Math.PI/2+side*.7,1,0,v*.55,'mine').forEach(b=>this.modify(b,'mine'));break;
      case 'rain':for(let i=0;i<4;i++)this.later(i*.18,()=>this.fire(a,Math.PI/2+(i-1.5)*.18,3,.16,v+1,'needle'));break;
      case 'broadside':for(const side of [-1,1]){const o=this.port(step+(side>0?1:0));this.fire(o,Math.PI/2+side*.3,4,.14,v,'shard');}break;
      case 'crossfire':for(const side of [-1,1]){const o=this.port(step+(side>0?1:0),side);this.fire(o,Math.atan2(target.y-o.y,target.x-o.x),3,.16,v,'needle');}break;
      case 'portal':{
        const o={x:a.width*(step%2?.2:.8),y:a.height*.38};a.fx.burst(o.x,o.y,14,1.3,'portal');
        this.later(.5,()=>this.fire(o,Math.atan2(target.y-o.y,target.x-o.x),5,.16,v+1,'dart'));break;
      }
      case 'sonic':this.fire(origin,angle,7,.21,v*.82,'crescent',{accel:.012});a.fx.burst(origin.x,origin.y,16,1.1,'shock');break;
      case 'lance':case 'rail':case 'prism':{
        const count=weapon==='prism'?3:1,locked=angle;
        for(let i=0;i<count;i++){
          const theta=locked+(i-(count-1)/2)*.25;
          a.beam(origin,{x:origin.x+Math.cos(theta)*a.height*1.1,y:origin.y+Math.sin(theta)*a.height*1.1},
            {width:weapon==='rail'?24:18,warning:weapon==='rail'?.85:.65,duration:weapon==='prism'?.24:.32,owner:origin===a?null:origin});
        }break;
      }
      case 'charge':this.startCharge();break;
      case 'drone':{
        if(this.drones.length>=4){this.shot('fan',step);break;}
        for(const side of [-1,1]){
          const d=a.part(`scout_${step}_${side}`,'bottomRight',{x:side*70,y:70,height:51,hp:8,radius:16});
          Object.assign(d,{drone:true,restX:d.localX,restY:d.localY,born:a.age,phase:step+side});
          this.drones.push(d);a.pendingTargets.push(d);a.fx.burst(d.x,d.y,6,.6,'muzzle');
        }break;
      }
      case 'echo':{
        // Replay a weapon already seen this run, not an offscreen wall/old hazard.
        const remembered=Object.values(a.game.mysteryMemories||{}).flat().filter(r=>r.kind==='volley').slice(-3)[step%3];
        this.fire(origin,angle,clamp(remembered?.count||5,3,7),.19,clamp(remembered?.speed||v,3.8,5.5),'crescent');break;
      }
      default:throw Error(`Unknown Mystery weapon ${weapon}`);
    }
  }
  port(step,side=1){
    const a=this.a,ports=this.ports();return ports.length?ports[step%ports.length]:{x:a.x+side*50*a.scale,y:a.y+40*a.scale};
  }
  attack(weapon,step){
    const a=this.a;
    if(this.charge)return true;
    // A broken gun changes the attack source. An exposed core becomes faster
    // but fires fewer rounds: damage changes the fight rather than adding HP.
    const ports=this.ports();
    if(this.structural.length&&!ports.length&&step%3===1)weapon='needle';
    if(['dive','pounce'].includes(this.p.motion)&&step%4===2)weapon='charge';
    if(['rail','lance','prism','charge'].includes(weapon)&&!claimMajorTelegraph(a.game,a,weapon==='charge'?1.55:1.2))return false;
    if(['rail','lance','prism'].includes(weapon))this.braceUntil=a.age+(weapon==='rail'?1.65:1.4);
    else if(this.p.motion==='bomber'&&['barrage','bomb','comet'].includes(weapon))this.braceUntil=a.age+.9;
    this.shot(weapon,step);
    if(a.type==='choir_unbound')a.sound(`motif_${ports.length?this.structural.indexOf(ports[step%ports.length]):6}`);
    return true;
  }
  startCharge(){
    const a=this.a,p=a.player();if(this.charge||p.y<a.height*.48)return this.shot('fan',this.step);
    const to={x:clamp(p.x,a.width*.12,a.width*.88),y:Math.min(a.height*.80,p.y-85*a.scale)};
    this.charge={from:{x:a.x,y:a.y},to,born:a.age,warning:.75,duration:.78};
    a.fx.charge(this.charge);a.stats.warnings++;a.sound('warning');this.next=a.age+1.95;
    this.later(.76,()=>{a.stats.attacks++;a.sound('attack_alt');a.fx.burst(a.x,a.y,14,1,'muzzle');});
  }
  modify(b,kind,direction=1){
    const a=this.a,update=b.update.bind(b),born=a.age;let done=false;
    b.update=(delta,...args)=>{
      if(!b.active)return;const d=Math.min(6,Math.max(0,delta)),age=(a.age-born);
      if(kind==='homing'&&age<.65){const p=a.player(),ang=Math.atan2(b.vy,b.vx),target=Math.atan2(p.y-b.y,p.x-b.x),s=Math.hypot(b.vx,b.vy);const n=ang+clamp(angleDelta(ang,target),-.017*d,.017*d);b.vx=Math.cos(n)*s;b.vy=Math.sin(n)*s;}
      if(kind==='curve'&&age<1.05){const ang=Math.atan2(b.vy,b.vx)+direction*.012*d,s=Math.hypot(b.vx,b.vy);b.vx=Math.cos(ang)*s;b.vy=Math.sin(ang)*s;}
      if(kind==='bounce'&&!done&&(b.x<a.width*.06||b.x>a.width*.94)){b.vx=-b.vx;done=true;a.fx.burst(b.x,b.y,5,.5,'muzzle');}
      const fuse=kind==='split'?.82:kind==='bomb'?1.45:kind==='mine'?1.9:kind==='comet'?1.25:Infinity;
      if(!done&&age>fuse&&a.canAttack()){
        done=true;const pos={x:b.x,y:b.y};a.play.bulletManager.deactivateBullet?.(b,'mystery_detonation');
        if(kind==='split')this.fire(pos,Math.atan2(b.vy,b.vx),3,.24,this.p.speed,'shard');
        else {
          a.zone(pos,{radius:kind==='mine'?34:49,warning:.5,duration:.18});
          this.later(.5,()=>{a.fx.burst(pos.x,pos.y,18,1.25,'explosion');this.fire(pos,Math.PI/2,kind==='comet'?5:4,.65,this.p.speed*.8,'ember');});
        }
      }
      if(b.active)update(delta,...args);
    };
  }
  partBroken(part){
    const a=this.a;
    this.queue=this.queue.filter(q=>q.owner!==part);
    if(part.structural){a.health=Math.max(1,a.health-a.maxHealth*a.definition.durability.breakFraction);this.next=Math.max(this.next,a.age+.3);}
    if(a.twin===part&&a.otherBlade){a.otherBlade.active=false;a.otherBlade.sprite.visible=false;}
    if(a.anchors?.includes(part)){const c=a.cables[a.anchors.indexOf(part)];c.active=false;c.sprite.visible=false;}
    for(const bud of a.parts.filter(p=>p.parentBranch===part&&p.active)){a.fx.breakPart(bud);bud.active=false;bud.sprite.visible=false;}
    if(a.type==='chrysalis_hunter'||a.type==='worldmolt')this.paceBoost=1.2;
    if(['vault_crawler','courier_zero','rail_cathedral'].includes(a.type) && part.structural
      && !this.ports().length && !this.coreOpened){
      this.coreOpened=true;this.coreBonusUntil=a.age+4;
      a.additionalBonus=()=>a.age<=this.coreBonusUntil?1500:0;
      a.stats.coreOpenedAt=a.age;a.sound('warning');a.fx.burst(a.x,a.y,18,1.2,'portal');
    }
  }
  damageStage(){
    const a=this.a,parts=this.structural;if(!parts.length)return;
    const lost=Math.floor((1-a.health/a.maxHealth)*(parts.length+1));
    if(lost>parts.filter(p=>!p.active).length){const part=parts.find(p=>p.active&&p.sprite.visible);if(part)part.takeDamage(part.health);}
  }
  clear(){this.queue.length=0;this.charge=null;}
}
