import { test, expect } from "@playwright/test";

test.describe("Community", () => {
  test("message board loads", async ({ page }) => {
    await page.goto("/community", { waitUntil: "networkidle" });
    // should see either posts or empty state
    await expect(page.locator("main")).toBeVisible();
  });

  test("new post button visible for members with write access", async ({
    page,
  }) => {
    await page.goto("/community", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /new post/i })).toBeVisible();
  });

  test("can navigate to a single post", async ({ page }) => {
    await page.goto("/community", { waitUntil: "networkidle" });
    // click first post link if posts exist
    const postLink = page.locator('a[href*="/community/"]').first();
    if (await postLink.isVisible()) {
      await postLink.click();
      await page.waitForURL(/community\/.+/);
      // single post page should have the post title
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});
