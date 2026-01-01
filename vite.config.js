import { defineConfig } from 'vite';

export default defineConfig({
  base: '/lumina-voyage/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
    esbuild: {
      drop: [] // Keep console logs
    }
  }
});
