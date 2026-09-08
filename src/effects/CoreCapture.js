import * as PIXI from 'pixi.js';
import {getReducedMotionEnabled} from '../config/AccessibilitySettings.js';
export function celebrateCoreCapture(scene,core,score){
 const reduced=getReducedMotionEnabled(),root=new PIXI.Container(),ring=new PIXI.Graphics();root.label='rareCoreCapture';root.addChild(ring);
 const texture=core.mainSprite?.texture||core.coreSprite?.texture,shards=[];
 if(texture)for(let i=0;i<(reduced?4:9);i++){const s=new PIXI.Sprite(texture);s.anchor.set(.5);s.width=s.height=10+i%3*5;root.addChild(s);shards.push(s);}
 scene.gameContainer.addChild(root);scene.scorePopupManager?.addScorePopup?.(core.x,core.y-35,score,{color:core.coreProfile.color});
 scene.particleManager?.createExplosion?.(core.x,core.y,core.coreProfile.color,.8);
 const ticker=scene.game.app.ticker;let elapsed=0;
 const dispose=()=>{ticker.remove(tick);if(!root.destroyed)root.destroy({children:true});};
 const tick=t=>{if(root.destroyed||!root.parent||scene.game.currentScene!==scene){dispose();return;}if(scene.isPaused)return;elapsed+=Math.min(50,t.deltaMS||16.67);if(elapsed>=900){dispose();return;}const p=elapsed/900;ring.clear();for(let i=0;i<2;i++)ring.circle(core.x,core.y,15+(reduced?45:95)*p+i*9).stroke({color:i?core.coreProfile.color:0xfff4c0,width:(1-p)*(i?3:5),alpha:(1-p)*.85});shards.forEach((s,i)=>{const a=i*2.399,r=(reduced?25:65)*p;s.position.set(core.x+Math.cos(a)*r,core.y+Math.sin(a)*r-p*p*65);s.rotation=p*(i%2?-2:2);s.alpha=1-p;});};ticker.add(tick);
}
