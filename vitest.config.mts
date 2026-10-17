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
    // Vitest's NODE_ENV=test would read only `.env` (production). Load the
    // development files explicitly; tests/setup.ts refuses anything but dev.
    env: loadEnv("development", root, ""),
    setupFiles: ["tests/setup.ts"],
  },
});
