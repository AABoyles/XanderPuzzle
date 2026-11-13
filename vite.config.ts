import { defineConfig } from 'vite';
import { pwaPlugin } from './build/pwaPlugin.ts';

export default defineConfig({
  base: './',
  plugins: [pwaPlugin()],
  build: {
    // Maps are fetched only when dev tools are open; the service worker leaves them out of its precache.
    sourcemap: true,
  },
  server: {
    host: true,
    port: 5173,
  },
});
