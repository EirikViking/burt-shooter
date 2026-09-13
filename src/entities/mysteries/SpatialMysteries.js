import { MysteryActor, clamp, mix } from './MysteryActor.js';

// Editable atlas rigs. Flight, weapons and staged damage live in MysteryCombat.

export class Foldship extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.wings = [-1, 1].map(side => this.part(`hinge_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 48, y: 0, height: 202, hp: 36, radius: 27, anchor: side < 0 ? [.83, .5] : [.17, .5] }));
    this.weapon = this.part('weapon', 'bottomRight', { y: 38, height: 130 });
  }
}

export class Doorwraith extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.entry = this.part('entry', 'bottomLeft', { x: -155, y: 55, height: 160 });
    this.exit = this.part('exit', 'topRight', { x: 155, y: 55, height: 160 });
    this.core = this.part('gate', 'bottomRight', { y: 10, height: 102 });
  }
}

export class Tidemason extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.paddles = [-1, 1].map(side => this.part(`paddle_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 78, y: 20, height: 184, anchor: side < 0 ? [.8, .5] : [.2, .5] }));
    this.seam = this.part('seam', 'bottomRight', { y: 12, height: 128, hp: 40, radius: 27 });
  }
}

export class ParallaxHunter extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.wings = [-1, 1].map(side => this.part(`foil_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 41, y: 0, height: 116, anchor: side < 0 ? [.78, .5] : [.22, .5] }));
    this.engine = this.part('engine', 'bottomRight', { y: -90, height: 118, angle: Math.PI });
    this.echoes = [-1, 1].map(side => this.part(`echo_${side}`, 'topLeft', { x: side * 245, y: 0, height: 226 }));
  }
}

export class Clockray extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.wings = [-1, 1].map(side => this.part(`membrane_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 38, y: 5, height: 185, anchor: side < 0 ? [.86, .5] : [.14, .5] }));
    this.clock = this.part('chronometer', 'bottomRight', { y: 8, height: 114 });
  }
}

export class HorizonBiter extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.jaws = [-1, 1].map(side => this.part(`jaw_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 90, y: 40, height: 210, anchor: side < 0 ? [.7, .1] : [.3, .1] }));
    this.latches = [-1, 1].map(side => this.part(`latch_${side}`, 'bottomRight', { x: side * 98, y: 102, height: 67, hp: 28, radius: 25 }));
  }
}

export class RiftSurgeon extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.arms = [-1, 1].map(side => this.part(`blade_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 48, y: 32, height: 195, anchor: side < 0 ? [.85, .15] : [.15, .15] }));
    this.aperture = this.part('aperture', 'bottomRight', { y: 5, height: 76 });
  }
}

export const SPATIAL_CONTROLLERS = { foldship: Foldship, doorwraith: Doorwraith, tidemason: Tidemason,
  parallax_hunter: ParallaxHunter, clockray: Clockray, horizon_biter: HorizonBiter, rift_surgeon: RiftSurgeon };
