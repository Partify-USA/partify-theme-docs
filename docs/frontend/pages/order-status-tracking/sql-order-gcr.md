---
title: Order Status Production Sync (Google Cloud Run)
description: Google Cloud Run service that reads open orders from Google Sheets, aggregates scan data in PostgreSQL, formats Shopify metafields in SQL, and writes a Shopify-import-compatible sheet.
---

## Purpose

Google Cloud Run – Production Status Sync is an HTTP-triggered service that reads open order numbers and SKUs from a Google Sheet (`1k8j-Ki6P6AlYFTgqhD1GWJ5ikLS7LuhXrCanOKXdpIE` — Finale Open Orders), correlates them with scan events in a PostgreSQL warehouse, builds Shopify metafield values entirely in SQL, and writes the results into a second Google Sheet (`19NnMjBGceTfzIX4XT4pb5aP_hlgp-3Guothd3iSl7Lw` — Extracted Data from Postgres) in a Shopify-import-compatible layout.

## Scope of Responsibility

### Owns

- Reading open order identifiers and SKUs from the "Open Orders" Google Sheet (columns C and D)
- Normalizing order numbers to a base identifier while retaining the full, lettered order for per-piece matching
- Connecting to PostgreSQL using `dbConfig.json` (path configurable via `DB_CONFIG_PATH` env var) and querying the `scans` table
- Aggregating latest scan timestamps per base order, per-SKU, and workflow step
- Building production status and step-specific metafield strings (prepared, painted, packaged, shipped) in SQL
- Writing fully formatted rows to the output Google Sheet in the exact layout required by Shopify metafield import
- Clearing and repopulating the output sheet on every run

### Does Not Own

- Scheduling or triggering of the job (handled by Cloud Scheduler cron `sql-order-status-sync-sheets` — search Cloud Scheduler in Google Cloud)
- Shopify metafield import itself (handled by Matrixify every 15 minutes)
- Maintenance of the PostgreSQL warehouse schema or upstream scan ingestion
- Business definitions of workflow steps or their naming conventions
- Shopify theme rendering of metafield values or storefront behavior

## Project Structure

```
server.js                   Express entry point — defines GET / and GET /run-job
src/
  auth.js                   Google Sheets auth using credentials.json (path via CREDENTIALS_PATH env var)
  fetchColumn.js            Reads open orders from Google Sheets (columns C and D)
  writeToSheet.js           Clears and rewrites the metafield import sheet
  syncOrderStatuses.js      Connects to PostgreSQL, executes the SQL query, orchestrates the full job
package.json                start script: node server.js
Dockerfile                  Cloud Run build definition (node:20-slim)
```

## Deployment

The service is deployed on **Google Cloud Run** (`sql-order-status-tracking-sheets`, region `us-east5`) with **continuous deployment from GitHub** (`Partify-USA/order-tracking-api`, branch `main`). Every push to `main` triggers a Cloud Build using the `Dockerfile` and automatically deploys a new revision.

Secrets (`credentials.json` and `dbConfig.json`) are stored in **Google Secret Manager** and mounted as files inside the container. The service reads their paths from environment variables:

| Variable           | Cloud Run value                 |
| ------------------ | ------------------------------- |
| `CREDENTIALS_PATH` | `/credentials/credentials.json` |
| `DB_CONFIG_PATH`   | `/dbConfig/dbConfig.json`       |

Locally these default to `./credentials.json` and `./dbConfig.json` in the project root.

## Local Testing

1. Place `credentials.json` and `dbConfig.json` in the `order-tracking-api/` root (both are gitignored).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   The server listens on `http://localhost:8080`.
4. Test the health check:
   ```
   GET http://localhost:8080/
   ```
5. Trigger the full job (reads Sheets, queries Postgres, writes Sheets):
   ```
   GET http://localhost:8080/run-job
   ```
   Use the `requests.http` file in the project root with the VS Code REST Client extension, or run with `curl`:
   ```bash
   curl http://localhost:8080/run-job
   ```

