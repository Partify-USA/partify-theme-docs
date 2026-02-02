---
title: Order Status Production Sync (Google Cloud Run)
description: Google Cloud Run job that reads open orders from Google Sheets, aggregates scan data in PostgreSQL, formats Shopify metafields in SQL, and writes a Shopify-import-compatible sheet.
---

## Purpose

Google Cloud Run – Production Status Sync Job is an HTTP-triggered service that reads open order numbers and SKUs from a Google Sheet ('1k8j-Ki6P6AlYFTgqhD1GWJ5ikLS7LuhXrCanOKXdpIE' -- Finale Open Orders), correlates them with scan events in a PostgreSQL warehouse, builds Shopify metafield values entirely in SQL, and writes the results into a second Google Sheet ('19NnMjBGceTfzIX4XT4pb5aP_hlgp-3Guothd3iSl7Lw' -- Extracted Data from Postgres) in a Shopify-import-compatible layout.

## Scope of Responsibility

### Owns

- Reading open order identifiers and SKUs from the "Open Orders" Google Sheet (columns C and D)
- Normalizing order numbers to a base identifier while retaining the full, lettered order for per-piece matching
- Connecting to PostgreSQL using `dbConfig.json` and querying the `scans` table
- Aggregating latest scan timestamps per base order, per-SKU, and workflow step
- Building production status and step-specific metafield strings (prepared, painted, packaged, shipped) in SQL
- Writing fully formatted rows to the output Google Sheet in the exact layout required by Shopify metafield import
- Clearing and repopulating the output sheet on every run

### Does Not Own

- Scheduling or triggering of the job (this is handled by the Cloud Scheduler cron `sql-order-status-sync-sheets` -- can be found in Google Cloud by searching Cloud Scheduler)
- Shopify metafield import itself (this is handled by matrixify every 15 minutes)
- Maintenance of the PostgreSQL warehouse schema or upstream scan ingestion
- Business definitions of workflow steps or their naming conventions
- Shopify theme rendering of metafield values or storefront behavior

## Data In

- Google Sheet: `Open Orders!C:D` from spreadsheet `1k8j-Ki6P6AlYFTgqhD1GWJ5ikLS7LuhXrCanOKXdpIE`
  - Column C contains open order numbers with suffix letters and optional slash segments (for example `U162378A/1`)
  - Column D contains the trusted SKU for that specific lettered order (for example `GM1230469C.WA8624`)
- PostgreSQL warehouse:
  - Table `scans` from `Warehouse` db with fields including `OrderNumber`, `StartTime`, `StepName`, and SKU (`sku`)
- Configuration files and credentials:
  - `dbConfig.json` for PostgreSQL connection parameters
  - `credentials.json` for Google service account authentication
- HTTP Request:
  - `GET /run-job` request to the Cloud Run service (no request body is used by the pipeline)

## Data Out / Side Effects

- Google Sheets writes:
  - Clears all data in `Sheet1` of spreadsheet `19NnMjBGceTfzIX4XT4pb5aP_hlgp-3Guothd3iSl7Lw`
  - Writes a full replacement dataset starting at `A1`, including header row and all computed metafields
- Network calls:
  - Google Sheets API (read `Open Orders!C:D`, clear `Sheet1`, write new rows)
  - PostgreSQL connection to run a single SQL query against the `scans` table
- No persistent in-service state:
  - The service does not store any data between runs; every execution is stateless and recomputes from source systems

## Key Logic Areas

### HTTP Entry Point and Execution Model

- The only runtime entry point is the HTTP handler for `GET /run-job`.
- `app.get("/run-job", async (req, res) => { await saveToPostgres(); });` invokes `saveToPostgres()` and then returns.
- There is no internal scheduler in the service itself; execution is triggered externally by the Cloud Scheduler job `sql-order-status-syunc-sheets` hitting `/run-job`.

### Order Ingestion and Normalization (Google Sheets)

- `fetchColumn()` reads columns C and D from `Open Orders!C:D` using a Google service account and Google Sheets API.
- For each row, JavaScript derives:
  - `fullOrder` as the order identifier trimmed of any `/` suffix but preserving the trailing letter (for example `U162378A`).
  - `baseName` by stripping any trailing alphabetic characters from `fullOrder` (for example `U162378`).
  - `sku` as the trusted SKU from column D for that specific lettered order.
- The function returns an array of `{ baseName, fullOrder, sku }` objects, which become the authoritative mapping between base orders, lettered orders, and SKUs.

### Warehouse Query and Order/SKU Correlation (PostgreSQL)

- `saveToPostgres()` opens a PostgreSQL client using `dbConfig.json` and executes a single SQL statement against the `scans` table.
- The query first materializes an `order_skus` CTE from the sheet data:
  - `order_skus(base_name, full_order, sku) AS (VALUES (...))`.
- The `latest_scans` CTE then joins `order_skus` to `scans` via the full, lettered order number:
  - `JOIN scans s ON split_part(s."OrderNumber", '/', 1) = os.full_order`.
- This ensures each SKU is only associated with scan rows for its own lettered order (for example `U162378B`), while `base_name` (`U162378`) is kept for grouping the Shopify output.

### Latest Scan Selection per Base Order / SKU / Step

- `latest_scans` groups scan records by:
  - Base order name (`base_name`)
  - SKU from the sheet
  - Step name
- For each (base order, SKU, step) combination, the query computes:
  - `MAX(s."StartTime") AS latest_time` per SKU and step.
- The final `SELECT` aggregates over `base_name` only, yielding one output row per base order while still preserving per-SKU timestamps inside the metafield strings.

