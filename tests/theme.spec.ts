import { test, expect } from "@playwright/test";

async function getTheme(page: import("@playwright/test").Page): Promise<string> {
  return await page.evaluate(() => document.documentElement.getAttribute("data-theme") ?? "");
}

async function getStoredTheme(page: import("@playwright/test").Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem("theme"));
}

test.describe("theme toggle", () => {
  test("pre-paint script sets data-theme to a valid value", async ({ page }) => {
    await page.goto("/");
    const theme = await getTheme(page);
    expect(["light", "dark"]).toContain(theme);
  });

  test("clicking the toggle flips data-theme and updates the label", async ({ page }) => {
    await page.goto("/");
    const before = await getTheme(page);
    const expectedAfter = before === "light" ? "dark" : "light";
    const expectedLabelAfter = expectedAfter === "light" ? "Dawn" : "Dusk";

    await page.locator("#themeToggle").click();

    expect(await getTheme(page)).toBe(expectedAfter);
    await expect(page.locator("#themeLabel")).toHaveText(expectedLabelAfter);
  });

  test("the toggled theme persists across reload via localStorage", async ({ page }) => {
    await page.goto("/");
    const before = await getTheme(page);
    const expectedAfter = before === "light" ? "dark" : "light";

    await page.locator("#themeToggle").click();
    expect(await getTheme(page)).toBe(expectedAfter);
    expect(await getStoredTheme(page)).toBe(expectedAfter);

    await page.reload();
    expect(await getTheme(page)).toBe(expectedAfter);
    expect(await getStoredTheme(page)).toBe(expectedAfter);
  });
});
