import { test as setup } from "@playwright/test";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { readFileSync } from "node:fs";

// read env vars from .env.local (same approach as scripts/ui-test.mjs)
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const email = env.TEST_USER_EMAIL!;
const password = env.TEST_USER_PASSWORD!;

setup("sign in and save state", async ({ page }) => {
  await clerkSetup();
  await setupClerkTestingToken({ page });

  await page.goto("/sign-in", { waitUntil: "networkidle" });
  await page.locator('input[name="identifier"]').fill(email);
  await page.getByRole("button", { name: /continue/i }).click();

  const pwd = page.locator('input[name="password"]');
  await pwd.waitFor({ timeout: 10000 });
  await pwd.fill(password);
  await page.getByRole("button", { name: /continue/i }).click();

  // handle device verification if needed
  try {
    await page.waitForURL("/", { timeout: 5000 });
  } catch {
    const url = page.url();
    if (url.includes("factor-two") || url.includes("client-trust")) {
      await page.waitForTimeout(500);
      await page.keyboard.type("424242", { delay: 50 });
      await page.waitForURL("/", { timeout: 20000 });
    }
  }

  // save session state for other tests
  await page.context().storageState({ path: "./e2e/.auth/state.json" });
});
