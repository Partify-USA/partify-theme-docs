---
title: Search Bar
description: Vehicle-scoped predictive search in the global navbar with dual search strategies (Shopify Predictive Search API + Fuse.js) and EasySearch vehicle integration.
---

## Purpose

The header predictive search bar lets customers search for parts while automatically scoping results to their selected vehicle (via EasySearch). It implements two search strategies: **Shopify Predictive Search API** for broad searches (no vehicle or SKU queries) and **Fuse.js** for vehicle-scoped fuzzy searches. This replaces the theme's generic live search behavior with a vehicle-aware, fitment-first experience.

## Scope of Responsibility

### Owns

- Rendering the header search input and results container in the navbar
- **Dual search strategy implementation:**
  - Calling Shopify Predictive Search API (`searchAllProducts()`) for broad searches
  - Calling Shopify Collections API + Fuse.js (`searchInCollection()`) for vehicle-scoped fuzzy searches
- Applying vehicle fitment filtering based on EasySearch-selected vehicle
- Showing vehicle-related messaging (no vehicle selected, no fitment matches)
- Handling search submission behavior (including redirects and logging)

### Does Not Own

- How a vehicle is selected or stored (owned by the EasySearch garage integration)
- Product card layout, pricing, and stock logic (shared product snippets)
- Global header layout, logo, menus, and cart behavior
- Core search results page layout at `/search` (static search templates)

## Data In

- **Shopify objects**

  - `predictive_search` section data (products, collections, pages, articles, queries)
  - Product data used inside predictive search results (title, images, variants, collections)

- **Metafields**

  - `product.metafields.custom.collection_types` (serialized and output as `data-collection-types` on each predictive search product result)

- **LocalStorage / App state**

  - `localStorage.searchTerms` from EasySearch / garage (provides selected vehicle YMM and related metadata)
  - EasySearch vehicle selection UI (via the garage components rendered in the header)

- **Theme settings**
  - Header settings that enable live search and control whether the mobile search bar is visible
  - Storefront money format and translation strings used inside predictive search templates

## Data Out / Side Effects

- **DOM mutations**

  - Injects predictive search HTML into the header results container under the search bar
  - Shows/hides the results flyout, loading skeleton, error messages, and vehicle reminders
  - Filters individual product `<li>` elements based on vehicle fitment metadata

- **Global state and exports**

  - Exposes a predictive search API on `window` for initialization and debugging

- **Network calls**

  - **For `searchAllProducts()`:** Calls Shopify Predictive Search API at `/search/suggest?section_id=predictive-search` to fetch server-rendered HTML with products and suggestions
  - **For `searchInCollection()`:** Calls Shopify Collections API at `/collections/{handle}/products.json` to fetch JSON product data, then uses Fuse.js client-side for fuzzy matching
  - Calls Shopify GraphQL Storefront API to enrich vehicle-scoped products with collection type metadata used for URL filtering
  - Sends search telemetry to Google Sheets via `navigator.sendBeacon` for analytics (query, vehicle, matches, selected product)

- **Navigation**
  - Redirects to full search results pages or vehicle-specific collection URLs when the user submits the form or uses the "Browse Catalog" fallback

## Key Logic Areas

### Search Strategy: Two Different Approaches

The predictive search implements two distinct search strategies based on context:

- **`searchAllProducts()`** — Uses **Shopify Predictive Search API** (`/search/suggest`) to search across all products
  - Used when: No vehicle is selected, or the query looks like a SKU/part number
  - Returns: Server-rendered HTML from the `predictive-search` section
  - Behavior: Broad search across entire catalog, then optionally filtered by vehicle client-side
- **`searchInCollection()`** — Uses **Fuse.js** for fuzzy matching within a specific vehicle collection
  - Used when: A vehicle is selected and the query is not a SKU
  - Returns: JSON product data from `/collections/{handle}/products.json`
  - Behavior: Scopes search to vehicle collection first, then uses Fuse.js for typo tolerance and fuzzy matching
  - Fallback: If collection endpoint fails, falls back to `searchAllProducts()` with client-side filtering

This dual-strategy approach optimizes performance (by searching smaller vehicle-scoped collections) while maintaining broad coverage for SKU searches and users without selected vehicles.

### Header Integration and Markup

- The global header section renders the search bar through a `render 'search-bar'` call.
- The search bar snippet outputs:
  - A search `<form>` tagged with `data-predictive-search-form` and `data-live-search-form`.
  - An `<input>` tagged with `data-predictive-search-input`.
  - A results container tagged with `data-predictive-search-results` that starts hidden and is controlled entirely by JavaScript.
