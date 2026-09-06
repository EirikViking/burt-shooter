import { hasColossus } from './BossReinvention.js';

// Re-sequence the existing ammunition budget into weapon-specific salvos.
// No new projectiles, speed/damage increase, random roll or delayed callback.
export function choreographColossusSalvo(boss, bullets) {
  if(!hasColossus(boss.profile?.archetype)||bullets.length<2)return bullets;
  const family=boss.profile.archetype,n=bullets.length;
  for(let i=0;i<n;i++){
    let order=i/(n-1);
    switch(family){
      case 'needle': case 'conductor': order=Math.abs(i-(n-1)/2)/Math.max(.5,(n-1)/2);break;
      case 'forge': order=Math.floor(i/2)/Math.max(1,Math.ceil(n/2)-1);break;
      case 'mirror': order=(i%2?1:0)*.6+Math.floor(i/2)/n*.4;break;
      case 'vortex': order=1-order;break;
      case 'jester': order=((i*3+1)%n)/(n-1);break;
      case 'carrier': order=(i%2)*.5+Math.floor(i/2)/n;break;
      case 'choir': order=(i%3)/2;break;
      case 'clock': order=Math.floor(order*3)/3;break;
    }
    const delay=Math.round(Math.min(1,order)*(boss.phase>=3?270:190));
    bullets[i].colossusLaunchDelayMs=delay;
    bullets[i].colossusLaunchRemainingMs=delay;
    bullets[i].colossusFamily=family;
    if(delay>0)bullets[i].sprite.visible=false;
  }
  return bullets;
}
