import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.js';
import { CreatureAudio } from '../audio/CreatureAudio.js';
import { getReducedMotionEnabled } from '../config/AccessibilitySettings.js';
import { drawEnergySurface } from './AstraEnergyMaterial.js';

export function celebrateSpaceSnakeDeath(scene, enemy) {
  const chain = enemy.chain;
  if (!chain || chain.rewardDelivered || chain.sections.some(section => section.active)) return false;
  chain.rewardDelivered = true;
  const profile = enemy.snakeProfile, x = enemy.x, y = enemy.y;
  const bounty = scene.game.addScore(900 + Math.min(1100, scene.game.level * 20), 'bonusScore');
  scene.scorePopupManager?.addScorePopup?.(x,y-35,bounty,{color:profile.color});
  CreatureAudio.stopOwner(chain);
  CreatureAudio.play(chain, profile, 'death', { x: x / enemy.game.getWidth() });
  AudioManager.playSfx('boss_explode', { volume:.25, minIntervalMs:500 });
  scene.screenShake?.shake(12,25);
  const reduced = getReducedMotionEnabled();
  if(!reduced)scene.screenShake?.freezeFrame(2);
  scene.particleManager?.createExplosion(x,y,profile.color,2.2);
  const reward=scene.spawnAmbientBonusDrone('POWERUP',{
    x:Math.max(90,Math.min(enemy.game.getWidth()-90,x)),
    y:Math.max(180,Math.min(enemy.game.getHeight()*.68,y))
  });
  if(reward){reward.vx *= .72;reward.vy *= .8;reward.fromSpaceSnake=true;}
  scene.hasActiveBonusCore = scene.ambientBonusDrones?.some(core => core.active && core.type === 'POWERUP') || false;
  scene.lastBonusCoreTime = Date.now();
  const root = new PIXI.Container();root.label='spaceSnakeDeath';
  const front = new PIXI.Graphics();root.addChild(front);
  const shards=[];
  // Decorative debris never enters enemy collision or gameplay RNG.
  for(let i=0;i<(reduced?6:16);i++){
    const shard=new PIXI.Sprite(enemy.body.texture);const size=20+(i%4)*8;
    shard.anchor.set(.5);shard.width=size;shard.height=size*.7;
    shard.tint=i%3===0?profile.color:0xb9cad1;
    shard.position.set(x,y);root.addChild(shard);shards.push(shard);
  }
  scene.gameContainer.addChild(root);
  const ticker=scene.game.app.ticker;let elapsed=0,burstIndex=0;
  const anchors=chain.sections.slice(-6).map(section=>({x:section.x,y:section.y}));
  const dispose=()=>{CreatureAudio.stopOwner(chain);ticker.remove(tick);if(!root.destroyed)root.destroy({children:true});};
  const tick=t=>{
    if(!root.parent||scene.game.currentScene!==scene||root.destroyed){dispose();return;}
    if(scene.isPaused)return;
    elapsed+=Math.min(50,t.deltaMS||16.67);
    if(elapsed>1150){dispose();return;}
    const p=elapsed/1150;
    while(burstIndex<anchors.length&&elapsed>burstIndex*65){
      const at=anchors[burstIndex++];scene.particleManager?.createExplosion(at.x,at.y,profile.color,.65);
    }
    front.clear();
    for(let i=0;i<2;i++){
      const radius=18+p*(reduced?80:180)+i*18;
      drawEnergySurface(front,{kind:i?'pressure':'corona',x,y,
        width:radius*2.5,height:radius*2.1,
        color:i?profile.color:0xffefce,alpha:(1-p)*.48});
    }
    shards.forEach((s,i)=>{const a=i*Math.PI*2/shards.length;const r=p*(reduced?55:110+i%4*35);s.position.set(x+Math.cos(a)*r,y+Math.sin(a)*r+p*p*45);s.rotation=p*(i%2?-1:1)*2;s.alpha=1-p;});
  };
  ticker.add(tick);
  scene.lastSpaceSnakeDefeat={id:profile.id,at:Date.now(),bounty,reward:reward?.coreProfile?.id,sections:chain.sections.length};
  return true;
}