- These data attributes are the contract between Liquid markup and the predictive search JavaScript.

### Predictive Search Section (Server-Side)

- The predictive search section uses the `predictive_search` object to build grouped result lists for:
  - Query suggestions and collections
  - Products
  - Pages and articles
- Each product result `<li>` encodes fitment-related metadata:
  - `data-fitment-collections` — a pipe-delimited list of collection titles the product belongs to (used to infer vehicle collections).
  - `data-collection-types` — value of `product.metafields.custom.collection_types` serialized for client-side filtering.
- The section also renders a "View all results" button that submits the sanitized search terms to the full search page.

### Client-Side Predictive Search Behavior

- A dedicated JavaScript asset initializes predictive search on page load by:
  - Locating the header search `<form>`, input, and results container via `data-predictive-search-*` attributes.
  - Debouncing user input (400ms) before triggering search.
  - Rendering a loading skeleton state while waiting for responses.
- **Search routing logic:**
  - Detects if the query looks like a SKU (alphanumeric, 6-20 chars, no spaces, contains both letters and numbers).
  - If SKU-like OR no vehicle is selected → calls **`searchAllProducts()`** which uses **Shopify Predictive Search API**.
  - If vehicle is selected AND not a SKU → calls **`searchInCollection()`** which uses **Fuse.js** for fuzzy matching within the vehicle collection.
- **Result rendering:**
  - For `searchAllProducts()`: Injects server-rendered HTML from the `predictive-search` section.
  - For `searchInCollection()`: Builds product tiles from JSON data client-side, including "Did you mean?" suggestions extracted from Fuse.js results.
- The script also normalizes search text (e.g., handling "and" vs `&`) and implements typo correction by analyzing character frequency in matched product titles.

### Vehicle-Scoped Fitment Filtering

- The script reads the selected vehicle from EasySearch / garage via `localStorage.searchTerms` and caches it.
- When predictive search results are present, it:
  - Parses `data-fitment-collections` and `data-collection-types` on each product result.
  - Compares the selected vehicle YMM (year/make/model) to the vehicle collections and collection types associated with each product.
  - Hides products that do not match the current vehicle and tracks how many matching products remain.
- If no vehicle is selected, the script:
  - Avoids fitment-based filtering.
  - Injects a non-blocking reminder banner prompting the user to "Select Vehicle" via the EasySearch button.
- If a vehicle is selected but no products match fitment:
  - Renders a "no fitment" state explaining that no parts were found for that vehicle and query.
  - Offers a "Browse Catalog" button that links to the vehicle's collection URL derived from the stored YMM.

### Search Submission, URLs, and Logging

- On submit, the script:
  - Waits for any in-flight input handling to finish.
  - Chooses between searching all products or within a vehicle-specific collection, based on the selected vehicle and inferred product type.
  - Constructs URLs that may include collection-type filters and product-type filters when appropriate.
- It logs search behavior (query, vehicle context, matches) to Google Sheets using `sendBeacon` so navigation does not block logging.

## High-Level Flow Diagram

```text
User types in header search
  ↓
snippets/search-bar.liquid
  - Renders search form + input + results container
  - Adds data-predictive-search-* attributes
  ↓
assets/predictive-search.js
  - Listens to input (debounced)
  - Reads EasySearch vehicle from localStorage.searchTerms
  - Detects if query looks like a SKU
  ↓
┌─────────────────────────────────────────────────────────────┐
│ BRANCH: Search Strategy Decision                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Is SKU? OR No vehicle selected?                            │
│                                                              │
│  YES ────────────────────────┐    NO ─────────────────────┐ │
│                              ↓                             ↓ │
│  searchAllProducts()         │    searchInCollection()    │ │
│  - Shopify Predictive Search │    - Fuse.js fuzzy search  │ │
│  - /search/suggest endpoint  │    - /collections/{handle}/│ │
│  - Server-rendered HTML      │      products.json         │ │
│  - Broad catalog search      │    - Vehicle-scoped first  │ │
│                              │    - JSON product data     │ │
│                              │    - Client-side rendering │ │
│                              └──────────┬─────────────────┘ │
│                                         ↓                    │
└─────────────────────────────────────────────────────────────┘
  ↓
sections/predictive-search.liquid (if Shopify Predictive Search)
  - Uses predictive_search object to render server-side HTML
  - Adds data-fitment-collections + data-collection-types to each product
  ↓
assets/predictive-search.js
  - Injects HTML (from Shopify) OR builds HTML (from Fuse.js results)
  - Filters products by vehicle fitment (if applicable)
  - Shows vehicle reminders / no-fitment / errors / "did you mean" suggestions
  ↓
Navigation
  - User clicks a product, suggestion, or "View all results" / "Browse Catalog"
  - JS builds filtered URLs using collection types + product type
  - Logs search analytics to Google Sheets via sendBeacon
```

