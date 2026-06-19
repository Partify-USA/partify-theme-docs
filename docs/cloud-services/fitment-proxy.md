---
title: Adamsearch Fitment Proxy
description: Cloud Run service that caches Year-Make-Model (YMM) fitment data from a Shopify metaobject and serves it to the storefronts for vehicle selection / garage search.
sidebar_position: 7
---

# Fitment Proxy

## Purpose

The Fitment Proxy is a small Cloud Run service that reads **Year-Make-Model
(YMM)** vehicle data out of a Shopify metaobject, holds it in an in-memory
cache, and serves it to the storefronts as fast JSON. It exists so the garage /
vehicle-selection UI can load the full YMM tree without hammering the Shopify
Admin API on every visit.

> The source folder is `google_cloud/adamsearch_proxy`, but the package, image,
> and deployed services are all named `fitment-proxy`. "AdamSearch" and
> "Fitment Proxy" are the same system.

## Scope of Responsibility

### Owns

- Paging the full `year_make_model_lookup` metaobject set from the Shopify
  Admin GraphQL API (250 per page, retried up to 3×)
- Normalizing, validating (4-digit year 1900–2035), de-duplicating, and grouping
  vehicles by year
- Holding the result in an in-memory cache with a TTL (default 10 min) and
  refreshing it in the background when stale
- Serving the YMM index and per-year vehicle lists to the storefront over CORS
- A protected `/internal/refresh` endpoint to force a cache rebuild

### Does Not Own

- The YMM data itself — that lives in the Shopify metaobject
  (`year_make_model_lookup`); the proxy is read-only
- Storefront rendering of the vehicle picker
- Any persistence — the cache is purely in-memory and rebuilt on cold start

## Deployment

Two Cloud Run services are deployed from one image, one per storefront:

| Service            | Store (`SHOPIFY_STORE`)         | Allowed origins                                                       |
| ------------------ | ------------------------------- | --------------------------------------------------------------------- |
| `fitment-proxy-us` | `partify-usa-123.myshopify.com` | `partifyusa.com`, `www.partifyusa.com`, local, `*.shopifypreview.com` |
| `fitment-proxy-ca` | `auto-realm.myshopify.com`      | `partify.ca`, `www.partify.ca`, local, `*.shopifypreview.com`         |

- **Project:** `partify-fitment-proxy` · **Region:** `us-central1`
- **Deploy:** GitHub Action `deploy.yml` on push to `main` — authenticates via
  Workload Identity Federation, builds the `Dockerfile` (Node 20 Alpine), pushes
  to Artifact Registry, then `gcloud run deploy` for both services.
- **Sizing:** `min-instances=1` (kept warm so the cache is populated),
  `max-instances=3`, 1 GiB / 1 CPU, 30s timeout, unauthenticated.
