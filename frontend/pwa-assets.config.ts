import { defineConfig } from '@vite-pwa/assets-generator/config';

/**
 * Regenerates every PWA icon from the single source at public/logo.svg.
 * Run with: npm run generate-pwa-assets
 * (or `npm run generate-logo` to rebuild the wordmark itself first).
 *
 * No padding anywhere: logo.svg is a deliberately full-bleed brand tile, so
 * padding would ring it with a border and break the edge-to-edge look. The
 * logotype is already held inside the centre of the tile by the generator
 * script, which is what keeps it clear of Android's circular maskable crop —
 * that mask is meant to eat the corners of the pink here.
 *
 * `padding: 0` matters on `transparent` too, and not only for the look: the
 * preset's default 2.5% inset leaves genuinely transparent pixels around the
 * tile, and Chrome's desktop install dialog draws the `any` icon straight onto
 * a white card — so those pixels read as a white halo around the mark. Pairing
 * it with an opaque `background` flattens the alpha away entirely.
 */
const BRAND = '#BC5873'; // keep in sync with BRAND in scripts/generate-logo.mjs

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  images: ['public/logo.svg'],
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[64, 'favicon.ico']],
      padding: 0,
      resizeOptions: { background: BRAND, fit: 'cover' },
    },
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: { background: BRAND, fit: 'cover' },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background: BRAND, fit: 'cover' },
    },
  },
});
