import { defineConfig } from 'vite';
import { execSync } from 'child_process';

let commitHash = 'unknown';

try {
  commitHash = execSync('git describe --tags --always --dirty').toString().trim();
} catch (e) {
}

export default defineConfig({
  build: {
    ssr: 'app/app.ts',
    outDir: 'dist',
    target: 'node18',
    rollupOptions: {
      external: [
        /node_modules/,
      ]
    }
  },
  define: {
    'import.meta.env.EPHEMERA_COMMIT_HASH': JSON.stringify(commitHash),
  },
});