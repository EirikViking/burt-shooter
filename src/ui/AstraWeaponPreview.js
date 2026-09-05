import { Container, Graphics, Sprite } from 'pixi.js';
import { createText } from '../utils/pixiText.js';
import { translateText } from '../i18n/index.js';
import { getReducedMotionEnabled } from '../config/AccessibilitySettings.js';
import { getAstraProjectileTexture } from '../effects/AstraProjectileMaterial.js';

// A schematic firing-range display. It reads the real hull's base volley,
// spacing and cadence without instantiating a Player or touching run state.
export class AstraWeaponPreview extends Container {
  constructor(ship, accent = 0x69e7ff) {
    super(); this.eventMode = 'none'; this.clock = 0; this.ship = ship;
    this.label = 'astra_weapon_preview';
    const plate = new Graphics().roundRect(-158, 0, 316, 60, 5)
      .fill({ color: 0x04111c, alpha: .86 }).stroke({ color: accent, width: 1, alpha: .4 });
    const name = createText(translateText('FIRING PATTERN'), { fontSize: 11, fill: '#9ccad7', fontWeight: '700' });
    name.position.set(-146, 5);
    const muzzle = new Graphics().poly([-144,31,-126,38,-144,45,-140,38]).fill({ color: accent, alpha: .9 });
    this.addChild(plate, name, muzzle);
    this.lanes = Math.max(1, Number(ship.weapon?.bullets) || 1);
    this.spread = Number(ship.weapon?.spread) || 0;
    this.offsets = this.lanes === 2 ? [-10,10] : this.lanes === 3 ? [-14,0,14] : Array.from({length:this.lanes},(_,i)=>(i-(this.lanes-1)/2)*10);
    this.period = Math.max(50, Number(ship.stats?.fireRate) || 140) / 1000;
    this.rounds = Array.from({ length: this.lanes * 5 }, () => {
      const s = new Sprite(getAstraProjectileTexture('lance', accent));
      s.anchor.set(.5); s.width = 21; s.height = 8; this.addChild(s); return s;
    });
    this.update(0);
  }
  update(delta) {
    this.clock += delta / 60;
    const distancePerSecond = 330;
    const lifetime = 258 / distancePerSecond;
    const offsets = this.offsets;
    const reduced = getReducedMotionEnabled();
    for(let lane=0;lane<this.lanes;lane++)for(let volley=0;volley<5;volley++) {
      const s=this.rounds[lane*5+volley];
      const phase=reduced ? volley*this.period : (this.clock+volley*this.period)%(5*this.period);
      const distance=phase*distancePerSecond, angle=(lane-(this.lanes-1)/2)*this.spread;
      s.position.set(-116+Math.cos(angle)*distance,38+Math.sin(angle)*distance*.24+(offsets[lane]||0)*.28);
      s.rotation=angle*.24;s.alpha=Math.min(1,phase*18)*Math.min(1,(lifetime-phase)*8);
      s.visible=phase<lifetime && Math.abs(s.y-38)<20;
    }
  }
}
