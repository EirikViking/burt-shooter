// Shootable score targets. Collectible bonus cores retain their separate cadence/rewards.
const names = ['Giltwing','Lockjaw','Spindle','Bullion','Razorfold','Parcel Ghost','Twinmint','Crownbreaker','Centipenny','Longwave','Trident','Drillbit','Crablock','Sawtooth','Vaultkeeper'];
const colors = [0xffb62d,0xff663d,0xc598ff,0xf4d18a,0xff4260,0x87d7ed,0xf08e38,0xdcdc55,0x80c879,0xe477b7,0xdd9859,0xafa9ec,0xda7348,0xd5c873,0xfcbfd0];
export const BONUS_DRONES = Object.freeze([
  ...['Scout','Courier','Skimmer','Warden'].map((name,index)=>Object.freeze({id:`bonus_drone_legacy_${index}`,name, index,textureIndex:index,score:500,color:0xffa451,art:`/art/astra/drone-v5/${String(index+1).padStart(2,'0')}.png`,legacy:true})),
  ...names.map((name,index)=>Object.freeze({id:`bonus_drone_${name.toLowerCase().replaceAll(' ','_')}`,name,index:index+4,textureIndex:index+12,score:650+index*100,color:colors[index],art:`/art/fleet-identity-20260908/drones/${String(index+1).padStart(2,'0')}.png`,legacy:false}))
]);
export function pickBonusDrone(value) {
  return BONUS_DRONES[Math.abs(Math.round(Number(value)||0)) % BONUS_DRONES.length];
}
