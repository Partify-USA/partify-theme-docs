---
title: Paint Decode Pipeline
description: How a VIN (or license plate) becomes a paint code on the storefront — ChromeData decodes vehicle data and paint codes, Bumper.com is used only to turn license plates into VINs, and certain makes always fall back to Match Paint by VIN.
sidebar_position: 2
---

# Paint Decode Pipeline

## Purpose

The paint decode pipeline turns a customer's **VIN** (or license plate) into a
**paint code** so the storefront can auto-select the correct paint variant.

**ChromeData (JD Power VSS) is the single decode source** — it supplies both the
vehicle data (year, make, model, submodel, engine) **and** the paint code.
**Bumper.com is used for one thing only: turning a license plate into a VIN.**
Both providers are fronted by Cloud Run services so credentials never reach the
browser.

> **No longer the case:** Bumper.com used to supply paint codes for makes that
> ChromeData covered poorly. That is no longer done — the Bumper paint path is
> disabled in the theme (see [Selection Logic](#selection-logic)). Bumper.com is
> now exclusively the license-plate → VIN decoder.

## Consumers

| Consumer | What it is |
| --- | --- |
| Storefront product page | The [VIN decoder input box](../theme-code/pages/product-page/vin-decoder.md) calls the decode services and auto-selects the paint variant |
| Internal ChromeData lookup tool | A standalone React app (GitHub Pages) for staff to look up vehicle style data manually; logs to a sheet |

## Storefront Decode Services (Cloud Run, `us-east5`)

The theme calls these services directly (URLs hardcoded in `assets/global-library.js`):

| Provider / Service | Service URL | Used for | Status |
| --- | --- | --- | --- |
| **ChromeData** (`garage-vin-service-node`) | `garage-vin-service-node-740168228309.us-east5.run.app/fetchVehicleData` (POST `{ vin, state, plate, location }`) | Vehicle data (year, make, model, submodel, engine) **and** paint codes | **Live — the decode source** |
| **Bumper.com — plate → VIN** (`license-to-vin`) | `license-to-vin-273472976974.us-east5.run.app/license-to-vin?state=…&plate=…` (GET) | License plate → VIN **only** | **Live** (the only Bumper.com use) |
| Bumper.com — paint (`bumperdotcom-api`) | `bumperdotcom-api-345230973812.us-east5.run.app/bumperdotcom-api?vin=…` (GET) | Formerly: paint code for certain makes | **Disabled** — `fetchFromBumper()` is commented out in the theme |

> Both Bumper services are Bumper.com, but only the plate→VIN one is in use. The
> paint endpoint (`bumperdotcom-api`) is dormant — the calling code is commented
> out and gated on "more bumper credits."

> ⚠️ **Source repos for these services are not in the monorepo.** They are
> deployed Cloud Run services (project numbers in the URLs) whose source lives
> elsewhere. Locating those repos is an open question (below). They belong on the
> [Cloud Services Overview](../cloud-services/overview.md) once confirmed.

## Selection Logic

### Inputs: VIN vs. license plate

There are two ways a customer gives us their vehicle, and they take different
routes to ChromeData:

- **VIN entered directly** → goes **straight to ChromeData**
  (`fetchVehicleData`). Bumper.com is **bypassed entirely**.
- **License plate entered** → Bumper.com (`fetchBumpersLicenseToVin` →
  `license-to-vin`) decodes the plate into a **VIN** first, then that VIN is sent
  to ChromeData. This is the **only** time Bumper.com is called.

In both cases, ChromeData does the actual vehicle + paint decode.

### ChromeData is the only paint source

ChromeData returns both the vehicle data and the paint code. The old "use Bumper
for the paint code when ChromeData covers a make poorly" behavior is **gone** —
`fetchFromBumper()` and `normalizeBumperData()` for paint are commented out in
`global-library.js`.

### `bumperdotcom_makes_list` → always Match Paint by VIN

The theme setting `bumperdotcom_makes_list` (loaded into JS as
`bumperMakesGlobal`) is now a **"force manual VIN paint match" list**, not a
"use Bumper for paint" list. For any vehicle whose make is in that list (when the
license-plate option is enabled, US store):

- The ChromeData paint code is **discarded — even if ChromeData decoded one
  successfully.**
- The paint code is forced to **`.VIN`**, which routes the product to **Match
  Paint by VIN** (the `.VIN` suffix appended to the SKU).

So **every `bumperdotcom_makes_list` vehicle always resorts to Match Paint by
VIN.** The same `.VIN` fallback also applies when ChromeData returns no paint
code at all. (This paint logic runs for the US store / `USD` and skips makes in
the separate `excludedMakesGlobal` list.)

### Normalization quirks

Toyota / Lexus / Scion paint codes are always 3 digits but a provider sometimes
returns 4 — the theme trims these.

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
Customer input
   │
   ├─ License plate ─► fetchBumpersLicenseToVin() ── license-to-vin ──► Bumper.com ─► VIN
   │                                                                                  │
   └─ VIN entered directly ───────────────────────────────────────────────────────► │
                                                                                      ▼
                          fetchVehicleDataByVin(vin) ── garage-vin-service-node ──► ChromeData (JD Power VSS)
                                                                                      │  vehicle data + paint code
                                                                                      ▼
                                          is make in bumperdotcom_makes_list (US store)?
                                             │ yes → discard ChromeData paint code → colorCode = ".VIN"
                                             │ no  → keep ChromeData paint code (".VIN" if none decoded)
                                                                                      ▼
                                          paint code resolved → auto-select variant
                                          (".VIN" → Match Paint by VIN; up to 3 attempts,
                                           two-tone handling, manual fallback — see VIN decoder doc)
```

## Known Constraints & Gotchas

- **Provider URLs are hardcoded in the theme** (`global-library.js`); changing a
  service URL requires a theme edit + deploy.
- **`bumperdotcom_makes_list` no longer routes to Bumper for paint** — it now
  forces those makes to Match Paint by VIN. The name is historical; treat it as a
  "force `.VIN`" list.
- **ChromeData is the only paint source.** Bumper.com is only ever called to turn
  a license plate into a VIN; if the customer gives a VIN directly, Bumper is not
  touched at all.
- **The Bumper paint endpoint is dormant, not removed** — `bumperdotcom-api` and
  the `fetchFromBumper()` call still exist but are commented out, gated on
  "more bumper credits." Re-enabling it is a code change, not a setting.

## Open Questions (to confirm)

- **Where do `garage-vin-service-node`, `bumperdotcom-api`, and `license-to-vin`
  source repos live?** (Not in the monorepo.)
- ChromeData (JD Power VSS) and Bumper.com **account/contract** details — owner,
  renewal, rate limits, and Bumper credit balance (the plate→VIN calls consume
  credits).
- Whether the internal lookup tool's hardcoded ChromeData secret has been rotated.

## Related Pages

- [VIN Decoder Input Box](../theme-code/pages/product-page/vin-decoder.md) (storefront UI + attempt/fallback logic)
- [Google Sheets Logging](google-sheets-logging.md)
- [Cloud Services Overview](../cloud-services/overview.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-10
