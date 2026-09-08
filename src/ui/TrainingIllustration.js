import { Container, Graphics, Sprite } from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';

// Bounded, silent teaching vignettes. They never touch simulation or random state.
export class TrainingIllustration extends Container {
  constructor(row, width, height) {
    super();
    this.eventMode = 'none'; this.interactiveChildren = false;
    this.row = row; this.w = width; this.h = height; this.time = 0;
    this.ink = new Graphics(); this.addChild(this.ink);
    const texture = GameAssets.playerTexture || GameAssets.rankShipTextures?.[0];
    if (GameAssets.isValidTexture(texture)) {
      this.ship = new Sprite(texture); this.ship.anchor.set(.5);
      this.ship.width = this.ship.height = Math.min(46, height * .48);
      this.addChild(this.ship);
    }
    if (!this.ship) GameAssets.ensureRankShipTexture(0).then(texture => {
      if (this.destroyed || !GameAssets.isValidTexture(texture)) return;
      this.ship = new Sprite(texture); this.ship.anchor.set(.5);
      this.ship.width = this.ship.height = Math.min(52, height * .48);
      this.addChild(this.ship); this.update(0, false);
    }).catch(() => {});
    this.update(0, true);
  }
  update(delta, reduced) {
    if (!reduced) this.time += Math.min(3, Math.max(0, Number(delta) || 0)) / 60;
    const t = reduced ? .8 : this.time, w = this.w, h = this.h, g = this.ink, c = this.row.accent;
    const code = this.row.code, phase = code === '04', focus = code === '02';
    const flight = ['01','02','03','04','05','06','07','08','09','10'].includes(code);
    g.clear();
    g.roundRect(0, 0, w, h, 8).fill({color:0x020c18,alpha:.62});
    for (let j = 1; j < 5; j++) g.moveTo(w*j/5,8).lineTo(w*j/5,h-8).stroke({color:c,width:1,alpha:.08});
    g.moveTo(12,h*.75).lineTo(w-12,h*.75).stroke({color:c,width:1,alpha:.2});
    let sx = w*.5, sy = h*.66;
    if (code === '01') sx += Math.sin(t*1.3)*w*.28;
    if (focus) sx += Math.sin(t*.65)*w*.065;
    if (['05','06'].includes(code)) sx += Math.sin(t*.9)*w*.09;
    if (flight) {
      const motion = code === '01' ? w*.28 : focus ? w*.065 : w*.13;
      for (let j=0;j<20;j++) {
        const x=w*.5+Math.sin(j/19*Math.PI*2)*motion;
        g.circle(x,h*.75,1.2).fill({color:c,alpha:.18});
      }
      if (code !== '01') for (let j=0;j<6;j++) {
        const x = focus ? w*.5+(j%2?1:-1)*w*.09 : w*(.18+(j%3)*.32);
        const y = 10+((t*.19+j/6)%1)*(h-25);
        g.circle(x,y,3).fill({color:0xff775d,alpha:.9});
        g.moveTo(x,y-8).lineTo(x,y-3).stroke({color:0xff775d,width:2,alpha:.25});
      }
      if (['03','07','08','09','10'].includes(code)) for(let j=0;j<4;j++) {
        const y = sy-14-((t*.65+j/4)%1)*Math.max(18,sy-23);
        g.moveTo(sx,y).lineTo(sx,y-7).stroke({color:code==='07'?0xff66ff:c,width:3,alpha:.95});
      }
      if (phase || focus || ['05','06'].includes(code)) {
        const radius = Math.min(27,h*.29);
        g.circle(sx,sy,radius).stroke({color:c,width:phase?2:1,alpha:.7});
        if (phase) g.circle(sx,sy,radius+5).stroke({color:0xd6faff,width:2,alpha:.25+.2*Math.sin(t*3)});
      }
      if (!this.ship) g.poly([sx,sy-18,sx+12,sy+13,sx,sy+8,sx-12,sy+13]).fill({color:0xdffaff,alpha:.9});
    } else {
      // A moving route connects larger holographic nodes for strategy/intel pages.
      for (let j=0;j<4;j++) {
        const x=w*(.16+j*.225),y=h*(.5+.17*Math.sin(j*1.8));
        if(j<3)g.moveTo(x,y).lineTo(w*(.16+(j+1)*.225),h*(.5+.17*Math.sin((j+1)*1.8))).stroke({color:c,width:1,alpha:.3});
        const lit=(Math.floor(t*.7)%4)===j;
        g.poly([x,y-14,x+14,y,x,y+14,x-14,y]).fill({color:c,alpha:lit?.22:.07}).stroke({color:c,width:1.5,alpha:lit?.9:.4});
        g.circle(x,y,4).fill({color:c,alpha:.8});
        if(lit)g.circle(x,y,20+Math.sin(t*2)*3).stroke({color:c,width:1,alpha:.25});
      }
    }
    if(this.ship){this.ship.visible=flight;this.ship.position.set(sx,sy);this.ship.alpha=phase?.65:1;}
    this.alpha = reduced ? 1 : Math.min(1,.35+this.time*2);
  }
}
