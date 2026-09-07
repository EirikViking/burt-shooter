import { Container, Graphics, Sprite } from 'pixi.js';
import { getRelicCollectionCount } from '../progression/BonusCoreRewards.js';

// A pair of gold inlays clipped to the actual hull alpha; strictly cosmetic.
export function updateRelicHullDetail(player) {
  const ship = player.shipSprite;
  if (!ship?.texture || ship.destroyed || !ship.parent) {
    if (player.relicDetail) player.relicDetail.visible = false;
    return;
  }
  const unlocked = getRelicCollectionCount() >= 3;
  if (!unlocked) { if (player.relicDetail) player.relicDetail.visible = false; return; }
  if (player.relicDetail?.parent !== ship.parent || player.relicDetail?.hullTexture !== ship.texture) {
    player.relicDetail?.destroy({ children: true });
    const root = new Container(); root.label = 'relicGoldHullDetail';
    const { width:w, height:h } = ship.texture;
    const stripes = new Graphics();
    for (const sign of [-1,1]) {
      stripes.poly([sign*w*.08,-h*.33,sign*w*.14,-h*.24,sign*w*.26,h*.31,sign*w*.22,h*.32])
        .fill({color:0xffce70,alpha:.88}).stroke({color:0xfff2be,width:w*.003,alpha:.9});
    }
    const mask = new Sprite(ship.texture); mask.anchor.copyFrom(ship.anchor);
    root.addChild(stripes,mask);stripes.mask=mask;
    ship.parent.addChildAt(root,ship.parent.getChildIndex(ship)+1);
    root.hullTexture=ship.texture;
    player.relicDetail=root;
  }
  const detail=player.relicDetail;
  detail.position.copyFrom(ship.position);detail.scale.copyFrom(ship.scale);
  detail.pivot.copyFrom(ship.pivot);detail.skew.copyFrom(ship.skew);
  detail.rotation=ship.rotation;detail.alpha=ship.alpha;
  detail.visible=ship.visible;
}
