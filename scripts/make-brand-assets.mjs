// Builds every brand image from Robert's artwork in assets/source/:
//   logo.png (transparent), icon.png (square, navy background), feature-graphic.png.
// Output: assets/ (input for `capacitor-assets generate --android`), the in-app
// logo src/assets/logo.webp, and the Play Store icon and feature graphic in store/.
// Run: node scripts/make-brand-assets.mjs

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'assets/source/';
mkdirSync('store', { recursive: true });
mkdirSync('src/assets', { recursive: true });

// The icon's own background colour, sampled from its corner, so the adaptive
// background layer and the scaled foreground meet without a visible edge.
const { data } = await sharp(SRC + 'icon.png').extract({ left: 40, top: 40, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
const bg = { r: data[0], g: data[1], b: data[2], alpha: 1 };

// Full-bleed icon: legacy launcher icon and the 512 Play Store icon.
await sharp(SRC + 'icon.png').resize(1024, 1024).flatten({ background: bg }).png().toFile('assets/icon-only.png');
await sharp(SRC + 'icon.png').resize(512, 512).flatten({ background: bg }).png().toFile('store/icon-512.png');

// Adaptive icon: capacitor-assets already insets each layer by 16.7%, so the
// launcher shows this whole square, cut to the device's mask shape. Shrink the
// art to 90% so a round mask doesn't clip the bricks' outer corners.
const inner = await sharp(SRC + 'icon.png').resize(922, 922).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: bg } })
  .composite([{ input: inner, left: 51, top: 51 }])
  .png()
  .toFile('assets/icon-foreground.png');
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: bg } }).png().toFile('assets/icon-background.png');

// Splash: the logo centred on the game's night sky, 2732 square.
const NIGHT = { r: 13, g: 20, b: 32, alpha: 1 };
const splashLogo = await sharp(SRC + 'logo.png').resize(1200).png().toBuffer();
for (const name of ['splash.png', 'splash-dark.png']) {
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: NIGHT } })
    .composite([{ input: splashLogo, gravity: 'center' }])
    .png()
    .toFile('assets/' + name);
}

// In-app logo for the splash and home screens.
await sharp(SRC + 'logo.png').resize(720).webp({ quality: 88, alphaQuality: 100 }).toFile('src/assets/logo.webp');

// Play Store feature graphic: exactly 1024 × 500.
await sharp(SRC + 'feature-graphic.png').resize(1024, 500, { fit: 'cover' }).png().toFile('store/feature-graphic-1024x500.png');

console.log('Brand assets written to assets/, src/assets/logo.webp and store/');
