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
  const hull = 10 + (seed % 8);
  const nose = -38 - (index % 5);
  const tail = 28 + ((seed >>> 5) % 8);
  const wingSpan = 27 + ((seed >>> 9) % 15);
  const wingY = -10 + ((seed >>> 13) % 17);
  const notch = 8 + ((seed >>> 17) % 9);
  const fin = 4 + ((seed >>> 20) % 8);
  const coreShape = index % 4;
  const antennae = 1 + (index % 3);
  const ringTilt = -18 + (index % 37);
  const id = `late_mayhem_${pad(index + 1)}`;

  const leftWing = [
    [-hull * 0.35, -20],
    [-wingSpan, wingY],
    [-wingSpan + notch, 14 + (index % 8)],
    [-hull * 0.65, tail - 5],
    [-hull * 0.55, 4]
  ];
  const rightWing = mirror(leftWing);
  const body = [
    [0, nose],
    [hull, -18],
    [hull * 0.78, tail - 2],
    [0, tail + fin],
    [-hull * 0.78, tail - 2],
    [-hull, -18]
  ];

  const antennaLines = Array.from({ length: antennae }, (_, antennaIndex) => {
    const side = antennaIndex % 2 === 0 ? -1 : 1;
    const offset = antennaIndex === 2 ? 0 : side * (hull * 0.45 + antennaIndex * 2);
    const tipX = offset + side * (8 + ((seed >>> (antennaIndex + 2)) % 8));
    const tipY = nose + 2 + antennaIndex * 5;
    return `<path d="M ${offset} ${nose + 11} L ${tipX} ${tipY}" stroke="${hot}" stroke-width="${1.2 + (index % 3) * 0.25}" stroke-linecap="round" opacity="0.8"/>`;
  }).join('\n    ');

  const core = coreShape === 0
    ? `<circle cx="0" cy="-7" r="${5 + (index % 4)}" fill="${hot}" opacity="0.92"/>`
    : coreShape === 1
      ? `<rect x="${-5 - (index % 3)}" y="-14" width="${10 + (index % 6)}" height="${13 + (index % 5)}" rx="3" fill="${hot}" opacity="0.9"/>`
      : coreShape === 2
        ? `<polygon points="0,-18 8,-7 0,5 -8,-7" fill="${hot}" opacity="0.92"/>`
        : `<path d="M -8 -10 C -2 -20 8 -14 7 -5 C 5 5 -7 5 -8 -10 Z" fill="${hot}" opacity="0.88"/>`;

  const engineCount = 2 + (index % 3);
  const engines = Array.from({ length: engineCount }, (_, engineIndex) => {
    const gap = engineCount === 1 ? 0 : (engineIndex - (engineCount - 1) / 2) * 7;
    const flame = 7 + ((seed >>> (engineIndex + 8)) % 9);
    return `<path d="M ${gap - 2.2} ${tail - 2} L ${gap} ${tail + flame} L ${gap + 2.2} ${tail - 2} Z" fill="${accent}" opacity="0.78"/>`;
  }).join('\n    ');

  const sideRunes = Array.from({ length: 4 }, (_, runeIndex) => {
    const y = -20 + runeIndex * 12 + (index % 3);
    const width = 4 + ((seed >>> (runeIndex + 15)) % 5);
    return `<path d="M ${-hull - 4} ${y} L ${-hull - width - 4} ${y + 3} M ${hull + 4} ${y} L ${hull + width + 4} ${y + 3}" stroke="${hot}" stroke-width="1.15" opacity="${0.4 + runeIndex * 0.1}"/>`;
  }).join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="-48 -48 96 96" fill="none">
  <defs>
    <radialGradient id="${id}_glow" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="${hot}" stop-opacity="0.7"/>
      <stop offset="46%" stop-color="${primary}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}_hull" x1="-24" y1="-38" x2="24" y2="38">
      <stop offset="0%" stop-color="${hot}"/>
      <stop offset="48%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <g transform="rotate(${ringTilt})">
    <ellipse cx="0" cy="0" rx="${31 + (index % 6)}" ry="${14 + ((seed >>> 6) % 5)}" stroke="${accent}" stroke-width="1.25" opacity="0.32"/>
  </g>
  <circle cx="0" cy="0" r="${36 + (index % 8)}" fill="url(#${id}_glow)" opacity="0.72"/>
  <g>
    <polygon points="${pointList(leftWing)}" fill="${accent}" opacity="0.88" stroke="${hot}" stroke-width="1.3"/>
    <polygon points="${pointList(rightWing)}" fill="${accent}" opacity="0.88" stroke="${hot}" stroke-width="1.3"/>
    <polygon points="${pointList(body)}" fill="url(#${id}_hull)" stroke="#f7fbff" stroke-width="1.45" opacity="0.96"/>
    <path d="M 0 ${nose + 5} L 0 ${tail - 1}" stroke="#ffffff" stroke-width="1.1" opacity="0.44"/>
    ${core}
    ${antennaLines}
    ${sideRunes}
    ${engines}
    <circle cx="${-hull * 0.55}" cy="${tail - 7}" r="${2.2 + (index % 2)}" fill="${hot}" opacity="0.72"/>
    <circle cx="${hull * 0.55}" cy="${tail - 7}" r="${2.2 + ((index + 1) % 2)}" fill="${hot}" opacity="0.72"/>
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
