// Local art direction only: no encounter RNG, clock, score or save state.
// Each row is a separate little scene, associated with its existing world.
const SCENES = [
  ['whale-commuters', 'whale,tug,pod,pod', 'convoy'],
  ['ring-road-breakdown', 'tug,cargo,wrench,gear', 'tow'],
  ['ice-moon-curling', 'robot,moon,robot,crystal', 'curl'],
  ['jellyfish-roundabout', 'jelly,jelly,saucer,ring', 'roundabout'],
  ['orbital-laundry', 'tug,kite,kite,duck', 'laundry'],
  ['volcano-tea-service', 'teapot,pod,pod,cloud', 'pour'],
  ['moon-garden-watering', 'teapot,plant,plant,balloon', 'garden'],
  ['ring-line-express', 'train,pod,pod,satellite', 'train'],
  ['snowball-retrieval', 'tug,moon,turtle', 'fetch'],
  ['meteor-bowling', 'robot,moon,crystal,crystal,crystal', 'bowl'],
  ['coastal-kite-club', 'kite,kite,manta,balloon', 'kite'],
  ['moon-fishing', 'crane,fish,moon,duck', 'fish'],
  ['space-duck-family', 'duck,duck,duck,whale', 'family'],
  ['orbital-pit-stop', 'train,robot,wrench,gear', 'repair'],
  ['frozen-carousel', 'ring,turtle,pod,crystal', 'carousel'],
  ['saucer-photo-bomb', 'camera,saucer,octopus', 'photo'],
  ['umbrella-delivery', 'umbrella,pod,pod,jelly', 'delivery'],
  ['lava-window-cleaner', 'robot,wrench,satellite,cloud', 'wipe'],
  ['whale-balloon-parade', 'whale,balloon,balloon,kite', 'parade'],
  ['ring-goose-crossing', 'train,duck,duck,duck', 'crossing'],
  ['ice-sculpture-unveiling', 'robot,crystal,umbrella,moon', 'unveil'],
  ['meteor-magnet', 'crane,gear,gear,cargo', 'magnet'],
  ['manta-school-trip', 'manta,manta,manta,pod', 'school'],
  ['octopus-traffic-conductor', 'octopus,saucer,saucer,ring', 'conduct'],
  ['planetary-beekeeper', 'plant,pod,pod,pod,balloon', 'bees'],
  ['ring-repair-shift', 'crane,wrench,gear,robot', 'patch'],
  ['snowman-satellite', 'moon,robot,umbrella,pod', 'snowman'],
  ['orbital-teacup-ride', 'teapot,pod,pod,ring', 'teacups'],
  ['lost-duck-rescue', 'tug,duck,whale,balloon', 'rescue'],
  ['cargo-juggling', 'robot,cargo,cargo,cargo', 'juggle'],
  ['turtle-rocket-race', 'turtle,rocket,kite', 'race'],
  ['donut-ring-delivery', 'tug,ring,ring,duck', 'donuts'],
  ['moon-ice-cream', 'teapot,moon,pod,crystal', 'scoop'],
  ['lava-choir', 'drum,robot,robot,robot', 'choir'],
  ['jellyfish-bubble-net', 'jelly,jelly,ring,fish', 'net'],
  ['purple-clockwork', 'clock,gear,gear,train', 'clockwork'],
  ['garden-hammock', 'plant,plant,turtle,kite', 'hammock'],
  ['ring-space-sweeper', 'robot,wrench,cloud,gear', 'sweep'],
  ['comet-sledding', 'turtle,cargo,moon,crystal', 'sled'],
  ['saucer-cup-shuffle', 'saucer,saucer,saucer,moon', 'shuffle'],
  ['flying-fish-festival', 'fish,fish,fish,manta,balloon', 'festival'],
  ['orbital-crane-nap', 'crane,robot,umbrella,gear', 'nap'],
  ['whale-planet-polish', 'whale,cloud,plant,pod', 'polish'],
  ['ring-ticket-inspector', 'train,robot,pod,duck', 'inspect'],
  ['frost-dragon-kite', 'kite,kite,turtle,rocket', 'dragon'],
  ['volcano-marshmallow', 'crane,moon,teapot,cloud', 'toast'],
  ['moon-egg-hatching', 'egg,duck,duck,jelly', 'hatch'],
  ['grand-orbital-orrery', 'clock,ring,moon,saucer,octopus', 'orrery']
];
const MOTIONS = ['drift','orbit','hop','swoop','swing','loop','chase','rise','roll','bob','zigzag','pause-go'];
export const PLANET_VIGNETTES=Object.freeze(SCENES.map(([id,motifs,story],index)=>Object.freeze({
  id,story,period:42+(index%7)*3,duration:19+(index%4),
  actors:Object.freeze(motifs.split(',').map((motif,i)=>Object.freeze({
    motif, path:MOTIONS[(index*5+i*3)%MOTIONS.length],
    x:.105+(i%3)*.092, y:.27+Math.floor(i/3)*.07+(index%3)*.02,
    size:i===0?.10:.045+(i%3)*.008,
    phase:i*.85+index*.31, span:.035+(index%4)*.012,
    pace:.35+(index%5)*.05, role:i
  })))
})));
export const planetIndexForLevel=level=>Math.floor((Math.max(1,Number(level)||1)-1)/5)%48;

