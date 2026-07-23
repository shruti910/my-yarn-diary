import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt', not 'autoUpdate': row-count edits save on a 1s debounce and AI
      // replies stream in, so a silent reload mid-session could drop work. The
      // user gets a Reload banner instead (see components/PwaUpdatePrompt.tsx).
      registerType: 'prompt',
      // The app registers the worker itself via virtual:pwa-register/react, so
      // 'auto' correctly injects nothing here.
      injectRegister: 'auto',

      manifest: {
        id: '/',
        name: 'My Yarn Diary',
        // Never drop the "My" — the brand is "My Yarn Diary", not "Yarn Diary".
        // This is what Android's launcher and install prompt actually show, and
        // 12 characters still fits under a home-screen icon without ellipsis.
        short_name: 'My Yarn Diary',
        description:
          'An AI-enabled multimodal companion and journal tracking ecosystem for crochet crafters.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        // Cream rather than brand pink so the Android status bar blends into the
        // app header instead of capping it with a pink band.
        theme_color: '#f7f0ee',
        background_color: '#f7f0ee',
        lang: 'en',
        dir: 'ltr',
        // Deliberately no `orientation` lock: the layout is responsive and the
        // app is genuinely used on tablets and desktop.
        categories: ['lifestyle', 'productivity'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Start a new project',
            short_name: 'New project',
            description: 'Open My Yarn Diary and start logging a new make',
            url: '/?action=new-project',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Required: the main chunk is ~2.1MB, above Workbox's 2MB default, and
        // exceeding it silently drops the entire app from the precache.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // No client-side router — every navigation resolves to the one shell.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,

        // Only the patterns below are intercepted. /api/v1/* is deliberately
        // absent: it is per-user and authenticated, so it must always hit the
        // network. Project photos arrive as base64 inside those responses, so
        // there are no image URLs to cache either.
        runtimeCaching: [
          {
            // Fonts are pulled via @import in src/index.css; without these the
            // installed app falls back to system fonts on a bad connection.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // Keep dev fast; verify the PWA with `npm run build && npm run preview`.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Set clean path mapping pointing to your active code folder
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Safely redirects local development browser requests seamlessly over to your Express Gateway
      '/api/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
