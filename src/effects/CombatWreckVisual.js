import { Container, Graphics, Sprite } from 'pixi.js';
import {premiumTexture} from './PremiumArt.js';

export class CombatWreckVisual {
  constructor(manager) { this.manager = manager; this.views = new Map(); this.root = new Container();
    this.root.label = 'interactive_combat_wrecks'; this.root.zIndex = 2; manager.container.addChild(this.root); }
  update() {
    for (const [r, v] of this.views) if (!r.active||(!r.owner&&!r.cover)) { v.destroy({ children: true }); this.views.delete(r); }
    for (const r of this.manager.combatWrecks.records) {
      if(!r.active||(!r.owner&&!r.cover))continue;
      let view = this.views.get(r);
      if (!view) {
        view = new Container(); const edges = new Graphics();
        if (r.texture) { const shell = new Sprite(premiumTexture(r.cover?'moltPlate':'captureCradle')||r.texture); shell.anchor.set(.5); shell.width = r.cover?85:58; shell.scale.y = shell.scale.x;
          shell.rotation = Math.PI; shell.tint = 0xb1bac5; view.addChild(shell); }
        // Steady broken brackets identify interaction even with effects disabled.
        edges.moveTo(-28,-10).lineTo(-28,10).lineTo(-17,10).moveTo(28,-10).lineTo(28,10).lineTo(17,10)
          .stroke({color:0x86cbbd,width:2}); view.addChild(edges); this.root.addChild(view); this.views.set(r,view);
      }
      const shell=view.children[0];if(shell instanceof Sprite&&r.cover&&shell.width<80){shell.width=85;shell.scale.y=shell.scale.x;}
      view.position.set(r.x,r.y); view.alpha = r.owner ? .8 : Math.min(1,(4.5-r.age)/.5);
    }
  }
  clear() { for (const v of this.views.values()) v.destroy({ children:true }); this.views.clear(); }
  destroy() { this.clear(); this.root.destroy(); }
}
