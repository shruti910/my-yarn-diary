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
 */
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  images: ['public/logo.svg'],
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[64, 'favicon.ico']],
      resizeOptions: { background: '#D6708A' },
    },
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: { background: '#D6708A' },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background: '#D6708A' },
    },
  },
});
