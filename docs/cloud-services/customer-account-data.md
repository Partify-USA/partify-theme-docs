---
title: Customer Account Data (read)
description: Cloud Run service that reads a customer's order history and saved garage (custom.garage_data metafield) from Shopify for the customer-account area of the US storefront.
sidebar_position: 8
---

# Customer Account Data (read)

## Purpose

`customer-account-data` is the **read** half of the customer-account garage. The
storefront's account area calls it (as `fetchCustomerAccountData`) to load a
signed-in customer's **order history** and their **saved garage**
(`custom.garage_data` metafield) in one request. Its write counterpart is
[Update Customer Account Info](update-customer-account-info.md).

It runs against the **US store only** (`partify-usa-123.myshopify.com`).

## Scope of Responsibility

### Owns

- Origin-gating storefront requests (CORS allowlist)
- Normalizing the `customerId` into a Shopify customer GID
- One Admin GraphQL query returning the customer's orders (with line items +
  images) and the `custom.garage_data` metafield
- Returning Shopify's response payload to the storefront

### Does Not Own

- **Writing** the garage — that's [Update Customer Account
  Info](update-customer-account-info.md)
- Customer authentication — it trusts the storefront to pass a valid
  `customerId`; the only gate is the origin check
- The CA store

## Deployment

- **Repo:** [`Partify-USA/customer-account-data`](https://github.com/Partify-USA/customer-account-data) · folder `google_cloud/customer-account-data`
- **Project:** `customer-account-info` (project number `725897343962`) · **Region:** `us-east5`
- **Service:** `customer-account-data` · **Entry point:** `getCustomerAccountInfo` (functions-framework HTTP function)
- **Deploy:** GitHub Action `deploy.yml` on push to `main` — Workload Identity
  Federation, `Dockerfile` build, Artifact Registry, `gcloud run deploy`.
- **Sizing:** `min-instances=0`, `max-instances=20`, 512 MiB / 1 vCPU, 300s
  timeout, concurrency 80, `--ingress=all`. The deploy omits
  `--allow-unauthenticated` to preserve the existing auth posture.
- **Console:** [Cloud Run — `customer-account-data`](https://console.cloud.google.com/run/detail/us-east5/customer-account-data/metrics?project=725897343962)

> Project `customer-account-info` hosts the **read** service
> (`customer-account-data`). The **write** service
> (`update-customer-account-info`) lives in its own project of the same name.

## Data In

- **Request:** `POST { customerId }` with an allowed `Origin` header. Gates:
  - Bad / missing origin → `403`
  - Non-`POST` → `405` (`OPTIONS` answered for preflight)
  - Missing `customerId` → `400`
- `customerId` may be a numeric id or a full `gid://shopify/Customer/…` GID; the
  service normalizes it.
- **Allowed origins** (substring match): `127.0.0.1`, `partifyusa.com`,
  `partify-usa-123.myshopify.com`, `shopifypreview.com`.
- **Secrets** (GCP Secret Manager → env vars):
  - `SHOPIFY_CLIENT_ID` ← `customer-account-data-shopify-client-id`
  - `SHOPIFY_CLIENT_SECRET` ← `customer-account-data-shopify-client-secret`
  - `SHOPIFY_ADMIN_ACCESS_TOKEN` ← `customer-account-data-shopify-admin-access-token`

## Data Out / Side Effects

- **Read-only.** Returns Shopify's GraphQL payload: `customer.orders` (first 250,
  each with line items, titles, images, product ids) and the `custom.garage_data`
  metafield value. No writes.

## Key Logic Areas

- **Origin gate first** — requests from non-allowlisted origins are rejected
  before any Shopify call.
- **GID normalization** — `customerId` is coerced to
  `gid://shopify/Customer/<id>` unless it already starts with `gid://`.
- **Single Admin GraphQL call** to `/admin/api/2026-01/graphql.json` with
  `SHOPIFY_ADMIN_ACCESS_TOKEN`; the raw parsed response is returned to the caller.

## High-Level Flow

```
Account area ─► POST getCustomerAccountInfo { customerId }
   ├─ origin allowed? ── no ─► 403
   ├─ method POST? ───── no ─► 405
   ├─ customerId? ────── no ─► 400
   └─ Admin GraphQL: customer.orders + custom.garage_data ─► 200 { ...Shopify payload }
```

## Known Constraints & Gotchas

- **Trust model:** the only authorization is the origin check — any caller from
  an allowed origin can request any `customerId`'s data. Hardening (verifying the
  session/customer) is an open consideration.
- **US store only** — the store domain is hardcoded.
- **`orders(first: 250)`** — customers with more than 250 orders are truncated.
- Pairs with [Update Customer Account Info](update-customer-account-info.md);
  the two share the `custom.garage_data` contract.

## Safe to Change

- Logging, CORS allowlist entries, the GraphQL field selection (additive)

## Dangerous to Change

- The `custom.garage_data` namespace/key — shared with the write service and the
  storefront garage UI
- The hardcoded store domain

## Related Pages

- [Update Customer Account Info](update-customer-account-info.md) (the write side)
- [Cloud Services Overview](overview.md)
- [Secrets](secrets.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-15
