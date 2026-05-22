---
title: ab-test-cleanup
description: >
  Cleans up completed A/B tests for the Partify Shopify theme after a winner is decided.
  Handles both template tests (?view= variants) and on-site edit tests (Intelligems flag-gated JS).
  Promotes the winning variant's code into the permanent codebase, removes all test infrastructure,
  and leaves zero test residue. Use this skill whenever a developer says a test is done, a winner
  has been chosen, or they want to clean up, conclude, close out, kill, or promote a completed
  experiment. Triggers on phrases like "the test is done", "B won", "clean up the test",
  "promote the winner", "remove the test code", "variant won", "control won", "kill the test",
  "wrap up the experiment", or any request to finalize and remove A/B test files.
sidebar_position: 2
---

# A/B Test Cleanup

Two test types are supported. The goal in both cases is the same: the winner's experience becomes permanent, and every artifact of the test disappears.

**Do NOT delete or modify any files until the interview is complete and the winner is confirmed.**

**Never stage or commit changes.** The developer always commits manually after reviewing the cleanup.

---

## Phase 1: Confirm the Essentials

Before touching anything, you need three things:

1. **Test type** — template test or on-site edit test
2. **Test slug** — the kebab-case identifier (e.g., `checkout-layout`, `paint-badge`)
3. **Winner** — which variant value won (e.g., `b`, `c`), or `control` if the original won

**If the winner is not explicitly stated, always ask before proceeding.** Never infer a winner from context — getting this wrong means promoting the losing variant to production. This question is required even if everything else is clear.

---

## Phase 2: Execute Cleanup

---

### Template Test Cleanup

A template test leaves these artifacts:

| File                                     | What it is                                     |
| ---------------------------------------- | ---------------------------------------------- |
| `templates/{type}.{value}.json`          | Variant template — one per non-control variant |
| `snippets/{slug}-{value}-snippet.liquid` | Variant snippet — one per non-control variant  |
| `snippets/template-test-config.liquid`   | Active test config                             |

The control template (`templates/{type}.json`) and the base control snippet stay — they're permanent storefront files, not test artifacts.

#### Step 1: Read the winner snippet

Open `snippets/{slug}-{winner}-snippet.liquid`. At the top is a comment block:

```liquid
{%- comment -%}
  {slug} template test — Variant {winner}
  Base: snippets/{base-snippet}.liquid
  Change: {description}
{%- endcomment -%}
```

This tells you the base snippet name. Read both the winner snippet and the base snippet so you understand exactly what changed.

#### Step 2: Promote the winner (if variant won)

The storefront needs to render the winner's code going forward — without any test infrastructure.

Write the winner's content into the base control snippet, replacing it entirely. Strip the test comment header (the `{%- comment -%}` block) before writing — that's test metadata, not content.

After this, the control template already points to the base snippet, which now has the winner's code. No other files need to change.

**If control won:** skip this step entirely. The base snippet is already correct.

#### Step 3: Delete variant templates and snippets

Delete every file that was created for this test:

- `templates/{type}.b.json`, `templates/{type}.c.json`, etc. — all variant templates
- `snippets/{slug}-b-snippet.liquid`, `snippets/{slug}-c-snippet.liquid`, etc. — all variant snippets (including the winner's, since its content has been promoted)

Do not touch `templates/{type}.json` (the control template) or any other templates.

#### Step 4: Clear the config

Open `snippets/template-test-config.liquid` and remove the `window.__templateTestConfig` block for this test. If this was the only active test, the file should be left with just an empty `<script></script>` block or a comment indicating no tests are active.

#### Checklist

- [x] Winner snippet content read
- [x] Base control snippet updated with winner content (if variant won)
- [x] All variant template files deleted
- [x] All variant snippet files deleted
- [ ] `snippets/template-test-config.liquid` cleared
- [ ] Verify: load the page normally — winner's experience is live
- [ ] Verify: `?view={value}` no longer serves a variant (falls back to default)
- [ ] Commit manually: `git commit -m "cleanup({slug}): promote {winner} variant to production"`

---

### On-Site Edit Test Cleanup

Two paths depending on who won.

#### If control won — remove everything

The site should look like the test never happened.

1. Open `snippets/onsite-test-config.liquid` — remove the config array entry for this slug
2. Delete `assets/onsite-test-{slug}.js`
3. If the test added hidden Liquid HTML (elements with `display: none` added for the variant to show), remove those elements from wherever they were added

#### Checklist (control won)

- [x] Config entry removed from `snippets/onsite-test-config.liquid`
- [x] `assets/onsite-test-{slug}.js` deleted
- [x] Hidden Liquid HTML removed (if any was added)
- [ ] Clear localStorage in browser: `localStorage.removeItem('__onsite_test__{slug}')`
- [ ] Verify: reload page — variant behavior is completely gone
- [ ] Commit manually: `git commit -m "cleanup({slug}): remove onsite test (control won)"`

---

#### If variant won — bake in the changes

The JS changes need to become permanent in Liquid so the framework can be removed.

**Step 1: Read the module**

Read `assets/onsite-test-{slug}.js`. For each method in the module, understand what DOM change it was making.

**Step 2: Translate each change to Liquid**

For each feature method:

- **JS was injecting HTML** → add that HTML directly into the relevant Liquid template or snippet. If it was wrapped in `display: none` for the JS to reveal, remove the `display: none` — it's now permanent.
- **JS was adding a CSS class to an element** → add that class directly to the element's Liquid markup
- **JS was modifying text content** → update the Liquid to render the winning copy
- **JS was showing a previously hidden element** → remove the `display: none` from the Liquid; the element is now always visible

Use Read and Edit to make these changes directly. Point out the exact file and line to the developer for anything that requires domain knowledge about which template controls that section.

**Step 3: Verify before deleting**

Before removing the test infrastructure, confirm the permanent change renders correctly on the page. The winning experience should appear without the JS module being loaded.

**Step 4: Remove test infrastructure**

Once the Liquid change is in place:

1. Remove the config entry from `snippets/onsite-test-config.liquid`
2. Delete `assets/onsite-test-{slug}.js`
3. Remove any Liquid HTML that was only there to support the test (e.g., a hidden element that the JS was toggling, which is no longer needed now that the change is baked in)

#### Checklist (variant won)

- [ ] Read the module — understand all changes
- [x] Baked each change into the relevant Liquid file(s)
- [ ] Verified the winner's experience renders without the test JS
- [x] Config entry removed from `snippets/onsite-test-config.liquid`
- [x] `assets/onsite-test-{slug}.js` deleted
- [x] Test-only Liquid HTML removed
- [ ] Clear localStorage in browser: `localStorage.removeItem('__onsite_test__{slug}')`
- [ ] Commit manually: `git commit -m "cleanup({slug}): promote onsite variant to production"`

---

## Phase 3: Zero Residue Check

After cleanup, search the codebase for the slug to make sure nothing was missed:

```
grep -r "{slug}" snippets/ templates/ assets/ sections/ layout/
```

The result should be empty. If anything comes up, investigate and clean it up.

Once everything is confirmed clean, remind the developer to commit manually:

```
git commit -m "cleanup({slug}): ..."
```

Never stage or run git commands yourself.
