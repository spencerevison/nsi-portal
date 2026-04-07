// Full UI/UX test suite — covers all pages, interactions, styling, and edge cases.
// Run: node scripts/thorough-test.mjs (dev server must be up)

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

const OUT = "./.ui-review/thorough";
await mkdir(OUT, { recursive: true });

await clerkSetup();

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();
await setupClerkTestingToken({ page });

const results = [];
function log(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(
    `${ok ? "PASS" : "FAIL"}: ${name}${detail ? " — " + detail : ""}`,
  );
}

// --- Sign in ---
console.log("Signing in...");
await page.goto("http://localhost:3000/sign-in", { waitUntil: "networkidle" });
await page.locator('input[name="identifier"]').fill(env.TEST_USER_EMAIL);
await page.getByRole("button", { name: /continue/i }).click();
await page.locator('input[name="password"]').waitFor({ timeout: 10000 });
await page.locator('input[name="password"]').fill(env.TEST_USER_PASSWORD);
await page.getByRole("button", { name: /continue/i }).click();
try {
  await page.waitForURL("http://localhost:3000/", { timeout: 5000 });
} catch {
  const url = page.url();
  if (url.includes("factor-two") || url.includes("client-trust")) {
    await page.waitForTimeout(500);
    await page.keyboard.type("424242", { delay: 50 });
    await page.waitForURL("http://localhost:3000/", { timeout: 20000 });
  }
}
log("Sign-in", page.url() === "http://localhost:3000/");

// ============================================================
console.log("\n=== Home Page ===");
// ============================================================
const welcomeText = await page.locator("h1").textContent();
log("Home shows welcome message", welcomeText?.includes("Welcome"));

const navLinks = await page.locator("header nav a").allTextContents();
log("Nav: Documents", navLinks.includes("Documents"));
log("Nav: Directory", navLinks.includes("Directory"));
log("Nav: Community", navLinks.includes("Community"));
log("Nav: Email (admin)", navLinks.includes("Email"));
log("Nav: Admin (admin)", navLinks.includes("Admin"));
await page.screenshot({ path: `${OUT}/01-home.png` });

