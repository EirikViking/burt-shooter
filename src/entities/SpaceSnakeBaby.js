import {Container,MeshPlane,Sprite} from 'pixi.js';
import {babyHealth} from '../config/SnakeBroods.js';

// Small real collision targets. The textured skin bends along a flexible mesh;
// no decorative wire cages, orbit rings or health bars cover the creature.
export class SpaceSnakeBaby {
 constructor(brood,index,x,y){
   this.brood=brood;this.game=brood.manager.game;this.index=index;this.kind='snake_baby';
   this.type=`snake_baby_${brood.family.id}`;this.family=brood.family;this.x=x;this.y=y;
   this.active=true;this.destroyed=false;this.state='ENTRY';this.contactSafeDuringEntry=true;
   this.level=brood.manager.level;this.health=this.maxHealth=babyHealth(this.level);
   this.scoreValue=45+Math.min(100,this.level*2);this.color=this.family.color;this.age=0;
   this.radius=11*brood.scale;this.usingGeneratedEnemyTexture=true;this.ownedVisuals=[];
   this.sprite=new Container();this.sprite.position.set(x,y);this.sprite.label=this.type;
   this.body=new MeshPlane({texture:brood.art[this.family.id],verticesX:7,verticesY:12});
   this.body.pivot.set(140,140);this.body.scale.set((60+(index%3)*5)*brood.scale/280);
   this.rest=new Float32Array(this.body.geometry.getBuffer('aPosition').data);this.sprite.addChild(this.body);
   this.charge=new Sprite(brood.art.plasma);this.charge.anchor.set(.5);this.charge.tint=this.family.color;
   this.charge.blendMode='add';this.charge.visible=false;this.sprite.addChild(this.charge);
 }
 update(delta){
   if(!this.active)return;const dt=Math.max(0,Math.min(3,delta))/60;this.age+=dt;
   const b=this.brood,oldX=this.x,oldY=this.y;
   if(b.orphanAt!=null){this.state='ENTRY';this.x+=(this.index%2?1:-1)*dt*110*b.scale;this.y-=dt*230*b.scale;this.sprite.alpha=Math.max(0,1-(b.age-b.orphanAt)/2);}
   else{
     const target=b.positionFor(this);
     if(target){const dx=target.x-this.x,dy=target.y-this.y,d=Math.hypot(dx,dy),step=Math.min(1,dt*6,dt*440*b.scale/Math.max(1,d));this.x+=dx*step;this.y+=dy*step;}
     this.state=this.age<.85?'ENTRY':'FORMATION';
     this.sprite.alpha=this.family.formation==='feint'&&this.action?.phase==='return' ? .48 : 1;
   }
   const dx=this.x-oldX,dy=this.y-oldY;
   if(Math.hypot(dx,dy)>.05){const angle=Math.atan2(dy,dx)+Math.PI/2;this.body.rotation+=Math.atan2(Math.sin(angle-this.body.rotation),Math.cos(angle-this.body.rotation))*Math.min(1,dt*9);}
   const buffer=this.body.geometry.getBuffer('aPosition'),v=buffer.data;
   for(let i=0;i<v.length;i+=2){const t=this.rest[i+1]/280;v[i]=this.rest[i]+Math.sin(this.age*9-t*6+this.index)*17*t*t;v[i+1]=this.rest[i+1]+Math.sin(this.age*6+this.index)*2*t;}
   buffer.update();
   const hatch=Math.min(1,this.age/.65);this.body.scale.set((60+(this.index%3)*5)*b.scale/280*(.3+.7*hatch));
   this.body.tint=this.hitUntil>this.age?0xffbdba:0xffffff;
   this.charge.visible=Boolean(this.action&&this.action.phase==='warning');
   if(this.charge.visible){const p=(b.age-this.action.at)/.65;this.charge.width=16*b.scale*(.5+p);this.charge.height=28*b.scale*(.5+p);this.charge.alpha=.4+.55*p;}
   this.sprite.position.set(this.x,this.y);
 }
 canShoot(){return false;} // The family coordinates a bounded volley schedule.
 takeDamage(amount){
   if(!this.active||this.age<.35)return false;
   this.health=Math.max(0,this.health-Math.max(0,Number(amount)||0));this.hitUntil=this.age+.075;
   if(this.health>0)return false;
   this.brood.onBabyDeath(this);this.active=false;this.deactivateVisuals();return true;
 }
 deactivateVisuals(){this.sprite.visible=false;this.sprite.renderable=false;}
 destroy(){if(this.destroyed)return;this.destroyed=true;this.active=false;this.body.geometry.destroy();this.sprite.destroy({children:true,texture:false,textureSource:false});}
}
