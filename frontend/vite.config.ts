import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { execSync } from 'child_process';

const commitHash = execSync('git describe --tags --always --dirty').toString().trim();

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  define: {
    'import.meta.env.EPHEMERA_COMMIT_HASH': JSON.stringify(commitHash),
  },
});
