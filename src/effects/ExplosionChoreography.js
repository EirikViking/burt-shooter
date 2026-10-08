// Cosmetic, deterministic choreography. Never use the combat RNG here.
const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const FAMILIES = ['corona', 'split-fuel', 'lance', 'vortex', 'collapse', 'chain-reaction', 'petals', 'ring-peel', 'crescent', 'geyser', 'double-core', 'shrapnel'];
const SEQUENCES = ['impulse', 'fuse-walk', 'rolling', 'recoil', 'spiral', 'satellites', 'rebound', 'braid', 'fallout', 'counterpulse'];
export const EXPLOSION_ANIMATIONS = Object.freeze(FAMILIES.flatMap((family, shape) => SEQUENCES.map((sequence, motion) => Object.freeze({
  id: `${family}/${sequence}`, shape, motion,
  duration: 35 + (shape % 4) * 3 + (motion % 3) * 2,
  bossDuration: 108 + (motion % 3) * 6
}))));

// A coprime stride visits every animation before repeating, across all runs.
// This counter belongs to the renderer, not profile history or encounter RNG.
export const selectExplosionAnimation = sequence => EXPLOSION_ANIMATIONS[((Math.floor(sequence) % 120 + 120) % 120 * 37) % 120];

// Coordinates are normalized to the event footprint. Explicit shape and
// sequence branches change topology, travel, ignition order and burnout.
export function sampleExplosionLobe(profile, index, t, out = {}) {
  const j = index % 8, band = Math.floor(index / 8), m = profile.motion;
  let delay = 0, clock = t, spin = 0, bend = 0, stretch = 1;
  switch(m) {
    case 0: delay=(j%2)*.024; break;
    case 1: delay=j*.036; break;
    case 2: delay=(7-j)*.026; clock=t*1.16; break;
    case 3: delay=.07; bend=-.3*Math.exp(-t*12); break;
    case 4: delay=j*.018; spin=t*2.5; break;
    case 5: delay=(j%3)*.085; stretch=.7+(j%3)*.25; break;
    case 6: delay=(j%4)*.02; bend=Math.sin(t*7)*.12; break;
    case 7: delay=(j%2)*.14; spin=(j%2?1:-1)*t*1.4; break;
    case 8: delay=.015*j; clock=t*.9; break;
    case 9: delay=(j%2)*.2; bend=Math.sin(t*9)*.13*(1-t); break;
  }
  const q=clamp((clock-delay)/Math.max(.35,1-delay)), ease=1-Math.exp(-q*5);
  let a=j*TAU/8+spin, r=(.06+ease*.31+bend)*stretch;
  let x=Math.cos(a)*r, y=Math.sin(a)*r*.8, size=.22;
  switch(profile.shape) {
    case 0: size=.21+.08*Math.sin(q*Math.PI); break;
    case 1: x=(j%2?1:-1)*(.06+ease*.34);y=(Math.floor(j/2)-1.5)*.06*(1+ease);size=.22;break;
    case 2: x=(j-3.5)*(.035+ease*.1);y=Math.sin(j*2.1)*.09*ease;size=.13+(j%3)*.035;break;
    case 3: a+=q*2.9;r*=.65+q*.5;x=Math.cos(a)*r;y=Math.sin(a)*r;size=.17;break;
    case 4: r=(q<.22?.26*(1-q/.22):.02+(1-Math.exp(-(q-.22)*6))*.3);x=Math.cos(a)*r;y=Math.sin(a)*r*.9;size=.17+Math.sin(q*Math.PI)*.09;break;
    case 5: x=(j-3.5)*.076;y=Math.sin(j*1.9+q*2)*.16;size=.16+ease*.07;break;
    case 6: a=(j%4)*Math.PI/2+(j>=4?.35:0)+spin;r*=j>=4?.55:1.25;x=Math.cos(a)*r;y=Math.sin(a)*r;size=.13+q*.11;break;
    case 7: r=.12+q*.35;a+=q*.6;x=Math.cos(a)*r;y=Math.sin(a)*r*.48;size=.17*(1-q*.4);break;
    case 8: a=-1.1+j*.32+spin;x=Math.cos(a)*r-.08;y=Math.sin(a)*r;size=.21;break;
    case 9: x=(j-3.5)*.035*(1+q);y=-ease*(.19+(j%3)*.13)+q*q*.15;size=.13+(j%2)*.08;break;
    case 10: x=(j%2?1:-1)*(.09+ease*.14);y=Math.sin(a)*.16*ease;size=.24-.07*q;break;
    case 11: a=j*2.399963+spin;r=(.04+ease*(.19+(j%3)*.14));x=Math.cos(a)*r;y=Math.sin(a)*r*.75;size=.10+(j%3)*.035;break;
  }
  if(m===5){x+=Math.cos(j*2.4)*Math.sin(q*Math.PI)*.1;y+=Math.sin(j*2.4)*Math.sin(q*Math.PI)*.1;}
  if(m===6)y+=Math.sin(q*TAU)*.065;
  if(m===7)x+=Math.sin(q*8+j)*.05;
  if(m===8)y+=q*q*.18;
  const fade=(1-q)**1.15, ignition=Math.min(1,q*18);
  out.x=x*(band?.7:1);out.y=y*(band?.7:1);
  out.size=Math.max(0,size*(.48+ease*.8)*(band?.65:1));
  out.alpha=clock<=delay||t>=1?0:clamp(ignition*fade);
  out.frame=clamp(q*(.8+(j%3)*.08));out.rotation=a+(j%2?-.2:.2)*q;
  return out;
}
