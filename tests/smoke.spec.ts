import { test, expect } from "@playwright/test";

test.describe("home page smoke", () => {
  test("renders with a non-empty title", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("shows the four main nav links", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav.nav");
    await expect(nav.getByRole("link", { name: "Ledger" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Photos" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Notes" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "About" })).toBeVisible();
  });

  test("clicking Ledger navigates to /ledger", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav.nav").getByRole("link", { name: "Ledger" }).click();
    await expect(page).toHaveURL(/\/ledger\/?$/);
  });
});
