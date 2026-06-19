---
title: Tax-Exemption Signup
description: Cloud Run service that turns a storefront tax-exemption application into a Shopify B2B company, customer contact, tax settings, and the uploaded exemption certificate — US store only.
sidebar_position: 8
---

# Tax-Exemption Signup

## Purpose

`tax-exemption-signup` takes a completed tax-exemption application from the
storefront and provisions everything it needs in Shopify B2B: a **company**, a
**customer** linked as the company's main contact, the company's **tax
settings** (tax-registration ID + exempt status), and the uploaded **exemption
certificate** (PDF) stored as a file and referenced from a metafield. It runs
against the **US store only** (`partify-usa-123.myshopify.com`).

## Scope of Responsibility

### Owns

- Looking up whether a customer already exists for the submitted email
- Creating the Shopify **company** (with or without a new customer, depending on
  whether the email already exists)
- Linking an existing customer to the new company as a **company contact** and
  **main contact**, and assigning the company-location role
- Uploading the exemption-certificate **PDF** via `fileCreate` and attaching it
  to the company as `custom.tax_exemption_form`
- Writing the exemption metafields and flipping the customer/company to
  tax-exempt

### Does Not Own

- The storefront form UI that collects the application
- The CA store — this service is wired to the US store domain only
- Any approval workflow — it provisions the records immediately on submit

## Deployment

- **Repo:** [`Partify-USA/tax-exemption-signup`](https://github.com/Partify-USA/tax-exemption-signup) · folder `google_cloud/tax-exemption-signup`
- **Project:** `tax-exemption-signup` (project number `505215902673`) · **Region:** `us-east5`
- **Service:** `tax-exemption-signup` · **Entry point:** `createCustomerProfile` (functions-framework HTTP function)
- **Deploy:** GitHub Action `deploy.yml` on push to `main` — authenticates via
  Workload Identity Federation, builds the `Dockerfile`, pushes to Artifact
  Registry, then `gcloud run deploy`.
- **Sizing:** `min-instances=0`, `max-instances=100`, 512 MiB / 1 vCPU, 300s
  timeout, concurrency 80, `--ingress=all`.
- **Console:** [Cloud Run — `tax-exemption-signup`](https://console.cloud.google.com/run/detail/us-east5/tax-exemption-signup/metrics?project=505215902673)

> ⚠️ **Auth posture:** the deploy intentionally omits `--allow-unauthenticated`,
> but the service's invoker IAM check is disabled, so it is still reachable
> without a token. The deploy preserves this existing posture rather than
> changing it. Treat the endpoint as effectively public.

## Data In

- **Request:** `POST` with a JSON body. A `GET` (or other method) returns `405`;
  `OPTIONS` is answered for CORS preflight. CORS `Access-Control-Allow-Origin` is
  `*`.

  | Field | Purpose |
  | --- | --- |
  | `companyName` | Company to create |
  | `firstName`, `lastName`, `email`, `phone`, `title` | Main-contact identity |
  | `address`, `city`, `zipCode`, `stateAbbr`, `locationName` | Company location |
  | `taxRegistrationId` | Written into the company location's tax settings |
  | `pdf` | Base64 / URL of the exemption certificate, uploaded via `fileCreate` |
  | `typeText`, `reasonText` | Stored as `custom.tax_exempt_business_type` / `custom.tax_exempt_reason` |

- **Secret** (GCP Secret Manager → env var at deploy):
  `SHOPIFY_ADMIN_TOKEN` ← `tax-exemption-signup-shopify-admin-token`.

## Data Out / Side Effects

In Shopify (US store), per submission:

- A **company** and **company location** (with tax settings:
  `taxRegistrationId`, exempt)
- A **customer** as the company's **main contact** (created new, or an existing
  customer is linked and promoted)
- An uploaded **file** (the PDF) referenced by company metafield
  `custom.tax_exemption_form` (`file_reference`)
- Metafields: `checkoutblocks.trigger = "Exempted"` on the customer,
  `custom.tax_exempt_business_type` and `custom.tax_exempt_reason` on the company
- The customer is updated to tax-exempt

## Key Logic Areas

### Existing-customer branch

`getCustomerByEmail(email)` decides the path:

- **No existing customer** → `createCompanyWithCustomer(...)` creates the company
  *and* the customer together; the customer GID is read back from the company's
  main contact.
- **Existing customer** → `createCompanyWithoutCustomer(...)`, then
  `assignCustomerAsContact` → `assignMainContact` → `assignCompanyRole` link the
  existing customer to the new company and give them the company-location role.

Both branches then upload the PDF (if provided), write the exemption metafields,
and update the company-location and customer tax settings.

### Single store

The store domain is hardcoded to `partify-usa-123.myshopify.com`. This service is
US-only; there is no CA equivalent.

## High-Level Flow

```
Storefront form ─► POST createCustomerProfile
   │
   ├─ getCustomerByEmail(email)
   │     ├─ none ──► createCompanyWithCustomer ─► company + customer
   │     └─ exists ─► createCompanyWithoutCustomer ─► assign contact + main contact + role
   │
   ├─ pdf? ──► fileCreate ─► metafield custom.tax_exemption_form (file_reference)
   ├─ metafields: checkoutblocks.trigger="Exempted", tax_exempt_business_type, tax_exempt_reason
   └─ updateCompanyTaxSettings(taxRegistrationId) + updateCustomerTaxSettings(exempt)
         └─► 200 { success, company, companyId, fileResponse }
```

## Known Constraints & Gotchas

- **Effectively public endpoint** (see auth note above) — there is no shared
  secret on the request; validation is by request shape only.
- **No idempotency guard** — re-submitting the same email after the company
  exists takes the "existing customer" branch, but a duplicate company can still
  be created.
- **Provisions immediately** — there is no review/approval step; a submission
  flips the account to tax-exempt right away.
- **Shopify B2B + Admin API version coupling** — the GraphQL relies on Shopify
  B2B company objects and specific API versions; a breaking API change requires a
  code update + redeploy.

## Safe to Change

- Logging, CORS specifics, response shape

## Dangerous to Change

- The company/contact GraphQL mutations and the order of the link-up calls
  (`assignCustomerAsContact` → `assignMainContact` → `assignCompanyRole`)
- The metafield namespaces/keys (`checkoutblocks.trigger`,
  `custom.tax_exempt_*`, `custom.tax_exemption_form`) — checkout and theme logic
  read these
- The hardcoded store domain

## Related Pages

- [Cloud Services Overview](overview.md)
- [Secrets](secrets.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-15
