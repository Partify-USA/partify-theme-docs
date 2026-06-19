---
title: Cloud Services Overview
description: Map of the Google Cloud Run services that power Partify order automation, production status, and storefront fitment data — what each one is, where it lives, and how it deploys.
sidebar_position: 1
---

# Cloud Services Overview

## Purpose

Partify runs its backend automation on **Google Cloud Run**. This page is the
map: every service, which GCP project and region it lives in, what triggers it,
and how it deploys. Read this first, then dive into the per-service pages.

## Service Inventory

| Service | What it does | GCP project | Region | Deploys via | Console |
| --- | --- | --- | --- | --- | --- |
| `finale-webhooks` | Shopify ↔ Finale (US + CA) ↔ Redo ↔ Postgres bridge: sales-order webhooks, scheduled sync/complete jobs, Paint Match UI | `finale-jobs` | `us-central1` | Cloud Build trigger on push to `main` (no GitHub Action) | [Cloud Run](https://console.cloud.google.com/run/overview?project=finale-jobs) |
| `sql-order-status-tracking-sheets` | Reads open orders from Google Sheets, finds latest production scan per order in Postgres, writes status metafields to Shopify | `alpine-sentry-448804-d4` | `us-east5` | GitHub Action `deploy.yml` (repo `order-tracking-api`) | [Cloud Run](https://console.cloud.google.com/run/detail/us-east5/sql-order-status-tracking-sheets/metrics?project=alpine-sentry-448804-d4) |
| `fitment-proxy-us` / `fitment-proxy-ca` | Serves Year-Make-Model (YMM) fitment data from a Shopify metaobject to the storefronts (one service per store) | `partify-fitment-proxy` | `us-central1` | GitHub Action `deploy.yml` (repo `adamsearch_proxy` / fitment proxy) | [Cloud Run](https://console.cloud.google.com/run/services?project=partify-fitment-proxy) |

> The repo folder `adamsearch_proxy` builds and deploys services named
> `fitment-proxy`. "AdamSearch" and "Fitment Proxy" refer to the same system.

## Storefront-Supporting Services (`us-east5`)

The storefront theme calls several additional Cloud Run services directly (URLs
hardcoded in `assets/global-library.js`). Each lives in its own GitHub repo,
checked out under `google_cloud/<folder>` in the monorepo workspace, and deploys
the same way as the fitment proxy — **GitHub Actions → Workload Identity
Federation → Artifact Registry → Cloud Run** on push to `main`. All are
`functions-framework` HTTP functions in `us-east5`, one GCP project each.

| Service | Repo / folder | What it does | GCP project (number) | Entry point |
| --- | --- | --- | --- | --- |
| `garage-vin-service-node` | [`garage-vin-service-node`](https://github.com/Partify-USA/garage-vin-service-node) | ChromeData (JD Power VSS) VIN decode — vehicle data **and** paint, see [Paint Decode Pipeline](../data-and-decoding/paint-decode-pipeline.md) | `ontime-eta` (`740168228309`) | `fetchVehicleData` |
| `license-to-vin` | [`license-to-vin`](https://github.com/Partify-USA/license-to-vin) | License plate → VIN via Bumper.com (the only live Bumper use) | `bumper-license-to-vin` (`273472976974`) | `fetchBumperLicenseToVin` |
| `bumperdotcom-api` | [`bumperdotcom-api`](https://github.com/Partify-USA/bumperdotcom-api) | Bumper.com paint-code lookup by VIN — **deployed but not currently called** by the theme (`fetchFromBumper` is commented out) | `bumperdotcom-api` (`345230973812`) | `fetchBumperPaintCodes` |
| `tax-exemption-signup` | [`tax-exemption-signup`](https://github.com/Partify-USA/tax-exemption-signup) | Creates a B2B company + tax-exempt customer profile — see [Tax-Exemption Signup](tax-exemption-signup.md) | `tax-exemption-signup` (`505215902673`) | `createCustomerProfile` |
| `customer-account-data` | [`customer-account-data`](https://github.com/Partify-USA/customer-account-data) | Reads order history + garage metafield — see [Customer Account Data](customer-account-data.md) | `customer-account-info` (`725897343962`) | `getCustomerAccountInfo` |
| `update-customer-account-info` | [`update-customer-account-info`](https://github.com/Partify-USA/update-customer-account-info) | Writes the garage metafield — see [Update Customer Account Info](update-customer-account-info.md) | `update-customer-account-info` (`49754682551`) | `updateCustomerGarageData` |
| `order-status-fetcher` | [`order-status-fetcher`](https://github.com/Partify-USA/order-status-fetcher) | Powers the Order Status Tracker page — looks up an order in Shopify, adds AfterShip tracking, logs the search — see [Order Status Fetcher](order-status-fetcher.md) | `order-status-tracking-447120` (`770424631875`) | `fetchOrderStatusMetafields` |

> **Repo folder vs. service name.** The theme's hardcoded URLs use each service's
> GCP **project number** (e.g.
> `garage-vin-service-node-740168228309.us-east5.run.app`); the project IDs above
> resolve to the same services. `garage-vin-service-node` runs in project
> `ontime-eta` (shared with order-status infrastructure), not a project of its own
> name.

## Per-service docs

- [Finale Webhooks — Architecture](finale-webhooks/finale-webhooks.md) · [Setup](finale-webhooks/finale-webhooks-setup.md) · [Adding Endpoints](finale-webhooks/finale-webhooks-endpoints.md)
- [Order Status Production Sync](order-status-sync.md)
- [Fitment Proxy](fitment-proxy.md)
- [Tax-Exemption Signup](tax-exemption-signup.md)
- [Customer Account Data (read)](customer-account-data.md) · [Update Customer Account Info (write)](update-customer-account-info.md)
- [Order Status Fetcher](order-status-fetcher.md)

> Paint-decode services (`garage-vin-service-node`, `license-to-vin`, the dormant
> `bumperdotcom-api`) are documented from the storefront's side on the
> [Paint Decode Pipeline](../data-and-decoding/paint-decode-pipeline.md) page.

## Triggers

| Service | Triggered by |
| --- | --- |
| `finale-webhooks` — `/webhook/sales-orders/*` | Shopify Flow HTTP webhooks (shared-secret header `x-partify-secret`) |
| `finale-webhooks` — `/jobs/*` | Cloud Scheduler (HTTP, shared-secret header) |
| `finale-webhooks` — `/paint-match` | Internal staff browser (Google OAuth session) |
| `sql-order-status-tracking-sheets` — `GET /run-job` | Cloud Scheduler (job `sql-order-status-sync-sheets`) |
| `fitment-proxy-*` — `/ymm-*` | Storefront (browser) requests |
| `fitment-proxy-*` — `/internal/refresh` | Cloud Scheduler every 10 min (jobs `fitment-proxy-us-refresh` / `fitment-proxy-ca-refresh`) |
| `garage-vin-service-node` / `license-to-vin` / `bumperdotcom-api` | Storefront (browser) — VIN / plate decode from `global-library.js` |
| `getCustomerAccountInfo` / `updateCustomerGarageData` | Storefront customer-account area (browser), US store |
| `createCustomerProfile` | Storefront tax-exemption form (browser), US store |
| `fetchOrderStatusMetafields` | Storefront Order Status Tracker page (browser), routed by `Origin` to US or CA store |

## Deploy Model

Two patterns are in use:

1. **Cloud Build trigger (source deploy)** — `finale-webhooks`. Pushing to `main`
   on its repo triggers a Cloud Build that builds from the `Dockerfile` and
   deploys a new Cloud Run revision. There is no GitHub Actions workflow in that
   repo.
2. **GitHub Actions → Artifact Registry → Cloud Run** — everything else:
   `order-tracking-api`, the fitment proxy, and the six storefront-supporting
   repos (`garage-vin-service-node`, `license-to-vin`, `bumperdotcom-api`,
   `tax-exemption-signup`, `customer-account-data`,
   `update-customer-account-info`). Each workflow authenticates to GCP via
   **Workload Identity Federation** (no long-lived service-account key in
   GitHub), builds and pushes a Docker image to Artifact Registry, then runs
   `gcloud run deploy`.

```
GitHub push to main
   │
   ├─ finale-webhooks ──────────► Cloud Build trigger ──► Cloud Run revision
   │
   └─ order-tracking-api ───┐
      fitment proxy ────────┤
      garage-vin-service ───┤
      license-to-vin ───────┤──► GitHub Action (WIF auth)
      bumperdotcom-api ─────┤     └─ docker build → Artifact Registry
      tax-exemption-signup ─┤        └─ gcloud run deploy → Cloud Run revision
      customer-account-* ───┘
```

> All six storefront-supporting repos were previously **source/console deploys**
> (no CI). They have since been put under this GitHub Actions + WIF pipeline; see
> the `onboard-cloud-run-function` skill that codified the pattern.

A failed build does not affect the live service — Cloud Run only routes traffic
to a new revision after it passes startup.

## Secrets & Configuration

All service secrets live in **Google Secret Manager**, scoped to each service's
GCP project, and are surfaced to the container either as **mounted files** or as
**environment variables**. The Cloud Run service account is granted
**Secret Manager Secret Accessor** on each secret it consumes.

| Service | Secrets (Secret Manager) | Surfaced as |
| --- | --- | --- |
| `finale-webhooks` | Finale US/CA keys, `PARTIFY_SECRET`, DB config, Slack webhook, Google OAuth client | env vars |
| `sql-order-status-tracking-sheets` | `order-status-credentials-json`, `order-status-db-config-json`, `SHOPIFY_TOKEN_US`, `SHOPIFY_TOKEN_CA` | `credentials.json` + `dbConfig.json` mounted as files; tokens as env vars |
| `fitment-proxy-*` | `fitment-proxy-{us,ca}-admin-token`, `fitment-proxy-{us,ca}-refresh-secret` | env vars (`SHOPIFY_ADMIN_TOKEN`, `REFRESH_SECRET`) |
| `garage-vin-service-node` | `garage-vin-shopify-admin-token`, `garage-vin-chromedata-app-id`, `garage-vin-chromedata-shared-secret` | env vars |
| `license-to-vin` | `license-to-vin-bumper-api-key` | env var `BUMPER_API_KEY` |
| `bumperdotcom-api` | `bumperdotcom-api-bumper-api-key` | env var `BUMPER_API_KEY` |
| `tax-exemption-signup` | `tax-exemption-signup-shopify-admin-token` | env var `SHOPIFY_ADMIN_TOKEN` |
| `customer-account-data` | `customer-account-data-shopify-{client-id,client-secret,admin-access-token}` | env vars |
| `update-customer-account-info` | `update-customer-account-info-shopify-{client-id,client-secret,admin-access-token}` | env vars |
| `order-status-fetcher` | `order-status-fetcher-shopify-admin-token-{usa,ca}`, `order-status-fetcher-aftership-api-key` | env vars (`SHOPIFY_ADMIN_TOKEN_USA`, `SHOPIFY_ADMIN_TOKEN_CA`, `AFTERSHIP_API_KEY`) |

The full secret-name registry for the Cloud Run services is documented under
[Secrets](secrets.md); the secrets consumed by GitHub Actions (CI/CD) live under
[GitHub → Secrets](../github/secrets.md).

## Shared Conventions

- **Region is per-service, not uniform** — `finale-webhooks` and the fitment
  proxies are in `us-central1`; order-status sync is in `us-east5`.
- **Store routing by order prefix** — `U…` → US store (`partify-usa-123`),
  `C…` → CA store (`auto-realm`). This convention recurs across services.
- **Stateless jobs** — services recompute from source systems each run; no
  service holds long-lived state beyond Postgres (owned by `finale-webhooks`).

## Known Constraints & Gotchas

- The `finale-webhooks` Setup and Endpoints docs predate the service's current
  architecture (it has grown well beyond the original `damage` webhook). Treat
  `finale_jobs/ARCHITECTURE.md` in the source repo as the authority until those
  pages are refreshed.
- Cloud Scheduler jobs (the `/jobs/*` triggers and `sql-order-status-sync-sheets`)
  are configured in the **Cloud Scheduler** console, not in source — their exact
  cadence is not captured in any repo.

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-15
