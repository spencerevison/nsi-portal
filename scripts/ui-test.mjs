// Automated UI test — signs in via Clerk test user, screenshots all pages.
// Uses @clerk/testing tokens (bypass bot detection) + +clerk_test email
// (bypass email verification, OTP code is always 424242).
//
// Run: node scripts/ui-test.mjs (dev server must be up)

import { chromium } from "@playwright/test";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const email = env.TEST_USER_EMAIL;
const password = env.TEST_USER_PASSWORD;
if (!email || !password) {
  console.error("Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.local");
  process.exit(1);
}

const OUT = "./.ui-review";
await mkdir(OUT, { recursive: true });

await clerkSetup();

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await setupClerkTestingToken({ page });

// --- Sign in ---
console.log(`Signing in as ${email}...`);
await page.goto("http://localhost:3000/sign-in", { waitUntil: "networkidle" });

await page.locator('input[name="identifier"]').fill(email);
await page.getByRole("button", { name: /continue/i }).click();

const pwd = page.locator('input[name="password"]');
await pwd.waitFor({ timeout: 10000 });
await pwd.fill(password);
await page.getByRole("button", { name: /continue/i }).click();

// handle device verification if it triggers
try {
  await page.waitForURL("http://localhost:3000/", { timeout: 5000 });
} catch {
  if (page.url().includes("factor-two")) {
    console.log("Device verification — entering test code 424242...");
    // Clerk renders 6 individual OTP digit inputs
    await page.waitForTimeout(500);
    await page.keyboard.type("424242", { delay: 50 });
    // click continue/verify
    const continueBtn = page.getByRole("button", { name: /continue|verify/i });
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
    }
    await page.waitForURL("http://localhost:3000/", { timeout: 10000 });
  } else {
    console.error("Unexpected URL:", page.url());
    await page.screenshot({ path: `${OUT}/error-signin.png` });
    await browser.close();
    process.exit(1);
  }
}

console.log("Signed in.\n");

// --- Screenshot helper ---
async function capture(name, path) {
  await page.goto(`http://localhost:3000${path}`, {
    waitUntil: "networkidle",
    timeout: 15000,
  });
  await page.waitForTimeout(500);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  ${name} (${page.url()})`);
}

// --- Desktop screenshots ---
console.log("Desktop (1280x900):");
await capture("50-home", "/");
await capture("51-admin-members", "/admin/members");

// open Add Member form
await page.goto("http://localhost:3000/admin/members", { waitUntil: "networkidle" });
const addBtn = page.getByRole("button", { name: "Add member" });
if (await addBtn.isVisible()) {
  await addBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/52-admin-add-form.png`, fullPage: true });
  console.log("  52-admin-add-form");

  // open role select
  const trigger = page.locator('[data-slot="select-trigger"]');
  if (await trigger.isVisible()) {
    await trigger.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/53-admin-role-select.png`, fullPage: true });
    console.log("  53-admin-role-select");
  }
}

await capture("54-sign-in", "/sign-in");
await capture("55-sign-up-no-ticket", "/sign-up");

// --- Mobile screenshots ---
await page.setViewportSize({ width: 375, height: 812 });
console.log("\nMobile (375x812):");
await capture("60-mobile-home", "/");
await capture("61-mobile-admin", "/admin/members");

await browser.close();
console.log(`\nDone. Screenshots in ${OUT}/`);