> No environment variables are required locally — `CREDENTIALS_PATH` and `DB_CONFIG_PATH` default to `./credentials.json` and `./dbConfig.json`.

## Data In

- **Google Sheet:** `Open Orders!C:D` from spreadsheet `1k8j-Ki6P6AlYFTgqhD1GWJ5ikLS7LuhXrCanOKXdpIE`
  - Column C contains open order numbers with suffix letters and optional slash segments (e.g. `U162378A/1`)
  - Column D contains the trusted SKU for that specific lettered order (e.g. `GM1230469C.WA8624`)
- **PostgreSQL warehouse:** table `scans` in `Warehouse` db with fields `Order_ID`, `StartTime`, `StepName`, `sku`
- **Configuration:** `dbConfig.json` (PostgreSQL connection) and `credentials.json` (Google service account)
- **HTTP trigger:** `GET /run-job` to the Cloud Run service URL

## Data Out / Side Effects

- **Google Sheets writes:**
  - Clears all data in `Sheet1` of spreadsheet `19NnMjBGceTfzIX4XT4pb5aP_hlgp-3Guothd3iSl7Lw`
  - Writes a full replacement dataset starting at `A1`, including header row and all computed metafields
- **Network calls:**
  - Google Sheets API (read `Open Orders!C:D`, clear `Sheet1`, write new rows)
  - PostgreSQL connection to run a single SQL query against the `scans` table
- **No persistent in-service state:** every execution is stateless and recomputes from source systems

## Key Logic Areas

### HTTP Entry Point

- `server.js` defines two routes:
  - `GET /` — health check, returns `"Service is running"`
  - `GET /run-job` — calls `syncOrderStatuses()` and returns `"Job completed successfully!"` on success or `500` on error
- Server binds to `0.0.0.0` on `$PORT` (default `8080`) as required by Cloud Run

### Order Ingestion and Normalization (`src/fetchColumn.js`)

- Reads columns C and D from `Open Orders!C:D` using a Google service account
- For each row, derives:
  - `fullOrder` — order identifier trimmed of any `/` suffix, preserving the trailing letter (e.g. `U162378A`)
  - `baseName` — `fullOrder` with trailing alphabetic characters stripped (e.g. `U162378`)
  - `sku` — trusted SKU from column D for that specific lettered order
- Returns an array of `{ baseName, fullOrder, sku }` objects

### Warehouse Query (`src/syncOrderStatuses.js`)

- Opens a PostgreSQL client using `dbConfig.json` (loaded lazily at call time, not at startup)
- Executes a single parameterized SQL statement built from the sheet data
- The `order_skus` CTE materializes the sheet data: `order_skus(base_name, full_order, sku) AS (VALUES (...))`
- The `latest_scans` CTE joins to `scans` via the full lettered order:
  - `JOIN scans s ON split_part(s."Order_ID", '/', 1) = os.full_order`
  - Groups by `(base_name, sku, StepName)` and computes `MAX(s."StartTime") AS latest_time`
- The final `SELECT` aggregates over `base_name`, yielding one output row per base order

### Metafield Construction

All metafield formatting happens inside SQL. Base value format per status entry:

```sql
CONCAT(l.sku, '_', to_char(l.latest_time, 'HH12:MI AM MM-DD-YYYY'))
```

> **Timezone note:** `StartTime` values are stored in Eastern Time in the database. No timezone conversion is applied — `to_char` formats the value as-is.

Step-to-metafield mapping:

