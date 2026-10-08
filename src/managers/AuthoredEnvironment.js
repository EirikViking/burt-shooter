import { Assets, Container, Graphics } from 'pixi.js';
import {prewarmPremiumArt,premiumTexture} from '../effects/PremiumArt.js';
import { Enemy } from '../entities/Enemy.js';
import { EncounterComponent } from '../entities/EncounterComponent.js';
import { SPACE_SNAKES } from '../config/SpaceSnakes.js';
import { serpentPlateTouches } from '../effects/SerpentMolt.js';

let relayTexture,relayPromise;
export class AuthoredEnvironment{
  static prewarm(){return relayPromise ||= Promise.all([Assets.load('/art/astra/component/02.png'),prewarmPremiumArt()]).then(([texture])=>relayTexture=premiumTexture('relay')||texture).catch(error=>{relayPromise=null;throw error;});}
  static get siegeReady(){return Boolean(relayTexture);}
  constructor(manager,definition,config){this.manager=manager;this.game=manager.game;this.definition=definition;
    this.id=definition.id;this.kind='environment';this.active=true;this.age=0;this.guns=[];this.relays=[];this.covers=[];
    this.sprite=new Container();this.sprite.label=`authored_environment:${this.id}`;manager.container.addChild(this.sprite);
    this.lines=new Graphics();this.sprite.addChild(this.lines);
    this.game.scenes.play.recordThreatDiscovery?.(`encounter_${this.id}`,'enemies',{sector:manager.level},{scoreBonus:false,silent:true});
    const w=this.game.getWidth(),h=this.game.getHeight();
    if(this.id==='migration'){
      // One real mother replaces the whole wave, including real owned babies.
      this.chain=manager.spawnSpaceSnake(SPACE_SNAKES[0],{force:true,count:5,healthScalar:.55});
      if(this.chain){this.chain.migration=true;this.chain.migrationAge=0;
        if(this.chain.brood)this.chain.brood.plan.hatchAt=3.3;}
    }else{
      const count=Math.min(this.id==='siege'?3:6,Math.max(3,Number(config.count)||3));
      for(let i=0;i<count;i++){
        const x=w*(.16+.68*i/Math.max(1,count-1)),enemy=new Enemy(x,-70-(i%2)*90,this.id==='siege'?'turret':'grunt',manager.level,this.game);
        const normalUpdate=enemy.update.bind(enemy),normalShot=enemy.shoot.bind(enemy),normalDamage=enemy.takeDamage.bind(enemy);
        const targetY=h*(this.id==='siege'?(i%2?.35:.27):.26);
        enemy.environmentOwner=this;enemy.update=(delta,...args)=>{
          normalUpdate(delta,...args);const t=Math.min(1,this.age/1.3);enemy.x=x;enemy.y=-90+(targetY+90)*t;
          enemy.sprite.position.set(enemy.x,enemy.y);enemy.state=t<1?'ENTRY':'FORMATION';enemy.waitingForEntry=false;
          if(enemy.body&&this.id==='siege')enemy.body.tint=enemy.linkedRelay?.active?0xffffff:0x5f7d85;
        };
        enemy.shoot=(...args)=>{const shots=normalShot(...args);for(const b of (Array.isArray(shots)?shots:shots?[shots]:[])){b.environmentOwner=this;b.environmentGun=enemy;}return shots;};
        manager.enemies.push(enemy);manager.container.addChild(enemy.sprite);this.guns.push(enemy);
        if(this.id==='siege'){
          if(enemy.body&&premiumTexture('battery')){enemy.body.texture=premiumTexture('battery');enemy.body.width=68;enemy.body.scale.y=enemy.body.scale.x;}
          const relay=new EncounterComponent(this,{id:`siege_relay_${i}`,health:Math.max(1,enemy.maxHealth*.25),width:40,radius:28},
            relayTexture,(part,amount)=>{
              part.health=Math.max(0,part.health-amount);if(!part.health){part.active=false;part.sprite.visible=false;this.clearGunShots(enemy);}
            });
          relay.x=x+(i%2?-1:1)*w*.045;relay.y=targetY-h*.08;relay.sprite.position.set(relay.x,relay.y);
          relay.ring.circle(0,0,relay.radius).stroke({color:0x82edcb,width:2});relay.gun=enemy;
          enemy.linkedRelay=relay;this.relays.push(relay);manager.enemies.push(relay);
          const canShoot=enemy.canShoot.bind(enemy);enemy.canShoot=()=>relay.active&&canShoot();
          enemy.takeDamage=(amount,options)=>normalDamage(amount*(relay.active?.55:1),options);
        }
      }
    }
  }
  clearGunShots(gun){const bm=this.game.scenes.play.bulletManager;
    for(const b of bm.enemyBullets)if(b.active&&b.environmentOwner===this&&(!gun||b.environmentGun===gun))bm.deactivateBullet(b,'environment_shutdown');}
  update(delta){if(!this.active)return;this.age+=Math.min(.1,Math.max(0,delta/60));this.lines.clear();
    if(this.id==='siege')for(const r of this.relays){if(!r.gun.active){r.active=false;r.sprite.visible=false;}else if(r.active)
      this.lines.moveTo(r.x,r.y).lineTo(r.gun.x,r.gun.y).stroke({color:0x82edcb,width:2});}
    if(this.id==='graveyard'){
      for(const r of this.manager.combatWrecks.records)if(r.active&&!r.owner&&!r.cover&&this.covers.length<2){
        r.cover=true;r.health=r.maxHealth=3;r.rx=this.game.getWidth()*.045;r.ry=this.game.getHeight()*.02;r.hits=new WeakSet();this.covers.push(r);}
      for(const r of this.covers)if(r.active)this.lines.ellipse(r.x,r.y,r.rx,r.ry).stroke({color:0xffb57c,width:3});
    }
    if(this.chain){this.chain.migrationAge=this.age;
      // The route is visible before the mother arrives; the lower combat band
      // remains open. Lines carry no collision or hazard.
      if(this.age<2)this.lines.moveTo(0,this.game.getHeight()*.3).lineTo(this.game.getWidth(),this.game.getHeight()*.3)
        .stroke({color:0xc4eacb,width:2,alpha:.7});
    }
    const alive=this.chain?this.chain.sections.some(e=>e.active):this.guns.some(e=>e.active);
    if(!alive||this.age>=this.definition.seconds)this.destroy();
  }
  hitCover(r,damage,bullet){if(!r.active||r.owner||r.hits.has(bullet))return false;r.hits.add(bullet);
    r.health=Math.max(0,r.health-Math.max(0,damage));if(!r.health)r.active=false;return true;}
  intercept(){if(!this.active)return;const s=this.game.scenes.play,bm=s.bulletManager;
    for(const r of this.covers){if(!r.active||r.owner)continue;
      for(const b of bm.playerBullets)if(b.active&&serpentPlateTouches(b,r)){
        if(b.isBomb){s.detonateBombBullet(b,'graveyard_cover');continue;}
        if(this.hitCover(r,Number(b.damage)||0,b))bm.deactivateBullet(b,'graveyard_cover');}
      if(r.active)for(const b of bm.enemyBullets)if(b.active&&serpentPlateTouches(b,r))bm.deactivateBullet(b,'graveyard_cover');}
  }
  hitBombBlast(x,y,radius,damage,bullet){for(const r of this.covers)if(r.active&&(r.x-x)**2+(r.y-y)**2<=(radius+r.rx)**2)this.hitCover(r,damage,bullet);}
  destroy(){if(!this.active)return;this.active=false;this.clearGunShots();
    for(const r of this.covers)r.active=false;
    for(const r of this.relays)r.destroy();
    for(const e of this.guns)if(e.active)this.manager.removeEnemySprite(e,'environment_departure');
    if(this.chain){for(const e of this.chain.sections)if(e.active)this.manager.removeEnemySprite(e,'migration_departure');
      // Invoke the real orphan clock; don't award an escaped mother's kill.
      this.chain.brood?.update(1);}
    this.sprite.destroy({children:true});
  }
}
