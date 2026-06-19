---
title: Order Status Fetcher (Customer Facing)
description: Google Cloud Run service behind the storefront Order Status Tracker page — looks up a single order in Shopify, enriches it with AfterShip tracking, logs the search to a Google Sheet, and returns the combined result to the browser.
sidebar_position: 6
---

# Order Status Fetcher

## Purpose

The Order Status Fetcher is the HTTP service that powers the customer-facing
**Order Status Tracker** page. When a shopper looks up an order, the storefront
posts the order number (and optionally an email) to this service. It queries the
correct Shopify store for that order, enriches any fulfillments with **AfterShip**
tracking detail, logs the lookup to a Google Sheet, and returns the combined
Shopify + AfterShip payload to the browser.

> **Not the same service as [Order Status Production Sync](order-status-sync.md).**
> The two are easy to confuse because both deal with "order status." The _Sync_
> service (`sql-order-status-tracking-sheets`, project `alpine-sentry-448804-d4`)
> **writes** production-status metafields (prepared / painted / packaged /
> shipped) onto orders. This _Fetcher_ service (`order-status-fetcher`, project
> `order-status-tracking-447120`) **reads** an order on demand for the tracker
> page and adds carrier tracking. The tracker page displays the metafields the
> Sync writes, but the live lookup and search logging are done here.

## Scope of Responsibility

### Owns

- Accepting the storefront's `POST { orderId, ipAddress?, submittedEmail? }`
  request and routing it to the US or CA Shopify store by request `Origin`
- Running the single-order Shopify GraphQL query (metafields, fulfillments,
  tracking, line items, tags, refunds)
- Normalizing the carrier name into an AfterShip courier slug and fetching
  tracking detail per tracking number
- Validating the shopper-submitted email against the order's real email
- Logging every lookup (and every failure mode) to the **Order Status Tracker
  Logs** Google Sheet
- CORS handling for the storefront origins, including the `OPTIONS` preflight

### Does Not Own

- The production-status metafields shown on the tracker page — those are written
  by [Order Status Production Sync](order-status-sync.md)
- The Google Sheet's logging logic — that lives in a bound Apps Script on the
  sheet itself (see [Google Sheets Logging](../data-and-decoding/google-sheets-logging.md))
- AfterShip's tracking data — this service only reads it
- The storefront tracker page UI

## Deployment

The service runs on **Google Cloud Run** (`order-status-fetcher`, project
`order-status-tracking-447120`, region `us-east5`) with **continuous deployment
from GitHub** (`Partify-USA/order-status-fetcher`, branch `main`). Every push to
`main` runs the `deploy.yml` GitHub Action, which authenticates to GCP via
**Workload Identity Federation**, builds the `Dockerfile` (Node 20 Alpine), pushes
the image to Artifact Registry, then runs `gcloud run deploy`.

- **Entry point:** `fetchOrderStatusMetafields` (a `functions-framework` HTTP function)
- **Runtime settings (set explicitly in the deploy step):** `concurrency=1`,
  `cpu=167m`, `memory=256Mi`, `min-instances=0`, `max-instances=100`,
  `timeout=300`, `--allow-unauthenticated`, App Engine default service account
  (`order-status-tracking-447120@appspot.gserviceaccount.com`)

> **Migrated from a Cloud Function.** This was originally a gen2 Cloud Function
> (image in `gcf-artifacts`). It is now a Docker image built by GitHub Actions and
> deployed as a new revision of the same underlying Cloud Run service. The Cloud
> Functions console entry may still show the old source — the live service is the
> GitHub-built revision. The runtime settings above are pinned to match the
> original service exactly.

## Local Testing

```bash
npm start   # functions-framework --target=fetchOrderStatusMetafields --port=8080
```

The three secrets must be present as environment variables or the process exits
on startup (`SHOPIFY_ADMIN_TOKEN_USA`, `SHOPIFY_ADMIN_TOKEN_CA`,
`AFTERSHIP_API_KEY`). A request from `127.0.0.1` skips the origin check, so local
calls are accepted without a storefront `Origin` header.

## Data In

- **HTTP trigger:** `POST /` from the storefront with body
  `{ orderId, ipAddress?, submittedEmail? }`. `orderId` is the order name
  (e.g. `U162378`); a missing `orderId` returns `400`.
- **Request `Origin` header:** decides the store — an origin containing
  `partifyusa` routes to the US store, `partify.ca` routes to the CA store, and
  `127.0.0.1` is treated as local. Any other origin is rejected with `400 Incorrect
origin` (and still logged).
- **Shopify Admin GraphQL API** (`2023-01`) for the resolved store
- **AfterShip API** (`v4`) for tracking detail

## Data Out / Side Effects

- **HTTP response** to the browser: `{ shopifyResponse, aftershipResponse }` on
  success. Error cases return `400` / `404` / `405` / `500` with an `error` field.
- **Google Sheet write:** every lookup is appended to the **Order Status Tracker
  Logs** sheet via the bound Apps Script web app
  (`script.google.com/macros/s/.../exec`). Logging is **best-effort** — a failed
  log never blocks or fails the lookup.
- **Network calls:** Shopify Admin GraphQL (one query per lookup) and AfterShip
  (one call per tracking number, in parallel).
- **No persistent state** — every request recomputes from Shopify and AfterShip.

## Key Logic Areas

