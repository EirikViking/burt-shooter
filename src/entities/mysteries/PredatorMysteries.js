import { MysteryActor, clamp, mix } from './MysteryActor.js';

// Editable atlas rigs. Flight, weapons and staged damage live in MysteryCombat.

export class GlassWidow extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.legs = [-1, 1].flatMap(side => Array.from({ length: 4 }, (_, i) => this.part(`leg_${side}_${i}`,
      side < 0 ? 'bottomLeft' : 'topRight', { x: side * (36 + i * 4), y: -55 + i * 34, height: 94,
        anchor: side < 0 ? [.88, .2] : [.12, .2], angle: side * (-.75 + i * .38) })));
    this.fangs = this.part('fangs', 'bottomRight', { y: 90, height: 95 });
    this.marks = []; this.markIndex = 0;
  }
}

export class CinderManta extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.wings = [-1, 1].map(side => this.part(`wing_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 80, y: 10, height: 155, hp: 33, radius: 35, anchor: side < 0 ? [.8, .5] : [.2, .5] }));
    this.furnace = this.part('furnace', 'bottomRight', { y: 6, height: 84 });
  }
}

export class NeedleSaint extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.fins = [-1, 1].map(side => this.part(`fin_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 40, y: -28, height: 64, anchor: side < 0 ? [.88, .5] : [.12, .5] }));
    this.lance = this.part('lance', 'bottomRight', { y: 73, height: 172 });
    this.fired = false;
  }
}

export class BlindLeviathan extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.lobes = [-1, 1].map(side => this.part(`sonar_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 75, y: 8, height: 92, anchor: side < 0 ? [.8, .5] : [.2, .5] }));
    this.jaw = this.part('jaw', 'bottomRight', { y: 96, height: 132 });
  }
}

export class LanternEater extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.jaws = [-1, 1].map(side => this.part(`jaw_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 64, y: 60, height: 138, anchor: side < 0 ? [.2, .3] : [.8, .3] }));
    this.food = []; this.consumed = 0;
  }
}

export class ScissorTwins extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.body.sprite.height = 185 * this.scale; this.body.sprite.scale.x = this.body.sprite.scale.y;
    this.twin = this.part('red_twin', 'topRight', { x: 240, y: 0, height: 185, hp: this.maxHealth * .5, radius: 45 });
    this.blade = this.part('left_blade', 'bottomLeft', { x: 10, y: 74, height: 118 });
    this.otherBlade = this.part('right_blade', 'bottomRight', { x: 230, y: 74, height: 118 });
  }
}

export class RedWake extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.vanes = [-1, 1].map(side => this.part(`vane_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 30, y: -6, height: 122, anchor: side < 0 ? [.85, .7] : [.15, .7] }));
    this.vent = this.part('vent', 'bottomRight', { y: -118, height: 125 });
  }
}

export const PREDATOR_CONTROLLERS = { glass_widow: GlassWidow, cinder_manta: CinderManta, needle_saint: NeedleSaint,
  blind_leviathan: BlindLeviathan, lantern_eater: LanternEater, scissor_twins: ScissorTwins, red_wake: RedWake };
