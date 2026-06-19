---
title: Cart Page
description: How the cart renders — AJAX updates, the shipping estimator, and the fitment/paint line-item properties.
sidebar_position: 4
---

# Cart Page

## Purpose

The cart page renders the shopper's line items with a CARiD-style sticky order
summary, a shipping/delivery estimator, and Partify-specific handling for fitment
and paint data attached to each item. Quantity and removal changes happen over the
AJAX cart API without a full page reload.

The template is `templates/cart.json` (auto-generated); its `main` section is
`sections/static-cart.liquid`. The **cart drawer** is a separate component
(`sections/cart-ajax.liquid`, template `cart._ajax.json`) — this page documents the
full cart *page*, not the drawer.

## Section & Snippet Structure

- `sections/static-cart.liquid` — the page: header with subtotal + checkout, the
  items list, and the sticky order-summary sidebar.
- `snippets/cart-item-list.liquid` → loops `snippets/cart-item.liquid` per line.
- Also renders `cart-discounts`, `quantity-selector`, and `Afterpay-Cart`.

## Line-Item Properties (Partify-specific)

This is the most important part of the cart to get right. `cart-item.liquid`
consumes several line-item properties:

- **`EasySearch`** → shown to the shopper as **"Fits: …"** (the Year/Make/Model
  fitment string). It's also merged with the `custom.title_collection_appending`
  metafield to build the displayed product title.
- **`Paint Code`** → deliberately **hidden** from both the desktop and mobile
  property lists (set during the product/touch-up flow, not shown in cart).
- **`_io_*`** → ShopPad **Infinite Options** bundle properties (paint sets, bumper
  kit add-ons). These are hidden, and `_io_parent_order_group` / `_io_order_group`
  drive bundle-item grouping and grouped removal.
- **`Fits`** → skipped when `EasySearch` is present.

There is no separate VIN line-item property read in the cart — VIN lives in the
paint/product flow. See [VIN Decoder Input Box](./product-page/vin-decoder.md).

## Data In

- Shopify `cart` object (`items`, `item_count`, `total_price`, `requires_shipping`,
  line-level discount allocations) and `routes.cart_url` / `routes.cart_change_url`.
- AJAX cart API: `/cart/change.js` (quantity/removal),
  `/cart/…/shipping_rates.json` (estimator).
- `customer.default_address.zip` — pre-fills the shipping estimator.
- `localStorage` — `partify_ship_zip` (cached estimator ZIP), `searchTerms` (the
  garage, used by the empty-cart hero).

## Data Out / Side Effects

- Removal/quantity changes POST to `/cart/change.js`, update `[data-cart-total]` and
  `[data-cart-count]`, and dispatch a `cartcount:update` event (the sticky mobile
  checkout bar listens for it).
- The shipping estimator polls `shipping_rates.json` for carrier-calculated rates,
  derives state/province from ZIP/postal code, builds ETA dates, and caches the ZIP.

## Key Logic Areas

### Empty-cart states

Two empty states: a generic empty cart, and — when customer accounts are enabled
and the shopper is logged out — a "sign in" hero that mounts the garage vehicle
widget ("Shop by vehicle") by relocating it into the hero via a MutationObserver.
See [Accounts](./auth/login-register.md).

### Shipping estimator

A large inline IIFE in `static-cart.liquid`. It detects **Canadian postal codes**
(mapping FSA → province) vs **US ZIPs** (mapping → state), and formats currency via
`shop.money_format` and the request locale.

## Known Constraints & Gotchas

- `cart.json` is **auto-generated**.
- **Currency/region branching:** `cart-item.liquid` swaps the placeholder image when
  `cart.currency.iso_code == 'CAD'`, and the shipping estimator branches on
  Canadian vs US postal formats.
- The empty-cart hero loads the `dotlottie-wc` web component from `unpkg.com` — an
  external dependency worth noting for CSP/performance.

## Related Files

- `sections/static-cart.liquid`, `snippets/cart-item-list.liquid`,
  `snippets/cart-item.liquid`
- `sections/cart-ajax.liquid` (the separate cart drawer)

## Owner & Maintenance

- **Owner:** Frontend Team
- **Last Updated:** June 19, 2026
