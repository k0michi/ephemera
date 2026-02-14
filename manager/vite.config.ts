import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'app/app.ts',
    outDir: 'dist',
    target: 'node22',
    rollupOptions: {
      external: [
        /node_modules/,
      ]
    }
  },
});