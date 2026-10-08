import { Texture } from 'pixi.js';

// Original, cached miniature models. Painted once at scene preparation, with
// shaded hulls, seams and tiny cabin windows; no per-frame canvas or filters.
const cache=new Map();
export function planetActorTexture(motif) {
  if(cache.has(motif))return cache.get(motif);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=160;
  const c=canvas.getContext('2d');c.lineJoin='round';c.lineCap='round';
  const alloy=c.createLinearGradient(0,20,0,140);
  alloy.addColorStop(0,'#96a89f');alloy.addColorStop(.24,'#596d70');alloy.addColorStop(.54,'#304651');alloy.addColorStop(1,'#142735');
  const warm=c.createLinearGradient(0,25,0,135);warm.addColorStop(0,'#ba9c74');warm.addColorStop(.48,'#706455');warm.addColorStop(1,'#293c46');
  const organic=c.createLinearGradient(0,25,0,135);organic.addColorStop(0,'#83998a');organic.addColorStop(.5,'#3b6264');organic.addColorStop(1,'#172f45');
  const line=(points,color='#1b2e3e',width=3)=>{c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
  const ellipse=(x,y,rx,ry,fill=alloy)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();c.strokeStyle='#192c3b';c.lineWidth=2;c.stroke();};
  const rect=(x,y,w,h,fill=alloy,r=5)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();c.strokeStyle='#192c3b';c.lineWidth=2;c.stroke();};
  const poly=(points,fill=alloy)=>{c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle='#192c3b';c.lineWidth=2;c.stroke();};
  const eye=(x,y)=>{ellipse(x,y,4,4,'#a4afa0');ellipse(x+1,y,2,2,'#102535');};
  const windows=(x,y,n=4)=>{for(let i=0;i<n;i++)rect(x+i*13,y,6,4,'#bdad82',1);};
  switch(motif){
    case 'whale':
      poly([[62,83],[30,55],[35,94],[22,115],[64,103]],organic);ellipse(140,78,83,39,organic);
      c.beginPath();c.moveTo(79,85);c.bezierCurveTo(119,118,187,122,208,85);c.strokeStyle='#87958a';c.lineWidth=3;c.stroke();
      poly([[129,99],[159,138],[167,111]],organic);eye(199,72);line([[115,40],[111,24],[121,31],[126,12],[132,29],[142,22]],'#6d938c',3);windows(94,63,5);break;
    case 'manta':case 'kite':
      poly([[127,28],[220,89],[149,105],[131,125],[107,101],[32,87]],organic);
      line([[127,35],[131,115],[139,133],[122,149]],'#7d8e88',3);eye(116,73);eye(142,73);line([[52,87],[122,79],[197,87]],'#536f71',2);break;
    case 'duck':
      ellipse(120,100,62,30,warm);ellipse(164,63,27,29,warm);poly([[184,66],[219,75],[184,85]],'#988361');
      ellipse(105,97,30,16,alloy);poly([[64,91],[39,76],[47,104]],warm);eye(171,59);line([[90,127],[87,142],[106,142]],'#8b7b5c');break;
    case 'jelly':case 'octopus':
      for(let i=0;i<7;i++){const x=79+i*16;c.beginPath();c.moveTo(x,79);c.bezierCurveTo(x-25,109,x+26,119,x-9,140);c.strokeStyle='#4a7375';c.lineWidth=8;c.stroke();}
      ellipse(128,64,motif==='octopus'?44:62,38,organic);ellipse(112,55,12,6,'#8ba09b66');eye(113,75);eye(140,75);break;
    case 'fish':
      poly([[76,84],[38,57],[38,107]],organic);ellipse(132,81,65,30,organic);poly([[104,58],[134,33],[155,60]],alloy);eye(169,75);
      for(let i=0;i<5;i++)line([[96+i*11,71],[92+i*11,94]],'#65827d',2);break;
    case 'turtle':
      ellipse(125,85,61,43,organic);ellipse(190,89,24,15,organic);
      for(const [x,y] of [[82,120],[154,125],[82,49],[158,48]])ellipse(x,y,20,8,alloy);
      poly([[109,61],[141,62],[156,85],[141,109],[109,108],[95,85]],'#4e6c67');eye(199,85);line([[109,61],[91,53]],'#819689',2);break;
    case 'teapot':
      ellipse(128,90,52,38,warm);ellipse(130,58,35,8,warm);ellipse(129,44,9,9,warm);
      poly([[82,89],[47,76],[40,52],[33,48],[35,80],[82,109]],warm);
      c.beginPath();c.ellipse(183,82,25,26,0,-Math.PI/2,Math.PI/2);c.strokeStyle='#84796a';c.lineWidth=10;c.stroke();windows(105,85,3);break;
    case 'umbrella':
      poly([[38,80],[60,46],[95,26],[130,22],[165,31],[199,52],[216,80]],warm);
      for(let i=0;i<4;i++)line([[130,25],[50+i*47,79]],'#50606a',2);
      line([[130,80],[130,127],[122,140],[107,137]],'#80928d',5);break;
    case 'balloon':
      ellipse(128,58,45,47,warm);for(let i=0;i<3;i++)line([[108+i*20,20],[103+i*24,65],[115+i*13,100]],'#5b6460',2);
      line([[98,95],[112,125],[143,125],[158,95]],'#697974',3);rect(111,120,34,20,alloy);break;
    case 'plant':
      rect(102,113,49,29,warm);line([[126,114],[130,43]],'#5a7f69',7);
      for(let i=0;i<4;i++){const x=i%2?153:106,y=48+i*15;ellipse(x,y,25,10,organic);line([[130,y+8],[x,y]],'#6b8d76',2);}break;
    case 'moon':case 'egg':
      ellipse(128,82,motif==='egg'?42:49,motif==='egg'?61:49,warm);
      if(motif==='moon')for(const [x,y,r]of [[105,61,11],[148,92,14],[116,108,6],[154,53,7]]){ellipse(x,y,r,r,'#56625c');line([[x-r,y],[x-5,y-r]],'#9f9b83',2);}
      else line([[92,82],[110,70],[130,85],[150,73],[164,86]],'#263e49',3);break;
    case 'ring':
      c.beginPath();c.ellipse(128,83,86,35,-.25,0,Math.PI*2);c.strokeStyle='#303f4e';c.lineWidth=14;c.stroke();c.strokeStyle='#929a86';c.lineWidth=4;c.stroke();
      for(let i=0;i<10;i++){const a=i*Math.PI/5;ellipse(128+Math.cos(a)*80,83+Math.sin(a)*33,4,3,'#889489');}break;
    case 'robot':
      rect(99,27,59,43,alloy);rect(95,74,66,47,warm);eye(113,48);eye(141,48);rect(113,60,31,4,'#6e8280',1);
      line([[101,84],[73,96],[54,81]],'#6c7e7b',9);line([[155,84],[181,63],[197,75]],'#6c7e7b',9);
      line([[111,119],[100,143],[80,143]],'#6c7e7b',9);line([[148,120],[160,142],[180,142]],'#6c7e7b',9);line([[128,25],[129,14]],'#74887f',3);break;
    case 'crane':
      rect(79,112,98,23,warm);poly([[118,117],[139,28],[158,117]],alloy);
      line([[58,43],[195,38],[198,67]],'#a0967b',9);line([[198,67],[198,111],[188,119]],'#8a9a89',3);
      line([[69,40],[140,26],[183,39]],'#6f827a',3);rect(105,91,25,22,alloy);windows(109,96,1);break;
    case 'wrench':
      poly([[65,117],[165,45],[177,24],[199,23],[184,41],[195,58],[216,43],[205,67],[180,71],[83,139]],alloy);ellipse(76,127,7,7,'#253947');break;
    case 'gear':case 'clock':
      for(let i=0;i<12;i++){c.save();c.translate(128,80);c.rotate(i*Math.PI/6);rect(39,-9,22,18,warm,2);c.restore();}
      ellipse(128,80,45,45,alloy);ellipse(128,80,28,28,motif==='clock'?'#b2ac91':'#263e4a');
      if(motif==='clock'){line([[128,52],[128,80],[151,91]],'#334d53',4);for(let i=0;i<12;i++){const a=i*Math.PI/6;ellipse(128+Math.cos(a)*22,80+Math.sin(a)*22,1.4,1.4,'#465f5e');}}break;
    case 'cloud':
      for(let i=0;i<7;i++)ellipse(60+i*22,81+Math.sin(i*2)*14,30,19,'#667d7977');break;
    case 'crystal':
      poly([[97,118],[89,69],[109,29],[139,41],[171,100],[152,130]],alloy);line([[109,29],[124,79],[152,130]],'#99ada5',3);line([[89,69],[124,79],[171,100]],'#698e91',2);break;
    case 'cargo':
      rect(62,44,133,75,warm);for(let i=0;i<6;i++)line([[73+i*20,49],[73+i*20,112]],'#506168',3);rect(99,70,40,18,alloy);break;
    case 'camera':
      rect(61,53,132,70,alloy);rect(92,35,49,21,warm);ellipse(132,86,29,29,warm);ellipse(132,86,20,20,'#173747');ellipse(126,80,8,8,'#8ba19566');windows(68,60,2);break;
    case 'drum':
      rect(77,52,101,66,warm);ellipse(128,52,51,16,alloy);ellipse(128,118,51,13,alloy);
      for(let i=0;i<4;i++)line([[84+i*23,64],[94+i*23,107]],'#8fa293',3);line([[94,31],[151,45]],'#a5997c',5);break;
    case 'satellite':
      rect(33,50,64,65,'#344e64');rect(162,50,61,65,'#344e64');
      for(let i=0;i<3;i++){line([[38,62+i*18],[91,62+i*18]],'#648a95',2);line([[166,62+i*18],[217,62+i*18]],'#648a95',2);}
      rect(98,59,64,50,warm);line([[130,60],[130,29],[156,20]],'#9ba48e',3);ellipse(157,22,15,6,alloy);break;
    case 'train':
      rect(51,57,150,52,alloy);poly([[202,75],[227,108],[196,108]],warm);rect(158,37,37,30,warm);windows(65,68,7);
      for(let i=0;i<5;i++)ellipse(72+i*28,115,11,7,'#253d4d');line([[58,124],[222,124]],'#7b8977',3);break;
    case 'rocket':
      poly([[49,71],[93,55],[185,59],[227,80],[184,99],[94,102],[48,89]],alloy);poly([[111,58],[95,29],[149,58]],warm);poly([[108,100],[92,129],[151,100]],warm);
      ellipse(178,78,13,10,'#597a83');poly([[44,77],[15,80],[46,87]],'#977957');break;
    case 'tug':case 'pod':case 'saucer':
      if(motif==='saucer'){ellipse(128,70,44,28,alloy);ellipse(128,93,86,17,warm);windows(78,94,8);}
      else {rect(64,64,130,47,motif==='tug'?warm:alloy);rect(110,41,51,39,alloy);windows(116,53,3);windows(82,88,6);
        ellipse(59,88,13,18,alloy);ellipse(192,88,10,18,alloy);line([[92,112],[76,129],[167,129]],'#617b78',4);}
      break;
    default:throw new Error(`Unknown planet motif: ${motif}`);
  }
  // Finish the miniature surfaces without leaking outside their silhouette.
  // Fine panel wear and a directional rim give the little models volume.
  c.globalCompositeOperation='source-atop';
  const rim=c.createLinearGradient(0,20,180,140);rim.addColorStop(0,'#dbd1ad55');rim.addColorStop(.32,'#a5b5a60d');rim.addColorStop(.7,'#06142a22');rim.addColorStop(1,'#04101c88');
  c.fillStyle=rim;c.fillRect(0,0,256,160);
  for(let i=0;i<95;i++){
    const x=(i*73+17)%256,y=(i*47+13)%160;
    c.fillStyle=i%2?'#d3c6a41f':'#061b2b26';c.fillRect(x,y,1+(i%4),.6);
  }
  c.globalCompositeOperation='source-over';
  const tex=Texture.from(canvas);cache.set(motif,tex);return tex;
}

export const planetArtCacheSize=()=>cache.size;
