import {Container, Graphics, Sprite, Texture} from 'pixi.js';
import {getAccessibilitySettings} from '../config/AccessibilitySettings.js';
import {SolidShipView} from './SolidShipView.js';
import {drawEnergySurface, preloadEnergyMaterials} from '../effects/AstraEnergyMaterial.js';

// The victory fly-in uses the same GLB and lighting as the hangar. A late model
// joins the light reveal only after its first real frame; never a flat fallback.
export class AstraCoronation extends Container {
  constructor({visual={}, milestone=10, shipIndex=0}={}) {
    super();
    this.label='astra_coronation';this.visual=visual;this.milestone=milestone;
    this.eventMode='static';this.cursor='grab';
    this.fx=new Graphics();this.addChild(this.fx);
    this.hull=new Sprite(Texture.EMPTY);this.hull.anchor.set(.5);this.hull.visible=false;this.addChild(this.hull);
    this.orbitYaw=0;this.pitch=0;
    this.solid=new SolidShipView(Math.max(0,Math.min(29,Number(shipIndex)||0)),1024,'menu');
    preloadEnergyMaterials();
    this.promise=this.solid.promise.then(()=>{
      if(this.destroyed||!this.solid.ready)return;
      this.solid.render(-.22,.08);
      this.ownedHull=Texture.from(this.solid.canvas);this.hull.texture=this.ownedHull;
      this.ready=true;this.readyAt=this.elapsed||0;this.hull.visible=true;
    }).catch(error=>console.warn('[Victory ship]',error));
    this.on('pointerdown',e=>{if(e.button!==0)return;e.stopPropagation();this.drag=[e.global.x,e.global.y];this.manual=true;this.cursor='grabbing';});
    this.on('globalpointermove',e=>{if(!this.drag)return;this.orbitYaw+=(e.global.x-this.drag[0])*.009;this.pitch+=(e.global.y-this.drag[1])*.007;this.drag=[e.global.x,e.global.y];});
    const stop=()=>{this.drag=null;this.cursor='grab';};
    this.on('pointerup',stop);this.on('pointerupoutside',stop);this.on('pointercancel',stop);
  }
  update(elapsed,width,height,{compact=false}={}) {
    this.elapsed=elapsed;
    const settings=getAccessibilitySettings(),motion=!settings.prefersReducedMotion;
    const t=motion?elapsed/1000:5;
    const arrival=motion?Math.min(1,Math.max(0,(elapsed-(this.readyAt||0))/1700)):1;
    const ease=1-(1-arrival)**3;
    const size=Math.min(width*1.15,height*1.24);
    this.hull.width=this.hull.height=size*(.8+.2*ease);
    this.hull.position.set((1-ease)*-size*.26,(1-ease)*size*.18);this.hull.alpha=ease;
    const angle=this.manual?this.orbitYaw:-.22+Math.sin(Math.min(t,6)*.35)*.25;
    const pitch=this.manual?this.pitch:.08;
    if(this.ready && (this.lastAngle===undefined || Math.abs(angle-this.lastAngle)>.001 || pitch!==this.lastPitch)) {
      if(this.solid.render(angle,pitch))this.ownedHull.source.update();
      this.lastAngle=angle;this.lastPitch=pitch;
    }
    const g=this.fx;g.clear();
    const strength=(compact?.3:1)*Math.min(1,t)*settings.flashIntensity;
    // Authored volumetric light, not orbiting wire ornaments.
    drawEnergySurface(g,{kind:'corona',x:0,y:height*.08,width:size*1.18,height:size*.85,color:this.visual.accentColor||0x61f6ff,alpha:.28*strength});
    drawEnergySurface(g,{kind:'rift',x:-size*.12,y:size*.22,width:size*.7,height:size*.10,angle:-.32,color:this.visual.primaryColor||0xffd15c,alpha:.50*strength});
    if(motion&&t<2.8)drawEnergySurface(g,{kind:'pressure',width:size*(.6+t*.42),height:size*(.6+t*.42),color:0xfff0c1,alpha:Math.max(0,1-t/2.8)*.45*strength});
  }
  destroy(options) {
    if(this.destroyed)return;
    this.solid.dispose();
    super.destroy({...options,children:true,texture:false,textureSource:false});
    this.ownedHull?.destroy(true);this.ownedHull=null;
  }
}
