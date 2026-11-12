import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));
const bluCoreSrc = path.join(root, "packages/blu-core/src");

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.join(root, "src"),
      },
      {
        find: /^blu-core\/(.+)$/,
        replacement: `${bluCoreSrc}/$1.ts`,
      },
      {
        find: "blu-core",
        replacement: path.join(bluCoreSrc, "index.ts"),
      },
    ],
  },
  test: {
    // forks evita el crash de undici/jsdom en worker threads (Node 20+/undici 8)
    // que bloqueó el gate MASTG del release APK v0.3.1.
    pool: "forks",
    clearMocks: true,
    restoreMocks: true,
    environment: "jsdom",
  },
});
