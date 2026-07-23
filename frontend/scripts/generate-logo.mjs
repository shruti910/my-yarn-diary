/**
 * Regenerates public/logo.svg — the single source image for every PWA icon.
 *
 *   npm run generate-logo        (rewrites logo.svg, then all icon sizes)
 *
 * The logotype is set in Grand Hotel, reusing the TTF already embedded in
 * src/lib/GrandHotelBase64.ts for PDF export, and every glyph is converted to a
 * <path> outline. That keeps logo.svg completely self-contained: no webfont
 * request, no dependency on the font being installed, and identical rendering
 * in browsers, image tools and the icon generator.
 *
 * Tweak the constants below to restyle the mark.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import opentype from 'opentype.js';

const here = dirname(fileURLToPath(import.meta.url));
const frontend = resolve(here, '..');

const SIZE = 512;
const BRAND = '#BC5873'; // brand tile pink
const INK = '#FFF8F5';
const LINES = ['My Yarn', 'Diary'];

/**
 * Largest dimension the finished logotype may occupy, measured from its real
 * inked bounds. Android crops maskable icons to a centre circle, so the mark has
 * to stay well inside that rather than running tile-edge to tile-edge — hence
 * roughly 65% of the tile rather than something that merely "looks centred".
 */
const TARGET_EXTENT = 330;

/** Baseline-to-baseline distance, as a multiple of the font size. */
const LINE_SPACING = 0.82;

const source = readFileSync(resolve(frontend, 'src/lib/GrandHotelBase64.ts'), 'utf8');
const base64 = source.match(/'([A-Za-z0-9+/=]+)'/)?.[1];
if (!base64) throw new Error('Could not read the embedded font from GrandHotelBase64.ts');

const font = opentype.parse(Buffer.from(base64, 'base64').buffer);

// Lay the lines out at an arbitrary probe size, centred on each other, then
// measure what was actually drawn. Font metrics (ascender/descender) are a poor
// guide for a script face: the real ink is what has to clear the mask.
const PROBE = 100;
const lineHeight = PROBE * LINE_SPACING;

const probePaths = LINES.map((line, i) => {
  const x = -font.getAdvanceWidth(line, PROBE) / 2;
  return font.getPath(line, x, i * lineHeight, PROBE);
});

const bounds = probePaths.reduce(
  (acc, path) => {
    const b = path.getBoundingBox();
    return {
      x1: Math.min(acc.x1, b.x1),
      y1: Math.min(acc.y1, b.y1),
      x2: Math.max(acc.x2, b.x2),
      y2: Math.max(acc.y2, b.y2),
    };
  },
  { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
);

const inkWidth = bounds.x2 - bounds.x1;
const inkHeight = bounds.y2 - bounds.y1;
const scale = TARGET_EXTENT / Math.max(inkWidth, inkHeight);

// Centre the measured ink box on the tile.
const offsetX = SIZE / 2 - (bounds.x1 + inkWidth / 2) * scale;
const offsetY = SIZE / 2 - (bounds.y1 + inkHeight / 2) * scale;

const paths = probePaths.map((path) => path.toPathData(2));
const fontSize = PROBE * scale;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" aria-label="My Yarn Diary">
  <!-- GENERATED FILE - do not edit by hand.
       Regenerate with: npm run generate-logo (see scripts/generate-logo.mjs)

       A full-bleed brand tile carrying the "My Yarn Diary" logotype in Grand
       Hotel, matching the in-app wordmark. Text is outlined to paths, so no
       webfont is needed. It is held inside the centre of the tile so Android's
       circular maskable crop never cuts into it. -->
  <rect width="${SIZE}" height="${SIZE}" fill="${BRAND}" />
  <g fill="${INK}" transform="translate(${offsetX.toFixed(2)} ${offsetY.toFixed(2)}) scale(${scale.toFixed(4)})">
${paths.map((d) => `    <path d="${d}" />`).join('\n')}
  </g>
</svg>
`;

writeFileSync(resolve(frontend, 'public/logo.svg'), svg);
console.log(
  `logo.svg written — ${LINES.join(' / ')} in ${font.names.fullName?.en ?? 'Grand Hotel'}`
);
console.log(
  `  ink ${(inkWidth * scale).toFixed(0)}x${(inkHeight * scale).toFixed(0)}px ` +
    `of ${SIZE} (${((Math.max(inkWidth, inkHeight) * scale) / SIZE * 100).toFixed(0)}% of tile), ` +
    `type ~${fontSize.toFixed(0)}px`
);
