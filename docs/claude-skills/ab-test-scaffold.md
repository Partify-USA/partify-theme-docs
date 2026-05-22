---
title: ab-test-scaffold
description: >
  Scaffolds new A/B tests for the Partify Shopify theme. Handles both on-site edit tests
  (Intelligems flag-gated JS that modifies the live DOM) and template tests (?view= URL param
  variants that swap entire Liquid templates). Use this skill whenever a developer says they
  want to start, set up, build, scaffold, or create a new A/B test, split test, or Intelligems
  experiment on the storefront. Triggers on phrases like "new test for X", "scaffold a test",
  "set up a template test", "create an onsite test", "I want to test X vs Y on the product page",
  or any request to begin a new storefront experiment. Always invoke this skill BEFORE touching
  any test-related files.
position: 1
---

# A/B Test Scaffold

Two test types are supported. Both follow the same structure: interview first, scaffold second.

**Do NOT create any files until the interview in Phase 2 is complete.**

---

## Phase 1: Determine Test Type

The very first thing to do is confirm which type of test this is. Do not skip this even if it seems implied.

- **On-site edit test** — JS changes the live page without swapping templates. Gated behind an Intelligems feature flag (`window.__PARTIFY_XYZ`). The dispatcher loads a per-test JS module when the flag is set.
- **Template test** — Alternate Shopify templates served via `?view=` URL param. Intelligems routes traffic to different URLs.

**When to ask vs. when to infer:**

- Mentions "on-site test", "onsite edit", "JS test", or an Intelligems flag name → on-site edit, confirm and continue
- Mentions "template test", "A/B/C test", "?view=", or template files → template test, confirm and continue
- Ambiguous message (e.g., "new test for the collection page", "I want to test X") → **ask explicitly before proceeding to Phase 2**

---

## Phase 2: Scoping Interview

Ask all relevant questions in one message before writing any files. Push for real specifics — a vague description produces a useless scaffold.

### On-site edit test questions

1. **Slug** — kebab-case identifier (e.g., `hero-cta-v2`). Becomes the body class `test--{slug}`, localStorage key, and module filename.
2. **Intelligems flag** — exact `window` property Intelligems sets for Variant group (e.g., `__PARTIFY_HERO_TEST`). TBD is OK.
3. **Page / entry point** — which page(s)?
4. **Control vs. Variant** — specific: what elements exist on the page, what changes? (e.g., "Control: no badge. Variant: '$5 OFF' badge appears below the VIN input.")
5. **DOM targets** — CSS selectors, element IDs, or class names? Even rough ones help.
6. **Hidden Liquid HTML** — does the variant need server-side rendered HTML that JS shows/hides, or is everything injected purely via JS?
7. **Sub-features** — one change or multiple? If multiple, list them — each becomes its own method.

### Template test questions

1. **Test name** — kebab-case slug
2. **Template type** — `product`, `collection`, `cart`, `page`, or `index`
3. **Variant values** — `?view=` param values for each non-control variant (e.g., `b`, `c`)
4. **What changes** — which section key or block is being replaced, and what snippet does the variant render?
5. **Base snippet** — the control snippet name, so the variant starts as a copy

### When to push back

If the description is vague, ask: what element specifically? what does the variant show that the control doesn't? what's the hypothesis? You need enough detail to write a skeleton with real placeholder selectors and meaningful method names.

---

## Phase 3: Scaffold the Files

---

### On-site edit test

#### File: `assets/onsite-test-{slug}.js`

Use this exact module pattern. Populate selectors and method names from the interview. One method per sub-feature.

```js
window.__onsiteTestModules = window.__onsiteTestModules || {};
window.__onsiteTestModules["{slug}"] = {
	init: function () {
		console.log("[wool] [{slug}] Initializing");
		this.featureA();
	},

	featureA: function () {
		// {describe what this does, based on interview}
		const el = document.querySelector("{selector}");
		if (!el) return;
		// TODO: implement the variant change
	},
};
```

Rules: `[wool]` prefix on all console.logs. Use `const`/`let` — never `var`. If hidden Liquid HTML is needed, add a CSS injection method:

```js
  injectStyles: function () {
    const style = document.createElement('style');
    style.textContent = '.test--{slug} .{class} { display: block !important; }';
    document.head.appendChild(style);
  }
```

#### Manual step: config entry

Tell the developer to add to `snippets/onsite-test-config.liquid` (inside the `window.__onsiteTestConfig` array):

```js
{
  slug: "{slug}",
  igFlag: "{igFlag}",
  moduleSrc: "{{ 'onsite-test-{slug}.js' | asset_url }}"
}
```

#### Checklist

- [ ] Feature branch created (`git checkout -b feat/{slug}-onsite`)
- [x] `assets/onsite-test-{slug}.js` created
- [ ] Hidden Liquid HTML added with `display: none` (if needed)
- [ ] `snippets/onsite-test-config.liquid` updated with new entry
- [ ] Intelligems experiment configured to set `window.{igFlag}` for Variant group
- [ ] Test verified locally: QA toggle → Variant shows changes, Control hides them

---

### Template test

#### File: `templates/{type}.{value}.json` (one per non-control variant)

Read `templates/{type}.json` first, then create the variant copy. Find the section key that needs to change and update it to render the variant snippet. Everything else stays identical to the control.

```json
"{section-key}": {
  "type": "custom-liquid",
  "settings": {
    "custom_liquid": "{% render '{slug}-{value}-snippet' %}"
  }
}
```

If the exact section key is ambiguous, ask the developer to confirm before proceeding.

#### File: `snippets/{slug}-{value}-snippet.liquid` (one per non-control variant)

```liquid
{%- comment -%}
  {slug} template test — Variant {value}
  Base: snippets/{base-snippet}.liquid
  Change: {from interview}
{%- endcomment -%}

{%- comment -%} TODO: Copy from snippets/{base-snippet}.liquid and apply your change here {%- endcomment -%}
```

#### Manual step: config entry

Tell the developer to update `snippets/template-test-config.liquid`:

```js
window.__templateTestConfig = {
	testName: "{slug}",
	variants: [
		{ value: "a", label: "A: Control" },
		{ value: "{value}", label: "{label}: Variant" },
	],
};
```

#### Checklist

- [ ] Feature branch created (`git checkout -b feat/{slug}-abc`)
- [x] `templates/{type}.{value}.json` created for each non-control variant
- [x] Variant snippet(s) created in `snippets/`
- [ ] Fill in variant snippet content (copy from control and apply change)
- [ ] `snippets/template-test-config.liquid` updated with `testName` and `variants`
- [ ] Toggle verified locally: variant applies `?view={value}` param

---

## Phase 4: What's Next

After scaffolding, remind the developer:

1. Fill in the implementation — the scaffold gives the structure; developer adds the actual logic
2. Test locally — `shopify theme dev`, enable QA toggle in Theme Settings, verify Control and Variant
3. Open a PR to `main` when ready — GitHub Actions syncs to `main-usa` and `main-ca` on merge
4. Enable toggle on QA/preview theme only — confirm it's off on the live published theme
5. Configure Intelligems — route traffic via the flag (on-site) or `?view=` URL (template)