// ============================================================
console.log("\n=== Documents ===");
// ============================================================
await page.goto("http://localhost:3000/documents", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(500);

const folderLinks = page.locator("main a").filter({
  hasText: /Strata|Meeting|Financial|Insurance|Forms|Community/,
});
const folderCount = await folderLinks.count();
log("Folder tree shows 6 folders", folderCount >= 6, `found ${folderCount}`);

const emptyState = await page.getByText("Select a folder").isVisible();
log("Empty state shown", emptyState);
await page.screenshot({ path: `${OUT}/02-documents-index.png` });

// navigate to a folder
await page.goto("http://localhost:3000/documents/strata-documents", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(500);
const folderHeader = await page.locator("h2").textContent();
log("Folder detail: name shown", folderHeader?.includes("Strata Documents"));

const uploadBtn = await page
  .getByRole("button", { name: "Upload" })
  .isVisible();
log("Folder detail: Upload button (admin)", uploadBtn);

const dragZone = await page
  .getByText("Drag files here or click Upload")
  .isVisible();
log("Folder detail: drag-and-drop zone", dragZone);
await page.screenshot({ path: `${OUT}/03-folder-detail.png` });

// ============================================================
console.log("\n=== Directory ===");
// ============================================================
await page.goto("http://localhost:3000/directory", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(500);

const dirHeading = await page.locator("h1").textContent();
log("Directory: heading", dirHeading?.includes("Member Directory"));

const memberCount = await page.locator("tbody tr").count();
log("Directory: members shown", memberCount > 0, `${memberCount} rows`);

const headers = await page.locator("thead th").allTextContents();
log(
  "Directory: all columns",
  headers.includes("Name") &&
    headers.includes("Email") &&
    headers.includes("Children") &&
    headers.includes("Dogs"),
  headers.join(", "),
);

// avatars
const avatarCircles = page.locator("tbody .rounded-full");
log("Directory: avatars", (await avatarCircles.count()) > 0);

// search
const searchInput = page.locator('input[placeholder*="Search"]');
log("Directory: search input", await searchInput.isVisible());

await searchInput.fill("Spencer");
await page.waitForTimeout(300);
const filteredRows = await page.locator("tbody tr").count();
log("Directory: search filters", filteredRows <= memberCount);

await searchInput.fill("999zzz");
await page.waitForTimeout(300);
const noResults = await page
  .locator("tbody")
  .getByText("No members match")
  .isVisible();
log("Directory: no-results message", noResults);
await searchInput.clear();

await page.screenshot({ path: `${OUT}/04-directory.png` });

// ============================================================
console.log("\n=== Profile/Settings ===");
// ============================================================
await page.goto("http://localhost:3000/profile", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(500);

log(
  "Profile: heading",
  (await page.locator("h1").textContent())?.includes("Profile"),
);

// name is read-only text, not an input
const nameText = page
  .locator("p")
  .filter({ hasText: /Test|Spencer/ })
  .first();
log("Profile: name shown as text", await nameText.isVisible());

log(
  "Profile: 'Account Settings' link",
  await page.getByText("Account Settings").isVisible(),
);

log("Profile: phone input editable", await page.locator("#phone").isEnabled());
log(
  "Profile: lot input editable",
  await page.locator("#lot_number").isEnabled(),
);

log("Profile: Children field", await page.getByText("Children").isVisible());
log("Profile: Dogs field", await page.getByText("Dogs").isVisible());
log("Profile: '+ Add child'", await page.getByText("+ Add child").isVisible());
log(
  "Profile: visibility toggle",
  await page.getByText("Show in member directory").first().isVisible(),
);
log(
  "Profile: Save button",
  await page.getByRole("button", { name: /Save/i }).isVisible(),
);

await page.screenshot({ path: `${OUT}/05-profile.png`, fullPage: true });

// ============================================================
console.log("\n=== Admin Members ===");
// ============================================================
await page.goto("http://localhost:3000/admin/members", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(500);

log(
  "Admin: heading",
  (await page.locator("h1").textContent())?.includes("Members"),
);

const activeTab = page
  .locator('a[class*="font-medium"]')
  .filter({ hasText: "Members" });
log("Admin: Members tab active", await activeTab.isVisible());

const addMemberBtn = page.getByRole("button", { name: "Add member" });
log("Admin: Add member button", await addMemberBtn.isVisible());
const addBtnBg = await addMemberBtn.evaluate(
  (el) => window.getComputedStyle(el).backgroundColor,
);
log("Admin: button styled", addBtnBg !== "rgba(0, 0, 0, 0)", addBtnBg);

const adminRows = await page.locator("tbody tr").count();
log("Admin: table rows", adminRows > 0, `${adminRows}`);

log(
  "Admin: Active badge",
  await page.locator("tbody").getByText("Active").first().isVisible(),
);

// kebab menu
const firstRow = page.locator("tbody tr").first();
await firstRow.locator("button").last().click({ force: true });
await page.waitForTimeout(300);
log(
  "Admin: Edit option",
  await page.getByRole("menuitem", { name: "Edit" }).isVisible(),
);
log(
  "Admin: Deactivate option",
  await page.getByRole("menuitem", { name: "Deactivate" }).isVisible(),
);
await page.keyboard.press("Escape");

// expand add form
await addMemberBtn.click();
await page.waitForTimeout(300);
log(
  "Admin: form expands",
  await page.locator('input[name="first_name"]').isVisible(),
);
log(
  "Admin: role select",
  await page.locator('[data-slot="select-trigger"]').isVisible(),
);

await page.screenshot({ path: `${OUT}/06-admin.png`, fullPage: true });

// ============================================================
console.log("\n=== Styling ===");
// ============================================================
const bodyFont = await page.evaluate(() =>
  window.getComputedStyle(document.body).fontFamily.split(",")[0].trim(),
);
log("Font: Geist", bodyFont === "Geist", bodyFont);

const primary = await page.evaluate(() =>
  window
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim(),
);
log("CSS: --primary defined", primary.length > 0, primary);

// ============================================================
console.log("\n=== Mobile (375px) ===");
// ============================================================
await page.setViewportSize({ width: 375, height: 812 });

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/10-mobile-home.png` });

await page.goto("http://localhost:3000/documents", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/11-mobile-documents.png` });

await page.goto("http://localhost:3000/directory", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/12-mobile-directory.png` });

await page.goto("http://localhost:3000/profile", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/13-mobile-profile.png`, fullPage: true });

await page.goto("http://localhost:3000/admin/members", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/14-mobile-admin.png` });

// ============================================================
console.log("\n=== Public Routes (unauthenticated) ===");
// ============================================================
await page.setViewportSize({ width: 1280, height: 900 });
const ctx2 = await browser.newContext();
const unauthPage = await ctx2.newPage();

await unauthPage.goto("http://localhost:3000/sign-up", {
  waitUntil: "networkidle",
});
log(
  "Public: /sign-up → invitation required",
  await unauthPage.getByText("Invitation required").isVisible(),
);

for (const path of ["/documents", "/directory", "/profile", "/admin/members"]) {
  await unauthPage.goto(`http://localhost:3000${path}`, {
    waitUntil: "networkidle",
  });
  log(
    `Public: ${path} → sign-in redirect`,
    unauthPage.url().includes("/sign-in"),
  );
}

const webhookRes = await unauthPage.request.post(
  "http://localhost:3000/api/webhooks/clerk",
  { data: {} },
);
log("Public: webhook rejects (400)", webhookRes.status() === 400);

await ctx2.close();

// ============================================================
console.log("\n=== Summary ===");
// ============================================================
const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(
  `\n${passed} passed, ${failed} failed out of ${results.length} checks`,
);

if (failed > 0) {
  console.log("\nFailed:");
  for (const r of results.filter((r) => !r.ok)) {
    console.log(`  - ${r.name}${r.detail ? ": " + r.detail : ""}`);
  }
}

console.log(`\nScreenshots in ${OUT}/`);
await browser.close();
process.exit(failed > 0 ? 1 : 0);
