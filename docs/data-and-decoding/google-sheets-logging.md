---
title: Google Sheets Logging
description: The Google Sheets used as logging sinks across Partify — vehicle lookups (Garage and VIN Decoder), order-status searches, search-bar queries, and the discontinued Bumper vs Qapter audit — each fed by an Apps Script bound to its sheet.
sidebar_position: 1
---

# Google Sheets Logging

## Purpose

Several user actions on the storefront are logged to Google Sheets so the team
can audit usage and verify decode accuracy. Each sheet records a different
action, and each is written by a **Google Apps Script bound to that sheet** — a
deployed web app that receives the event and appends a row. This page maps every
logging sheet, what it captures, and where the action originates.

> These are **logging sinks** only — nothing in the production pipeline reads
> from them. (The Finale "Open Orders" sheet that the
> [Order Status Sync](../cloud-services/order-status-sync.md) service reads is an
> input source, not a log, and is documented on that service's page.)

## Sheets Inventory

| Sheet                         | Spreadsheet                                                                                                   | Logs                                                 | Entry point                          | Status           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------ | ---------------- |
| **Garage API Usage — USA**    | [`1KT_uGMW…YHrwg`](https://docs.google.com/spreadsheets/d/1KT_uGMW0ESPVW3tv9TO548fUAwRhXmwZp6ots1YHrwg/edit)  | Vehicle lookups entered at the **Garage** (US store) | Navbar + product-page AdamSearch     | Live             |
| **Garage API Usage — CA**     | [`1QSuRy7T…rxVCts`](https://docs.google.com/spreadsheets/d/1QSuRy7TJX3Smc2EGIzweG5cw0ilhHGm-sapk-rxVCts/edit) | Vehicle lookups entered at the **Garage** (CA store) | Navbar + product-page AdamSearch     | Live             |
| **VIN Decoder Logs**          | [`1OZl8bux…dv8cI`](https://docs.google.com/spreadsheets/d/1OZl8buxoSPjU3OXTfp7Fhn4r4CmuW34DM78WFidv8cI/edit)  | Vehicle lookups entered at the **VIN Decoder**       | Product page → paint options section | Live             |
| **Order Status Tracker Logs** | [`15Lm5HHA…uVqNc`](https://docs.google.com/spreadsheets/d/15Lm5HHAfK_wacnJj5ByECL0oexARG7oScsSkxEuVqNc/edit)  | Every order lookup on the order-status tracker page  | Order Status Tracker page            | Live             |
| **Search Bar Queries**        | [`1WJPfWf1…LzZ5E`](https://docs.google.com/spreadsheets/d/1WJPfWf1O7GIj5gyKRtTqQhPDCW9lHQaohHQ7tCLzZ5E/edit)  | Every query a user enters into the search bar        | Predictive search bar (navbar)       | Live             |
| **Bumper vs Qapter Orders**   | [`1q9wOo_a…RZtzs`](https://docs.google.com/spreadsheets/d/1q9wOo_auNVkI300La_nJsALyKGRqLaM5uD44pkRZtzs/edit)  | VINs decoded by Bumper.com, for accuracy auditing    | —                                    | **Discontinued** |

## Vehicle Lookup Logs

A customer can enter a VIN or license plate in **two different places** on the
storefront, and each place logs to its own sheet:

### Garage level

The **Garage** is present on **every page** — in the navbar and on product pages
inside AdamSearch. VIN / license-plate lookups made here are logged per store:

- **Garage API Usage — USA** — US store
  ([`1KT_uGMW0ESPVW3tv9TO548fUAwRhXmwZp6ots1YHrwg`](https://docs.google.com/spreadsheets/d/1KT_uGMW0ESPVW3tv9TO548fUAwRhXmwZp6ots1YHrwg/edit))
- **Garage API Usage — CA** — CA store
  ([`1QSuRy7TJX3Smc2EGIzweG5cw0ilhHGm-sapk-rxVCts`](https://docs.google.com/spreadsheets/d/1QSuRy7TJX3Smc2EGIzweG5cw0ilhHGm-sapk-rxVCts/edit))

### VIN Decoder level

The **VIN Decoder** appears **only on the product page**, in the paint options
section. Lookups made there are logged to a single sheet (both stores):

- **VIN Decoder Logs**
  ([`1OZl8buxoSPjU3OXTfp7Fhn4r4CmuW34DM78WFidv8cI`](https://docs.google.com/spreadsheets/d/1OZl8buxoSPjU3OXTfp7Fhn4r4CmuW34DM78WFidv8cI/edit))

See the [Paint Decode Pipeline](paint-decode-pipeline.md) for how these lookups
resolve a vehicle to paint codes (ChromeData + Bumper.com).

## Other Logs

### Order Status Tracker Logs

Records every time someone searches for their order on the **Order Status
Tracker** page — see [Order Status Sync](../cloud-services/order-status-sync.md)
for the service behind that page's data.
([`15Lm5HHAfK_wacnJj5ByECL0oexARG7oScsSkxEuVqNc`](https://docs.google.com/spreadsheets/d/15Lm5HHAfK_wacnJj5ByECL0oexARG7oScsSkxEuVqNc/edit))

### Search Bar Queries

Logs **every single thing** a user enters into the search bar. The predictive
search bar sends this telemetry via `navigator.sendBeacon` so navigation never
blocks on logging — see
[Predictive Search Bar](../theme-code/global-components/navbar/predictive_searchbar.md).
([`1WJPfWf1O7GIj5gyKRtTqQhPDCW9lHQaohHQ7tCLzZ5E`](https://docs.google.com/spreadsheets/d/1WJPfWf1O7GIj5gyKRtTqQhPDCW9lHQaohHQ7tCLzZ5E/edit))

### Bumper vs Qapter Orders (discontinued)

**No longer in use**, but worth knowing about. Christian used this sheet to
verify that the VINs decoded by **Bumper.com** were correct (Bumper vs Qapter).
([`1q9wOo_auNVkI300La_nJsALyKGRqLaM5uD44pkRZtzs`](https://docs.google.com/spreadsheets/d/1q9wOo_auNVkI300La_nJsALyKGRqLaM5uD44pkRZtzs/edit))

## How Logging Works

Each sheet is written by a **Google Apps Script bound to that sheet** (the script
lives in the spreadsheet's own Apps Script project, deployed as a
`script.google.com/macros/s/.../exec` web app). The storefront posts the event to
that web app, and the script appends a row. Because the script is bound to the
sheet, **each sheet's logging logic is edited from that sheet** (Extensions →
Apps Script), not from a central repo.

> These bound Apps Scripts are the **live** Apps Scripts in the stack.

## Known Constraints & Gotchas

- **Logging is best-effort** — a failed POST/beacon does not block the user's
  lookup, search, or navigation.
- **Per-store split for the Garage** — US and CA lookups go to different sheets;
  reporting across both stores means combining the two Garage sheets.
- **Logic lives in the sheets, not in git** — to change what gets logged or its
  format, you edit the bound Apps Script inside each spreadsheet. There is no
  version control on these scripts beyond Apps Script's own revision history.
- **Bumper vs Qapter is frozen** — discontinued; do not rely on it for current
  data.

## Open Questions (to confirm)

- Which Google account **owns** each bound Apps Script / spreadsheet, and who
  retains edit access after the transition.
- Whether the Garage and VIN Decoder logs share a common payload schema or each
  has its own column layout.

## Related Pages

- [Paint Decode Pipeline](paint-decode-pipeline.md)
- [Order Status Production Sync](../cloud-services/order-status-sync.md)
- [Predictive Search Bar](../theme-code/global-components/navbar/predictive_searchbar.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-11
