// Draws the app icon and splash images from SVG, all original artwork.
// Output: assets/ (input for `capacitor-assets generate --android`) and store/icon-512.png.
// Run: node scripts/make-brand-assets.mjs

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const NIGHT = '#0D1420';
const G = '#1EB53A';
const Y = '#FCD116';
const K = '#141414';
const B = '#00A3DD';

// Foreground art in a 1024 box, kept inside the central 600 px so adaptive-icon masks never clip it.
function art() {
  const brick = (x, y, fill, extra = '') =>
    `<rect x="${x}" y="${y}" width="170" height="78" rx="16" fill="${fill}" ${extra}/>` +
    `<rect x="${x + 12}" y="${y + 10}" width="146" height="14" rx="7" fill="#fff" opacity=".2"/>`;
  return `<g transform="translate(512 528) scale(1.2) translate(-512 -528)">
    ${brick(242, 318, G)}
    ${brick(427, 318, K, `stroke="${Y}" stroke-width="8"`)}
    ${brick(612, 318, B)}
    <circle cx="560" cy="560" r="44" fill="#fff"/>
    <circle cx="545" cy="545" r="15" fill="${Y}"/>
    <path d="M520 600 L470 660" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".35" stroke-dasharray="4 22"/>
    <defs>
      <linearGradient id="pad" x1="0" x2="1" y1="0" y2="0">
        <stop offset=".42" stop-color="${G}"/><stop offset=".42" stop-color="${Y}"/>
        <stop offset=".46" stop-color="${Y}"/><stop offset=".46" stop-color="#000"/>
        <stop offset=".54" stop-color="#000"/><stop offset=".54" stop-color="${Y}"/>
        <stop offset=".58" stop-color="${Y}"/><stop offset=".58" stop-color="${B}"/>
      </linearGradient>
    </defs>
    <rect x="282" y="680" width="460" height="58" rx="29" fill="url(#pad)"/></g>`;
}

const svg = (body, { bg = NIGHT, size = 1024 } = {}) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">` +
      (bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : '') +
      body +
      '</svg>',
  );

const stars = Array.from({ length: 26 }, (_, i) => {
  const x = (i * 397) % 1024;
  const y = (i * 211) % 300 + 30;
  return `<circle cx="${x}" cy="${y}" r="${2 + (i % 3)}" fill="#CFD8E6" opacity=".5"/>`;
}).join('');

mkdirSync('assets', { recursive: true });
mkdirSync('store', { recursive: true });

await sharp(svg(stars + art())).png().toFile('assets/icon-only.png');
await sharp(svg(art(), { bg: null })).png().toFile('assets/icon-foreground.png');
await sharp(svg(stars, { bg: NIGHT })).png().toFile('assets/icon-background.png');
await sharp(svg(stars + art())).resize(512, 512).png().toFile('store/icon-512.png');

// Splash: the icon art centred on night sky, 2732 square as capacitor-assets expects.
const splash = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
     <rect width="2732" height="2732" fill="${NIGHT}"/>
     <g transform="translate(1110 1110) scale(0.5)">${art()}</g>
   </svg>`,
);
await sharp(splash).png().toFile('assets/splash.png');
await sharp(splash).png().toFile('assets/splash-dark.png');
console.log('Brand assets written to assets/ and store/icon-512.png');
