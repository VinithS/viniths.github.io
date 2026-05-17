# Playwright setup — design

**Date:** 2026-05-17
**Status:** Approved

## Goal

Add Playwright as a real test foundation for the site. Two committed specs: a smoke test (page loads, nav works) and a theme-toggle test (toggle flips `data-theme` and persists across reload). After scaffolding, demonstrate end-to-end correctness by running `npm test` and by driving the live site via the Playwright MCP browser tools.

## Why

`@playwright/test` is already a dev dependency but unused — no config, no scripts, no specs. The only behavior on the site that's both interactive and easy to break silently is the theme system (pre-paint inline script + localStorage round-trip). A small suite that exercises the home page and theme toggle is a useful safety net for that, and a foundation to grow.

## Out of scope

- CI workflow integration. The deploy workflow stays as-is.
- Visual regression / screenshot diffing.
- Tests for sandbox pages — `src/pages/sandbox/` is explicitly allowed to break the design system.
- Cross-browser coverage (Firefox, WebKit). Chromium only for now; trivially extensible later.
- Tests for blog post rendering, photos viewer, tweets — defer until there's a reason.

## Architecture

### Files added

```
playwright.config.ts                 # Playwright config (chromium-only, no webServer)
tests/
  smoke.spec.ts                      # / loads, nav links present
  theme.spec.ts                      # toggle flips data-theme, persists across reload
docs/superpowers/specs/2026-05-17-playwright-setup-design.md   # this file
docs/superpowers/plans/2026-05-17-playwright-setup-plan.md     # implementation plan
```

### Files edited

- `package.json` — add `"test": "playwright test"` and `"test:report": "playwright show-report"`.
- `.gitignore` — ignore `test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/`.
- `CLAUDE.md` — replace the "no test runner is configured" paragraph with the actual setup. Document the dev-server-must-be-running assumption.

### Configuration

`playwright.config.ts`:

- `testDir: "tests"`
- `fullyParallel: true` — these tests don't share state.
- `forbidOnly: !!process.env.CI` — keep the option even though there's no CI yet, in case the user wires one later.
- `retries: 0` — local-only suite; flake should be debugged, not papered over.
- `reporter: [["list"], ["html", { open: "never" }]]` — terminal output for the run, HTML report kept on disk for `npm run test:report`.
- `use.baseURL: "http://localhost:4321"`
- `use.trace: "on-first-retry"` — defaults are fine.
- `projects: [{ name: "chromium", use: devices["Desktop Chrome"] }]`
- **No `webServer` block.** Tests rely on the dev server already being up (matches the user's workflow rule).

### Test design

**`tests/smoke.spec.ts`**

1. `goto("/")` — succeeds (no exceptions, no 404).
2. `<title>` is non-empty.
3. The four main nav links are visible: `Blog`, `Photos`, `Notes`, `About`. Located by role `link` + accessible name; not by raw selector strings, so a class rename doesn't break the test.
4. Clicking `Blog` navigates to `/blog`.

This exists to catch the "I broke the build / layout" class of regressions cheaply.

**`tests/theme.spec.ts`**

The theme system has three pieces working together: a pre-paint inline script that reads `localStorage["theme"]`, a runtime click handler on `#themeToggle` that writes it, and the `[data-theme="..."]` attribute on `<html>` that drives all CSS tokens. The test exercises all three:

1. **Default state.** With localStorage cleared, navigate to `/`. Read `data-theme` from `<html>`. Assert it's either `"light"` or `"dark"` (depends on the OS / browser default — both are valid; we only care that the pre-paint script ran and set *something*).
2. **Toggle flips the attribute.** Click `#themeToggle`. Assert `data-theme` is now the opposite value. Assert the visible label inside the toggle changed (`"Dawn"` ↔ `"Dusk"`).
3. **Persistence across reload.** Reload the page. Assert `data-theme` matches the value from step 2. Assert there is no flash to the other theme — verified by reading `data-theme` in a `<head>`-time evaluation, since the inline pre-paint script runs before first paint. (We test this by checking the attribute is set immediately, not by visual diff.)
4. **localStorage round-trip.** Assert `localStorage.getItem("theme")` matches the active theme.

Each assertion is a separate `expect` so failure messages identify which piece broke.

### Test runner ergonomics

- `npm test` runs the suite. Fails fast with a connection error if the dev server isn't running — message will be obvious enough.
- `npm run test:report` opens the HTML report from the last run.
- Ad-hoc: `npx playwright test --ui` for interactive debugging; `npx playwright test theme` to filter; `--headed` to watch.

### Browser binary

Playwright requires a browser binary at `~/.cache/ms-playwright/`. The implementation will run `npx playwright install chromium` once if missing. This is a one-time, per-machine action — not committed.

## Trade-offs

- **No `webServer` block.** Pro: tests are fast (no build step) and match the user's "dev server is always running" workflow. Con: confusing failure if dev server is down. Mitigation: a one-line note in CLAUDE.md.
- **Chromium only.** Pro: smaller install, faster runs, simpler config. Con: misses iOS Safari quirks. Acceptable for a personal site; trivially extensible later.
- **No `webServer` for production parity.** A `npm run preview` server would catch production-only bugs (e.g. dead-code-stripped sandbox link). The smoke test is generic enough that this rarely matters; if it does, add a second project later.
- **Theme test depends on hardcoded `#themeToggle` and `localStorage["theme"]`.** These are stable contracts (the inline script in `Layout.astro` references them by exactly these names). If they change, the test will break loudly, which is the right behavior — they're a contract.

## Success criteria

1. `npm test` passes against the running dev server, both specs green.
2. `npm run test:report` opens an HTML report.
3. The MCP browser tools (`mcp__playwright__browser_*`) successfully navigate to the running site, take a snapshot, click the theme toggle, and re-snapshot — confirming visual change between themes.
4. CLAUDE.md no longer says "no test runner is configured."

## Verification plan

- After implementation, run `npm test` from the repo root. Both specs pass.
- Drive the browser via MCP: navigate to `http://localhost:4321/`, snapshot, click `#themeToggle`, snapshot, observe `data-theme` change.
- Run `npm run typecheck` to confirm the new TS files don't break the build.
- Run `npm run format:check` to confirm formatting is clean.
