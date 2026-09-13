import { MysteryActor, clamp, mix } from './MysteryActor.js';

// Editable atlas rigs. Flight, weapons and staged damage live in MysteryCombat.

export class Rainmaker extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.tendrils = [-1, 1].map(side => this.part(`tendril_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 35, y: 63, height: 191, anchor: side < 0 ? [.92, .45] : [.08, .48], angle: side * Math.PI / 2 }));
    this.organ = this.part('storm_organ', 'bottomRight', { y: 30, height: 78 });
  }
}

export class CometShepherd extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.guides = [-1, 1].map(side => this.part(`guidance_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 70, y: -2, height: 143, hp: 30, radius: 26 }));
    this.stones = [];
  }
}

export class ThunderLoom extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.limbs = [-1, 1].map(side => this.part(`limb_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 60, y: 44, height: 192, angle: side * .25 }));
    this.nodes = Array.from({ length: 5 }, (_, i) => this.part(`node_${i}`, 'bottomRight',
      { x: (i - 2) * 118, y: 155 + i % 2 * 45, height: 65, hp: 18, radius: 23 }));
  }
}

export class AvalancheEngine extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.rams = [-1, 1].map(side => this.part(`ram_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 71, y: 43, height: 177 }));
    this.ice = [];
  }
}

export class RicochetDuchess extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.reflectors = [-1, 1].map(side => this.part(`reflector_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 230, y: 100, height: 170, hp: 29, radius: 29 }));
    this.core = this.part('core', 'bottomRight', { height: 88, y: 13 });
  }
}

export class LanternShoal extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.shoal = Array.from({ length: 8 }, (_, i) => this.part(`organism_${i}`, ['topRight', 'bottomLeft', 'bottomRight'][i % 3],
      { x: (i % 4 - 1.5) * 125, y: 80 + Math.floor(i / 4) * 120, height: 92, hp: 16, radius: 27 }));
  }
}

export class NovaAnvil extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.hammer = this.part('hammer', 'topRight', { y: -79, height: 149 });
    this.clamps = [-1, 1].map(side => this.part(`clamp_${side}`, side < 0 ? 'clampLeft' : 'clampRight',
      { x: side * 53, y: 45, height: 195, hp: 36, radius: 28 }));
    this.star = this.part('contained_star', 'bottomRight', { y: 12, height: 91 });
  }
}

export const SCULPTOR_CONTROLLERS = { rainmaker: Rainmaker, comet_shepherd: CometShepherd, thunder_loom: ThunderLoom,
  avalanche_engine: AvalancheEngine, ricochet_duchess: RicochetDuchess, lantern_shoal: LanternShoal, nova_anvil: NovaAnvil };
