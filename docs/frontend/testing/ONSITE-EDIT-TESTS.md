---
title: On-Site Edit A/B Testing Guide
description: Step-by-step process for setting up on-site edit tests with Intelligems
sidebar_position: 2
---

# Intelligems On-Site Edit Test

## How It Works

On-site edit tests modify the live page via JavaScript — injecting elements, changing behavior, toggling visibility — gated behind an Intelligems feature flag. Unlike template tests (which swap entire templates via `?view=`), on-site edit tests change what's on the page without changing which template is rendered.

The framework has three parts:

1. **Config snippet** (`snippets/onsite-test-config.liquid`) — lists every active test, its Intelligems flag name, and the URL of its JS module.
2. **Dispatcher** (`assets/onsite-test-dispatcher.js`) — hooks into Intelligems' `window.onIgReady` callback, checks which flags are set (or overridden via QA toggle), adds a `test--{slug}` class to `<body>`, and dynamically loads the test's JS module.
3. **Test module** (`assets/onsite-test-{slug}.js`) — a single JS file containing all DOM changes for that test. The dispatcher calls its `init()` function when the test is active.

The QA toggle (`assets/onsite-test-toggle.js`) renders a floating widget that lets you force any test to Control or Variant without needing Intelligems to assign you. Your selection persists in `localStorage`. The toggle has two safety guards: it only loads when `show_onsite_test_toggle` is `true` in Theme Settings, and it always suppresses itself on the live published theme via a `Shopify.theme.role` check.

---

## Files

| File                                  | Edit per-test?                              | Purpose                                              |
| ------------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| `snippets/onsite-test-config.liquid`  | **Yes** — add an entry per test             | Lists active tests, their IG flag, and module URL    |
| `assets/onsite-test-{slug}.js`        | **Yes** — create one per test               | All DOM changes for that test                        |
| `snippets/` or `sections/` (optional) | **Yes** — if baked-in hidden HTML is needed | Hidden Liquid elements the JS module shows/hides     |
| `assets/onsite-test-dispatcher.js`    | No                                          | Central dispatcher using `onIgReady`                 |
| `assets/onsite-test-toggle.js`        | No                                          | QA toggle widget                                     |
| `layout/theme.liquid`                 | No                                          | Loads config, dispatcher, and toggle                 |
| `config/settings_schema.json`         | No                                          | Exposes the "Show on-site edit test toggle" checkbox |

---

## Setting Up a New Test

### 1. Create a branch

```bash
git checkout main && git pull
git checkout -b feat/your-test-name-onsite
```

### 2. Create the test module

Create `assets/onsite-test-{slug}.js` using this template:

```js
window.__onsiteTestModules = window.__onsiteTestModules || {};
window.__onsiteTestModules["your-test-slug"] = {
	init: function () {
		// Your test code goes here.
		// At this point:
		//   - document.body has the class "test--your-test-slug"
		//   - The Intelligems flag is confirmed set (or QA override is "Variant")
		//   - DOM is ready (body exists)
		//
		// For visual-only changes, inject a <style> tag targeting the body class:
		//   var style = document.createElement("style");
		//   style.textContent = ".test--your-test-slug .my-element { display: block; }";
		//   document.head.appendChild(style);
		//
		// For behavioral changes (intercepting clicks, fetching data, etc.),
		//   write your logic directly here.
	},
};
```

If the test has multiple features, organize them as methods:

```js
window.__onsiteTestModules = window.__onsiteTestModules || {};
window.__onsiteTestModules["your-test-slug"] = {
	init: function () {
		this.featureA();
		this.featureB();
	},

	featureA: function () {
		// ...
	},

	featureB: function () {
		// ...
	},
};
```

### 3. Add hidden Liquid HTML (if needed)

If your test needs to show/hide HTML that is rendered server-side in Liquid, bake it into the relevant snippet or section with `display: none` by default. Your JS module toggles it visible.

Example — add a hidden badge to a snippet:

```liquid
<span class="my-test-badge" style="display: none;">New!</span>
```

Then in your module, either inject CSS targeting the body class (no JS needed for pure visual changes):

