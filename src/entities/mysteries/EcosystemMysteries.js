import { MysteryActor, clamp, mix } from './MysteryActor.js';

// Editable atlas rigs. Flight, weapons and staged damage live in MysteryCombat.

export class BloomQueen extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.branches = [-1, 1].map(side => this.part(`branch_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 75, y: 0, height: 200, hp: 36, radius: 33, anchor: side < 0 ? [.85, .5] : [.15, .5] }));
    this.heart = this.part('heart', 'bottomRight', { y: 4, height: 105 });
    this.buds = this.branches.flatMap((parent, side) => [0, 1].map(i => {
      const bud = this.part(`bud_${side}_${i}`, 'bottomRight', { x: (side ? 1 : -1) * (145 + i * 38), y: i * 62 - 55, height: 48, hp: 9, radius: 18 });
      bud.parentBranch = parent; bud.order = side * 2 + i; return bud;
    }));
  }
}

export class BroodArk extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.pods = [-1, 1].map(side => this.part(`pod_${side}`, side < 0 ? 'bottomLeft' : 'topRight',
      { x: side * 68, y: 15, height: 166, hp: 38, radius: 32 }));
    this.eggs = [];
  }
}

export class CarrionWeaver extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.legs = [-1, 1].flatMap(side => [0, 1, 2].map(i => this.part(`leg_${side}_${i}`, 'topRight',
      { x: side * 65, y: i * 43 - 60, height: 126, angle: side * (.55 + i * .35) })));
    this.tendril = this.part('grafting_tendril', 'bottomLeft', { x: 122, y: 24, height: 140, hp: 32, radius: 24 });
    this.wreck = this.part('salvage', 'bottomRight', { x: 200, y: 100, height: 112 });
    this.armor = 0;
  }
}

export class SporeMonk extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.mantles = [-1, 1].map(side => this.part(`mantle_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 52, y: 32, height: 198, anchor: side < 0 ? [.85, .35] : [.15, .35] }));
    this.clusters = [];
  }
}

export class HuskParade extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.body.sprite.visible = false;
    this.shells = ['topLeft', 'topRight', 'bottomLeft'].map((slot, i) => this.part(`shell_${i}`, slot, { height: 196 }));
    this.core = this.part('occupied_core', 'bottomRight', { height: 79 });
    this.occupied = 1;
  }
}

export class MagnetUrchin extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.spines = Array.from({ length: 6 }, (_, i) => this.part(`spine_${i}`, i % 2 ? 'topRight' : 'bottomLeft',
      { x: Math.cos(i * Math.PI / 3) * 75, y: Math.sin(i * Math.PI / 3) * 75, height: 105, hp: 16, radius: 23, angle: i * Math.PI / 3 }));
    this.core = this.part('magnet', 'bottomRight', { height: 97 });
  }
}

export class ChrysalisHunter extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.wings = [-1, 1].map(side => this.part(`wing_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 45, y: 8, height: 210, anchor: side < 0 ? [.85, .5] : [.15, .5] }));
    this.wings.forEach(wing => { wing.sprite.visible = false; });
    this.transformed = false;
  }
}

export const ECOSYSTEM_CONTROLLERS = { bloom_queen: BloomQueen, brood_ark: BroodArk, carrion_weaver: CarrionWeaver,
  spore_monk: SporeMonk, husk_parade: HuskParade, magnet_urchin: MagnetUrchin, chrysalis_hunter: ChrysalisHunter };
