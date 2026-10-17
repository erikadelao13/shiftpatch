import { fileURLToPath } from "node:url";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": `${root}src`,
      "server-only": `${root}tests/stubs/server-only.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // `.env` holds the production branch, and Vitest's own NODE_ENV=test would
    // read only `.env`. Load the development files explicitly so tests run on
    // the dev branch; tests/setup.ts then refuses anything else.
    env: loadEnv("development", root, ""),
    setupFiles: ["tests/setup.ts"],
  },
});
