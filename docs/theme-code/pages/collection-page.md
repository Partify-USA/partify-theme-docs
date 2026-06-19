---
title: Collections Page
description: How collections render and filter — Boost SD, vehicle-as-collection, and the collection_types facet.
sidebar_position: 2
---

# Collections Page

## Purpose

Collections are the browsing surface for parts. The key idea to understand first:
**a vehicle *is* a collection.** Picking a Year/Make/Model routes the shopper to a
YMM collection (e.g. `/collections/2023-gmc-sierra-1500-denali-8-cyl-5-3l`), and
choosing a part category adds a **facet** on top of that collection rather than
navigating somewhere new.

The template is `templates/collection.json` (auto-generated). The whole template is
wrapped in `.boost-sd__product-filter-fallback` — a strong tell that **Boost SD**
(Boost AI Search & Discovery) owns filtering and search.

## Client vs Server Filtering

This is the most important thing to know about this page:

- **Server side:** filtering is expressed as Shopify URL params —
  `filter.p.m.custom.collection_types=…` (part category) combined with
  `filter.p.product_type=…`. The theme's native grid section
  (`sections/static-collection.liquid`) can render results from these params.
- **Client side / production:** **Boost SD overrides the native grid** on the live
  site and renders results itself. The native Liquid grid is largely **decorative
  in production** — it matters mainly in the theme editor/preview, or if Boost fails
  to load.

When changing collection behavior, assume Boost is in charge on production.

## Section Order

`collection.json` renders: `vehicle-hero-banner` → `collection-breadcrumbs` →
`collection-title` → `collection-type-buttons` → `collection-categories` →
**`static-collection`** (the grid + filters + sort) → a title/description block.
Several blocks are disabled.

The grid section uses snippets `product-grid-item`, `product-grid-sidebar`,
`product-grid-sortby`, `product-grid-filters-active`, `pagination`, `quick-shop`,
and Partify's `universal-products-grid`.

## Vehicle Fitment Interaction

- The **vehicle picks the collection** (the YMM handle). The category tiles in
  `collection-type-buttons.liquid` / `collection-categories.liquid` append the
  `collection_types` + `product_type` facets to that handle.
- On a YMM collection's **bare base URL with no active filter**, the native grid is
  intentionally **hidden** (regex check for a `/collections/<year>-…` URL with no
  `filter.p.` param). The category/type buttons act as the entry point; Boost SD
  renders the real grid once a facet is chosen.
- **Universal parts** (parts that fit broadly) are injected into a YMM collection
  from the `year_make_model_lookup` metaobject's `universal_products` field, rendered
  via `universal-products-grid` and filtered to match the active facets.

For how the active vehicle is stored and read, see
[Adding Search Terms](../global-components/garage/adding_search_terms.md).
Predictive search on collections is documented in
[Predictive Search Bar](../global-components/navbar/predictive_searchbar.md).

## Sorting

Sort is handled by `product-grid-sortby` (Shopify `sort_by`), enhanced by Boost on
production. The grid supports a grid/list toggle and defaults to list view.

## Data In

- Shopify `collection` object (`handle`, `filters`, `products`, `products_count`,
  `current_tags`).
- Product metafield **`custom.collection_types`** — drives the primary category facet.
- Metaobject **`year_make_model_lookup`** — keyed by collection handle; supplies
  universal products and per-vehicle data.
- `localStorage.searchTerms` — powers the shared vehicle hero banner at the top.

## Notable Variants

- `collection.boost-sd-original.json` — the unmodified Boost SD template.
- `collection.subcollections*.json` — subcollection grid / menu-list layouts.
- `collection.touchup-paint.json` — the touch-up-paint collection flow.

## Known Constraints & Gotchas

- `collection.json` is **auto-generated**.
- The native `static-collection.liquid` grid is **decorative on production** — Boost
  SD replaces it. Don't assume changes to that Liquid grid affect the live site.
- Faceting depends entirely on the `custom.collection_types` metafield being
  populated and mapped in Boost. The facet groups `YGroup`, `Year`, and `Model` are
  explicitly excluded from the visible filters.
- Category labels are bilingual (EN/ES) and locale-aware.

## Related Files

- `sections/static-collection.liquid`, `assets/boost-sd-custom.js`,
  `assets/boost-sd-custom.css`, `snippets/boost-sd-fallback.liquid`
- `sections/collection-type-buttons.liquid`, `sections/collection-categories.liquid`
- `assets/partify-ymm-paint-filter.js`, `snippets/universal-products-grid.liquid`

## Owner & Maintenance

- **Owner:** Frontend Team
- **Last Updated:** June 19, 2026
