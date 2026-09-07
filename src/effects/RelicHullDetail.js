import { Container, Graphics, Sprite } from 'pixi.js';
import { getRelicCollectionCount } from '../progression/BonusCoreRewards.js';

// A pair of gold inlays clipped to the actual hull alpha; strictly cosmetic.
export function updateRelicHullDetail(player) {
  const ship = player.shipSprite;
  if (!ship?.texture || ship.destroyed) return;
  const unlocked = getRelicCollectionCount() >= 3;
  if (!unlocked) { if (player.relicDetail) player.relicDetail.visible = false; return; }
  if (player.relicDetail?.parent !== ship) {
    player.relicDetail?.destroy({ children: true });
    const root = new Container(); root.label = 'relicGoldHullDetail';
    const { width:w, height:h } = ship.texture;
    const stripes = new Graphics();
    for (const sign of [-1,1]) {
      stripes.poly([sign*w*.08,-h*.33,sign*w*.14,-h*.24,sign*w*.26,h*.31,sign*w*.22,h*.32])
        .fill({color:0xffce70,alpha:.88}).stroke({color:0xfff2be,width:w*.003,alpha:.9});
    }
    const mask = new Sprite(ship.texture); mask.anchor.copyFrom(ship.anchor);
    root.addChild(stripes,mask);stripes.mask=mask;ship.addChild(root);
    player.relicDetail=root;
  }
  player.relicDetail.visible=true;
}
