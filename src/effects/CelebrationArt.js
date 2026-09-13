import { Assets, Container, Sprite, Texture } from 'pixi.js';
import {energyTexture, preloadEnergyMaterials} from './AstraEnergyMaterial.js';
import {getFlashIntensityScale} from '../config/AccessibilitySettings.js';

export const CELEBRATION_ART = '/art/celebration-polish-20260908/';

// Shared textures are owned by Assets; scene sprites never destroy their source.
export function celebrationSprite(name, width, height = width) {
  const sprite = new Sprite(Texture.EMPTY);
  sprite.anchor.set(.5);
  sprite.label = `authored_celebration_${name}`;
  sprite.eventMode = 'none';
  sprite.visible = false;
  Assets.load(`${CELEBRATION_ART}${name}.png`).then(texture => {
    if (sprite.destroyed) return;
    sprite.texture = texture;
    sprite.width = width;
    sprite.height = height;
    sprite.visible = true;
  }).catch(error => console.warn('[CelebrationArt]', name, error));
  return sprite;
}

export class VictoryAtmosphere extends Container {
  constructor() {
    super();
    this.eventMode = 'none';
    this.label = 'authored_victory_fireworks';
    this.glints = Array.from({length:96}, (_,i) => {
      const sprite = new Sprite(Texture.EMPTY);
      sprite.anchor.set(.5); sprite.blendMode = 'add';
      sprite.tint = i%3 ? 0xffdc83 : 0x70edff;
      this.addChild(sprite);return sprite;
    });
    this.blooms=Array.from({length:4},()=>{const sprite=new Sprite(Texture.EMPTY);sprite.anchor.set(.5);sprite.blendMode='add';this.addChildAt(sprite,0);return sprite;});
    preloadEnergyMaterials().then(()=>{
      if(this.destroyed)return;
      for(const sprite of this.glints)sprite.texture=energyTexture('rift');
      for(const sprite of this.blooms)sprite.texture=energyTexture('corona');
    });
  }

  update(elapsed, width, height, reduced, alpha=1, visual={}) {
    this.visible = !reduced;
    if (reduced) return;
    const exposure=getFlashIntensityScale()*alpha;
    for(let group=0;group<4;group++){
      const age=((elapsed/1000-group*.65-1.1+24)%8)/2.6;
      const active=age<1;
      const radius=Math.min(width,height)*(.10+.14*Math.min(age,1));
      const cx=width*([.12,.45,.08,.42][group]),cy=height*([.18,.12,.72,.77][group]);
      const bloom=this.blooms[group];bloom.position.set(cx,cy);
      bloom.width=bloom.height=radius*2.4;
      bloom.tint=group%2?(visual.accentColor||0x61f6ff):(visual.primaryColor||0xffd15c);
      bloom.alpha=active?Math.sin(age*Math.PI)*.40*exposure:0;
      for(let ray=0;ray<24;ray++){
        const sprite=this.glints[group*24+ray],angle=ray/24*Math.PI*2+group*.36;
        const flight=radius*(.15+Math.min(age,1)*1.25);
        sprite.position.set(cx+Math.cos(angle)*flight,cy+Math.sin(angle)*flight+age*age*32);
        sprite.width=(10+ray%4*5)*Math.max(.1,1-age*.5);sprite.height=44+ray%5*9;
        sprite.rotation=angle-Math.PI/2;sprite.tint=bloom.tint;
        sprite.alpha=active?Math.sin(age*Math.PI)*.82*exposure:0;
      }
    }
  }
}
