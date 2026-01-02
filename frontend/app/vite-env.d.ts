// src/vite-env.d.ts

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly EPHEMERA_COMMIT_HASH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}