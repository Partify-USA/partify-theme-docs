---
title: Update Customer Account Info (write)
description: Cloud Run service that writes a customer's saved garage (custom.garage_data metafield) back to Shopify for the customer-account area of the US storefront.
sidebar_position: 9
---

# Update Customer Account Info (write)

## Purpose

`update-customer-account-info` is the **write** half of the customer-account
garage. When a signed-in customer saves vehicles to their garage, the storefront
calls this service to persist the garage as the `custom.garage_data` metafield on
the Shopify customer. Its read counterpart is [Customer Account
Data](customer-account-data.md).

It runs against the **US store only** (`partify-usa-123.myshopify.com`).

## Scope of Responsibility

### Owns

- Origin-gating storefront requests (CORS allowlist)
- Validating the payload (`customerId` + a `garageData` **object**)
- Serializing `garageData` to JSON and upserting it into the customer's
  `custom.garage_data` metafield (`type: json`) via `customerUpdate`
- Surfacing Shopify `userErrors` as a hard `400`

### Does Not Own

- **Reading** the garage / order history — that's [Customer Account
  Data](customer-account-data.md)
- The shape/semantics of the garage object — it stores whatever valid object the
  storefront sends
- Customer authentication (only the origin gate) or the CA store

## Deployment

- **Repo:** [`Partify-USA/update-customer-account-info`](https://github.com/Partify-USA/update-customer-account-info) · folder `google_cloud/update-customer-account-info`
- **Project:** `update-customer-account-info` (project number `49754682551`) · **Region:** `us-east5`
- **Service:** `update-customer-account-info` · **Entry point:** `updateCustomerGarageData` (functions-framework HTTP function)
- **Deploy:** GitHub Action `deploy.yml` on push to `main` — Workload Identity
  Federation, `Dockerfile` build, Artifact Registry, `gcloud run deploy`.
- **Sizing:** `min-instances=0`, `max-instances=20`, 512 MiB / 1 vCPU, 300s
  timeout, concurrency 80, `--ingress=all`. The deploy omits
  `--allow-unauthenticated` to preserve the existing auth posture.
- **Console:** [Cloud Run — `update-customer-account-info`](https://console.cloud.google.com/run/detail/us-east5/update-customer-account-info/metrics?project=49754682551)

## Data In

- **Request:** `POST { customerId, garageData }` with an allowed `Origin` header.
  Gates (all before any Shopify mutation):
  - Bad / missing origin → `403`
  - Non-`POST` → `405` (`OPTIONS` answered for preflight)
  - Missing `customerId` → `400`
  - Missing `garageData`, or not a plain object (array/primitive) → `400`
- **Allowed origins** (substring match): `127.0.0.1`, `partifyusa.com`,
  `partify-usa-123.myshopify.com`, `shopifypreview.com`.
- **Secrets** (GCP Secret Manager → env vars):
  - `SHOPIFY_CLIENT_ID` ← `update-customer-account-info-shopify-client-id`
  - `SHOPIFY_CLIENT_SECRET` ← `update-customer-account-info-shopify-client-secret`
  - `SHOPIFY_ADMIN_ACCESS_TOKEN` ← `update-customer-account-info-shopify-admin-access-token`

## Data Out / Side Effects

- **Write:** upserts `custom.garage_data` (`type: json`) on the customer via the
  `customerUpdate` Admin GraphQL mutation.
- **Response:** `200 { success, customerId, metafield }` on success; `400` with
  `userErrors` if Shopify rejects the update.

## Key Logic Areas

- **Validation before mutation** — origin, method, `customerId`, and a
  JSON-serializable `garageData` object are all checked before any Shopify call.
- **GID** — `customerId` is wrapped as `gid://shopify/Customer/<id>`.
- **Hard-fail on `userErrors`** — a non-empty `customerUpdate.userErrors` returns
  `400` rather than a misleading success.
- Admin GraphQL call to `/admin/api/2026-01/graphql.json` with
  `SHOPIFY_ADMIN_ACCESS_TOKEN`.

## High-Level Flow

```
Garage save ─► POST updateCustomerGarageData { customerId, garageData }
   ├─ origin allowed? ── no ─► 403
   ├─ method POST? ───── no ─► 405
   ├─ customerId + valid garageData object? ── no ─► 400
   └─ customerUpdate metafields: custom.garage_data (json)
         ├─ userErrors? ─► 400 { error, userErrors }
         └─ ok ─► 200 { success, customerId, metafield }
```

## Known Constraints & Gotchas

- **Trust model:** the only authorization is the origin check — any caller from
  an allowed origin can write any `customerId`'s garage. Hardening (verifying the
  session/customer) is an open consideration.
- **US store only** — the store domain is hardcoded.
- **Last write wins** — the metafield is overwritten wholesale; there is no merge
  with existing garage data.
- Pairs with [Customer Account Data](customer-account-data.md); both share the
  `custom.garage_data` contract.

## Safe to Change

- Logging, CORS allowlist entries, response shape

## Dangerous to Change

- The `custom.garage_data` namespace/key/type (`json`) — shared with the read
  service and the storefront garage UI
- The hardcoded store domain

## Related Pages

- [Customer Account Data](customer-account-data.md) (the read side)
- [Cloud Services Overview](overview.md)
- [Secrets](../github/secrets.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-15
