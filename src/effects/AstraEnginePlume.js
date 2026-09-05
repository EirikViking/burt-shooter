import * as PIXI from 'pixi.js';

let plumeTexture;
// One tiny shared raster, generated once. Animation only changes sprite transforms;
// it never advances a timer, changes thrust, or calls gameplay randomness.
export function createAstraEnginePlume() {
  if (!plumeTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 192;
    const ctx = canvas.getContext('2d');
    const body = ctx.createLinearGradient(0, 0, 0, 192);
    body.addColorStop(0, '#d7fbff');
    body.addColorStop(0.13, '#78edff');
    body.addColorStop(0.45, '#179cdca8');
    body.addColorStop(1, '#076baa00');
    ctx.fillStyle = body; ctx.shadowColor = '#28bfff'; ctx.shadowBlur = 9;
    ctx.beginPath();ctx.moveTo(18, 0);ctx.bezierCurveTo(6, 50, 25, 133, 32, 192);ctx.bezierCurveTo(39, 133, 58, 50, 46, 0);ctx.closePath();ctx.fill();
    ctx.shadowBlur = 0;
    const core = ctx.createLinearGradient(0, 0, 0, 135);
    core.addColorStop(0, '#ffffff');core.addColorStop(0.4, '#d4fdffdc');core.addColorStop(1, '#4dddff00');
    ctx.fillStyle = core;ctx.beginPath();ctx.moveTo(25, 0);ctx.lineTo(32, 140);ctx.lineTo(39, 0);ctx.closePath();ctx.fill();
    for (let j=0;j<4;j++) {
      const y=25+j*23, w=5-j*.75;
      ctx.fillStyle=`rgba(225,255,255,${.62-j*.12})`;
      ctx.beginPath();ctx.moveTo(32,y-5);ctx.lineTo(32+w,y);ctx.lineTo(32,y+7);ctx.lineTo(32-w,y);ctx.closePath();ctx.fill();
    }
    plumeTexture = PIXI.Texture.from(canvas);
  }
  const sprite = new PIXI.Sprite(plumeTexture);
  sprite.anchor.set(0.5, 0);
  sprite.blendMode = 'add';
  return sprite;
}