## Known Constraints & Gotchas

- **Hard dependency on Fuse.js library**

  - The `searchInCollection()` function requires Fuse.js to be loaded on the page for fuzzy matching and typo tolerance. If Fuse.js is missing or fails to load, vehicle-scoped searches will fail silently or fall back to exact matching only.
  - Fuse.js configuration (threshold, keys, weights) is hardcoded in the JavaScript and affects search quality.

- **Dual search strategy creates complexity**

  - Two different search paths (`searchAllProducts()` using Shopify API vs `searchInCollection()` using Fuse.js) mean debugging search issues requires identifying which code path was taken.
  - SKU detection logic determines which path is used, so changes to `looksLikeSKU()` can unexpectedly shift behavior between Shopify and Fuse.js searches.

- **Hard dependency on EasySearch / garage state**

  - Vehicle-scoped behavior assumes `localStorage.searchTerms` exists and follows the expected structure. If this shape changes, fitment filtering will silently break.

- **Fitment based on collection titles and metafields**

  - Fitment filtering depends on collection naming conventions and `product.metafields.custom.collection_types`. Renaming collections or changing metafield formats without updating the logic can cause incorrect matches or missed products.

- **Predictive Search section contract**

  - The JavaScript expects predictive search results (from `searchAllProducts()`) to include `data-fitment-collections` and `data-collection-types` attributes. Removing or renaming these breaks vehicle filtering while leaving basic search functional.

- **GraphQL and API dependencies**

  - Collection-type enrichment and some URL-building behavior depend on Shopify GraphQL. API failures degrade behavior to more generic searching.

- **Localization and money formats**
  - The predictive search section uses translated strings and money formats provided by theme settings and locales. Changes in translation keys or formats can affect rendering but not core logic.

## Safe to Change

- Visual styling of the header search input, buttons, and results layout (CSS-only changes).
- Copy and microcopy inside predictive search messages (e.g., instructions, error text), as long as IDs and data attributes remain intact.
- Non-behavioral refactors inside the JavaScript that do not alter:
  - Data attributes (`data-predictive-search-*`, `data-fitment-collections`, `data-collection-types`).
  - LocalStorage key names.
  - URL-building rules.
- Adding additional analytics or logging that does not change existing payload shapes or event timing.

## Dangerous to Change

- **SKU detection logic** (`looksLikeSKU()`) — Changes affect which search strategy (Shopify API vs Fuse.js) is used, potentially breaking part number searches.
- **Search routing decision tree** — Logic that decides between `searchAllProducts()` and `searchInCollection()` based on vehicle state and SKU detection.
- **Fuse.js configuration** — Threshold values, search keys, and weights directly affect search quality and relevance for vehicle-scoped searches.
- LocalStorage keys and structure used for vehicle selection (especially `localStorage.searchTerms`).
- The way vehicle collection handles are derived from YMM strings (year/make/model) when building URLs.
- The rules that map predictive search products to vehicles via collections and `product.metafields.custom.collection_types`.
- The data attributes used by the JavaScript (`data-predictive-search-form`, `data-predictive-search-input`, `data-predictive-search-results`, `data-fitment-collections`, `data-collection-types`).
- Network call shapes and endpoints for Shopify Predictive Search, Shopify Collections API, and GraphQL without updating all consumers.

## Related Files

- `sections/static-header.liquid` (renders the global header and invokes the search bar snippet)
- `snippets/search-bar.liquid` (header search input, buttons, and results container markup)
- `sections/predictive-search.liquid` (server-side predictive search section consumed by `searchAllProducts()`)
- `assets/predictive-search.js` (client-side predictive search behavior and vehicle fitment filtering)
- `assets/predictive-search.css` (styles for predictive search skeleton, errors, and messaging)
- `layout/theme.liquid` (loads predictive search CSS/JS assets and Fuse.js library into the storefront)
- **Fuse.js library** (external dependency loaded via CDN, required for `searchInCollection()` fuzzy matching)
- `snippets/rimg.liquid`, `snippets/product-price.liquid`, `snippets/product-stock-level.liquid` (product card rendering used inside predictive search results)
- `snippets/search-sanitizer.liquid` (sanitizes search terms for "view all results" behavior)
- `snippets/easysearch-garage.liquid` and related EasySearch assets (vehicle selection UI and localStorage state)

## Owner & Maintenance

- **Owner:** Wyatt C.
- **Last Updated:** 2026-01-12
