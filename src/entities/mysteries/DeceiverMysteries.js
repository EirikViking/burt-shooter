import { MysteryActor, clamp, mix } from './MysteryActor.js';

// Editable atlas rigs. Flight, weapons and staged damage live in MysteryCombat.

export class FalseSun extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.sails = [-1, 1].map(side => this.part(`solar_sail_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 68, y: 0, height: 244, anchor: side < 0 ? [.9, .5] : [.1, .5] }));
    this.jet = this.part('jet', 'bottomRight', { y: 42, height: 113 });
  }
}

export class MirrorCourt extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.mirrors = Array.from({ length: 4 }, (_, i) => this.part(`mirror_${i}`, i % 2 ? 'topRight' : 'bottomLeft',
      { x: (i - 1.5) * 137, y: 55 + Math.abs(i - 1.5) * 45, height: 104, hp: 22, radius: 26 }));
    this.iris = this.part('iris', 'bottomRight', { y: 18, height: 100 });
  }
}

export class SignalThief extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.receivers = [-1, 1].map(side => this.part(`receiver_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 69, y: -15, height: 151, hp: 29, radius: 26 }));
    this.escorts = [-1, 1].map(side => this.part(`escort_${side}`, 'bottomRight', { x: side * 220, y: 120, height: 110, hp: 22, radius: 30 }));
    this.charge = 0;
  }
}

export class LanternMimic extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.jaws = [-1, 1].map(side => this.part(`jaw_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 49, y: 25, height: 188, anchor: side < 0 ? [.85, .2] : [.15, .2] }));
    this.jaws.forEach(part => { part.sprite.visible = false; });
  }
}

export class AfterimageDuelist extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.blades = [-1, 1].map(side => this.part(`blade_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 54, y: 30, height: 189, anchor: side < 0 ? [.85, .25] : [.15, .25] }));
    this.echo = this.part('echo', 'bottomRight', { x: -95, y: -12, height: 182 });
    this.echo.sprite.alpha = .4; this.route = [];
  }
}

export class Surveyor extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.telescope = this.part('telescope', 'topRight', { y: 45, height: 93, hp: 38, radius: 30, anchor: [.18, .5], angle: Math.PI / 2 });
    this.panel = this.part('radiator', 'bottomLeft', { x: -83, y: -25, height: 161 });
    this.sensor = this.part('sensor', 'bottomRight', { x: 70, y: -30, height: 113 });
    this.samples = [0, 0, 0];
  }
}

export class CipherEngine extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.gates = ['topRight', 'bottomLeft', 'bottomRight'].map((slot, i) => this.part(`gate_${i}`, slot,
      { x: (i - 1) * 155, y: 74, height: 110, hp: 27, radius: 26 }));
    this.order = [0, 1, 2];
  }
}

export const DECEIVER_CONTROLLERS = { false_sun: FalseSun, mirror_court: MirrorCourt, signal_thief: SignalThief,
  lantern_mimic: LanternMimic, afterimage_duelist: AfterimageDuelist, surveyor: Surveyor, cipher_engine: CipherEngine };
