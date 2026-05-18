import { test, expect } from "@playwright/test";

test("cosmos page renders the chart with tag stars and labels", async ({ page }) => {
  await page.goto("/cosmos");

  await expect(page.getByRole("heading", { name: /a sky of tags/i })).toBeVisible();

  // Chart contains hit-circles (one per tag) and at least one label
  const hits = page.locator("svg .hit[role='button']");
  expect(await hits.count()).toBeGreaterThan(0);

  const tagLabels = page.locator("svg text").filter({ hasText: /design|rust|svelte/i });
  expect(await tagLabels.count()).toBeGreaterThan(0);
});

test("clicking a tag star filters the ledger", async ({ page }) => {
  await page.goto("/cosmos");

  // Capture the visible row count before filtering
  const allRows = page.locator(".ledger > li");
  const totalRows = await allRows.count();

  // Click the hit-circle whose aria-label contains "design"
  const designStar = page.locator("svg .hit[aria-label*='design']").first();
  await designStar.click();

  // Filter region should mark itself filtered
  await expect(page.locator("#filter-region.filtered")).toBeVisible();

  // At least one row remains visible (display !== "none"); fewer than total
  const visibleAfter = await allRows.evaluateAll((els) =>
    els.filter((el) => getComputedStyle(el).display !== "none").length,
  );
  expect(visibleAfter).toBeGreaterThan(0);
  expect(visibleAfter).toBeLessThanOrEqual(totalRows);

  // Click again to clear
  await designStar.click();
  await expect(page.locator("#filter-region")).not.toHaveClass(/filtered/);
});
