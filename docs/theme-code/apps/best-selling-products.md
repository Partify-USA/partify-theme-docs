---
title: Best Selling Products (Admin App)
description: Internal Shopify admin app (built with Sidekick) that manages several backend tools. Currently documented — the ChromeData → ACES model mapping that fixes VIN decodes whose model name doesn't match the AdamSearch (EasySearch) fitment format.
sidebar_position: 2
---

# Best Selling Products (Admin App)

## Purpose

**Best Selling Products** is an internal Shopify **admin app**, built with
**Sidekick**, that bundles several backend tools used by the team. It is admin-only
— it is not part of the storefront theme, and customers never see it.

The app does more than one thing, but this page currently documents a single
feature: the **ChromeData → ACES model mapping**. As the app grows, more of its
tabs (Product Uploader, Product Editor, Settings, and the rest of the ChromeData
browser) will be documented here.

> The app is named "Best Selling Products" as of this writing — the name may
> change. Find it in the Shopify admin under **Apps**.

## ChromeData → ACES Model Mapping

### Where to find it

In the app, the mapping editor lives at:

**ChromeData → ACES Mapping → Add Mapping**

The ACES Mapping tab lists every existing mapping (searchable by either column)
and lets you add, edit, or delete entries.

### What problem it solves

When a customer decodes a VIN, **ChromeData** (JD Power VSS, via the
[`garage-vin-service-node`](../../cloud-services/overview.md) service) returns the
vehicle's **Year / Make / Model**. The storefront then has to match that model
against the **AdamSearch / EasySearch** fitment vehicle list to resolve fitment.

The catch: ChromeData sometimes returns a model name in a format that **doesn't
match** the way that model is spelled in AdamSearch. For example, ChromeData might
return one spelling/format while EasySearch expects another. When the names don't
match exactly, fitment can't resolve and the lookup fails.

This mapping is the fix. It is a lookup table of **"the model name ChromeData
gives us"** → **"the model name AdamSearch needs."** When a decoded model doesn't
match the fitment list directly, the storefront consults this table, swaps in the
corrected value, and tries again. Each entry is essentially an
incorrect-key → correct-value pair.

### How to add a mapping

1. Open **ChromeData → ACES Mapping → Add Mapping**.
2. **Model Name** — enter the value **exactly as ChromeData returns it** (the one
   that fails to match). This is the key the storefront will look up.
3. **EasySearch Model** — enter the value **AdamSearch / EasySearch requires** for
   that vehicle (the one that *does* match the fitment list). This is the
   corrected value the storefront substitutes.
4. Click **Add**.

That's it — the new mapping is live for subsequent VIN decodes. (See
[Where the data lives](#where-the-data-lives) for the small caveat about the
storefront's cached copy.)

> **Getting the EasySearch value right.** The "EasySearch Model" value must match
> how the model appears in the AdamSearch fitment data, or the corrected lookup
> will also miss. The reliable way to confirm the exact spelling is to find a
> working vehicle of that make/model in AdamSearch and copy the model name it uses.

### How a mapping is used (runtime)

The storefront applies this table inside the VIN-decode → fitment flow in
`assets/global-library.js`:

1. A VIN is decoded → ChromeData returns Year / Make / **Model**.
2. The theme checks whether that **make + model** exists in the AdamSearch
   fitment vehicle list.
3. **If it matches**, fitment resolves normally and the mapping is never touched.
4. **If it does not match**, the theme loads the mapping table and looks for an
   entry whose **Model** equals the decoded model. Matching is **case- and
   punctuation-insensitive** — both sides are lowercased and stripped to
   letters/numbers before comparing — so spacing, hyphens, and capitalization
   don't matter.
5. On a hit, the theme replaces the decoded model with the entry's
   **EasySearch Model** value and re-checks the fitment list. If it now matches,
   fitment resolves; if not, the lookup still fails.

So a mapping only ever helps a model that *wasn't* already matching — it never
overrides a model that AdamSearch already recognizes.

### Where the data lives

The mappings are stored in a **Shopify metaobject**, and the app is just the
editor on top of it:

| Thing | Value |
| --- | --- |
| Metaobject type | `vin_lookup_to_aces` |
| Entry handle | `model-mappings` |
| Field | `mappings` (a JSON list of entries) |
| Entry shape | `{ "Model": "<ChromeData value>", "Easysearch Model": "<AdamSearch value>" }` |

The storefront receives this list two ways (see `layout/theme.liquid`):

- **Primary** — rendered inline into `window.VIN_LOOKUP_DATA` from the metaobject
  at page load, so the mappings ship with the page.
- **Fallback** — if that array isn't present, the theme fetches the
  `vinLookupToAces.json` theme asset (`window.VIN_LOOKUP_URL`).

> **Field key capitalization matters.** The runtime reads the property
> **`"Easysearch Model"`** (capital E, lowercase s, with a space) from each entry.
> The app writes the entries, so adding mappings through the UI is safe — but if
> anyone edits the metaobject by hand, that exact key must be preserved or the
> lookup silently won't find the corrected value.

## Known Constraints & Gotchas

- **A mapping only rescues a failed match.** It is consulted only when the decoded
  model doesn't already match the fitment list. It can't be used to *re-point* a
  model that AdamSearch already recognizes.
- **The corrected value still has to exist in AdamSearch.** If the "EasySearch
  Model" you enter isn't a real model in the fitment data, the second lookup
  misses too. Confirm the exact spelling against AdamSearch.
- **Per-make match.** The lookup matches on model and then re-checks against the
  decoded **make** — a corrected model only resolves under the same make.
- **Cached copy in the theme asset.** The `vinLookupToAces.json` asset is a static
  fallback copy. If the inline metaobject path is ever disabled and the theme
  falls back to the asset, that file would need to be kept in sync with the
  metaobject.

## Related Pages

- [Cloud Services Overview](../../cloud-services/overview.md) — the
  `garage-vin-service-node` (ChromeData) decode service
- [Paint Decode Pipeline](../../data-and-decoding/paint-decode-pipeline.md) — the
  other half of what a VIN decode feeds
- [Fitment Proxy (AdamSearch)](../../cloud-services/fitment-proxy.md) — the YMM
  fitment data this mapping resolves against

## Owner & Maintenance

- **Owner:** Cloud / Backend (app built with Sidekick by Jared)
- **Last Updated:** 2026-06-19
