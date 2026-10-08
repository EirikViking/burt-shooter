import assert from 'node:assert/strict';
import {Container, Sprite, Texture, TextureSource} from 'pixi.js';
import {updatePlayerHullSilhouette} from '../src/effects/PlayerHullSilhouette.js';

const texture = new Texture({source: new TextureSource({width: 128, height: 128})});
const nextTexture = new Texture({source: new TextureSource({width: 64, height: 96})});
const player = {sprite: new Container(), shipSprite: new Sprite(texture)};
player.sprite.addChild(player.shipSprite);
updatePlayerHullSilhouette(player);
const group = player.hullSilhouette;
const copies = [...group.children];
assert.equal(copies.length, 4);
for (let frame = 0; frame < 100; frame++) {
 const hull = player.shipSprite;
 hull.position.set(3, -4);
 hull.anchor.set(.4, .6);
 hull.scale.set(frame % 2 ? -.3 : .5, .7);
 hull.rotation = frame / 40;
 hull.skew.set(.02, -.03);
 hull.alpha = .6;
 hull.visible = frame % 7 !== 0;
 hull.texture = frame % 2 ? nextTexture : texture;
 updatePlayerHullSilhouette(player);
 assert.equal(player.hullSilhouette, group);
 assert.equal(player.sprite.getChildIndex(group) + 1, player.sprite.getChildIndex(hull));
 assert.equal(group.rotation, hull.rotation);
 assert.equal(group.x, hull.x);
 assert.equal(group.y, hull.y);
 assert.equal(group.alpha, .6 * .82);
 assert.equal(group.visible, hull.visible);
 assert.equal(group.children.length, 4);
 for (let i = 0; i < 4; i++) {
  assert.equal(group.children[i], copies[i]);
  assert.equal(copies[i].texture, hull.texture);
  assert.equal(copies[i].scale.x, hull.scale.x);
  assert.equal(copies[i].anchor.y, hull.anchor.y);
 }
}
group.destroy({children: true});
assert.equal(texture.destroyed, false);
assert.equal(nextTexture.destroyed, false);
player.sprite.destroy({children: true});
texture.destroy(true);
nextTexture.destroy(true);
console.log('PASS: isolated silhouette transforms, bounded nodes and shared-texture ownership. Not integrated gameplay or visual quality proof.');
