import { MysteryActor, clamp, mix } from './MysteryActor.js';

// Editable atlas rigs. Flight, weapons and staged damage live in MysteryCombat.

export class RailCathedral extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.carriages = [-1, 1].map(side => this.part(`carriage_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 220, y: 0, height: 215 }));
    this.couplings = [-1, 1].map(side => this.part(`coupling_${side}`, 'bottomRight',
      { x: side * 115, y: 0, height: 80, hp: 29, radius: 25, angle: Math.PI / 2 }));
  }
}

export class SiegeOrchid extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.body.sprite.texture = this.lease.frames.chassis;
    this.body.sprite.height = 215 * this.scale; this.body.sprite.scale.x = this.body.sprite.scale.y;
    this.petals = Array.from({ length: 6 }, (_, i) => this.part(`cannon_${i}`, 'topRight',
      { x: Math.cos(i * Math.PI / 3) * 100, y: Math.sin(i * Math.PI / 3) * 100, height: 94, hp: 25, radius: 28 }));
    this.cooler = this.part('cooling_sector', 'bottomLeft', { height: 94, y: 15 });
    this.core = this.part('core', 'bottomRight', { height: 146, y: 0 });
  }
}

export class BulwarkHauler extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.cargo = this.part('shield_cargo', 'topRight', { x: -160, y: 210, height: 180 });
    this.boom = this.part('tow_boom', 'bottomLeft', { x: -80, y: 110, height: 95, angle: 2 });
    this.projector = this.part('projector', 'bottomRight', { x: 32, y: 75, height: 74, hp: 34, radius: 24 });
  }
}

export class Bellfoundry extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.bowl = this.part('casting_bowl', 'topRight', { y: 87, height: 147 });
    this.castings = [];
  }
}

export class PrismBastion extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.towers = [-1, 1].map(side => this.part(`splitter_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 133, y: 30, height: 170, hp: 36, radius: 29 }));
    this.emitter = this.part('main_emitter', 'bottomRight', { y: 45, height: 115 });
  }
}

export class CableKraken extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.anchors = [0, 1, 2].map(i => this.part(`anchor_${i}`, 'bottomLeft', { x: (i - 1) * 230, y: 190, height: 98, hp: 26, radius: 27 }));
    this.cables = this.anchors.map((anchor, i) => this.part(`cable_${i}`, 'topRight',
      { x: (i - 1) * 60, y: 50, height: 200, anchor: [.16, .1] }));
    this.coupler = this.part('coupler', 'bottomRight', { y: 42, height: 93 });
  }
}

export class Switchyard extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.body.sprite.rotation = -Math.PI / 2;
    this.junctions = [-1, 1].map(side => this.part(`junction_${side}`, 'topRight', { x: side * 180, y: 125, height: 113, hp: 24, radius: 28 }));
    this.switches = this.junctions.map((junction, i) => this.part(`switch_${i}`, 'bottomRight', { x: junction.localX, y: 128, height: 40 }));
    this.drones = [];
  }
}

export const MACHINE_CONTROLLERS = { rail_cathedral: RailCathedral, siege_orchid: SiegeOrchid, bulwark_hauler: BulwarkHauler,
  bellfoundry: Bellfoundry, prism_bastion: PrismBastion, cable_kraken: CableKraken, switchyard: Switchyard };
