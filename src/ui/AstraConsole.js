import { Texture } from 'pixi.js';

// Shared presentation materials. Cached textures stay bounded; these never
// touch the simulation clock, input routing, or gameplay random stream.
const materials = new Map();
function mix(a, b, t) {
  let color = 0;
  for (const shift of [16, 8, 0]) color |= Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t) << shift;
  return color;
}
function material(color, luminous) {
  const lifted = ((color >> 8) & 255) > 48;
  const key = luminous ? `light-${color}` : lifted ? 'titanium-lit' : 'titanium';
  if (!materials.has(key)) {
    const base = luminous ? color : lifted ? 0x123c50 : 0x071c2e;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const c=canvas.getContext('2d');
    const css=n=>`#${n.toString(16).padStart(6,'0')}`;
    const grad=c.createLinearGradient(0,0,75,256);
    for(const [p,v]of [[0,mix(base,0xa1e9f4,luminous?.32:.12)],[.12,mix(base,0x376c91,luminous?.14:.12)],[.48,base],[1,mix(base,0x000308,luminous?.18:.72)]])grad.addColorStop(p,css(v));
    c.fillStyle=grad;c.fillRect(0,0,512,256);
    const glint=c.createRadialGradient(68,0,0,90,25,330);glint.addColorStop(0,'#bde6f426');glint.addColorStop(.45,'#5483a00b');glint.addColorStop(1,'#10243300');c.fillStyle=glint;c.fillRect(0,0,512,256);
    // Fixed engraved grain: no random calls, no filters, and one cached texture
    // per material. The broad highlight remains readable at small button sizes.
    for(let y=0;y<256;y+=2){const h=(Math.imul(y+37,1597334677)>>>0);c.fillStyle=`rgba(169,197,210,${.012+(h%11)*.0017})`;c.fillRect((h>>>8)%20,y,492,1);}
    c.strokeStyle='rgba(159,190,200,.045)';c.lineWidth=1;
    for(let x=430;x<650;x+=42){c.beginPath();c.moveTo(x,0);c.lineTo(x-110,256);c.stroke();}
    const aura=c.createRadialGradient(460,230,0,460,230,240);
    aura.addColorStop(0,'#227caa24');aura.addColorStop(1,'#07142300');c.fillStyle=aura;c.fillRect(0,0,512,256);
    materials.set(key,Texture.from(canvas));
  }
  return materials.get(key);
}
export function drawAstraPanel(g, x, y, width, height, radius = 7, fillStyle = {}, strokeStyle = {}) {
  if (!(width > 0 && height > 0)) return g;
  if (width > 280 && height > 100) {
    g._astraPanelBounds ||= new Map();
    const key = `${x}:${y}`;
    if (g._astraPanelBounds.size < 32 || g._astraPanelBounds.has(key)) g._astraPanelBounds.set(key,{x,y,width,height,color:strokeStyle?.color || 0x79b9c4});
  }
  const color = typeof fillStyle?.color === 'number' ? fillStyle.color : 0x08131e;
  const alpha = fillStyle?.alpha ?? 1;
  const accent = strokeStyle?.color ?? 0x79b9c4;
  const strokeAlpha = strokeStyle?.alpha ?? 0.5;
  const brightness = (((color >> 16) & 255) + ((color >> 8) & 255) + (color & 255)) / 3;
  const luminous = brightness > 110 && alpha > 0.68;
  const cut = Math.min(Math.max(3, radius), 12, height * 0.2);
  g.poly([x + cut, y, x + width - cut, y, x + width, y + cut, x + width, y + height - cut, x + width - cut, y + height, x + cut, y + height, x, y + height - cut, x, y + cut]);
  if (fillStyle) g.fill({ texture: material(color, luminous), textureSpace:'local', alpha });
  if (strokeStyle) g.stroke({ ...strokeStyle, color: luminous ? 0xd9f8ff : mix(typeof accent === 'number' ? accent : 0x79b9c4, 0x718896, 0.55), alpha: Math.min(0.8, strokeAlpha) });
  // Crisp edge illumination and a recessed lower lip give even small controls
  // physical depth without bloom or a separate filter/render pass.
  if (width > 42 && height > 25 && alpha > 0.35) {
    // Beveled face, recessed inlay and an illuminated status edge share one
    // retained Graphics object. No per-frame filter or full-screen blur.
    const metal = luminous ? 0xe7fcff : 0x77b6c8;
    g.poly([x+cut,y+1,x+width-cut,y+1,x+width-2,y+cut,x+width-5,y+cut+2,x+width-cut-2,y+5,x+cut+1,y+5]).fill({color:metal,alpha:luminous?.42:.20});
    g.poly([x+2,y+cut,x+5,y+cut+2,x+5,y+height-cut-2,x+cut+1,y+height-5,x+width-cut-1,y+height-5,x+width-cut,y+height-2,x+cut,y+height-2,x+2,y+height-cut]).fill({color:0x000309,alpha:.66});
    if(!luminous){
      g.moveTo(x+cut+1,y+6).lineTo(x+width-cut-2,y+6).stroke({color:0x02070c,width:1,alpha:.75});
      g.moveTo(x+5,y+cut+4).lineTo(x+5,y+height-cut-4).stroke({color:accent,width:1,alpha:.32});
    }
    if(width>280&&height>100){
      const corner=Math.min(32,width*.08);
      g.moveTo(x+width-cut-8,y+11).lineTo(x+width-corner,y+11).stroke({color:accent,width:2,alpha:.46});
      for(let i=0;i<6;i++)g.rect(x+width-corner-5-i*4,y+10,1,3).fill({color:0xb6d2d7,alpha:.13+i*.026});
      g.moveTo(x+22,y+height-10).lineTo(x+68,y+height-10).stroke({color:accent,width:1,alpha:.32});
    }
    g.moveTo(x + cut + 5, y + 3).lineTo(x + width - cut - 5, y + 3);
    g.stroke({ color: 0xd5eff2, width: 1, alpha: luminous ? 0.68 : 0.19 });
    g.moveTo(x + cut + 4, y + height - 3).lineTo(x + width - cut - 4, y + height - 3);
    g.stroke({ color: 0x00040a, width: 2, alpha: 0.55 });
    if (width > 180 && height > 72) {
      for (const px of [x + 9, x + width - 9]) for (const py of [y + 10, y + height - 10]) {
        g.circle(px, py, 2.3).fill({ color: 0x03070b, alpha: 0.9 });
        g.moveTo(px - 1.3, py - 0.6).lineTo(px + 1.3, py - 0.6).stroke({ color: 0x90a5ad, width: 1, alpha: 0.5 });
      }
      g.moveTo(x + 15, y + 14).lineTo(x + 15, y + height - 14).stroke({ color: 0x8096a2, width: 1, alpha: 0.09 });
      g.moveTo(x + width - 15, y + 14).lineTo(x + width - 15, y + height - 14).stroke({ color: 0x00050b, width: 1, alpha: 0.45 });
    }
  }
  return g;
}
