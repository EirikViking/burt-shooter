import {discoverySector} from './DiscoveryProgression.js';
// Original enemy identities. Mechanics and beam artwork share the same field sampling.
export const TRACTOR_FLEET = Object.freeze([
 {id:'harpoon',name:'Aster Harpoon',hull:'lance',color:0x56dcff,paint:0x244f70,accent:0xd5efff,warning:1100,active:2200,width:.075,sound:'A heavy electromagnetic harpoon, tight sizzling tungsten cable under enormous tension, sharp metallic resonances and a deep focused power core'},
 {id:'tide',name:'Tidal Manta',hull:'manta',color:0x3affcb,paint:0x176356,accent:0x8be9cf,warning:1200,active:2600,width:.095,sound:'An enormous liquid magnetic tide sweeping sideways, glassy fluid turbulence and rolling subsonic pressure with clear upper harmonic spray'},
 {id:'pulse',name:'Hammerfall',hull:'hammer',color:0xffaa40,paint:0x7b371e,accent:0xe9b66c,warning:1100,active:2400,width:.11,sound:'An industrial gravity hammer with three separated heavy piston suction pulses, mechanical clacks and dense resonant metal pressure'},
 {id:'twin',name:'Gemini Loom',hull:'catamaran',color:0xbe8bff,paint:0x573479,accent:0xd5c5fa,warning:1200,active:2600,width:.055,sound:'Twin counter rotating electromagnetic spindles, interwoven silky electrical ribbons alternating left and right, crystalline metallic phase beating'},
 {id:'helix',name:'Helix Warden',hull:'helix',color:0x79ed72,paint:0x31593e,accent:0xc0e9a0,warning:1250,active:2600,width:.08,sound:'A corkscrew graviton drill winding through space, thick twisting spectral whorl, toothed magnetic oscillations and restrained mechanical grit'},
 {id:'well',name:'Mass Cathedral',hull:'citadel',color:0x637eff,paint:0x303b68,accent:0xb2bfdb,warning:1400,active:2400,width:.17,sound:'A monumental gravity lens bending spacetime, low architectural metal groan, resonant cathedral sized vacuum pressure and bright glass overtones'},
 {id:'shepherd',name:'Solar Shepherd',hull:'crescent',color:0xffce57,paint:0x83601e,accent:0xeedba4,warning:1250,active:2300,width:.14,sound:'A radiant solar magnetic sail parting into two sheets, broad shimmering ion wind and tense golden metallic harmonics moving outward'},
 {id:'anchor',name:'Anchorite',hull:'anchor',color:0x63d6e4,paint:0x344b52,accent:0xc7d0c9,warning:1250,active:2500,width:.095,sound:'A massive aerospace docking clamp locking a gravitational anchor, weighty sequential latches, grounded magnetic drone with a taut cable resonance'},
 {id:'elevator',name:'Eventide Ferryman',hull:'barge',color:0xff72ab,paint:0x71354b,accent:0xe6adbd,warning:1250,active:2700,width:.13,sound:'Travelling gravity rings ascending a deep energy shaft, rising sequential electromagnetic steps, smooth charged metal and distant spatial shimmer'},
 {id:'winch',name:'Iron Cantor',hull:'winch',color:0xff7850,paint:0x783b2c,accent:0xc7b7a4,warning:1350,active:2600,width:.10,sound:'An immense industrial winch accelerating from a slow strained motor into a powerful turbine pull, tension rattles and heated copper energy'},
 {id:'prism',name:'Trident Choir',hull:'trident',color:0x85caff,paint:0x4b507a,accent:0xc5d8f5,warning:1400,active:2700,width:.05,sound:'Three precision prism emitters firing in a deliberate left centre right sequence, distinct chiming magnetic resonances over a heavy coherent laser hum'},
 {id:'pendulum',name:'Pendulum Ark',hull:'asymmetric',color:0xebacff,paint:0x663d79,accent:0xe3c4da,warning:1250,active:2600,width:.09,sound:'An alien inertial pendulum rocking magnetic weight back and forth, two alternating deep tonal stresses and tactile swinging servo machinery'},
 {id:'zipper',name:'Vise Seraph',hull:'pincer',color:0xffe779,paint:0x6b6441,accent:0xeee3c0,warning:1400,active:2400,width:.065,sound:'Two huge magnetic jaws closing together with converging energy ribbons, zipper like sequential metal catches and a concentrated hot ion hiss'},
 {id:'eclipse',name:'Eclipse Chalice',hull:'chalice',color:0x69a0ff,paint:0x252f57,accent:0xb3c3e1,warning:1300,active:2500,width:.07,sound:'A hollow antimatter corona with a silent centre, two dark resonating pressure walls, eerie rich metallic harmonics and granular electrical fringes'},
 {id:'sling',name:'Comet Slingshot',hull:'scorpion',color:0xff626e,paint:0x702d3a,accent:0xe0a8a1,warning:1500,active:2700,width:.12,sound:'An enormous magnetic catapult winding a tense energy tether then releasing into an outward sweeping plasma surge, elastic metal stress and a powerful clean release'}
].map((p,index)=>Object.freeze({...p,index,unlockLevel:discoverySector(index,15,1),sprite:`/art/tractor-fleet/${p.id}.png`})));

export function getTractorProfile(level=1,id) {
 const pool=TRACTOR_FLEET.filter(p=>p.unlockLevel<=Math.max(1,level));
 return TRACTOR_FLEET.find(p=>p.id===id)||pool[(Math.max(1,Math.floor(level))-1)*7%pool.length];
}
