import { test, expect } from "@playwright/test";

test.describe("Admin Members", () => {
  test("members table renders", async ({ page }) => {
    await page.goto("/admin/members", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Members");
    // should have at least the table header row
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("search filters the table", async ({ page }) => {
    await page.goto("/admin/members", { waitUntil: "networkidle" });
    const search = page.getByPlaceholder(/search/i);
    await search.fill("nonexistent-member-xyz");
    // should show "no members match" or empty table
    await expect(page.getByText(/no members match/i)).toBeVisible();
  });

  test("add member form opens", async ({ page }) => {
    await page.goto("/admin/members", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Add member" }).click();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("First name")).toBeVisible();
  });

  test("CSV import dialog opens", async ({ page }) => {
    await page.goto("/admin/members", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Import CSV" }).click();
    await expect(page.getByText("Import Members from CSV")).toBeVisible();
  });
});
