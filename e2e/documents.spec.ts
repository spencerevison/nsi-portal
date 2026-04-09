import { test, expect } from "@playwright/test";

test.describe("Documents", () => {
  test("folder tree renders", async ({ page }) => {
    await page.goto("/documents", { waitUntil: "networkidle" });
    // should see at least one folder in the sidebar
    await expect(page.getByText("Strata Documents")).toBeVisible();
  });

  test("clicking a folder shows its contents", async ({ page }) => {
    await page.goto("/documents", { waitUntil: "networkidle" });
    await page.getByText("Strata Documents").click();
    await page.waitForURL(/documents\/strata-documents/);
    // should show folder heading and upload button
    await expect(page.getByText("Strata Documents").first()).toBeVisible();
  });

  test("upload button visible for admin", async ({ page }) => {
    await page.goto("/documents/strata-documents", {
      waitUntil: "networkidle",
    });
    await expect(page.getByRole("button", { name: /upload/i })).toBeVisible();
  });
});