export function samplePlanetActor(vignette,index,seconds,out={}) {
  const a=vignette.actors[index],t=seconds*a.pace+a.phase,s=Math.sin(t),c=Math.cos(t);
  let x=a.x,y=a.y,rotation=0,scale=1;
  switch(a.path){
    case 'drift':x+=s*a.span;y+=c*.014;break;
    case 'orbit':x+=c*a.span;y+=s*a.span*.6;rotation=s*.25;break;
    case 'hop':x+=s*a.span;y-=Math.abs(Math.sin(t*1.5))*.038;rotation=c*.12;break;
    case 'swoop':x+=s*a.span*1.3;y+=Math.sin(t*2)*.025;rotation=c*.25;break;
    case 'swing':x+=s*a.span;y+=c*.025;rotation=s*.32;break;
    case 'loop':x+=Math.sin(t*2)*a.span;y+=c*.035;rotation=s*.18;break;
    case 'chase':x+=Math.sin(t*.8)*a.span*1.4;y+=Math.cos(t*1.6)*.017;break;
    case 'rise':x+=c*.014;y+=s*.035;rotation=c*.1;break;
    case 'roll':x+=s*a.span;y+=c*.02;rotation=t*.5;break;
    case 'bob':x+=c*.01;y+=s*.024;rotation=s*.07;break;
    case 'zigzag':x+=Math.asin(s)/1.57*a.span;y+=c*.026;rotation=c*.22;break;
    case 'pause-go':x+=Math.tanh(s*3)*a.span;y+=c*.012;rotation=s*.08;break;
  }
  // An individual story beat, not just actors following unrelated paths.
  const beat=Math.max(0,Math.sin(seconds*.24-1));
  switch(vignette.story){
    case 'tow':case 'train':case 'convoy':case 'family':case 'parade':case 'donuts':
      x=.085+index*.078+Math.sin(seconds*.21)*.045;y=.29+Math.sin(seconds*.21+index*.24)*.025;rotation=Math.cos(seconds*.21)*.07;break;
    case 'bowl':case 'curl':case 'sled':if(index>0){x+=beat*.05;y+=beat*(index%2?-.025:.025);rotation+=beat*1.3;}break;
    case 'fish':case 'fetch':case 'rescue':case 'scoop':if(index===1){y-=beat*.065;x-=beat*.025;rotation-=beat*.2;}break;
    case 'juggle':if(index>0){x=.19+Math.cos(seconds*.8+index*2.1)*.062;y=.29-Math.abs(Math.sin(seconds*.8+index*2.1))*.075;}break;
    case 'carousel':case 'teacups':case 'orrery':if(index>0){x=.2+Math.cos(seconds*.36+index*1.8)*(.045+index*.012);y=.30+Math.sin(seconds*.36+index*1.8)*.032;}break;
    case 'repair':case 'patch':case 'wipe':case 'polish':case 'sweep':if(index>0){x=.18+index*.036+Math.sin(seconds*1.3+index)*.01;y=.29+Math.cos(seconds*.9+index)*.023;}break;
    case 'garden':case 'bees':case 'hammock':if(a.motif==='plant')scale=1+beat*.15;break;
    case 'race':case 'school':case 'crossing':case 'festival':x+=Math.sin(seconds*.25+index*.18)*.025;break;
    case 'photo':case 'unveil':case 'hatch':if(index>0){scale=.8+beat*.3;y-=beat*.028;}break;
    case 'shuffle':if(index<3){x=.18+Math.sin(seconds*.6+index*2.1)*.06;y=.29+Math.cos(seconds*.6+index*2.1)*.02;}break;
    case 'magnet':case 'net':if(index>0){x-=beat*.02;y-=beat*.025;}break;
    case 'choir':case 'conduct':case 'clockwork':rotation+=Math.sin(seconds*.7+index)*.15;break;
    case 'laundry':case 'kite':case 'dragon':rotation+=Math.sin(seconds*.35+index)*.12;break;
    case 'pour':case 'toast':if(index===0)rotation-=beat*.25;break;
    case 'nap':case 'snowman':case 'inspect':case 'delivery':x+=beat*.015;break;
  }
  out.x=x;out.y=y;out.rotation=rotation;out.scale=scale;return out;
}