| Metafield column    | Step names                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `status_prepared`   | `PrepUS - Prepara`, `PrepCA`                                                                                                                  |
| `status_painted`    | `PaintUS - Pintar`, `PaintCA`, `ClearUS`                                                                                                      |
| `status_packaged`   | `PackUS - Embalar`, `PackCA`                                                                                                                  |
| `status_shipped`    | `Warren Ship`, `Loading FedEx - USA`, `Loading RL`, `Loading SAIA`, `Loading RoadRunner`, `BoxCA`, `Loading FedEx - Canada`, `Loading Canpar` |
| `production_status` | All of the above combined                                                                                                                     |

`STRING_AGG(DISTINCT ..., ', ')` combines multiple step entries per metafield. Orders with no qualifying steps are excluded via the `HAVING` clause.

### Output Sheet Layout (`src/writeToSheet.js`)

Clears `Sheet1` then writes headers and data in fixed column order:

| Column | Field                                                             |
| ------ | ----------------------------------------------------------------- |
| A      | `Name` (base order, e.g. `U162378`)                               |
| B      | `SKU`                                                             |
| C      | `Command` (always `UPDATE`)                                       |
| D      | `Metafield: custom.production_status [multi_line_text_field]`     |
| E      | `Metafield: custom.status_shipped [list.single_line_text_field]`  |
| F      | `Metafield: custom.status_packaged [list.single_line_text_field]` |
| G      | `Metafield: custom.status_painted [list.single_line_text_field]`  |
| H      | `Metafield: custom.status_prepared [list.single_line_text_field]` |

## High-Level Flow Diagram

```
Cloud Scheduler (every 15 min)
  --> GET /run-job (Cloud Run)
    --> fetchColumn()        reads Open Orders!C:D from Google Sheets
    --> syncOrderStatuses()  connects to PostgreSQL, runs SQL query
    --> writeToSheet()       clears and rewrites Sheet1
  --> Matrixify picks up Sheet1 and imports metafields to Shopify
```

## Known Constraints & Gotchas

- **No internal scheduling:** the job only runs when `GET /run-job` is called externally (Cloud Scheduler)
- **Strict dependence on step names:** step-to-metafield mapping relies on exact `StepName` strings; upstream renames will silently break categorizations
- **SQL-only formatting:** timestamp format, SKU delimiter, and metafield structure are encoded in SQL; JavaScript must not reformat these values
- **Full sheet overwrite:** every run clears `Sheet1` entirely; any manual edits in that sheet will be lost
- **Timezone assumption:** `StartTime` is stored as Eastern Time in the database with no conversion needed; do not add timezone conversion to the SQL
- **Filtered orders only:** orders with no qualifying workflow steps are excluded from results
- **Lazy config loading:** `dbConfig.json` is loaded inside `syncOrderStatuses()` at call time (not at module load) so the server starts cleanly even when secrets aren't available at startup

## Safe to Change

- Logging and error reporting
- Non-functional refactors that do not alter SQL semantics or I/O contracts
- HTTP response messaging and observability (e.g. returning processed order counts)
- Adding new step names to an existing metafield's step list

## Dangerous to Change

- Order normalization rules (`split('/')` and trailing-letter removal) in `fetchColumn.js`
- SQL that constructs metafield values, including timestamp format, SKU delimiter
- The mapping of `StepName` values into metafield columns
- Spreadsheet IDs, sheet names (`Open Orders`, `Sheet1`), and header labels and column ordering expected by Shopify import
- Clearing behavior for `Sheet1`
- Authentication configuration, secret paths, or the `CREDENTIALS_PATH` / `DB_CONFIG_PATH` env var names

## Related Files

- `dbConfig.json` — PostgreSQL connection configuration (gitignored, mounted via Secret Manager in Cloud Run)
- `credentials.json` — Google Sheets service account credentials (gitignored, mounted via Secret Manager in Cloud Run)
- Cloud Scheduler job: `sql-order-status-sync-sheets` — triggers `GET /run-job` every 15 minutes
- Matrixify — picks up the output sheet and imports metafields into Shopify

## Owner & Maintenance

- **Owner:** Wyatt Chamberlin
- **Last Updated:** 2026-03-04
