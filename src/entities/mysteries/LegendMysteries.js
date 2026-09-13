import { MysteryActor, clamp, mix } from './MysteryActor.js';

// Editable atlas rigs. Flight, weapons and staged damage live in MysteryCombat.

export class ConstellationBeast extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.limbs = [-1, 1].map(side => this.part(`limb_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 94, y: 8, height: 255, anchor: side < 0 ? [.85, .3] : [.15, .3] }));
    this.organs = [-1, 0, 1].map(side => this.part(`stellar_organ_${side}`, 'bottomRight',
      { x: side * 187, y: 70 - Math.abs(side) * 30, height: 96, hp: 45, radius: 28 }));
  }
}

export class CathedralOfTeeth extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.jaws = [-1, 1].map(side => this.part(`jaw_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 55, y: 45, height: 245, anchor: side < 0 ? [.85, .15] : [.15, .15] }));
    this.teeth = Array.from({ length: 6 }, (_, i) => this.part(`tooth_${i}`, 'bottomRight',
      { x: (i < 3 ? -1 : 1) * (65 + i % 3 * 38), y: 95 + i % 3 * 40, height: 72, hp: 18, radius: 21 }));
  }
}

export class DyingStar extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.vanes = [-1, 1].map(side => this.part(`thermal_vane_${side}`, 'topRight',
      { x: side * 90, y: 4, height: 225, angle: side < 0 ? 0 : Math.PI }));
    this.radiator = this.part('radiator', 'bottomLeft', { y: 80, height: 155 });
    this.coolers = Array.from({ length: 3 }, (_, i) => {
      const part = this.part(`cooler_${i}`, 'bottomRight', { x: (i - 1) * 128, y: 84, height: 80, hp: 25, radius: 25 });
      const takeDamage = part.takeDamage.bind(part);
      part.takeDamage = amount => this.nextCooler() === part ? takeDamage(amount) : false;
      return part;
    });
    this.heat = 0;
  }
  nextCooler() { return this.coolers.find(part => part.active); }
}

export class Worldmolt extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.plates = [-1, 1].map(side => this.part(`crust_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 95, y: 18, height: 244, hp: 46, radius: 39 }));
    this.seam = this.part('living_seam', 'bottomRight', { y: 50, height: 124 });
    this.cover = [];
  }
}

export class ChoirUnbound extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.voices = Array.from({ length: 6 }, (_, i) => this.part(`voice_${i}`, ['topRight', 'bottomLeft', 'bottomRight'][i % 3],
      { x: (i < 3 ? -1 : 1) * (130 + (i % 3) * 88), y: 75 + (i % 3) * 62, height: 115 + (i % 3) * 15, hp: 35, radius: 29 }));
  }
}

export class EventideEngine extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.batteries = Array.from({ length: 3 }, (_, i) => this.part(`battery_${i}`, 'topRight', { height: 122, y: 70 }));
    this.thrusters = [-1, 1].map(side => this.part(`steering_thruster_${side}`, 'bottomLeft',
      { x: side * 117, y: -43, height: 126, hp: 42, radius: 31 }));
    this.sail = this.part('outer_sail', 'bottomRight', { y: -45, height: 258 });
    this.sprite.setChildIndex(this.sail.sprite, 0); this.turn = 0;
  }
}

export class Witness extends MysteryActor {
  constructor(...args) {
    super(...args);
    const memories = Object.entries(this.game.mysteryMemories || {}).filter(([id, rows]) => id !== 'witness' && rows.length);
    this.memories = memories.slice(-3);
    // Empty archives use the Witness's own simple pulse. They never reveal an
    // attack from an identity the pilot has not encountered during this run.
    this.chambers = ['topRight', 'bottomLeft', 'bottomRight'].map((slot, i) => this.part(`recording_${i}`, slot,
      { x: (i - 1) * 167, y: 91, height: 135, hp: 43, radius: 33 }));
  }
}

export const LEGEND_CONTROLLERS = { constellation_beast: ConstellationBeast, cathedral_of_teeth: CathedralOfTeeth, dying_star: DyingStar,
  worldmolt: Worldmolt, choir_unbound: ChoirUnbound, eventide_engine: EventideEngine, witness: Witness };
