import { Container, Graphics, Sprite } from 'pixi.js';
import { createText } from '../utils/pixiText.js';
import { translateText } from '../i18n/index.js';
import { getReducedMotionEnabled } from '../config/AccessibilitySettings.js';

const SUPPORTED = new Set(['pierce', 'double_shot', 'drones']);

// Display-only snapshots. Never create combat entities or advance the run clock.
export function getTacticalWeaponPreviewModel(offer, player) {
  if (!SUPPORTED.has(offer?.id) || offer.statPreview?.overlapSuppressed) return null;
  const metric = name => offer.statPreview?.metrics?.find(item => item.metric === name);
  const shots = metric('shots');
  const piercing = metric('piercing');
  const drones = metric('supportDrones');
  const before = {
    shots: shots?.before ?? Math.max(1, Number(player.multiShot) || 1),
    piercing: piercing?.before ?? Boolean(player.bulletPierce),
    drones: drones?.before ?? (player.dronesActive ? Number(player.droneCount) || 0 : 0)
  };
  return {
    id: offer.id,
    before,
    after: { shots: shots?.after ?? before.shots, piercing: piercing?.after ?? before.piercing, drones: drones?.after ?? before.drones }
  };
}

// A schematic comparison of volley count, penetration and support fire, not a
// scaled combat simulation. Existing numeric cards remain authoritative for DPS.
// Every sprite/geometry object is allocated once; animation only changes transforms.
export class TacticalWeaponPreview extends Container {
  constructor(model, shipTexture, droneTexture) {
    super();
    this.label = 'tactical_weapon_comparison';
    this.eventMode = 'none';
    this.model = model;
    this.clock = 0;
    this.rounds = [];
    this.hits = [];
    this.accent = { pierce: 0xcaa0ff, double_shot: 0x75eaff, drones: 0xffd778 }[model.id];
    this.desktop = new Container();
    this.compact = new Container();
    this.addChild(this.desktop, this.compact);
    this.buildRange(this.desktop, model.before, -143, 136, false, shipTexture, droneTexture);
    this.buildRange(this.desktop, model.after, 7, 136, true, shipTexture, droneTexture);
    this.buildRange(this.compact, model.after, -34, 68, true, shipTexture, droneTexture, true);
    this.setCompact(false);
    this.update(0, false);
  }

  buildRange(parent, state, left, width, upgraded, shipTexture, droneTexture, compact = false) {
    const ink = upgraded ? this.accent : 0x8caab9;
    const top = compact ? -42 : -52, height = compact ? 84 : 104;
    const plate = new Graphics().roundRect(left, top, width, height, 4)
      .fill({ color: 0x020b14, alpha: 0.98 }).stroke({ color: ink, width: 1, alpha: upgraded ? 0.68 : 0.27 });
    parent.addChild(plate);
    const caption = createText(translateText(compact ? 'PREVIEW' : upgraded ? 'WITH UPGRADE' : 'CURRENT'), {
      fontSize: compact ? 8 : 11, fontWeight: '800', fill: upgraded ? '#eafaff' : '#a8bdc8', letterSpacing: 0.2
    });
    caption.anchor.set(0.5); caption.position.set(left + width / 2, top + 10);
    caption.scale.set(Math.min(1, (width - 10) / Math.max(1, caption.width)));
    parent.addChild(caption);
    const shipX = left + (compact ? 12 : 22), centerY = 8;
    const start = shipX + (compact ? 9 : 14);
    const firstTarget = left + width * 0.68, secondTarget = left + width * 0.9;
    const end = left + width - 7;
    const laneCount = Math.max(1, Math.min(16, Math.round(state.shots)));
    const spread = Math.min(compact ? 14 : 22, (laneCount - 1) * 10);
    const track = new Graphics();
    for (let lane = 0; lane < laneCount; lane++) {
      const y = centerY + (laneCount === 1 ? 0 : (lane / (laneCount - 1) - 0.5) * spread);
      track.moveTo(start, y).lineTo(state.piercing ? end : firstTarget, y).stroke({ color: ink, width: 1, alpha: 0.17 });
      for (let volley = 0; volley < 2; volley++) {
        const round = new Graphics().roundRect(-3, -1, compact ? 5 : 7, 2, 1).fill({ color: ink });
        parent.addChild(round);
        this.rounds.push({ round, start, end: state.piercing ? end : firstTarget - 3, y, phase: volley * 0.5, group: parent });
      }
    }
    parent.addChildAt(track, 1);
    const target = (x, pierced) => {
      const hull = new Graphics().poly([x - 4, centerY - 17, x + 3, centerY - 13, x + 3, centerY + 13, x - 4, centerY + 17])
        .fill({ color: 0x913c54, alpha: 0.4 }).stroke({ color: 0xeb7992, width: 1, alpha: 0.85 });
      parent.addChild(hull);
      if (pierced) {
        const hit = new Graphics().moveTo(x - 3, centerY - 11).lineTo(x + 5, centerY + 11)
          .moveTo(x + 5, centerY - 11).lineTo(x - 3, centerY + 11).stroke({ color: ink, width: 1.3 });
        parent.addChild(hit); this.hits.push({ hit, phase: (x - start) / Math.max(1, end - start), group: parent });
      }
    };
    target(firstTarget, true);
    if (this.model.id === 'pierce') target(secondTarget, state.piercing);
    const ship = shipTexture?.width ? new Sprite(shipTexture) : new Graphics().poly([-9, -6, 10, 0, -9, 6, -5, 0]).fill({ color: ink });
    if (ship instanceof Sprite) {
      ship.anchor.set(0.5); ship.scale.set((compact ? 21 : 36) / Math.max(shipTexture.width, shipTexture.height)); ship.rotation = Math.PI / 2;
    }
    ship.position.set(shipX, centerY); parent.addChild(ship);
    for (let i = 0; i < Math.min(4, state.drones); i++) {
      const droneX = left + width * 0.35 + i * 9, droneY = 30;
      const drone = droneTexture?.width ? new Sprite(droneTexture) : new Graphics().poly([-4, 0, 0, -4, 4, 0, 0, 4]).fill({ color: ink });
      if (drone instanceof Sprite) { drone.anchor.set(0.5); drone.scale.set(14 / Math.max(droneTexture.width, droneTexture.height)); drone.rotation = Math.PI / 2; }
      drone.position.set(droneX, droneY); parent.addChild(drone);
      track.moveTo(droneX + 7, droneY).lineTo(end, droneY).stroke({ color: ink, width: 1, alpha: 0.17 });
      const round = new Graphics().roundRect(-2, -1, 5, 2, 1).fill({ color: ink }); parent.addChild(round);
      this.rounds.push({ round, start: droneX + 7, end, y: droneY, phase: 0.15, group: parent });
    }
  }

  setCompact(value) { this.desktop.visible = !value; this.compact.visible = value; }

  update(delta, focused) {
    const animate = focused && !getReducedMotionEnabled();
    if (animate) this.clock = (this.clock + Math.min(3, Math.max(0, Number(delta) || 0)) / 60) % 1.4;
    const time = animate ? this.clock / 1.4 : 0.35;
    for (const item of this.rounds) {
      if (!item.group.visible) continue;
      const progress = (time + item.phase) % 1;
      item.round.position.set(item.start + (item.end - item.start) * progress, item.y);
      item.round.alpha = animate ? 0.7 + Math.sin(progress * Math.PI) * 0.3 : 0.95;
    }
    for (const item of this.hits) {
      item.hit.alpha = animate ? Math.max(0.12, 1 - Math.abs(time - item.phase) * 5) : 0.5;
    }
  }
}
