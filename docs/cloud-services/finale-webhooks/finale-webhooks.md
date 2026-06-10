---
title: Finale Webhooks — Architecture
description: The finale-webhooks Cloud Run service — a Shopify ↔ Finale (US + CA) ↔ Redo ↔ Postgres bridge handling sales-order webhooks, scheduled sync/complete jobs, and the Paint Match UI.
sidebar_position: 2
---

# Finale Webhooks — Architecture

## Purpose

`finale-webhooks` is the backend bridge between Shopify, **Finale Inventory**
(US + CA tenants), **Redo** returns, and a **PostgreSQL** database. It handles
real-time sales-order webhooks from Shopify Flow, runs scheduled background sync
and completion jobs, and serves an internal **Paint Match** dashboard. It is the
most complex Cloud Service and the one most worth understanding first.

> The repo's `ARCHITECTURE.md` is the living source of truth for internals; this
> page is the documentation-site summary. Keep them in sync when the service
> changes.

## Scope of Responsibility

### Owns

- Creating, cancelling, and damage-replacing Finale **Sales Orders** from Shopify events
- **Cross-border** order mirroring (mirror Sales Order + Purchase Order on the opposite tenant)
- Scheduled syncs: Shopify orders/line items → Postgres, Finale sales orders → Postgres, Redo returns → Postgres
- Auto-**completing** Finale orders whose Shopify line items are fulfilled
- The Paint Match dashboard + CSV/Yotpo imports (internal staff UI)

### Does Not Own

- Production scan → Shopify status metafields — that is [Order Status Sync](../order-status-sync.md)
- Storefront rendering or theme logic
- The YMM fitment data feed — that is the [Fitment Proxy](../fitment-proxy.md)

## Deployment

- **Project:** `finale-jobs` · **Region:** `us-central1` · **Service:** `finale-webhooks`
- **Deploy:** Cloud Run **source deploy** via a Cloud Build trigger on push to
  `main` (configured in the GCP console — there is no GitHub Actions workflow and
  no `cloudbuild.yaml` in the repo). Build uses the `Dockerfile` (Node 18 slim).
- **Runtime:** `PORT` 8080; `NODE_ENV=production` enables Cloud Logging severity
  output and secure session cookies.
