import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    // Use happy-dom for faster tests (jsdom alternative)
    environment: "happy-dom",

    // Enable globals (describe, it, expect without imports)
    globals: true,

    // Setup file for test utilities and mocks
    setupFiles: ["./tests/setup.ts"],

    // Test file patterns
    include: [
      "./tests/**/*.{test,spec}.{ts,tsx}",
      "./lib/**/*.{test,spec}.{ts,tsx}",
      "./components/**/*.{test,spec}.{ts,tsx}",
    ],

    // Exclude patterns
    exclude: ["node_modules", ".next", "vendor"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["lib/api/**/*.ts", "components/**/*.tsx"],
      exclude: ["**/*.d.ts", "**/types/**", "**/*.test.{ts,tsx}"],
    },

    // Timeout for async operations
    testTimeout: 10000,

    // Reporter configuration
    reporters: ["verbose"],
  },
});
