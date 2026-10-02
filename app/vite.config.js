import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

const appDir = fileURLToPath(new URL('.', import.meta.url));
const repoDir = fileURLToPath(new URL('..', import.meta.url));

// GitHub Pages serves the site under /<repo-name>/. The deploy workflow sets
// BASE_PATH from the repository name; locally the app runs at /.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  root: appDir,
  base,
  publicDir: 'public',
  build: { outDir: fileURLToPath(new URL('../dist', import.meta.url)), emptyOutDir: true },
  // The engine lives in ../src and ../curriculum (outside the app root).
  server: { fs: { allow: [repoDir] } },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'رياضياتي',
        short_name: 'رياضياتي',
        description: 'تمارين الرياضيات والعلوم للصفين الثاني والثالث الابتدائي',
        lang: 'ar',
        dir: 'rtl',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        theme_color: '#2F5D9E',
        background_color: '#F4F7FB',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
