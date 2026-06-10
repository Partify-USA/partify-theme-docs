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

## Storefront-Supporting Services (source not in this monorepo)

The storefront theme calls several additional Cloud Run services directly (URLs
hardcoded in `assets/global-library.js`). Their **source repos are not in this
monorepo** — they are known only by their deployed URLs and behavior. Locating
and documenting their repos is an open task.

| Service (region `us-east5`) | Purpose | Console |
| --- | --- | --- |
| `garage-vin-service-node` | ChromeData (JD Power VSS) VIN decode — see [Paint Decode Pipeline](../data-and-decoding/paint-decode-pipeline.md) | [Cloud Run](https://console.cloud.google.com/run/detail/us-east5/garage-vin-service-node/metrics?project=740168228309) |
| `bumperdotcom-api` | Bumper.com VIN decode | [Cloud Run](https://console.cloud.google.com/run/detail/us-east5/bumperdotcom-api/metrics?project=345230973812) |
| `license-to-vin` | License plate → VIN lookup | [Cloud Run](https://console.cloud.google.com/run/detail/us-east5/license-to-vin/metrics?project=273472976974) |
| `tax-exemption-signup` | Creates a tax-exemption customer profile | [Cloud Run](https://console.cloud.google.com/run/detail/us-east5/tax-exemption-signup/metrics?project=505215902673) |
| `customer-account-data` | Reads customer account data | [Cloud Run](https://console.cloud.google.com/run/detail/us-east5/customer-account-data/metrics?project=725897343962) |
| `update-customer-account-info` | Updates customer account info | [Cloud Run](https://console.cloud.google.com/run/detail/us-east5/update-customer-account-info/metrics?project=49754682551) |

> These are confirmed to exist (the theme calls them in production) but are not
> yet fully documented. The console links use each service's GCP **project
> number** (taken from its `*.run.app` URL); they resolve fine but show numbers
> rather than project IDs. Treat this list as the starting inventory for tracking
> down their repos and deploy pipelines.

## Per-service docs

- [Finale Webhooks — Architecture](finale-webhooks/finale-webhooks.md) · [Setup](finale-webhooks/finale-webhooks-setup.md) · [Adding Endpoints](finale-webhooks/finale-webhooks-endpoints.md)
- [Order Status Production Sync](order-status-sync.md)
- [Fitment Proxy](fitment-proxy.md)

## Triggers

| Service | Triggered by |
| --- | --- |
| `finale-webhooks` — `/webhook/sales-orders/*` | Shopify Flow HTTP webhooks (shared-secret header `x-partify-secret`) |
| `finale-webhooks` — `/jobs/*` | Cloud Scheduler (HTTP, shared-secret header) |
| `finale-webhooks` — `/paint-match` | Internal staff browser (Google OAuth session) |
| `sql-order-status-tracking-sheets` — `GET /run-job` | Cloud Scheduler (job `sql-order-status-sync-sheets`) |
| `fitment-proxy-*` — `/ymm-*` | Storefront (browser) requests |
| `fitment-proxy-*` — `/internal/refresh` | Cloud Scheduler every 10 min (jobs `fitment-proxy-us-refresh` / `fitment-proxy-ca-refresh`) |

## Deploy Model

Two patterns are in use:

1. **Cloud Build trigger (source deploy)** — `finale-webhooks`. Pushing to `main`
   on its repo triggers a Cloud Build that builds from the `Dockerfile` and
   deploys a new Cloud Run revision. There is no GitHub Actions workflow in that
   repo.
2. **GitHub Actions → Artifact Registry → Cloud Run** — `order-tracking-api`
   and the fitment proxy. The workflow authenticates to GCP via **Workload
   Identity Federation** (no long-lived service-account key in GitHub), builds
   and pushes a Docker image to Artifact Registry, then runs `gcloud run deploy`.

```
GitHub push to main
   │
   ├─ finale-webhooks ──────────► Cloud Build trigger ──► Cloud Run revision
   │
   └─ order-tracking-api ───┐
      fitment proxy ────────┴────► GitHub Action (WIF auth)
                                    └─ docker build → Artifact Registry
                                       └─ gcloud run deploy → Cloud Run revision
```

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

The full secret-name registry across repos and services is documented under
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
- **Last Updated:** 2026-06-10
