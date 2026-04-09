import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("home page loads with welcome content", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // should see welcome banner or regular heading
    await expect(
      page.getByText(/welcome|community portal/i).first(),
    ).toBeVisible();
  });

  test("desktop nav has all main links", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav.getByText("Documents")).toBeVisible();
    await expect(nav.getByText("Directory")).toBeVisible();
    await expect(nav.getByText("Message Board")).toBeVisible();
    await expect(nav.getByText("Admin")).toBeVisible();
  });

  test("footer is visible", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("North Secretary Island");
  });

  test("can navigate to all main sections", async ({ page }) => {
    await page.goto("/documents", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/documents/);

    await page.goto("/directory", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Member Directory");

    await page.goto("/community", { waitUntil: "networkidle" });
    // community page should have posts or empty state
    await expect(page.locator("main")).toBeVisible();
  });
});