```js
init: function () {
  var style = document.createElement("style");
  style.textContent = ".test--your-test-slug .my-test-badge { display: inline-block !important; }";
  document.head.appendChild(style);
}
```

Or manipulate the DOM directly for behavioral changes.

### 4. Update the test config

Edit `snippets/onsite-test-config.liquid` — add your test to the array:

```liquid
<script>
  window.__onsiteTestConfig = [
    {
      slug: "your-test-slug",
      igFlag: "__YOUR_INTELLIGEMS_FLAG",
      moduleSrc: "{{ 'onsite-test-your-test-slug.js' | asset_url }}"
    }
  ];
</script>
```

**Fields:**

- `slug` — unique kebab-case identifier. Used for the body class (`test--your-test-slug`), localStorage key, and toggle label.
- `igFlag` — the exact `window` property name that Intelligems sets for the Variant group. Configured in the Intelligems dashboard.
- `moduleSrc` — the Shopify asset URL for your test module JS file.

### 5. Verify locally

```bash
shopify theme dev
```

1. Enable the toggle: **Theme Settings → On-Site Edit Tests → Show on-site edit test toggle → on**
2. Navigate to the page your test affects
3. The dark toggle widget should appear in the top-left
4. Set your test to "Variant" — page reloads and your changes should be visible
5. Set to "Control" — page reloads and changes should disappear

---

## Deploying

1. Push your branch and open a PR to `main`. GitHub Actions syncs to `main-usa` and `main-ca` on merge.
2. Enable the toggle on the QA/preview theme only: **Theme Settings → On-Site Edit Tests → Show on-site edit test toggle → on**.
3. Confirm the toggle is **off** on the published live theme. The `Shopify.theme.role` safety check will also suppress it automatically.
4. For real traffic splitting, configure the Intelligems experiment to set your `window` flag for the Variant group. The dispatcher picks it up via `onIgReady` — no polling, no race conditions.

---

## Using the Toggle

The toggle saves your selection to `localStorage` scoped to the test slug. Two states:

- **Control** — forces the test inactive, even if Intelligems would assign it
- **Variant** — forces the test active, bypasses Intelligems entirely

The default state (no localStorage key set) defers to whatever Intelligems assigns.

To clear all overrides: DevTools → Application → Local Storage → delete keys starting with `__onsite_test__`.

---

## Cleaning Up

1. **Stop the Intelligems experiment** — end the test in the IG dashboard
2. **Promote the winner:**
   - If Variant won: move the test module's logic into the main codebase (the relevant section/snippet/JS file) and remove the flag gate
   - If Control won: skip this step
3. **Delete the test module** — `rm assets/onsite-test-{slug}.js`
4. **Remove hidden HTML** — if you baked in hidden Liquid elements, either delete them (Control won) or remove the `display: none` (Variant won and logic is now permanent)
5. **Remove the config entry** — edit `snippets/onsite-test-config.liquid` and remove the test from the array
6. **Disable the toggle** — confirm `show_onsite_test_toggle` is off on all themes (can stay on if other tests are still active)
7. **Commit and merge** — open a PR to `main`

---

## Checklist

**Setup**

- [ ] Feature branch created
- [ ] `assets/onsite-test-{slug}.js` created following the module template
- [ ] Hidden Liquid HTML added (if needed) with `display: none` default
- [ ] `snippets/onsite-test-config.liquid` updated with new test entry
- [ ] Intelligems experiment configured to set the `window` flag for Variant group
- [ ] Test verified locally using the QA toggle (Control/Variant both behave correctly)

**Deploy**

- [ ] PR merged to `main`
- [ ] Toggle enabled on QA/preview theme only
- [ ] Toggle confirmed off on the published live theme
- [ ] Intelligems experiment started for live traffic

**Cleanup**

- [ ] Intelligems experiment stopped
- [ ] Winning variant promoted (or control kept)
- [ ] Test module JS file deleted
- [ ] Hidden Liquid HTML removed or made permanent
- [ ] Config entry removed from `snippets/onsite-test-config.liquid`
- [ ] Toggle disabled on all themes (if no other active tests)
- [ ] Cleanup commit merged to `main`
