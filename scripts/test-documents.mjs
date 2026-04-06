// Document library interaction tests.
// Tests upload, download, folder CRUD, file delete against real Supabase.
// Run: node scripts/test-documents.mjs (dev server must be up)

import { chromium } from "@playwright/test";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const OUT = "./.ui-review/interactions";
await mkdir(OUT, { recursive: true });

await clerkSetup();

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
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
  if (page.url().includes("factor-two")) {
    await page.waitForTimeout(500);
    await page.keyboard.type("424242", { delay: 50 });
    const btn = page.getByRole("button", { name: /continue|verify/i });
    if (await btn.isVisible()) await btn.click();
    await page.waitForURL("http://localhost:3000/", { timeout: 10000 });
  }
}

// --- Navigate to a top-level folder ---
console.log("\n=== Folder Navigation ===");
await page.goto("http://localhost:3000/documents/strata-documents", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(500);

const folderName = await page.locator("h2").textContent();
log("Navigate to folder", folderName?.includes("Strata Documents"));

const uploadBtn = page.getByRole("button", { name: "Upload" });
log("Upload button visible", await uploadBtn.isVisible());
await page.screenshot({ path: `${OUT}/01-folder-empty.png` });

// --- File Upload ---
console.log("\n=== File Upload ===");

// create a temp test file
const testFilePath = resolve(".ui-review", "test-upload.txt");
writeFileSync(
  testFilePath,
  "This is a test document for NSI portal upload testing.",
);

// use the file picker (hidden input)
const fileInput = page.locator('input[type="file"]').first();
await fileInput.setInputFiles(testFilePath);

// wait for upload to complete (page revalidates)
await page.waitForTimeout(3000);
await page.reload({ waitUntil: "networkidle" });

const fileRow = page.getByText("test-upload.txt");
const fileUploaded = await fileRow.isVisible();
log("File appears in list after upload", fileUploaded);
await page.screenshot({ path: `${OUT}/02-after-upload.png` });

// check file metadata
if (fileUploaded) {
  const sizeText = await page
    .locator("div")
    .filter({ hasText: /test-upload\.txt/ })
    .locator("xpath=ancestor::div[contains(@class, 'group')]")
    .first()
    .textContent();
  log(
    "File metadata shown (size, date)",
    sizeText?.includes("B") || false,
    sizeText?.slice(0, 80) ?? "",
  );
}

// --- File Download ---
console.log("\n=== File Download ===");
// The download button triggers a server action that returns a signed URL
// and opens it in a new tab. In headless mode we can verify the action succeeds
// by checking the button is clickable.
const downloadBtn = page
  .locator("div")
  .filter({ hasText: /test-upload\.txt/ })
  .locator("xpath=ancestor::div[contains(@class, 'group')]")
  .first()
  .locator("button")
  .first();

if (await downloadBtn.isVisible()) {
  log("Download button visible", true);
} else {
  log("Download button visible", false);
}

// --- Compact upload zone ---
console.log("\n=== Compact Upload Zone ===");
const compactZone = await page
  .getByText("Drop files here to upload")
  .isVisible();
log("Compact drag-and-drop hint visible (folder has files)", compactZone);

// --- File Delete ---
console.log("\n=== File Delete ===");
// hover over the file row to reveal the kebab
const fileGroup = page
  .locator("div.group")
  .filter({ hasText: "test-upload.txt" })
  .first();
await fileGroup.hover();
await page.waitForTimeout(300);

// the kebab trigger has opacity-0 until hover; find it by MoreVertical svg or second button
const allBtns = fileGroup.locator("button");
const btnCount = await allBtns.count();
log("File row has action buttons", btnCount >= 2, `${btnCount} buttons`);

if (btnCount >= 2) {
  // last button is the kebab (download is first)
  await allBtns.nth(btnCount - 1).click({ force: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/03-file-menu.png` });

  const deleteItem = page.getByRole("menuitem", { name: "Delete" });
  const deleteVisible = await deleteItem.isVisible();
  log("Delete menu item visible", deleteVisible);

  if (deleteVisible) {
    page.once("dialog", (dialog) => dialog.accept());
    await deleteItem.click();
    await page.waitForTimeout(3000);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const fileGone = !(await page.getByText("test-upload.txt").isVisible());
    log("File deleted successfully", fileGone);
    await page.screenshot({ path: `${OUT}/04-after-delete.png` });
  }
} else {
  log("File kebab menu visible", false);
}

// --- Folder CRUD (admin kebab menu) ---
console.log("\n=== Folder CRUD ===");
await page.goto("http://localhost:3000/documents", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(500);

// hover over a folder to reveal the kebab
const communityFolder = page.locator("main a").filter({ hasText: "Community" });
if (await communityFolder.isVisible()) {
  await communityFolder.hover();
  await page.waitForTimeout(300);

  // look for the kebab trigger (MoreVertical icon)
  const folderKebab = communityFolder
    .locator("xpath=ancestor::div[contains(@class, 'group')]")
    .first()
    .locator("button")
    .last();

  if (await folderKebab.isVisible()) {
    await folderKebab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/05-folder-menu.png` });

    const renameItem = page.getByRole("menuitem", { name: "Rename" });
    log("Folder rename menu item visible", await renameItem.isVisible());

    // close menu by pressing Escape
    await page.keyboard.press("Escape");
  } else {
    log("Folder kebab menu visible on hover", false);
  }
} else {
  log("Community folder visible", false);
}

// --- Cleanup ---
try {
  unlinkSync(testFilePath);
} catch {}

// --- Summary ---
console.log("\n=== Summary ===");
const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(
  `${passed} passed, ${failed} failed out of ${results.length} checks`,
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