- **Console:** [Cloud Run services — `partify-fitment-proxy`](https://console.cloud.google.com/run/services?project=partify-fitment-proxy)

## Refresh Schedule (Cloud Scheduler)

The periodic cache refresh is driven by **Cloud Scheduler**, not by an in-app
timer. Two jobs (project `partify-fitment-proxy`, region `us-central1`) POST to
each service's `/internal/refresh` endpoint every 10 minutes:

| Job | Frequency | Target |
| --- | --- | --- |
| `fitment-proxy-us-refresh` | `*/10 * * * *` (UTC) | `https://fitment-proxy-us-130776886961.us-central1.run.app/internal/refresh` |
| `fitment-proxy-ca-refresh` | `*/10 * * * *` (UTC) | `https://fitment-proxy-ca-130776886961.us-central1.run.app/internal/refresh` |

Each request carries the `x-refresh-secret` header (`REFRESH_SECRET`). The app's
`CACHE_TTL_MS` (default 10 min) is a secondary safety net: if a storefront read
arrives and the cache is older than the TTL, the app also kicks off a background
refresh on its own. In normal operation the scheduler keeps the cache fresh, so
storefront reads are served from a warm cache.

> To change the refresh cadence, edit the two Cloud Scheduler jobs in the GCP
> console — it is **not** configured in the service code.

## Local Testing

```bash
npm start   # node src/server.js, listens on :8080
```

Requires `SHOPIFY_STORE` and `SHOPIFY_ADMIN_TOKEN` env vars (the process exits
on startup without them). Use `test.http` with the VS Code REST Client.

| Endpoint            | Method | Description                                                      |
| ------------------- | ------ | ---------------------------------------------------------------- |
| `/health`           | GET    | `200 ok` once the cache is warm, `503 warming` until then        |
| `/ymm-index`        | GET    | `{ years: [...], cachedAt }` — list of all years                 |
| `/ymm-data/{year}`  | GET    | `{ year, vehicles: [...] }` for a 4-digit year; `404` if unknown |
| `/internal/refresh` | POST   | Forces a background refresh; requires header `x-refresh-secret`  |

## Data In

- **Shopify Admin GraphQL API** (`API_VERSION 2025-01`) — `metaobjects(type:
"year_make_model_lookup")`, paged 250 at a time, authenticated with
  `SHOPIFY_ADMIN_TOKEN`
- **Env vars:** `SHOPIFY_STORE`, `SHOPIFY_ADMIN_TOKEN`, `METAOBJECT_TYPE`
  (default `year_make_model_lookup`), `ALLOWED_ORIGIN` (`|`-separated list),
  `REFRESH_SECRET`, `CACHE_TTL_MS` (default `600000`), `PORT` (default `8080`)

## Data Out / Side Effects

- JSON responses to storefront callers (CORS-restricted to allowed origins)
- Outbound calls to the Shopify Admin GraphQL API during refresh
- No database, no file writes — state is the in-memory `cache` object only

## Key Logic Areas

### Cache lifecycle

- On startup, `runRefresh()` warms the cache before the server accepts traffic.
- Each metaobject field set is parsed into `{ year, make, model, submodel,
engine }`, validated, de-duplicated by a lowercased composite key, grouped by
  year, and sorted.
- `isCacheStale()` compares `cachedAt` against `CACHE_TTL_MS`. A stale read
  triggers a **background** refresh (`triggerBackgroundRefresh()`) but still
  serves the current cache immediately — readers never block on a refresh.
- `cache.refreshing` guards against overlapping refreshes.

### CORS

`ALLOWED_ORIGIN` is a `|`-separated list. Matching supports exact origins,
wildcard subdomains (`*.shopifypreview.com`), and `*` (allow all). Disallowed
origins fall back to the first configured origin.

### Refresh auth

`POST /internal/refresh` requires the `x-refresh-secret` header to equal
`REFRESH_SECRET`; otherwise `401`.

## High-Level Flow

```
Startup ─► runRefresh() ─► Shopify metaobjects (paged) ─► validate/dedup/group ─► cache

Storefront ─► GET /ymm-index or /ymm-data/{year}
                 └─ serve from cache (background refresh if stale)

Cloud Scheduler (every 10 min) ─► POST /internal/refresh (x-refresh-secret) ─► background refresh
```

## Known Constraints & Gotchas

- **In-memory only:** a cold start serves `503` until the first refresh
  completes; `min-instances=1` mitigates this in production.
- **Stale-while-revalidate:** callers may receive data up to `CACHE_TTL_MS` old
  before the background refresh lands.
- **Secret hygiene:** `test.http` historically contained a real
  `x-refresh-secret` value. Never commit live secrets; rotate any that have been
  committed and keep `REFRESH_SECRET` in Secret Manager only.
- The metaobject `type` must match `METAOBJECT_TYPE`; renaming the metaobject in
  Shopify silently empties the cache.

## Safe to Change

- `CACHE_TTL_MS`, logging, retry counts/delays
- Adding response fields, sort order within a year

## Dangerous to Change

- `METAOBJECT_TYPE` / the field keys parsed in `parseFields` — must match the
  Shopify metaobject definition
- `ALLOWED_ORIGIN` handling — a mistake here breaks storefront CORS
- The dedup key composition — changing it changes which vehicles are collapsed

## Related Files

- Source repo folder: `adamsearch_proxy` (image/services: `fitment-proxy`)
- [Cloud Services Overview](overview.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-10
