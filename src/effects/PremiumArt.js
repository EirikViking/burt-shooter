import {Assets,Rectangle,Texture} from 'pixi.js';
let ready=null,pending;
export const premiumTexture=id=>ready?.[id]||null;
export function prewarmPremiumArt(){
  if(ready)return Promise.resolve(ready);
  return pending ||= fetch('/art/encounter-premium/frames.json').then(response=>{
    if(!response.ok)throw new Error(`Premium atlas HTTP ${response.status}`);
    return response.json();
  }).then(async atlas=>{
      const entries=await Promise.all(Object.keys(atlas.sheets).map(async file=>[file,await Assets.load(`/art/encounter-premium/${file}`)]));
      const sheets=Object.fromEntries(entries);ready={};
      for(const [id,frame]of Object.entries(atlas.frames)){const {sheet,x,y,w,h}=frame;
        ready[id]=new Texture({source:sheets[sheet].source,frame:new Rectangle(x,y,w,h)});}
      return ready;}).catch(error=>{pending=null;ready=null;throw error;});
}
