# Playwright Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright as a real test foundation with two committed specs (smoke + theme toggle), runnable via `npm test` against the already-running dev server.

**Architecture:** Single Chromium project, no `webServer` block (assumes dev server is running on port 4321 — matches the user's workflow). Tests live under `tests/` at the repo root, separate from `src/`. Two specs: one home/nav smoke test, one theme-toggle round-trip test that exercises the pre-paint inline script in `src/layouts/Layout.astro`.

**Tech Stack:** `@playwright/test ^1.60.0` (already in devDependencies), Astro v6 dev server, Chromium browser binary (one-time `npx playwright install chromium`).

---

## File Structure

**Created:**
- `playwright.config.ts` — Test runner config. Single responsibility: tell Playwright where tests live, what browser to use, and what `baseURL` to hit.
- `tests/smoke.spec.ts` — Home page renders + nav links work. One responsibility.
- `tests/theme.spec.ts` — Theme toggle flips `data-theme`, persists across reload. One responsibility.

**Modified:**
- `package.json` — Add `test` and `test:report` scripts.
- `.gitignore` — Ignore Playwright output dirs.
- `CLAUDE.md` — Replace the "no test runner is configured" block with the actual setup. Document the dev-server-must-be-running assumption.

---

## Task 1: Install Chromium browser binary (one-time, not committed)

**Files:** None (caches to `~/.cache/ms-playwright/`).

- [ ] **Step 1: Check if Chromium is already installed**

Run:
```bash
ls ~/.cache/ms-playwright/ 2>/dev/null | grep -i chromium || echo "missing"
```
Expected: lists a `chromium-*` directory, OR prints `missing`.

- [ ] **Step 2: Install if missing**

If the previous step printed `missing`, run:
```bash
npx playwright install chromium
```
Expected: Downloads and extracts a Chromium build. ~150 MB. Takes 30–90 seconds depending on network.

If it was already present, skip this step.

- [ ] **Step 3: No commit**

This is a per-machine cache, not part of the repo. Move on.

---

## Task 2: Add `playwright.config.ts`

**Files:**
- Create: `/Users/vinithsh/workplace/git/pf-website/playwright.config.ts`

- [ ] **Step 1: Write the config file**

Create `playwright.config.ts` at repo root with this exact content:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

- [ ] **Step 2: Verify it parses**

Run:
```bash
npx playwright test --list
```
Expected: Output ends with "Total: 0 tests in 0 files" (no specs yet, but the config loaded without error). If you see a TypeScript or import error, fix the config before continuing.

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts
git commit -m "test: add playwright config"
```

---

## Task 3: Update `.gitignore` for Playwright output

**Files:**
- Modify: `/Users/vinithsh/workplace/git/pf-website/.gitignore`

- [ ] **Step 1: Append Playwright output paths**

Append the following block to the end of `.gitignore`:

```
# playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
```

The leading `/` anchors each pattern to the repo root so they only match top-level directories.

- [ ] **Step 2: Verify the patterns work**

Run:
```bash
git check-ignore -v test-results/foo playwright-report/bar blob-report/baz playwright/.cache/quux
```
Expected: each path prints a line like `.gitignore:NN:/test-results/   test-results/foo`, confirming the rule matches.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "test: ignore playwright output dirs"
```

---

## Task 4: Add `npm test` and `test:report` scripts

**Files:**
- Modify: `/Users/vinithsh/workplace/git/pf-website/package.json`

- [ ] **Step 1: Add the scripts**

In the `"scripts"` block, add `"test"` and `"test:report"` keys. The full block should read:

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "astro": "astro",
  "typecheck": "astro check",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "lint:css": "stylelint \"src/**/*.{css,astro,svelte}\"",
  "lint:staged": "lint-staged",
  "test": "playwright test",
  "test:report": "playwright show-report"
}
```

(Keys may be in any order, but match the existing style — alphabetical-ish, but `test` and `test:report` at the end is fine.)

- [ ] **Step 2: Verify the scripts resolve**

Run:
```bash
npm run test --silent -- --list
```
Expected: same output as Task 2 step 2 — the config loads, lists 0 tests. Confirms `npm run test` is wired to `playwright test`.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "test: add npm test and test:report scripts"
```

---

## Task 5: Write the smoke test

