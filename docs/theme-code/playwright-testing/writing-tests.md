---
title: Writing a New Playwright Test
description: How to add Playwright tests to the main theme — add a scenario to an existing suite by editing a JSON data file, or create a new spec from the data-driven template. Includes the data-entry shape and the storefront selectors the tests rely on.
sidebar_position: 2
---

# Writing a New Playwright Test

There are two ways to add coverage. Most of the time you want the first one.

- **[Add a scenario](#path-a--add-a-scenario-to-an-existing-suite)** — cover one
  more SKU/vehicle in a flow that already has a spec. Edit a JSON file only.
- **[Add a new spec](#path-b--add-a-new-spec)** — test a flow none of the current
  specs cover. Write a new `*.spec.js`.

> Read the [Overview](overview.md) first if you haven't — it explains the
> data-driven pattern these instructions build on.

## Path A — Add a scenario to an existing suite

Pick the suite that matches what you want to test:

| You want to test… | Add an entry to |
| --- | --- |
| A painted variant adds to cart with the right paint code | `tests/paint-code-data.json` |
| An unpainted / quality / assembly combo adds the right variant | `tests/unpainted-sku-data.json` |
| A vehicle missing a required submodel is **blocked** from add-to-cart | `tests/submodel-required-data.json` |

Add one keyed object to the file. The spec automatically generates a test from it
on the next run — no code changes.

```jsonc
// in tests/paint-code-data.json
"NI1240224": {
  "url": "/products/nissan-maxima-driver-side-fender-ni1240224",
  "vehicle": {
    "year": "2016",
    "make": "Nissan",
    "model": "Maxima",
    "ymm": "2016 Nissan Maxima",
    "submodel": "",
    "engine": "",
    "vin": "",
    "paintCode": "GAB"
  },
  "expected": {
    "sku": "NI1240224.GAB",
    "variant_title": "Aftermarket / GAB",
    "paintCode": "GAB"
  }
}
```

Then run just your new case by matching its title (the key):

```bash
npm run test:sku -- "NI1240224"
```

### The data-entry shape

| Field | Used by | Meaning |
| --- | --- | --- |
| **key** (e.g. `"NI1240224"`) | all | Becomes the test title. Use the SKU, or a descriptive label for negative cases (e.g. `FO1100636_NO_SUBMODEL`). |
| `url` | all | Relative product-page path, resolved against `baseURL`. |
| `vehicle` | all | The object injected into `localStorage.searchTerms` — the active garage vehicle. Fields: `year`, `make`, `model`, `ymm`, `submodel`, `engine`, `vin`, `paintCode` (and `decodedByBumper` where relevant). |
| `vehicle.paintCode` | paint-code suite | Must match a real variant's paint code on the product — the test selects `#variant-selector option[data-variant-title="<paintCode>"]`. |
| `quality` | unpainted suite | Preferred quality to select: `aftermarket`, `capa`, or `oem`. Falls back to the first enabled option if that one isn't available. |
| `paint` | unpainted suite | `"unpainted"`, `"paint-code"`, or `""` (no paint step). |
| `expected` | paint-code + unpainted | The cart line to assert: `{ sku, variant_title, paintCode }`. Omit it (unpainted suite) to assert only that exactly one item with quantity 1 was added. `variant_title` may be `null` to assert the line has no variant title. |

> **`_comment` keys are ignored.** The paint-code spec skips any entry whose value
> isn't an object, so a top-level `"_comment": "..."` string is a safe place to
> leave notes in the data file.

## Path B — Add a new spec

Create `tests/<name>-test.spec.js` and a sibling `tests/<name>-data.json`. Use the
shared pattern so the new suite behaves like the others:

```js
// @ts-check
const { test, expect } = require("@playwright/test");
const testData = require("./your-flow-data.json");

const FITMENT_TIMEOUT = 10_000;

for (const [sku, data] of Object.entries(testData)) {
	test(`${sku} — your flow description`, async ({ page }) => {
		// 1. Seed the active vehicle BEFORE any page script runs.
		await page.addInitScript((vehicle) => {
			localStorage.setItem("searchTerms", JSON.stringify([vehicle]));
		}, data.vehicle);

		// 2. Go to the product page.
		await page.goto(data.url);

		// 3. Drive the flow with the selectors below, then assert.
		//    For cart assertions, read /cart.js:
		const cart = await (await page.request.get("/cart.js")).json();
		expect(cart.items).toHaveLength(1);
	});
}
```

Two things make this pattern work and are easy to get wrong:

- **`addInitScript` must run before `goto`.** It registers a script that runs on
  every new document *before* page scripts, so `getSearchTerms()` sees the vehicle
  on its first call. Setting `localStorage` after `goto` is too late.
- **Generate tests in a loop.** Iterating `Object.entries(data)` keeps one test per
  data row, so the suite scales by editing JSON.

### Storefront selectors the tests rely on

These are the hooks the current specs use to walk the product page. Reuse them so
new specs stay consistent (and so you know what to keep stable in theme code):

| Step | Selector(s) |
| --- | --- |
| Active vehicle | `localStorage` key `searchTerms` (array of vehicle objects) |
| Fitment questions | `#fitment-questions-root` → `.fitment-type-select[data-group-index="N"]`; enabled when **not** `.fitment-disabled`; choose `input.fitment-radio` |
| Quality | `#quality-type-select` (enabled when not `.disabled`) → `input[name="quality_type"][value="aftermarket\|capa\|oem"]` |
| Paint — coded | `#checkbox-select-paint-option`, then `#variant-selector option[data-variant-title="<paintCode>"]` |
| Paint — unpainted | `#checkbox-select-unpainted` |
| Assembly | `input[name="bundle_mode"]` |
| Add to Cart | `button.add-to-cart`, or `button.add-to-cart-for-unpainted` |
| Cart verification | `GET /cart.js` → `items[]` (`sku`, `variant_title`, `quantity`, `properties["Paint Code"]`) |

> The paint-code option is hidden in the DOM until quality resolves, so the
> paint-code spec checks `#checkbox-select-paint-option` via `page.evaluate(...)`
> and fires a `change` event manually rather than clicking it. Keep that in mind if
> a click on a paint control seems to "do nothing."

## Running and debugging

```bash
shopify theme dev          # storefront must be running first (see Overview)

npm test                   # whole suite
npm run test:sku -- "TO1290105"   # just the matching test(s)
npm run test:headed        # watch the browser
npm run test:debug         # step through with the Inspector
```

On failure, check the HTML report (`npx playwright show-report`) and the
screenshot/video in `test-results/`.

## Checklist

- [ ] Chose the right path — JSON entry (Path A) vs new spec (Path B)
- [ ] `vehicle` reflects a real, in-stock product/variant; `url` is correct
- [ ] For paint tests, `paintCode` matches an actual variant on the product
- [ ] `expected` matches the real cart line (SKU, variant title, paint code)
- [ ] New spec seeds `searchTerms` via `addInitScript` **before** `goto`
- [ ] New spec generates one `test()` per data row
- [ ] Ran the new test locally against `shopify theme dev` and it passes

## Related Pages

- [Playwright Testing Overview](overview.md)
- [Auto-Select Quality](../pages/product-page/auto-select-quality.md)
- [VIN Decoder](../pages/product-page/vin-decoder.md)

## Owner & Maintenance

- **Owner:** Theme / Frontend
- **Last Updated:** 2026-06-19
