---
title: Playwright Testing Overview
description: How the main theme's Playwright end-to-end tests are set up — the data-driven spec pattern, the current suites, configuration, and how to run them against a local Shopify dev server.
sidebar_position: 1
---

# Playwright Testing Overview

## Purpose

The main theme repo (`themes/main-theme`) uses **Playwright** for end-to-end
browser tests. They drive a real Chromium browser through the **product-page
fitment → quality → paint → add-to-cart** pipeline and assert that the correct
variant lands in the cart. This is the part of the storefront most likely to
break silently when fitment, paint, or variant logic changes, so the tests act as
a regression guard for it.

The tests live in `themes/main-theme/tests/`. This page explains how the suite is
set up today; [Writing a New Playwright Test](writing-tests.md) covers adding to
it.

## How It Works

Every spec follows the same **data-driven** pattern — the test logic is written
once, and each scenario is just a row of data:

1. A spec `require`s a JSON data file (a map of `SKU → test case`).
2. It loops over the entries and generates **one `test()` per entry**, titled with
   the SKU (e.g. `NI1240224 — paint code add-to-cart flow`).
3. Before navigating, it injects a vehicle into `localStorage` under the
   `searchTerms` key using `page.addInitScript(...)`. This runs **before any page
   script**, so the storefront's `getSearchTerms()` sees an active garage vehicle
   on first call — simulating a customer who already selected their vehicle.
4. It navigates to the product `url`, walks the on-page flow (fitment questions,
   quality, paint, assembly), clicks **Add to Cart**, and waits for `/cart`.
5. It reads `/cart.js` and asserts the resulting line item — SKU, variant title,
   quantity, and (for paint tests) the `Paint Code` line-item property.

Because tests are generated from data, **adding a scenario usually means adding a
JSON entry, not writing new test code.**

## The Test Suites

| Spec | Data file | What it verifies |
| --- | --- | --- |
| `paint-code-test.spec.js` | `paint-code-data.json` | Full **paint-code** add-to-cart flow: answer fitment questions, pick quality, choose the paint-code option, select the variant matching the vehicle's `paintCode`, add to cart, and confirm the cart line has the right SKU, variant title, and `Paint Code` property. |
| `unpainted-sku-test.spec.js` | `unpainted-sku-data.json` | Broader add-to-cart flow across **unpainted / painted / quality / assembly** combinations. Each case can specify a preferred `quality`, a `paint` choice (`unpainted` / `paint-code` / none), and asserts the cart line (SKU + variant title) when an `expected` block is present. |
| `submodel-required-test.spec.js` | `submodel-required-data.json` | **Negative test**: a vehicle that's missing its required submodel must leave the add-to-cart button **disabled** — fitment can't resolve, so nothing can be added. |

Each data file is a map keyed by SKU (or a label like
`FO1100636_NO_SUBMODEL`), where each entry carries the product `url`, the
`vehicle` to inject, optional flow choices, and an optional `expected` cart
result. The field-by-field shape is documented in
[Writing a New Playwright Test](writing-tests.md#the-data-entry-shape).

## Configuration

All configuration lives in `playwright.config.js`:

| Setting | Value | Notes |
| --- | --- | --- |
| `testDir` | `./tests` | Where specs and data files live. |
| `timeout` | `30000` (30 s) | Per-test timeout. |
| `retries` | `0` | A failing test fails immediately — no automatic re-runs. |
| `use.baseURL` | `process.env.BASE_URL ?? "http://127.0.0.1:9292"` | Defaults to the local `shopify theme dev` server; override with `BASE_URL`. |
| `use.headless` | `true` | Runs without a visible browser by default. |
| `use.screenshot` | `only-on-failure` | Screenshot captured when a test fails. |
| `use.video` | `retain-on-failure` | Video kept only for failing tests. |
| `projects` | `chromium` (Desktop Chrome) | Only Chromium is configured. |
| `reporter` | `list` + `html` (`open: never`) | Console list output plus an HTML report. |

## Prerequisites & Running

The config does **not** start a server — it points at one. The product URLs in the
data files are relative (e.g. `/products/...`), resolved against `baseURL`. So you
need a storefront running at that address first.

**First-time setup** (once per machine):

```bash
cd themes/main-theme
npm install
npx playwright install chromium   # download the browser Playwright drives
```

**Run the tests** — start the storefront, then run the suite in a second terminal:

```bash
# Terminal 1 — local storefront on http://127.0.0.1:9292
shopify theme dev

# Terminal 2 — run all tests against it
npm test
```

To run against a deployed preview or live theme instead of the local dev server,
set `BASE_URL`:

```bash
BASE_URL=https://your-preview-url npm test
```

### npm scripts

| Script | Command | Use |
| --- | --- | --- |
| `npm test` | `playwright test` | Run the whole suite (headless). |
| `npm run test:sku -- "<text>"` | `playwright test --grep` | Run only tests whose title matches — e.g. a single SKU. |
| `npm run test:headed` | `playwright test --headed` | Watch the browser as it runs. |
| `npm run test:debug` | `playwright test --debug` | Step through with the Playwright Inspector. |

## Reports & Artifacts

- **Console** — the `list` reporter prints pass/fail per test as it runs.
- **HTML report** — written to `playwright-report/`. View it with
  `npx playwright show-report`.
- **Failure artifacts** — screenshots and videos for failing tests land in
  `test-results/` (screenshot on failure, video retained on failure).

`playwright-report/`, `test-results/`, and `node_modules/` are build/output
folders — they are not source and should not be committed.

## Known Constraints & Gotchas

- **You must start the storefront yourself.** There is no `webServer` block in the
  config, so `npm test` will fail fast if nothing is serving at `baseURL`. Run
  `shopify theme dev` (or set `BASE_URL`) first.
- **Tests are data-coupled to live products.** Each case references a real product
  `url`, SKU, variant title, and (for paint) paint code. If a product is renamed,
  unpublished, or its variants change, the matching test will fail until the data
  file is updated — the failure is data drift, not necessarily a code bug.
- **Chromium only.** No Firefox/WebKit projects are configured.
- **No retries.** A flaky timing failure is reported as a hard failure; the
  per-step `FITMENT_TIMEOUT` (10 s) and the 30 s test timeout are the only slack.
- **Vehicle is injected, not selected through the UI.** Tests seed `searchTerms`
  in `localStorage` directly rather than going through the Garage/VIN flow, so they
  test the product-page pipeline, not vehicle selection itself.

## Related Pages

- [Writing a New Playwright Test](writing-tests.md)
- [Auto-Select Quality](../pages/product-page/auto-select-quality.md) — the quality
  step the paint/unpainted tests exercise
- [VIN Decoder](../pages/product-page/vin-decoder.md) — how a real vehicle gets
  into `searchTerms` in production
- [Intelligems Testing](../testing/TEMPLATE-TESTS.md) — the separate A/B-testing setup (not E2E)

## Owner & Maintenance

- **Owner:** Theme / Frontend
- **Last Updated:** 2026-06-19
