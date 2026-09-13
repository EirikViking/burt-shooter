import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'public', 'art', 'generated', 'nova-swarm', 'enemies', 'late-mayhem');
const COUNT = 177;

const palettes = [
  ['#66f7ff', '#ff4fd8', '#fff45c'],
  ['#7cffcb', '#8a5cff', '#ff934f'],
  ['#ff5c8a', '#5dfcff', '#f8ff8a'],
  ['#84a8ff', '#ffef6e', '#35ff92'],
  ['#ff9f4a', '#63d9ff', '#d870ff'],
  ['#a6ff4d', '#ff6bd6', '#7ab7ff'],
  ['#f7f7ff', '#ff3d7f', '#46ffd8'],
  ['#ffd166', '#38d430', '#c77dff']
];

function pad(value, width = 3) {
  return String(value).padStart(width, '0');
}

function hash(index) {
  let value = (index + 1) * 2654435761;
  value ^= value >>> 16;
  value = Math.imul(value, 2246822507);
  value ^= value >>> 13;
  value = Math.imul(value, 3266489909);
  value ^= value >>> 16;
  return value >>> 0;
}

function pointList(points) {
  return points.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(' ');
}

function mirror(points) {
  return points.map(([x, y]) => [-x, y]).reverse();
}

function buildSvg(index) {
  const seed = hash(index);
  const palette = palettes[index % palettes.length];
  const primary = palette[(seed >>> 3) % palette.length];
  const accent = palette[(seed >>> 7) % palette.length];
  const hot = palette[(seed >>> 11) % palette.length];
  const darkA = ['#08131e', '#101827', '#131019', '#0b1720'][(seed >>> 2) % 4];
  const darkB = ['#1d2633', '#241a32', '#142b2f', '#2a1c24'][(seed >>> 6) % 4];
  const hull = 9 + (seed % 7);
  const nose = -40 - (index % 4);
  const tail = 27 + ((seed >>> 5) % 7);
  const wingSpan = 24 + ((seed >>> 9) % 13);
  const wingY = -14 + ((seed >>> 13) % 14);
  const notch = 6 + ((seed >>> 17) % 8);
  const fin = 6 + ((seed >>> 20) % 7);
  const coreShape = index % 4;
  const antennae = 1 + (index % 3);
  const bladeStyle = (seed >>> 23) % 5;
  const id = `late_mayhem_${pad(index + 1)}`;

  const leftWing = [
    [-hull * 0.42, -21],
    [-wingSpan, wingY],
    [-wingSpan + notch, 10 + (index % 7)],
    [-hull * 0.82, tail - 4],
    [-hull * 0.58, 2]
  ];
  const rightWing = mirror(leftWing);
  const body = [
    [0, nose],
    [hull, -18],
    [hull * 0.72, tail - 1],
    [0, tail + fin],
    [-hull * 0.72, tail - 1],
    [-hull, -18]
  ];
  const spine = [
    [0, nose + 8],
    [hull * 0.38, -11],
    [hull * 0.3, tail - 5],
    [0, tail + 3],
    [-hull * 0.3, tail - 5],
    [-hull * 0.38, -11]
  ];
  const leftWingInset = [
    [-hull * 0.78, -15],
    [-wingSpan + 7, wingY + 3],
    [-wingSpan + notch + 3, 8 + (index % 7)],
    [-hull * 0.96, tail - 9],
    [-hull * 0.62, 1]
  ];
  const rightWingInset = mirror(leftWingInset);

  const antennaLines = Array.from({ length: antennae }, (_, antennaIndex) => {
    const side = antennaIndex % 2 === 0 ? -1 : 1;
    const offset = antennaIndex === 2 ? 0 : side * (hull * 0.45 + antennaIndex * 2);
    const tipX = offset + side * (7 + ((seed >>> (antennaIndex + 2)) % 7));
    const tipY = nose + 4 + antennaIndex * 5;
    return `<path d="M ${offset} ${nose + 12} L ${tipX} ${tipY}" stroke="${hot}" stroke-width="${1.05 + (index % 3) * 0.22}" stroke-linecap="round" opacity="0.72"/>`;
  }).join('\n    ');

  const core = coreShape === 0
    ? `<circle cx="0" cy="-7" r="${4 + (index % 3)}" fill="${hot}" opacity="0.96"/>`
    : coreShape === 1
      ? `<rect x="${-4 - (index % 2)}" y="-14" width="${8 + (index % 5)}" height="${12 + (index % 4)}" rx="2.4" fill="${hot}" opacity="0.94"/>`
      : coreShape === 2
        ? `<polygon points="0,-17 7,-7 0,4 -7,-7" fill="${hot}" opacity="0.96"/>`
        : `<path d="M -7 -10 C -2 -18 7 -14 6 -5 C 5 4 -6 4 -7 -10 Z" fill="${hot}" opacity="0.92"/>`;

  const engineCount = 2 + (index % 3);
  const engines = Array.from({ length: engineCount }, (_, engineIndex) => {
    const gap = engineCount === 1 ? 0 : (engineIndex - (engineCount - 1) / 2) * 7;
    const flame = 6 + ((seed >>> (engineIndex + 8)) % 8);
    return `<path d="M ${gap - 1.8} ${tail - 1} L ${gap} ${tail + flame} L ${gap + 1.8} ${tail - 1} Z" fill="${accent}" opacity="0.84"/>`;
  }).join('\n    ');

  const sideRunes = Array.from({ length: 4 }, (_, runeIndex) => {
    const y = -20 + runeIndex * 12 + (index % 3);
    const width = 4 + ((seed >>> (runeIndex + 15)) % 5);
    return `<path d="M ${-hull - 3} ${y} L ${-hull - width - 3} ${y + 2.5} M ${hull + 3} ${y} L ${hull + width + 3} ${y + 2.5}" stroke="${hot}" stroke-width="1.05" opacity="${0.36 + runeIndex * 0.1}"/>`;
  }).join('\n    ');

  const blade = bladeStyle === 0
    ? `<path d="M -${wingSpan - 2} ${wingY + 2} L -${wingSpan + 6} ${wingY + 10} M ${wingSpan - 2} ${wingY + 2} L ${wingSpan + 6} ${wingY + 10}" stroke="${primary}" stroke-width="2" stroke-linecap="round" opacity="0.62"/>`
    : bladeStyle === 1
      ? `<path d="M -${hull + 5} ${tail - 12} L -${hull + 16} ${tail - 2} M ${hull + 5} ${tail - 12} L ${hull + 16} ${tail - 2}" stroke="${accent}" stroke-width="1.7" stroke-linecap="round" opacity="0.66"/>`
      : bladeStyle === 2
        ? `<polygon points="-${hull + 7},-24 -${hull + 14},-15 -${hull + 4},-13" fill="${primary}" opacity="0.5"/><polygon points="${hull + 7},-24 ${hull + 14},-15 ${hull + 4},-13" fill="${primary}" opacity="0.5"/>`
        : bladeStyle === 3
          ? `<path d="M -${hull + 10} 5 C -${hull + 20} 13 -${hull + 14} 24 -${hull + 5} 20 M ${hull + 10} 5 C ${hull + 20} 13 ${hull + 14} 24 ${hull + 5} 20" stroke="${hot}" stroke-width="1.5" fill="none" opacity="0.62"/>`
          : `<path d="M -${hull + 2} -31 L -${hull + 13} -37 M ${hull + 2} -31 L ${hull + 13} -37" stroke="${accent}" stroke-width="1.7" stroke-linecap="round" opacity="0.64"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="-48 -48 96 96" fill="none">
  <defs>
    <radialGradient id="${id}_core" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="44%" stop-color="${hot}" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="${hot}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}_hull" x1="-24" y1="-38" x2="24" y2="38">
      <stop offset="0%" stop-color="${darkB}"/>
      <stop offset="54%" stop-color="${darkA}"/>
      <stop offset="100%" stop-color="#02070d"/>
    </linearGradient>
    <linearGradient id="${id}_panel" x1="-28" y1="-24" x2="28" y2="32">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.86"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.72"/>
    </linearGradient>
  </defs>
  <ellipse cx="0" cy="${tail - 4}" rx="${18 + (index % 8)}" ry="7" fill="${accent}" opacity="0.12"/>
  <g>
    <polygon points="${pointList(leftWing)}" fill="${darkB}" opacity="0.98" stroke="${primary}" stroke-width="1.55"/>
    <polygon points="${pointList(rightWing)}" fill="${darkB}" opacity="0.98" stroke="${primary}" stroke-width="1.55"/>
    <polygon points="${pointList(leftWingInset)}" fill="url(#${id}_panel)" opacity="0.46" stroke="${accent}" stroke-width="0.65"/>
    <polygon points="${pointList(rightWingInset)}" fill="url(#${id}_panel)" opacity="0.46" stroke="${accent}" stroke-width="0.65"/>
    <path d="M -${wingSpan - 3} ${wingY + 2} L -${hull + 1} -9 L -${hull * 0.78} ${tail - 9} M ${wingSpan - 3} ${wingY + 2} L ${hull + 1} -9 L ${hull * 0.78} ${tail - 9}" stroke="#dffaff" stroke-width="0.6" opacity="0.28"/>
    ${blade}
    <polygon points="${pointList(body)}" fill="url(#${id}_hull)" stroke="${hot}" stroke-width="1.65" opacity="0.99"/>
    <polygon points="${pointList(spine)}" fill="${darkB}" stroke="#dffaff" stroke-width="0.75" opacity="0.72"/>
    <path d="M 0 ${nose + 7} L 0 ${tail - 2}" stroke="#ffffff" stroke-width="0.9" opacity="0.34"/>
    ${core}
    <circle cx="0" cy="-7" r="${8 + (index % 3)}" fill="url(#${id}_core)" opacity="0.42"/>
    ${antennaLines}
    ${sideRunes}
    ${engines}
    <circle cx="${-hull * 0.55}" cy="${tail - 7}" r="${1.9 + (index % 2)}" fill="${hot}" opacity="0.74"/>
    <circle cx="${hull * 0.55}" cy="${tail - 7}" r="${1.9 + ((index + 1) % 2)}" fill="${hot}" opacity="0.74"/>
  </g>
</svg>
`;
}

mkdirSync(outDir, { recursive: true });
for (let index = 0; index < COUNT; index += 1) {
  const filename = `nova-late-mayhem-enemy-${pad(index + 1)}.svg`;
  writeFileSync(path.join(outDir, filename), buildSvg(index), 'utf8');
}

console.log(`[late-enemy-mayhem-assets] wrote ${COUNT} SVG enemy ships to ${outDir}`);
