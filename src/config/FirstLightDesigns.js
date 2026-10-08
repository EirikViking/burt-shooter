// Selection uses its own hash; it never advances the ranked wave RNG.
export const FIRST_LIGHT_DESIGNS = Object.freeze({
  convoy: [
    { id:'bastion', name:'Bastion', art:'prison-transport', color:0x60e3d5, width:450, drift:36, escortRanks:[0,1] },
    { id:'talon', name:'Talon', art:'convoy-talon', color:0xffc46b, width:430, drift:68, escortRanks:[2,3] },
    { id:'pearl', name:'Pearl', art:'convoy-pearl', color:0x91efff, width:450, drift:48, escortRanks:[4,5] },
    { id:'ark', name:'Ark', art:'convoy-ark', color:0xa7ec8a, width:470, drift:28, escortRanks:[6,7] }
  ],
  rival: [
    { id:'ravager', name:'Ravager', art:'rival-core-hull', color:0xff9667, width:360, drift:58, pattern:'fan', sound:'mechanical' },
    { id:'lancer', name:'Lancer', art:'rival-lancer', color:0x87d6ff, width:330, drift:68, pattern:'spear', sound:'mechanical' },
    { id:'forge', name:'Forge', art:'rival-forge', color:0xffc576, width:400, drift:24, pattern:'split', sound:'mechanical' },
    { id:'vortex', name:'Vortex', art:'rival-vortex', color:0xd7a2ff, width:380, drift:60, pattern:'crescent', sound:'exotic' },
    { id:'wasp', name:'Wasp', art:'rival-wasp', color:0xb0ef81, width:335, drift:78, pattern:'fork', sound:'exotic' },
    { id:'oracle', name:'Oracle', art:'rival-oracle', color:0xffdf9f, width:380, drift:42, pattern:'cross', sound:'exotic' }
  ]
});
export function getFirstLightDesign(kind, variant = 0) {
  const list = FIRST_LIGHT_DESIGNS[kind] || FIRST_LIGHT_DESIGNS.convoy;
  return list[Math.abs(Math.floor(variant)) % list.length];
}
