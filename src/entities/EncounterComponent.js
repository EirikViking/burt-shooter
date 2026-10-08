import { Container, Graphics, Sprite } from 'pixi.js';

// Shared only by authored component fights. Components have no kill identity,
// drops, score or contact damage; the root owns completion and reward policy.
export class EncounterComponent {
  constructor(root,definition,texture,onHit){
    this.root=root;this.game=root.game;this.kind='mystery_part';this.type=definition.id;
    this.active=true;this.noContactDamage=true;this.state='ENTRY';this.contactSafeDuringEntry=true;
    this.health=this.maxHealth=definition.health;this.radius=definition.radius||34;this.scoreValue=0;
    this.onHit=onHit;this.sprite=new Container();this.sprite.label=`encounter_component:${definition.id}`;
    this.body=new Sprite(texture);this.body.anchor.set(.5);this.body.width=definition.width||84;
    this.body.scale.y=this.body.scale.x;this.body.rotation=definition.rotation||0;
    this.ring=new Graphics();this.sprite.addChild(this.body,this.ring);root.sprite.addChild(this.sprite);
  }
  canShoot(){return false;}
  update(){}
  takeDamage(amount,options){if(!this.active||this.untargetable||!this.root.active)return false;
    this.onHit(this,Math.max(0,Number(amount)||0),options);return false;}
  deactivateVisuals(){this.sprite.visible=false;}
  destroy(){this.active=false;if(!this.sprite.destroyed)this.sprite.destroy({children:true});}
}
