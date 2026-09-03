import { defineConfig } from 'vite';

export default defineConfig({
  base: '/psyreason/',
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 3000,
  },
});
