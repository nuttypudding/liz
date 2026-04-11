import { defineConfig } from "vitest/config";
import path from "path";

const alias = { "@": path.resolve(__dirname, ".") };

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: "api",
          environment: "node",
          include: ["tests/api/**/*.test.ts", "tests/lib/**/*.test.ts"],
          setupFiles: ["tests/setup-dom.ts"],
        },
        resolve: { alias },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["__tests__/integration/**/*.test.ts"],
          setupFiles: ["tests/setup-dom.ts"],
        },
        resolve: { alias },
      },
      {
        test: {
          name: "components",
          environment: "jsdom",
          include: ["tests/components/**/*.test.tsx"],
          setupFiles: ["tests/setup-dom.ts"],
        },
        resolve: { alias },
      },
    ],
  },
  resolve: { alias },
});
