---
title: Paint Decode Pipeline
description: How a VIN (or license plate) becomes a paint code on the storefront — the ChromeData and Bumper.com decode services, their selection logic, and the internal ChromeData lookup tool.
sidebar_position: 2
---

# Paint Decode Pipeline

## Purpose

The paint decode pipeline turns a customer's **VIN** (or license plate) into a
**paint code** so the storefront can auto-select the correct paint variant. It
uses two providers — **ChromeData** (JD Power VSS) as the primary source and
**Bumper.com** for makes ChromeData covers poorly — fronted by Cloud Run
services so credentials never reach the browser.

## Consumers

| Consumer | What it is |
| --- | --- |
| Storefront product page | The [VIN decoder input box](../theme-code/pages/product-page/vin-decoder.md) calls the decode services and auto-selects the paint variant |
| Internal ChromeData lookup tool | A standalone React app (GitHub Pages) for staff to look up vehicle style data manually; logs to a sheet |

## Storefront Decode Services (Cloud Run, `us-east5`)

The theme calls these services directly (URLs hardcoded in `assets/global-library.js`):

| Provider | Service URL | Method | Input |
| --- | --- | --- | --- |
| ChromeData | `garage-vin-service-node-740168228309.us-east5.run.app/fetchVehicleData` | POST | `{ vin, state, plate, location }` |
| Bumper.com | `bumperdotcom-api-345230973812.us-east5.run.app/bumperdotcom-api?vin=…` | GET | `vin` query param |
| Plate → VIN | `license-to-vin-273472976974.us-east5.run.app/license-to-vin?state=…&plate=…` | GET | `state`, `plate` |

> ⚠️ **Source repos for these services are not in the monorepo.** They are
> deployed Cloud Run services (project numbers in the URLs) whose source lives
> elsewhere. Locating those repos is an open question (below). They belong on the
> [Cloud Services Overview](../cloud-services/overview.md) once confirmed.

## Selection Logic

1. **ChromeData first, always.** `fetchFromChromeData()` is called first to
   establish consistent vehicle data (year/make/model/style/colors). The raw
   payload is run through `normalizeChromeData()` into a common shape.
2. **Bumper for specific makes.** Makes listed in the theme setting
   `bumperdotcom_makes_list` (mirrored in `is_bumperdotcom_make_found` and the
   JS `chromeDataMakesGlobal`) are decoded via `fetchFromBumper()`. When a make
   is a "bumper make" and ChromeData did not resolve a paint code, the Bumper
   color code is used instead.
3. **License plate path.** If the customer enters a plate instead of a VIN, the
   theme first calls the plate→VIN service, then proceeds with the VIN flow.
4. **Normalization quirks.** Toyota / Lexus / Scion paint codes are always 3
   digits but a provider sometimes returns 4 — the theme trims these. Bumper does
   not return hex color values; ChromeData does.

## Internal ChromeData Lookup Tool

A standalone **create-react-app** (repo `chromedata-lookup`, deployed to GitHub
Pages) for staff to look up vehicle data manually:

- **Lookup by Style ID** or by **Year / Make / Model** against the JD Power VSS
  API (`https://vss-api.jdpower.com/VSS/v1.0/...`).
- Auth uses the ChromeData **Atmosphere** scheme: `app_id` + `shared_secret` +
  nonce + SHA-1 `secret_digest` + realm.
- Each successful lookup is POSTed to a Google Apps Script web app that logs it
  to a sheet (see [Google Sheets Logging](google-sheets-logging.md)).

> ⚠️ **Security:** the tool currently has the ChromeData `shared_secret` and
> `app_id` **hardcoded in client-side code** (`src/YMM.js`) on a public repo.
> These should be rotated and moved server-side; a client-side app cannot keep an
> API secret secret.

## High-Level Flow (storefront)

```
VIN box (product page)
   │  (or plate → license-to-vin → VIN)
   ▼
fetchFromChromeData(vin,…)  ── garage-vin-service-node ──► ChromeData (JD Power VSS)
   │  normalizeChromeData()
   ▼
is make in bumperdotcom_makes_list?
   │ yes → fetchFromBumper(vin) ── bumperdotcom-api ──► Bumper.com
   ▼
paint code resolved → auto-select variant
   │ (up to 3 attempts, two-tone handling, manual fallback — see VIN decoder doc)
```

## Known Constraints & Gotchas

- **Provider URLs are hardcoded in the theme** (`global-library.js`); changing a
  service URL requires a theme edit + deploy.
- **`bumperdotcom_makes_list` is a theme setting** — the split between ChromeData
  and Bumper is configured there, not in the services.
- ChromeData is treated as the source of truth for vehicle data even when Bumper
  supplies the paint code.

## Open Questions (to confirm)

- **Where do `garage-vin-service-node`, `bumperdotcom-api`, and `license-to-vin`
  source repos live?** (Not in the monorepo.)
- ChromeData (JD Power VSS) and Bumper.com **account/contract** details — owner,
  renewal, rate limits.
- Whether the internal lookup tool's hardcoded ChromeData secret has been rotated.

## Related Pages

- [VIN Decoder Input Box](../theme-code/pages/product-page/vin-decoder.md) (storefront UI + attempt/fallback logic)
- [Google Sheets Logging](google-sheets-logging.md)
- [Cloud Services Overview](../cloud-services/overview.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-10
