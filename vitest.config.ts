import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    maxWorkers: 1,
    minWorkers: 1,
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "test-results/**", ".playwright/**"],
  },
})