- **Console:** [Cloud Run — `finale-jobs`](https://console.cloud.google.com/run/overview?project=finale-jobs)

## Authentication

| Surface | Guard | Mechanism |
| --- | --- | --- |
| `/webhook/sales-orders/*`, `/jobs/*` | `requireSecret` | Shared-secret header `x-partify-secret` checked against `PARTIFY_SECRET` |
| `/paint-match/*` | `requireAuth` | Google OAuth (Passport); sessions persisted to Postgres `user_sessions`; only `ALLOWED_EMAIL_DOMAINS` permitted |
| `/`, `/auth/google*`, static assets | none (public) | Health check + OAuth handshake |

## Route Map

The `selling` router is mounted at **two** prefixes — `/webhook/sales-orders`
(event-driven) and `/jobs/selling` (scheduled). All endpoints accept a dry-run
flag (`x-dry-run` / `x-finale-dry-run` header, or `dryRun` in query/body) that
skips all Finale writes.

| Method · Path | Handler | What it does |
| --- | --- | --- |
| POST `/webhook/sales-orders/damage` | `damage.js` | Pulls unprocessed damage/lost scans (last 3h) from Postgres, creates replacement orders in Finale, posts a Slack summary |
| POST `/webhook/sales-orders/create` | `create.js` | Creates a Finale Sales Order from a Shopify Flow payload (+ cross-border mirror SO/PO; splits qty > 1) |
| POST `/webhook/sales-orders/cancel` | `cancel.js` | Cancels a Finale order; if already packed, completes it then transfers stock to the Cancel Dock |
| POST `/jobs/selling/sync-orders` | `sync-orders.js` | Syncs one page of Shopify orders/line items into the Paint Match DB (cursor-based) |
| POST `/jobs/selling/diff-sync-orders` | `sync-orders.js` | Full diff recovery — upserts only missing orders |
| POST `/jobs/selling/sync-redo-returns` | `sync-redo-returns.js` | Syncs Redo returns into Postgres |
| POST `/jobs/selling/sync-finale-sales-orders` | `sync-finale-sales-orders.js` | Incremental cursor sync of Finale sales orders into Postgres |
| POST `/jobs/selling/diff-sync-finale-sales-orders` | `sync-finale-sales-orders.js` | Diff recovery sync of Finale sales orders |
| POST `/jobs/selling/complete-finale-sales-orders` | `complete-finale-sales-orders.js` | Completes open Finale orders whose Shopify items are fulfilled |
| POST `/jobs/products/sync-lookups-ca-to-us` | `lookups.js` | Copies CA product lookup short codes to US Finale |
| GET/POST `/paint-match*` | `paintMatch.js` + `import.js` | Dashboard UI, paginated data, CSV/Yotpo imports |

## Multi-Tenant & Cross-Border

Two Finale tenants: **US** (`U`-prefixed order IDs) and **CA** (`C`-prefixed).
Each has its own env vars and its own entry in `src/config.js` (facility/origin
IDs, custom field attribute IDs). When the supplier is a configured cross-border
supplier (e.g. CA Finale, LKQUSA, TigerUSA):

```
US order + cross-border supplier        CA order + cross-border supplier
  └─ US Sales Order  (primary)            └─ CA Sales Order  (primary)
  └─ CA Sales Order  (mirror)             └─ US Sales Order  (mirror)
  └─ US Purchase Order                    └─ CA Purchase Order
```

## Data In

- **Shopify Flow** webhooks → `/webhook/sales-orders/*`
- **Cloud Scheduler** HTTP calls → `/jobs/*` (shared-secret header)
- **Shopify Admin GraphQL** (orders, line items, fulfillments) during syncs
- **Finale** REST + GraphQL APIs (US + CA tenants)
- **Redo** API (returns)
- **PostgreSQL** (`scans`, `orders`, `order_line_items`, `paint_codes`,
  `finale_sales_orders`, `finale_order_events`, `redo_returns`, `sync_cursors`,
  `user_sessions`, `yotpo_reviews`)

## Data Out / Side Effects

- Finale Sales Orders / Purchase Orders created, cancelled, completed; inventory transfers
- Postgres upserts (read-write — this service owns the Paint Match DB)
- Slack notifications (damage run summaries, cross-border failure alerts)
- Shopify reads only (no metafield writes from this service)

## Key Utilities

| File | Purpose |
| --- | --- |
| `src/utils/finale.js` | All Finale REST/GraphQL calls + the create→patch→retry `runOrderPipeline` |
| `src/utils/shopify.js` | Shopify Admin GraphQL (orders, line items, names, GID parsing) |
| `src/utils/sql.js` | Postgres pool + all DB queries |
| `src/utils/redo.js` | Redo API client (cursor-paginated returns) |
| `src/utils/slack.js` | Slack webhook notifications |
| `src/utils/logger.js` | Pino logger (pretty locally, Cloud Logging severities in prod) |
| `src/config.js` | Static per-tenant Finale config (facility IDs, custom field attribute IDs) |

## High-Level Flow

```
Shopify Flow ─► /webhook/sales-orders/{create,cancel,damage} ─► finale.js (+ Slack)
Cloud Scheduler ─► /jobs/selling/{sync-orders,sync-finale-sales-orders,
                    complete-finale-sales-orders,sync-redo-returns}
                    └─ shopify.js / finale.js / redo.js ─► sql.js (Postgres)
Cloud Scheduler ─► /jobs/products/sync-lookups-ca-to-us ─► finale.js
Staff browser ─► /paint-match  [Google OAuth] ─► paintMatch.js / import.js ─► EJS views
```

## Known Constraints & Gotchas

- **Shared router, two prefixes:** `selling.js` serves both `/webhook/sales-orders`
  and `/jobs/selling`. Adding a route there exposes it under both prefixes.
- **Damage processes a time window, not a single order:** `/damage` pulls all
  unprocessed damage/lost scans from the last 3 hours, not just one order.
- **Cross-border supplier list is config-driven** (`src/config.js` / handler
  logic) — adding a supplier there changes order routing.
- **Dry-run is honoured everywhere** via `parseDryRunFlag`; use it to test
  against live Finale without writing.
- **Cloud Scheduler cadence lives in the console**, not in source.
- **Test-only routes** (`/test/*`) exist when `NODE_ENV !== "production"`.

## Safe to Change

- Logging, Slack message formatting, response shapes
- Page sizes / limits on the sync jobs
- Adding new utilities that don't change order semantics

## Dangerous to Change

- `src/config.js` tenant facility/origin IDs and cross-border supplier rules
- The `requireSecret` / `requireAuth` guards and `PARTIFY_SECRET`
- `runOrderPipeline` and the cross-border create/cancel logic
- Postgres schema and cursor tables (`sync_cursors`) that drive incremental syncs

## Related Files

- Source repo: `google_cloud/finale_jobs` (`server.js`, `src/`, `ARCHITECTURE.md`)
- [Finale Webhooks — Setup](finale-webhooks-setup.md) · [Adding Endpoints](finale-webhooks-endpoints.md)
- [Cloud Services Overview](../overview.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-10