### Metafield Construction and Step Mapping (SQL Only)

- All metafield formatting happens inside the SQL query; JavaScript only passes parameters and forwards results.
- Base value format used for each status entry:
  - `CONCAT(l."sku", '_', to_char(l.latest_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York', 'HH12:MI AM MM-DD-YYYY'))`
- Timezone handling:
  - Timestamps are converted from UTC to `America/New_York` before formatting.
- Step-to-metafield mapping is enforced entirely in SQL:
  - Prepared: `'PrepUS - Prepara', 'PrepCA'`
  - Painted: `'PaintUS - Pintar', 'PaintCA', 'ClearUS'`
  - Packaged: `'PackUS - Embalar', 'PackCA'`
  - Shipped: `'Warren Ship', 'Loading FedEx - USA', 'Loading RL', 'Loading SAIA', 'Loading RoadRunner', 'BoxCA', 'Loading FedEx - Canada', 'Loading Canpar'`
- `STRING_AGG(DISTINCT ..., ', ')` is used to combine multiple step entries into a single, comma-separated string for each metafield column.
- `production_status` includes all step categories, while the four status\_\* metafields include only their respective step groups.

### Output Sheet Layout and Overwrite Behavior

- Before writing, the job clears `Sheet1` completely using `sheets.spreadsheets.values.clear`.
- It then writes headers and data rows in a fixed column order:
  - `Name`
  - `SKU`
  - `Command`
  - `Metafield: custom.production_status [multi_line_text_field]`
  - `Metafield: custom.status_shipped [list.single_line_text_field]`
  - `Metafield: custom.status_packaged [list.single_line_text_field]`
  - `Metafield: custom.status_painted [list.single_line_text_field]`
  - `Metafield: custom.status_prepared [list.single_line_text_field]`
- Each result row is written as:
  - `[row.name, row.sku, row.command, row.production_status, row.status_shipped, row.status_packaged, row.status_painted, row.status_prepared]`.
- Because the sheet is cleared first, each run fully replaces prior data and is effectively idempotent relative to source systems.

### Service Lifecycle and Resource Management

- After the SQL query completes and `writeToSheet(result.rows)` finishes, the PostgreSQL connection is closed.
- The HTTP request then completes; no background work continues after the response is sent.
- The Cloud Run instance holds no persistent state; each invocation is independent.

## High-Level Flow Diagram

1. Cloud Scheduler calls HTTP `GET /run-job` -- hits the Cloud Run service.
2. Service authenticates to Google Sheets using the service account from `credentials.json`.
3. `fetchColumn()` reads `Open Orders!C:C` and normalizes order numbers.
4. `saveToPostgres()` connects to PostgreSQL using `dbConfig.json`.
5. SQL query normalizes `OrderNumber`, filters to the open-order list, computes latest scans per (order, SKU, step), and builds metafield strings.
6. Query results are mapped into the Shopify import layout and passed to `writeToSheet()`.
7. Output `Sheet1` is cleared and rewritten with the new headers and data.
8. PostgreSQL connection is closed; HTTP response completes; service remains idle until the next call.

Cloud Scheduler --> saveToPostgres() (gcr function) --> Extracted Data from Postgres (Sheets) --> matrixify upload to shopify

## Known Constraints & Gotchas

- No internal scheduling:
  - The job only runs when `GET /run-job` is called by an external system (Cloud Scheduler).
- Duplicated order normalization logic:
  - Normalization runs in both JavaScript and SQL; these rules must stay in sync to avoid data mismatches.
- Strict dependence on step names:
  - Step-to-metafield mapping relies on exact `StepName` strings; any upstream renames will silently break categorizations.
- SQL-only formatting:
  - Timestamp format, SKU delimiter, and metafield structure are all encoded in SQL; JavaScript must not reformat these values.
- Full sheet overwrite:
  - Every run clears `Sheet1` entirely; any manual edits or auxiliary data in that sheet will be lost.
- Timezone assumptions:
  - All timestamps are presented in `America/New_York`; consumers must not assume UTC.
- Filtered orders only:
  - Orders with no qualifying workflow steps (per the configured step lists) are excluded from the final result set.

## Safe to Change

- Logging and error reporting around Google Sheets and PostgreSQL calls.
- Non-functional refactors inside `saveToPostgres()` and related helpers that do not alter SQL semantics or I/O contracts.
- Adding additional, clearly non-Shopify columns to the output (e.g., debug-only columns), provided downstream import tooling explicitly ignores them.
- HTTP response messaging and basic observability (e.g., returning simple summaries of processed order counts).

## Dangerous to Change

- Order normalization rules in either JavaScript or SQL (`split('/')` and trailing-letter removal).
- SQL that constructs metafield values, including timestamp format, SKU delimiter, and timezone conversion.
- The mapping of `StepName` values into prepared/painted/packaged/shipped/production_status metafields.
- Spreadsheet IDs, sheet names (`Open Orders`, `Sheet1`), and the exact header labels and column ordering expected by Shopify import.
- Clearing behavior for `Sheet1`; partial clears or appends can break downstream import expectations.
- Authentication configuration for the Google service account, scopes, or the location of `credentials.json` and `dbConfig.json`.

## Related Files

- `dbConfig.json` (PostgreSQL connection configuration)
- `credentials.json` (Google Sheets service account credentials)
- Cloud Run service source file that defines `app.get("/run-job")` and `saveToPostgres()`
- Infrastructure configuration that wires the public URL of this Cloud Run service into Cloud Scheduler or other external triggers

## Owner & Maintenance

- **Owner:** Wyatt Chamberlin
- **Last Updated:** 2026-02-02
