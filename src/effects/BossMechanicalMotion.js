const smooth=v=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x);};

// Cosmetic section offsets in hull-radius units. Reuses caller storage and
// depends only on the existing simulation visual clock, never wall time/RNG.
export function sampleBossMechanicalMotion(out,family,index,time,phase,charge,reduced){
  out.x=0;out.y=0;out.rotation=0;
  if(reduced||charge>=.55)return out;
  const t=Number.isFinite(time)?Math.max(0,time):0,side=index%2?1:-1;
  const gain=(1-smooth(Math.max(0,charge)/.55))*(1+Math.max(0,Math.min(2,phase-1))*.1);
  let x=0,y=0,roll=0;
  switch(family){
    case 'conductor': {
      const breath=Math.sin(t*1.45+side*.7),settle=Math.sin(t*2.9+side*.7);
      x=side*(.014+breath*.019);y=breath*.009;roll=side*(breath*.016+settle*.004);break;
    }
    case 'forge': {
      const pressure=((1+Math.sin(t*1.08-.7))*.5)**3;
      x=side*pressure*.022;y=pressure*.028-.008;roll=-side*pressure*.012;break;
    }
    case 'mirror':
      x=side*Math.sin(t*1.1)*.018;y=side*Math.sin(t*1.1+.8)*.027;roll=side*Math.sin(t*.55)*.02;break;
    case 'needle': {
      const tension=(1+Math.sin(t*.94))*.5;
      x=side*tension*.01;y=-tension*.013;roll=side*Math.sin(t*1.88)*.006;break;
    }
    case 'vortex': {
      // Rotor slices are parts of one continuous painting: rotate together.
      roll=Math.sin(t*1.65)*.034;break;
    }
    case 'jester': {
      const tick=Math.sin(t*1.72+index*1.3),double=Math.sin(t*3.44+index*1.3);
      x=side*tick*.019;y=(tick+double*.32)*.015;roll=side*(tick*.024+double*.008);break;
    }
    case 'carrier': {
      const pressure=((1+Math.sin(t*1.2-index*.8))*.5)**2;
      x=side*pressure*.03;y=pressure*.01;roll=-side*pressure*.006;break;
    }
    case 'monolith': {
      const settle=Math.sin(t*.72);
      x=side*(1+settle)*.006;y=settle*.029;roll=side*Math.sin(t*.72-.6)*.004;break;
    }
    case 'choir': {
      const breath=Math.sin(t*1.38-index*.95);
      x=side*(1+breath)*.012;y=breath*.022;roll=side*breath*.012;break;
    }
    case 'clock': {
      // Smooth catch-and-release around each tooth, with no cycle-end jump.
      const turn=t*.65,f=turn-Math.floor(turn),catchUp=smooth(f/.28)-f-.35;
      roll=catchUp*.065;break;
    }
    default: throw new Error(`Unknown mechanical boss family: ${family}`);
  }
  out.x=x*gain;out.y=y*gain;out.rotation=roll*gain;
  return out;
}
