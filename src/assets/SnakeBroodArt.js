import {Assets} from 'pixi.js';
const cache=new Map();
export const SnakeBroodArt={
 async load(family){
   const names=[family.id,'egg','plasma'];
   return Object.fromEntries(await Promise.all(names.map(async id=>{
     if(!cache.has(id))cache.set(id,Assets.load(`/art/snake-broods/${id}.webp`).catch(e=>{cache.delete(id);throw e;}));
     return [id,await cache.get(id)];
   })));
 }
};
