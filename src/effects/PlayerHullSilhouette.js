import {Container, Sprite} from 'pixi.js';

const OFFSETS = [[-1.4, 0], [1.4, 0], [0, -1.4], [0, 1.4]];

// Shared hull art provides separation without filters or render targets.
export function updatePlayerHullSilhouette(player) {
  const hull = player.shipSprite;
  if (!(hull instanceof Sprite) || !hull.texture?.source || !hull.parent) {
    if (player.hullSilhouette) player.hullSilhouette.visible = false;
    return;
  }
  let group = player.hullSilhouette;
  if (!group || group.destroyed) {
    group = player.hullSilhouette = new Container();
    group.label = 'playerHullSilhouette';
    for (let i = 0; i < OFFSETS.length; i++) {
      const copy = new Sprite(hull.texture);
      copy.tint = 0x000000;
      group.addChild(copy);
    }
  }
  const parent = hull.parent;
  if (group.parent !== parent || parent.getChildIndex(group) !== parent.getChildIndex(hull) - 1) {
    group.removeFromParent();
    parent.addChildAt(group, parent.getChildIndex(hull));
  }
  group.position.copyFrom(hull.position);
  group.rotation = hull.rotation;
  group.skew.copyFrom(hull.skew);
  group.alpha = hull.alpha * 0.82;
  group.visible = hull.visible;
  group.renderable = hull.renderable;
  for (let i = 0; i < OFFSETS.length; i++) {
    const copy = group.children[i];
    copy.texture = hull.texture;
    copy.anchor.copyFrom(hull.anchor);
    copy.scale.copyFrom(hull.scale);
    copy.position.set(OFFSETS[i][0], OFFSETS[i][1]);
  }
}
