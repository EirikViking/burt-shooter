import {Container,Sprite,Graphics,Texture,Filter,GlProgram,UniformGroup,defaultFilterVert} from 'pixi.js';
import {getAccessibilitySettings} from '../config/AccessibilitySettings.js';

let glowTexture;
function getGlow(){
  if(glowTexture)return glowTexture;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,1,32,32,32);
  g.addColorStop(0,'rgba(208,248,255,0.85)');g.addColorStop(.16,'rgba(81,205,255,0.48)');g.addColorStop(.5,'rgba(43,155,255,0.14)');g.addColorStop(1,'rgba(26,113,255,0)');
  c.fillStyle=g;c.fillRect(0,0,64,64);glowTexture=Texture.from(canvas);return glowTexture;
}
const fragment=`in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uStrength;
out vec4 finalColor;
void main(){
 vec4 c=texture(uTexture,vTextureCoord);
 float luminance=dot(c.rgb,vec3(.2126,.7152,.0722));
 float phase=fract(uTime*.085)*1.7-.35;
 float band=1.0-smoothstep(.0,.12,abs(vTextureCoord.x+vTextureCoord.y*.35-phase));
 float metal=smoothstep(.08,.65,luminance);
 c.rgb+=vec3(.11,.17,.22)*band*metal*c.a*uStrength;
 finalColor=c;
}`;

// Showroom-only lighting. A single material pass follows the selected hull;
// two tiny cached sprites and short electrical arcs add engine activity.
export class AstraShowroomLights extends Container {
  constructor(){
    super();this.eventMode='none';this.interactiveChildren=false;
    this.lamps=[0,1].map(()=>{const s=new Sprite(getGlow());s.anchor.set(.5);s.blendMode='add';this.addChild(s);return s;});
    this.arcs=new Graphics();this.arcs.blendMode='add';this.addChild(this.arcs);
    this.material=new Filter({glProgram:GlProgram.from({vertex:defaultFilterVert,fragment,name:'astra-showroom-metal'}),resources:{showroomUniforms:new UniformGroup({uTime:{value:0,type:'f32'},uStrength:{value:1,type:'f32'}})},padding:0,resolution:1});
  }
  update(sprite,emitters,time,enabled=true){
    if(this.target!==sprite){
      if(this.target&&!this.target.destroyed)this.target.filters=(this.target.filters||[]).filter(f=>f!==this.material);
      this.target=sprite;
      if(sprite)sprite.filters=[...(sprite.filters||[]),this.material];
    }
    const settings=getAccessibilitySettings(),motion=!settings.prefersReducedMotion;
    this.visible=Boolean(enabled&&sprite?.parent&&emitters?.length===2);
    this.material.resources.showroomUniforms.uniforms.uTime=motion?time:2;
    this.material.resources.showroomUniforms.uniforms.uStrength=enabled?settings.flashIntensity:0;
    if(!this.visible)return;
    this.arcs.clear();
    emitters.forEach((uv,i)=>{
      const p={x:(uv.x-.5)*sprite.texture.width,y:(uv.y-.5)*sprite.texture.height};
      const at=this.parent.toLocal(sprite.toGlobal(p));
      const edge=this.parent.toLocal(sprite.toGlobal({x:p.x+sprite.texture.width*.035,y:p.y}));
      const r=Math.max(2,Math.hypot(edge.x-at.x,edge.y-at.y));
      const pulse=motion ? .88+Math.sin(time*2.3+i)*.12 : 1;
      const lamp=this.lamps[i];lamp.position.copyFrom(at);lamp.width=lamp.height=r*2.4;lamp.alpha=.50*pulse*settings.flashIntensity;
      const phase=(time+i*.73)%5.7;
      if(motion&&phase<.3&&settings.flashIntensity>0){
        for(let j=0;j<9;j++){
          const x=at.x+(j/8-.5)*r*1.7;
          const y=at.y+Math.sin(j*3.7+time*29)*r*.2;
          if(j===0)this.arcs.moveTo(x,y);else this.arcs.lineTo(x,y);
        }
        this.arcs.stroke({color:0xa9edff,width:1,alpha:.65*settings.flashIntensity});
      }
    });
  }
  destroy(options){
    if(this.target&&!this.target.destroyed)this.target.filters=(this.target.filters||[]).filter(f=>f!==this.material);
    this.material.destroy();super.destroy(options);
  }
}
