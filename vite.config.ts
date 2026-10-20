import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Relative base so the build works at any path (GitHub Pages serves /betsie/).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5181, strictPort: true },
  preview: { port: 5181, strictPort: true },
});
