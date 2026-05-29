import { test, expect } from "@playwright/test";

test("ledger shows all entries with stamps and kickers", async ({ page }) => {
  await page.goto("/ledger");

  // The ledger has at least the 3 featured prototypes + 2 markdown posts
  const rows = page.locator(".ledger > li");
  expect(await rows.count()).toBeGreaterThanOrEqual(5);

  // Each row has a stamp svg (constellation) and a kicker
  for (let i = 0; i < (await rows.count()); i++) {
    const row = rows.nth(i);
    await expect(row.locator("svg").first()).toBeVisible();
    await expect(row.locator(".kicker")).toBeVisible();
  }
});

test("hovering a stamp opens the atlas card", async ({ page }) => {
  await page.goto("/ledger");

  const firstAnchor = page.locator(".ledger > li .anchor[data-atlas-anchor]").first();
  await firstAnchor.hover();

  // The Svelte island animates in; allow it a moment
  const card = page.locator(".atlas[role='dialog']");
  await expect(card).toBeVisible({ timeout: 1500 });

  // Pressing Escape closes it
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();
});
