---
title: Template A/B/C Testing Guide
description: Step-by-step process on how to set up and structure template tests with Intelligems
sidebar_position: 1
---

# Intelligems Template Test

## How It Works

Shopify loads alternate templates when a `?view=<value>` param is in the URL:

- `/products/my-part` → `templates/product.json`
- `/products/my-part?view=b` → `templates/product.b.json`
- `/collections/all?view=b` → `templates/collection.b.json`

This works for any template type: `product`, `collection`, `cart`, `page`, etc.

The toggle widget (`assets/template-variant-toggle.js`) reads from `snippets/template-test-config.liquid` and renders a floating dropdown on every page that lets you switch variants. Your selection persists in `localStorage` so navigating away and back doesn't reset it. The toggle has two safety guards: it only loads when `show_template_test_toggle` is `true` in Theme Settings, and it always suppresses itself on the live published theme via a `Shopify.theme.role` check.

---

## Files

| File                                   | Edit per-test?                               | Purpose                                             |
| -------------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| `snippets/template-test-config.liquid` | **Yes**                                      | Defines the active test name and variants           |
| `templates/<type>.<value>.json`        | **Yes** — create one per non-control variant | The alternate template for each variant             |
| `snippets/<variant-snippet>.liquid`    | **Yes** — if UI differs                      | The UI snippet your variant template points to      |
| `assets/template-variant-toggle.js`    | No                                           | Floating toggle widget                              |
| `layout/theme.liquid`                  | No                                           | Loads the toggle when the setting is on             |
| `config/settings_schema.json`          | No                                           | Exposes the "Show template variant toggle" checkbox |

---

## Setting Up a New Test

### 1. Create a branch

```bash
git checkout main && git pull
git checkout -b feat/your-test-name-abc
```

### 2. Create variant template files

Duplicate the base template for the page type you're testing and name the copy after the variant value. The control always uses the existing base template — no new file needed for it.

```
templates/collection.b.json   ← for ?view=b
templates/collection.c.json   ← for ?view=c
```

Inside each duplicate, find the section or `custom-liquid` block that renders the UI you're changing and update it to point to your variant snippet. Everything else in the file stays identical to the control.

```json
"custom_liquid_EKKgEh": {
  "type": "custom-liquid",
  "settings": {
    "custom_liquid": "{% render 'my-variant-b-snippet' %}"
  }
}
```

### 3. Create variant snippets

Create a snippet in `snippets/` for each variant that needs different UI. Start from a copy of the control's snippet and make your changes.

### 4. Update the test config

Edit `snippets/template-test-config.liquid`:

```javascript
window.__templateTestConfig = {
	testName: "your-test-slug",
	variants: [
		{ value: "a", label: "A: Control" }, // FIRST entry = control (no ?view= param)
		{ value: "b", label: "B: Variant" }, // loads templates/<type>.b.json
		{ value: "c", label: "C: Variant" }, // loads templates/<type>.c.json
	],
};
```

The first entry is always the control regardless of its `value`. Every non-control entry needs a matching `templates/<type>.<value>.json` file.

### 5. Verify locally

```bash
shopify theme dev
```

Navigate to the relevant page type. The blue toggle should appear in the top-left. Switching variants should reload the page with the correct `?view=` param.

If the toggle doesn't appear, enable it: **Theme Settings → Developer Tools → Show template variant toggle**.

---

## Deploying

1. Push your branch and open a PR to `main`. GitHub Actions syncs to `main-usa` and `main-ca` on merge.
2. Enable the toggle on the QA/preview theme only: **Theme Settings → Developer Tools → Show template variant toggle → on**.
3. Confirm the toggle is **off** on the published live theme. The `Shopify.theme.role` safety check will also suppress it automatically if it's ever accidentally left on.
4. For real traffic splitting, use Intelligems to route users to the `?view=` URL — the toggle is for QA only and doesn't need to be on for Intelligems to work.

---

## Using the Toggle

The toggle saves your selection to `localStorage` scoped to the test name. When you land on a page without a `?view=` param, it auto-redirects to restore your last selection. To reset, select the control in the dropdown. To clear localStorage entirely: DevTools → Application → Local Storage → delete the `__tmpl_test_variant__<test-name>` key.

---

## Cleaning Up

1. **Promote the winner** — copy `templates/<type>.<winning-value>.json` over `templates/<type>.json`. If the control wins, skip this step.
2. **Delete variant templates** — `rm templates/<type>.b.json templates/<type>.c.json`
3. **Delete variant snippets** — remove any snippets that are no longer needed
4. **Reset the config** — clear the `variants` array in `snippets/template-test-config.liquid`
5. **Disable the toggle** — confirm `show_template_test_toggle` is off on all themes
6. **Commit and merge** — open a PR to `main`

---

## Checklist

**Setup**

- [ ] Feature branch created
- [ ] `templates/<type>.<value>.json` created for each non-control variant
- [ ] Variant snippets created in `snippets/`
- [ ] `snippets/template-test-config.liquid` updated with new `testName` and `variants`
- [ ] Toggle verified locally on the correct page type

**Deploy**

- [ ] PR merged to `main`
- [ ] Toggle enabled on QA/preview theme only
- [ ] Toggle confirmed off on the published live theme

**Cleanup**

- [ ] Winning variant promoted to `templates/<type>.json`
- [ ] Losing variant template files deleted
- [ ] Losing variant snippets deleted
- [ ] `snippets/template-test-config.liquid` cleared
- [ ] Toggle disabled on all themes
- [ ] Cleanup commit merged to `main`
