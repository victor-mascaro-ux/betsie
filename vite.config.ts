import { defineConfig } from 'vite';

// Relative base so the build works at any path (GitHub Pages serves /betsie/).
export default defineConfig({
  base: './',
  server: { port: 5181, strictPort: true },
  preview: { port: 5181, strictPort: true },
});
