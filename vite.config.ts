import { defineConfig } from 'vite';
import { pwaPlugin } from './build/pwaPlugin.ts';

export default defineConfig({
  base: './',
  plugins: [pwaPlugin()],
  server: {
    host: true,
    port: 5173,
  },
});