### Store routing & CORS

The `Origin` header selects the store (`partify-usa-123.myshopify.com` for US,
`auto-realm.myshopify.com` for CA). `Access-Control-Allow-Origin` is set to `*`,
and the `OPTIONS` preflight is answered with the allowed `POST` method and a
one-hour `Access-Control-Max-Age`. Only `POST` is processed; other methods get
`405`.

### Shopify lookup

A single GraphQL query against `orders(first: 6, query: $orderName, sortKey:
ORDER_NUMBER)` pulls, for the matched order: `custom`-namespace metafields,
`email`, `createdAt`, `fulfillments` (tracking number + company, status,
per-fulfillment line items and tracking), `lineItems` (title, quantity, image,
SKU), `tags`, and `refunds`. The first edge is used as the order; no edge returns
`404 Order Not Found`.

### Carrier slug normalization

The carrier `company` string from the first fulfillment is lowercased and mapped
to an AfterShip courier slug:

| Contains     | AfterShip slug       |
| ------------ | -------------------- |
| `carriers`   | `rl-carriers`        |
| `saia`       | `saia-freight`       |
| `roadrunner` | `roadrunner-freight` |
| `ups`        | `ups`                |

If no slug can be determined, the company name is recorded in the log error so the
mapping gap is visible.

### AfterShip enrichment

For each tracking number, the service calls
`GET /v4/trackings/{slug}/{number}` with the `aftership-api-key` header, in
parallel. If AfterShip reports an invalid slug (`meta.code === '004'` or a message
containing `invalid`), the tracking results are dropped and the unresolved company
is logged.

### Email verification & logging

`sendToGoogleSheets()` appends the lookup to the Order Status Tracker Logs sheet.
If a `submittedEmail` was provided and does not match the order's real email, the
logged error is `The email: … does not match our records for this order.` (and the
line-item list is cleared from the log). The order GID prefix is stripped before
logging (`orderId.split(':')[1]`). Every error path — bad origin, wrong method,
missing order ID, order not found, Shopify failure, unexpected exception — is
logged before the response is returned.

## High-Level Flow

```
Storefront (Order Status Tracker page)
  --> POST / { orderId, submittedEmail?, ipAddress? }   (Origin: partifyusa.com | partify.ca)
        --> route to US or CA store by Origin
        --> Shopify GraphQL (2023-01): order + metafields + fulfillments + line items
              └─ no order? --> log + 404 Order Not Found
        --> normalize carrier company --> AfterShip courier slug
        --> AfterShip GET /v4/trackings/{slug}/{number}  (one per tracking number)
        --> sendToGoogleSheets(...)   append lookup to Order Status Tracker Logs (best-effort)
        --> 200 { shopifyResponse, aftershipResponse }
```

## Required Shopify API Scopes

The store's Admin API token needs at least `read_orders` (covers orders,
order metafields, fulfillments, line items, and refunds). To look up orders older
than 60 days, Shopify additionally requires the protected `read_all_orders` scope,
which must be explicitly granted.

## Known Constraints & Gotchas

- **Name collision with the Sync service.** `order-status-fetcher` (this page) and
  `sql-order-status-tracking-sheets` (the Sync page) are different services in
  different GCP projects. Confirm which one you mean before changing anything.
- **Origin-gated.** Requests are rejected unless the `Origin` is a known Partify
  storefront (or `127.0.0.1`). Calling the service from anywhere else returns
  `400 Incorrect origin`.
- **Carrier slug map is hardcoded.** Only the four carriers above are mapped; a new
  carrier needs a new mapping rule or AfterShip enrichment will be skipped for it.
- **Logging is best-effort.** A Google Sheet failure is swallowed so the shopper
  still gets their result — so a missing log row does not mean the lookup failed.
- **Tracking assumes `trackingInfo[0]`.** The slug and the per-fulfillment tracking
  number are read from the first `trackingInfo` entry; multi-carrier fulfillments
  are not fully represented.
- **Pinned API version.** The Shopify GraphQL calls use API version `2023-01`.

## Safe to Change

- Logging and console output
- Adding carrier slug mappings to the normalization table
- Non-functional refactors that preserve the request/response contract and the
  log payload shape

## Dangerous to Change

- The `Origin`-based store routing — getting it wrong sends a CA lookup to the US
  store (or rejects valid traffic)
- The Shopify GraphQL query shape — the storefront tracker page reads specific
  fields out of `shopifyResponse`
- The Google Sheets log payload — the bound Apps Script expects the current field
  set
- The CORS headers — a mistake here breaks the tracker page in the browser

## Related Files

- `index.js` — the entire function (entry point `fetchOrderStatusMetafields`)
- `Dockerfile` — Cloud Run build definition (Node 20 Alpine, non-root user)
- `.github/workflows/deploy.yml` — GitHub Actions deploy (WIF → Artifact Registry → Cloud Run)
- Source repo: [`Partify-USA/order-status-fetcher`](https://github.com/Partify-USA/order-status-fetcher)

## Related Documentation

- [Order Status Production Sync](order-status-sync.md) — writes the production-status metafields the tracker page displays
- [Google Sheets Logging](../data-and-decoding/google-sheets-logging.md) — the Order Status Tracker Logs sheet this service writes to
- [Cloud Services Overview](overview.md) · [Secrets](secrets.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-19
