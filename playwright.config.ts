import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
  },
  // auth setup runs first, stores session state
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "tests",
      dependencies: ["setup"],
      use: {
        storageState: "./e2e/.auth/state.json",
      },
    },
  ],
});
