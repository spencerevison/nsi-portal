import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: [
      {
        find: "server-only",
        replacement: path.resolve(__dirname, "vitest.server-only-mock.ts"),
      },
      {
        find: /^@\/lib\/supabase-admin$/,
        replacement: path.resolve(__dirname, "vitest.supabase-mock.ts"),
      },
      {
        find: /^resend$/,
        replacement: path.resolve(__dirname, "vitest.resend-mock.ts"),
      },
      { find: "@", replacement: path.resolve(__dirname, "src") },
    ],
  },
});
