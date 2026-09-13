import { MysteryActor, clamp, mix } from './MysteryActor.js';

// Editable atlas rigs. Flight, weapons and staged damage live in MysteryCombat.

export class GildedPilgrim extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.wings = [-1, 1].map(side => this.part(`wing_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 62, y: 15, height: 167 }));
    this.seals = [-1, 1].flatMap(side => [0, 1].map(i => this.part(`seal_${side}_${i}`, 'bottomRight',
      { x: side * (185 + i * 65), y: 45 - i * 90, height: 63, hp: 18, radius: 22 })));
  }
}

export class VaultCrawler extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.legs = [-1, 1].flatMap(side => [0, 1, 2].map(i => this.part(`leg_${side}_${i}`, 'topRight',
      { x: side * 70, y: i * 45 - 45, height: 118, angle: side * (.7 + i * .3) })));
    this.cargo = [-1, 1].map(side => this.part(`vault_${side}`, 'bottomLeft', { x: side * 137, y: 35, height: 114, hp: 31, radius: 31 }));
    this.openCargo = [];
  }
}

export class Oathkeeper extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.wings = [-1, 1].map(side => this.part(`wing_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 65, y: 5, height: 182 }));
    this.gate = this.part('challenge_gate', 'bottomRight', { height: 137 });
    this.exposedUntil = 0;
  }
}

export class CourierZero extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.foils = [-1, 1].map(side => this.part(`foil_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 47, y: -10, height: 151 }));
    this.payload = this.part('payload', 'bottomRight', { y: 85, height: 125, hp: 33, radius: 32 });
  }
}

export class DebtCollector extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.claws = [-1, 1].map(side => this.part(`claw_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 80, y: 42, height: 184, anchor: side < 0 ? [.8, .2] : [.2, .2] }));
    // Its own loose salvage is independent of player inventory and pickups.
    this.salvage = Array.from({ length: 6 }, (_, i) => {
      const part = this.part(`salvage_${i}`, 'bottomRight', { x: (i - 2.5) * 120, y: 235, height: 44 });
      part.collectAt = 4 + i * 2.1; return part;
    });
    this.stored = 0;
  }
}

export class MercyTrap extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.folds = [-1, 1].map(side => this.part(`fold_${side}`, side < 0 ? 'topRight' : 'bottomLeft',
      { x: side * 90, y: 140, height: 232, anchor: side < 0 ? [.85, .15] : [.15, .15] }));
    this.shelter = this.part('shelter', 'bottomRight', { y: 260, height: 123 });
  }
}

export class FortuneLeech extends MysteryActor {
  constructor(...args) {
    super(...args);
    this.leech = this.part('leech', 'topRight', { x: 145, y: -20, height: 151, hp: 38, radius: 32 });
    this.wings = [-1, 1].map(side => this.part(`host_wing_${side}`, side < 0 ? 'bottomLeft' : 'bottomRight',
      { x: side * 65, y: 18, height: 147 }));
  }
}

export const TEMPTATION_CONTROLLERS = { gilded_pilgrim: GildedPilgrim, vault_crawler: VaultCrawler, oathkeeper: Oathkeeper,
  courier_zero: CourierZero, debt_collector: DebtCollector, mercy_trap: MercyTrap, fortune_leech: FortuneLeech };