**Files:**
- Create: `/Users/vinithsh/workplace/git/pf-website/tests/smoke.spec.ts`

This test verifies the home page renders, the title is non-empty, the four main nav links exist, and clicking Blog navigates to `/blog`.

The home page lives at `/` (`src/pages/index.astro`). Nav links from `src/layouts/Layout.astro:81-86`: `Blog → /blog`, `Photos → /photos`, `Notes → /tweets` (yes, the label says "Notes" but the route is `/tweets`), `About → /about`. We locate links by accessible role + name, not by class.

- [ ] **Step 1: Write the test file**

Create `tests/smoke.spec.ts` with this exact content:

```ts
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
    await expect(nav.getByRole("link", { name: "Blog" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Photos" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Notes" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "About" })).toBeVisible();
  });

  test("clicking Blog navigates to /blog", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav.nav").getByRole("link", { name: "Blog" }).click();
    await expect(page).toHaveURL(/\/blog\/?$/);
  });
});
```

- [ ] **Step 2: Run the test against the running dev server**

Run:
```bash
npm test -- smoke
```
Expected: All 3 tests pass. If the dev server isn't up, you'll see a connection error — start the dev server and retry. (Per project rules, do not start the dev server yourself; ask the user to confirm it's running.)

- [ ] **Step 3: Commit**

```bash
git add tests/smoke.spec.ts
git commit -m "test: smoke test for home page and nav"
```

---

## Task 6: Write the theme-toggle test

**Files:**
- Create: `/Users/vinithsh/workplace/git/pf-website/tests/theme.spec.ts`

This test verifies the theme system end-to-end: pre-paint script sets `data-theme`, click handler toggles it, change persists in `localStorage`, and survives a reload without a flash.

The relevant pieces in `src/layouts/Layout.astro`:
- Inline pre-paint script (lines 23–38) reads `localStorage["theme"]` and sets `<html data-theme="...">`.
- Toggle button has `id="themeToggle"` (line 88), label has `id="themeLabel"` (line 90).
- Click handler (lines 109–144) flips between `"light"` and `"dark"`, writes `localStorage`, updates the visible label between `"Dawn"` and `"Dusk"`.

Mapping of attribute → label: `data-theme="light"` → `"Dawn"`, `data-theme="dark"` → `"Dusk"`.

- [ ] **Step 1: Write the test file**

Create `tests/theme.spec.ts` with this exact content:

```ts
import { test, expect } from "@playwright/test";

async function getTheme(page: import("@playwright/test").Page): Promise<string> {
  return await page.evaluate(() => document.documentElement.getAttribute("data-theme") ?? "");
}

async function getStoredTheme(
  page: import("@playwright/test").Page,
): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem("theme"));
}

test.describe("theme toggle", () => {
  test.beforeEach(async ({ context }) => {
    // Start each test from a clean localStorage so the pre-paint script
    // falls back to prefers-color-scheme rather than a leftover value.
    await context.clearCookies();
  });

  test("pre-paint script sets data-theme to a valid value", async ({ page }) => {
    await page.goto("/");
    const theme = await getTheme(page);
    expect(["light", "dark"]).toContain(theme);
  });

  test("clicking the toggle flips data-theme and updates the label", async ({
    page,
  }) => {
    await page.goto("/");
    const before = await getTheme(page);
    const expectedAfter = before === "light" ? "dark" : "light";
    const expectedLabelAfter = expectedAfter === "light" ? "Dawn" : "Dusk";

    await page.locator("#themeToggle").click();

    expect(await getTheme(page)).toBe(expectedAfter);
    await expect(page.locator("#themeLabel")).toHaveText(expectedLabelAfter);
  });

  test("the toggled theme persists across reload via localStorage", async ({
    page,
  }) => {
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
```

- [ ] **Step 2: Run the theme test**

Run:
```bash
npm test -- theme
```
Expected: All 3 tests pass.

- [ ] **Step 3: Run the full suite**

Run:
```bash
npm test
```
Expected: 6 tests pass total (3 smoke + 3 theme).

- [ ] **Step 4: Commit**

```bash
git add tests/theme.spec.ts
git commit -m "test: theme toggle flips data-theme and persists"
```

---

## Task 7: Update CLAUDE.md to document the test setup

**Files:**
- Modify: `/Users/vinithsh/workplace/git/pf-website/CLAUDE.md`

The current CLAUDE.md says (roughly):

> No test runner is configured. `@playwright/test` is in `devDependencies` but has no config file or `test` script — treat it as currently unused, not as an active suite to run.

Replace that paragraph with the real story.

- [ ] **Step 1: Add the test commands**

Find the line in the Commands section that reads:
```
- `npm run lint:staged` — Runs Prettier + Stylelint over staged files only (manual invocation; no Husky pre-commit hook is wired up)
```

Insert two lines immediately after it:
```
- `npm test` — Run Playwright tests against the running dev server (Chromium only). Assumes `npm run dev` is up at `localhost:4321`; fails fast if not.
- `npm run test:report` — Open the HTML report from the last `npm test` run.
```

- [ ] **Step 2: Replace the "no test runner" paragraph**

Find and replace this exact block:

```
No test runner is configured. `@playwright/test` is in `devDependencies` but has no config file or `test` script — treat it as currently unused, not as an active suite to run.
```

Replace with:

```
Playwright tests live under `tests/` at the repo root (not `src/`). Two specs: `tests/smoke.spec.ts` (home page + nav) and `tests/theme.spec.ts` (theme toggle round-trip). Single Chromium project, configured in `playwright.config.ts`.

Tests assume `npm run dev` is already running on `localhost:4321` — there is no `webServer` block. If the dev server is down, `npm test` fails with a connection error.

To add a test, drop a `*.spec.ts` file under `tests/`. Use `getByRole`/`getByText` over class selectors so visual refactors don't break tests. Don't test `src/pages/sandbox/*` — that area is allowed to break the design system.
```

- [ ] **Step 3: Verify the doc still reads well**

Read the modified Commands section and Architecture section top to bottom. Make sure the changes flow with the surrounding text.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document playwright test setup in CLAUDE.md"
```

---

## Task 8: Verify everything end-to-end

**Files:** None modified — this is a verification task.

- [ ] **Step 1: Run typecheck**

Run:
```bash
npm run typecheck
```
Expected: 0 errors. The new TS test files import from `@playwright/test` which has its own types; no other type changes.

- [ ] **Step 2: Run formatter check**

Run:
```bash
npm run format:check
```
Expected: passes. If it fails on the new files, run `npm run format` and re-commit.

- [ ] **Step 3: Run the full suite one more time**

Run:
```bash
npm test
```
Expected: `6 passed` in the terminal output.

- [ ] **Step 4: Confirm HTML report works**

Run:
```bash
npm run test:report
```
Expected: opens an HTML report in the browser (or prints a URL). Close it; this is just a sanity check that the reporter is wired.

- [ ] **Step 5: No commit**

Pure verification. Move on.

---

## Self-Review

**Spec coverage:**
- Files added (config, two specs) — Tasks 2, 5, 6.
- Files edited (`package.json`, `.gitignore`, `CLAUDE.md`) — Tasks 4, 3, 7.
- `playwright.config.ts` settings (testDir, fullyParallel, forbidOnly, retries, reporter, baseURL, trace, single chromium project, no webServer) — Task 2.
- Smoke test (goto, title, four nav links by role, click Blog → /blog) — Task 5.
- Theme test (default value valid, toggle flips attribute and label, persistence across reload, localStorage round-trip) — Task 6.
- Browser binary install — Task 1.
- `npm test` + `test:report` — Task 4.
- Verification (`npm test`, typecheck, format) — Task 8. MCP browser verification is not in this plan; it's the parent agent's responsibility after implementation completes.

**Placeholder scan:** No "TBD", "TODO", "implement later" patterns. Every code step contains the actual code. Every command has expected output.

**Type/name consistency:**
- Selectors used in tests: `nav.nav` (matches `<nav class="nav">` in Layout.astro:75), `#themeToggle` (Layout.astro:88), `#themeLabel` (Layout.astro:90) — all verified against source.
- Nav link names: `Blog`, `Photos`, `Notes`, `About` — match Layout.astro:82-85.
- Label values: `Dawn` for light, `Dusk` for dark — match Layout.astro:115-116 (`data-theme === "light" ? "Dawn" : "Dusk"`).
- localStorage key: `theme` — matches Layout.astro:27, 121.
