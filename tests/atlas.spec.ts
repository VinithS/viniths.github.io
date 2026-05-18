import { test, expect } from "@playwright/test";

test("blog page exposes the Atlas pane and unfolds on click", async ({ page }) => {
  await page.goto("/blog");

  // Pane starts collapsed; the Atlas button is always present.
  const atlasBtn = page.getByRole("button", { name: /^atlas/i });
  await expect(atlasBtn).toBeVisible();
  await expect(atlasBtn).toHaveAttribute("aria-expanded", "false");

  // Open the pane.
  await atlasBtn.click();
  await expect(atlasBtn).toHaveAttribute("aria-expanded", "true");

  // Chart contains hit-circles (one per tag) and at least one label.
  const hits = page.locator("svg .hit[role='button']");
  expect(await hits.count()).toBeGreaterThan(0);

  const tagLabels = page.locator("svg text").filter({ hasText: /design|rust|svelte/i });
  expect(await tagLabels.count()).toBeGreaterThan(0);
});

test("clicking a tag star filters the ledger", async ({ page }) => {
  await page.goto("/blog");

  // Open the pane first.
  await page.getByRole("button", { name: /^atlas/i }).click();

  const allRows = page.locator(".ledger > li");
  const totalRows = await allRows.count();

  const designStar = page.locator("svg .hit[aria-label*='design']").first();
  await designStar.click();

  await expect(page.locator("#filter-region.filtered")).toBeVisible();

  const visibleAfter = await allRows.evaluateAll((els) =>
    els.filter((el) => getComputedStyle(el).display !== "none").length,
  );
  expect(visibleAfter).toBeGreaterThan(0);
  expect(visibleAfter).toBeLessThanOrEqual(totalRows);

  // Click again to clear.
  await designStar.click();
  await expect(page.locator("#filter-region")).not.toHaveClass(/filtered/);
});
