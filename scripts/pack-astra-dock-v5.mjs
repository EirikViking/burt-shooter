import sharp from 'sharp';
const size=192,columns=8,count=32;
const frames=[];
for(let i=0;i<count;i++)frames.push({input:await sharp(`docs/astra-v5-models/renders/dock-tug/${String(i).padStart(2,'0')}.png`).resize(size,size).png().toBuffer(),left:i%columns*size,top:Math.floor(i/columns)*size});
await sharp({create:{width:size*columns,height:size*4,channels:4,background:'#00000000'}}).composite(frames).webp({quality:92,alphaQuality:100}).toFile('public/art/astra/dock-tug-v5.webp');
console.log('Packed 32 Blender views; 4.5 MiB decoded, shared by both dock tugs.');
