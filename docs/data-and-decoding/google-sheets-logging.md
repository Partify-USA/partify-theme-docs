---
title: Google Sheets Logging
description: How Google Sheets are used as a data source and a logging sink across Partify systems — the Open Orders sheet that feeds production status sync, and the lookup logger fed by the ChromeData tool.
sidebar_position: 1
---

# Google Sheets Logging

## Purpose

Google Sheets play two distinct roles at Partify: as an **input source** that
feeds a production pipeline, and as a **logging sink** that records lookups.
This page maps both so a successor knows which sheet drives what.

## Sheets Inventory

| Sheet | Spreadsheet ID | Role | Read/Written by |
| --- | --- | --- | --- |
| **Finale Open Orders** | `1k8j-Ki6P6AlYFTgqhD1GWJ5ikLS7LuhXrCanOKXdpIE` | Input — the list of active orders to push production status for | Read by [Order Status Sync](../cloud-services/order-status-sync.md) |
| **ChromeData lookup log** | _confirm ID_ | Sink — one row per vehicle lookup performed in the internal tool | Written by the ChromeData lookup tool (see [Paint Decode Pipeline](paint-decode-pipeline.md)) |

## Finale Open Orders (input)

The **Order Status Sync** Cloud Run service reads `Open Orders!C:D` from this
spreadsheet on every run:

- **Column C** — order number with its piece letter and optional slash segment
  (e.g. `U162378A/1`)
- **Column D** — the trusted SKU for that specific lettered order
  (e.g. `GM1230469C.WA8624`)

The service authenticates with a **Google service account** (credentials JSON,
mounted from Secret Manager in production). Rows are filtered:

- The header row is skipped.
- Orders beginning with `E` (eBay) are skipped.
- The order is normalized to a `baseName` (trailing letters stripped) while the
  full lettered `fullOrder` is retained for per-piece scan matching.

> **Why a sheet, not a query?** The Open Orders list is curated outside the
> warehouse database; the sheet is the contract between whoever maintains the
> open-order list and the sync service.

## ChromeData Lookup Log (sink)

The internal **ChromeData lookup tool** posts every successful lookup to a
**Google Apps Script web app** (a deployed `script.google.com/macros/s/.../exec`
URL held in the tool's `REACT_APP_SHEETS_LOGGER` env var). The Apps Script
receives the POST and appends a row to its bound spreadsheet — giving a running
log of which vehicles/style IDs were looked up.

This is the only **live** Apps Script in the stack. (The `appsscript_*.js` files
in the Finale repo are dead migration-era reference code and are not used.)

## Data In / Data Out

- **In:** order numbers + SKUs (Open Orders sheet); lookup payloads (from the ChromeData tool)
- **Out:** the sync service consumes Open Orders read-only; the logger appends rows to its sheet

## Known Constraints & Gotchas

- **The Open Orders sheet is a hard dependency** of production status sync — if
  it is empty, renamed, or its columns shift, the sync silently processes nothing.
- **Service-account access** must remain shared on the Open Orders sheet; losing
  access breaks the sync with an auth error.
- The lookup logger is best-effort — a failed POST does not block a lookup.

## Open Questions (to confirm)

- What populates the **Open Orders** sheet (a Finale export, a script, or manual
  entry) and on what cadence?
- The **spreadsheet ID** and **Apps Script project** behind the ChromeData
  lookup log, and which Google account owns the script.
- The exact **service account** identity used for Sheets access.

## Related Pages

- [Order Status Production Sync](../cloud-services/order-status-sync.md)
- [Paint Decode Pipeline](paint-decode-pipeline.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-10
