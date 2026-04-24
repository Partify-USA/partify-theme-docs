---
title: Order Status Production Sync (Google Cloud Run)
description: Google Cloud Run service that reads open orders from Google Sheets, aggregates scan data in PostgreSQL, and pushes production status metafields directly to Shopify via the GraphQL Admin API.
---

## Purpose

Google Cloud Run – Production Status Sync is an HTTP-triggered service that reads open order numbers and SKUs from a Google Sheet (`1k8j-Ki6P6AlYFTgqhD1GWJ5ikLS7LuhXrCanOKXdpIE` — Finale Open Orders), correlates them with scan events in a PostgreSQL warehouse, builds Shopify metafield values entirely in SQL, and pushes them directly to Shopify order metafields via the GraphQL Admin API.

## Scope of Responsibility

### Owns

- Reading open order identifiers and SKUs from the "Open Orders" Google Sheet (columns C and D)
- Normalizing order numbers to a base identifier while retaining the full, lettered order for per-piece matching
- Connecting to PostgreSQL using `dbConfig.json` (path configurable via `DB_CONFIG_PATH` env var) and querying the `scans` table
- Determining the most recently active part variant per SKU to avoid stale data from damaged/replaced parts
- Aggregating latest scan timestamps per base order, per-SKU, and workflow step
- Building production status and step-specific metafield strings (prepared, painted, packaged, shipped) in SQL
- Pushing metafields directly to Shopify order records via batched GraphQL mutations
- Clearing (deleting) metafields in Shopify when a field has no current qualifying scan data

### Does Not Own

- Scheduling or triggering of the job (handled by Cloud Scheduler cron `sql-order-status-sync-sheets` — search Cloud Scheduler in Google Cloud)
- Maintenance of the PostgreSQL warehouse schema or upstream scan ingestion
- Business definitions of workflow steps or their naming conventions
- Shopify theme rendering of metafield values or storefront behavior

## Project Structure

```
server.js                   Express entry point — HTTP routes and dry-run/test endpoints
src/
  auth.js                   Google Sheets auth using credentials.json (path via CREDENTIALS_PATH env var)
  fetchColumn.js            Reads open orders from Google Sheets (columns C and D)
  shopifyConfig.js          Shopify store URLs and token env var references, keyed by order prefix
  pushToShopify.js          Resolves Shopify order GIDs and pushes/deletes metafields via GraphQL
  syncOrderStatuses.js      Connects to PostgreSQL, executes the SQL query, orchestrates the full job
  writeToSheet.js           Legacy file — no longer used in the main job flow
package.json                start script: node server.js
Dockerfile                  Cloud Run build definition (node:20-slim)
requests.http               VS Code REST Client file for local testing
```

## Deployment

The service is deployed on **Google Cloud Run** (`sql-order-status-tracking-sheets`, region `us-east5`) with **continuous deployment from GitHub** (`Partify-USA/order-tracking-api`, branch `main`). Every push to `main` triggers a Cloud Build using the `Dockerfile` and automatically deploys a new revision.

Secrets (`credentials.json` and `dbConfig.json`) are stored in **Google Secret Manager** and mounted as files inside the container. The service reads their paths from environment variables:

| Variable           | Cloud Run value                 |
| ------------------ | ------------------------------- |
| `CREDENTIALS_PATH` | `/credentials/credentials.json` |
| `DB_CONFIG_PATH`   | `/dbConfig/dbConfig.json`       |
| `SHOPIFY_TOKEN_US` | Secret Manager secret           |
| `SHOPIFY_TOKEN_CA` | Secret Manager secret           |

Locally these default to `./credentials.json` and `./dbConfig.json` in the project root, and Shopify tokens are read from a `.env` file.

## Local Testing

1. Place `credentials.json` and `dbConfig.json` in the project root (both are gitignored).
2. Create a `.env` file with your Shopify tokens:
   ```
   SHOPIFY_TOKEN_US=your_us_token
   SHOPIFY_TOKEN_CA=your_ca_token
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
   The server listens on `http://localhost:8080`.

Use the `requests.http` file with the VS Code REST Client extension to hit any of the available endpoints:

| Endpoint             | Method | Description                                                                               |
| -------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `/`                  | GET    | Health check                                                                              |
| `/run-job`           | GET    | Full job — reads sheet, queries Postgres, pushes to Shopify                               |
| `/dry-run`           | GET    | Full sheet + Postgres run, resolves Shopify IDs, returns what would be pushed — no writes |
| `/test-single-order` | POST   | Single order test — pass `{ "orderName": "U184207", "dryRun": true/false }`               |

## Data In

- **Google Sheet:** `Open Orders!C:D` from spreadsheet `1k8j-Ki6P6AlYFTgqhD1GWJ5ikLS7LuhXrCanOKXdpIE`
  - Column C contains open order numbers with suffix letters and optional slash segments (e.g. `U162378A/1`)
  - Column D contains the trusted SKU for that specific lettered order (e.g. `GM1230469C.WA8624`)
- **PostgreSQL warehouse:** table `scans` in `Warehouse` db with fields `Order_ID`, `StartTime`, `StepName`
- **Configuration:** `dbConfig.json` (PostgreSQL connection) and `credentials.json` (Google service account)
- **HTTP trigger:** `GET /run-job` to the Cloud Run service URL

## Data Out / Side Effects

- **Shopify metafield writes:** for each resolved order, up to five metafields are set via `metafieldsSet`
- **Shopify metafield deletes:** metafields with no qualifying scan data are explicitly deleted via `metafieldsDelete` to clear stale values from prior runs
- **Network calls:**
  - Google Sheets API (read `Open Orders!C:D`)
  - PostgreSQL connection to run a single SQL query against the `scans` table
  - Shopify GraphQL Admin API (name-to-GID resolution, `metafieldsSet`, `metafieldsDelete`)
- **No persistent in-service state:** every execution is stateless and recomputes from source systems

## Key Logic Areas

### HTTP Entry Point (`server.js`)

- `GET /` — health check
- `GET /run-job` — calls `syncOrderStatuses()` which queries Postgres then calls `pushToShopify(rows)`
- `GET /dry-run` — runs the full Postgres query and calls `pushToShopify(rows, { dryRun: true })` — resolves Shopify order IDs and returns what would be pushed, but does not write anything
- `POST /test-single-order` — accepts `{ orderName, dryRun }`, runs the Postgres query scoped to that single order, and calls `pushToShopify()` — useful for verifying a single order end-to-end

### Order Ingestion and Normalization (`src/fetchColumn.js`)

- Reads columns C and D from `Open Orders!C:D` using a Google service account
- Skips rows where the order starts with `E` (eBay orders, not handled)
- For each row, derives:
  - `fullOrder` — order identifier trimmed of any `/` suffix, preserving the trailing letter (e.g. `U162378A`)
  - `baseName` — `fullOrder` with trailing alphabetic characters stripped (e.g. `U162378`)
  - `sku` — trusted SKU from column D for that specific lettered order
- Returns an array of `{ baseName, fullOrder, sku }` objects

### Warehouse Query (`src/syncOrderStatuses.js`)

- Opens a PostgreSQL client using `dbConfig.json` (loaded lazily at call time, not at startup)
- Executes a single parameterized SQL statement built from the sheet data
- The `order_skus` CTE materializes the sheet data: `order_skus(base_name, full_order, sku) AS (VALUES (...))`
- **`active_variants` CTE** — groups scans by exact `Order_ID` (keeping `U170718A` and `U170718A/D1` separate) and finds the latest scan time per variant
- **`current_parts` CTE** — selects only the most recently active variant per `(base_name, sku)` using `DISTINCT ON ... ORDER BY last_active DESC`. This ensures that if a part was damaged and replaced, only the replacement part's scans are used
- **`latest_scans` CTE** — joins scans on the exact `Order_ID` from `current_parts`, grouping by `(base_name, sku, StepName)` with `MAX(StartTime)`
- The final `SELECT` aggregates over `base_name`, yielding one output row per base order

### Damaged Part Handling

When a part is damaged and replaced mid-production, the system creates a new `Order_ID` variant (e.g. `U170718A/D1`). Without special handling, steps completed on the damaged part would still appear in the customer's timeline even though the replacement hasn't reached those steps yet.

The `active_variants` → `current_parts` CTE chain resolves this by identifying the variant with the most recent scan activity and using **only that variant's scans** for the output. Steps from the old damaged part are ignored entirely.

### Metafield Construction

All metafield formatting happens inside SQL. Base value format per status entry:

```sql
CONCAT(l.sku, '_', to_char(l.latest_time AT TIME ZONE 'UTC', 'HH12:MI AM MM-DD-YYYY'))
```

Step-to-metafield mapping:

| Metafield           | Step names                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `production_status` | All qualifying steps combined (displayed as `SKU_StepName` newline-separated)                                                                 |
| `status_prepared`   | `PrepUS - Prepara`, `PrepCA`, `Scuffing/Lijado`                                                                                               |
| `status_painted`    | `PaintUS - Pintar`, `PaintCA`, `ClearUS`                                                                                                      |
| `status_packaged`   | `PackUS - Embalar`, `PackCA`                                                                                                                  |
| `status_shipped`    | `Warren Ship`, `Loading FedEx - USA`, `Loading RL`, `Loading SAIA`, `Loading RoadRunner`, `BoxCA`, `Loading FedEx - Canada`, `Loading Canpar` |

`STRING_AGG(DISTINCT ..., ', ')` combines multiple step entries per metafield. Orders with no qualifying steps are excluded via the `HAVING` clause.

### Shopify Push (`src/pushToShopify.js`)

1. **Route by store** — orders are grouped by the first character of `baseName`: `U` → US store, `C` → CA store
2. **Resolve order GIDs** — order names are resolved to Shopify GIDs via batched `orders` GraphQL queries (50 names per request). Results are exact-match filtered in JS (Shopify's name search can return prefix matches). Requires `read_all_orders` scope to find orders older than 60 days
3. **Set metafields** — set inputs are batched in groups of 25 (`metafieldsSet`) for all fields with data
4. **Delete metafields** — delete inputs are batched in groups of 25 (`metafieldsDelete`) for all fields that returned null from SQL, clearing any stale values from prior runs

### Store Configuration (`src/shopifyConfig.js`)

| Prefix | Store                           | Token env var      |
| ------ | ------------------------------- | ------------------ |
| `U`    | `partify-usa-123.myshopify.com` | `SHOPIFY_TOKEN_US` |
| `C`    | `auto-realm.myshopify.com`      | `SHOPIFY_TOKEN_CA` |

## High-Level Flow Diagram

```
Cloud Scheduler (cron)
  --> GET /run-job (Cloud Run)
    --> fetchColumn()         reads Open Orders!C:D from Google Sheets
    --> syncOrderStatuses()   connects to PostgreSQL, runs SQL query
    --> pushToShopify(rows)
          --> resolveOrderIds()     batched Shopify name → GID lookup (50 per request)
          --> metafieldsSet         push fields with data (batches of 25)
          --> metafieldsDelete      clear fields with no data (batches of 25)
```

## Required Shopify API Scopes

| Scope             | Purpose                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `read_orders`     | Basic order lookup                                                                        |
| `write_orders`    | Write metafields to orders                                                                |
| `read_all_orders` | Access orders older than 60 days — protected scope, must be explicitly granted by Shopify |

## Known Constraints & Gotchas

- **No internal scheduling:** the job only runs when `GET /run-job` is called externally (Cloud Scheduler)
- **Strict dependence on step names:** step-to-metafield mapping relies on exact `StepName` strings in Postgres; upstream renames will silently break categorizations
- **SQL-only formatting:** timestamp format, SKU delimiter, and metafield structure are encoded in SQL; JavaScript must not reformat these values
- **Stale metafields are actively deleted:** when a field has no qualifying scan data, the metafield is deleted from Shopify — not just skipped — so old values never persist across runs
- **Filtered orders only:** orders with no qualifying workflow steps are excluded from SQL results entirely and receive no metafield updates
- **Lazy config loading:** `dbConfig.json` is loaded inside `syncOrderStatuses()` at call time (not at module load) so the server starts cleanly even when secrets aren't available at startup

## Safe to Change

- Logging and error reporting
- Non-functional refactors that do not alter SQL semantics or I/O contracts
- HTTP response messaging and observability (e.g. returning processed order counts)
- Adding new step names to an existing metafield's step list

## Dangerous to Change

- Order normalization rules (`split('/')` and trailing-letter removal) in `fetchColumn.js`
- SQL CTEs — especially `active_variants`, `current_parts`, and `latest_scans` — which encode the damaged-part handling logic
- SQL that constructs metafield values, including timestamp format and SKU delimiter
- The mapping of `StepName` values into metafield columns
- The `metafieldsDelete` logic — removing it will cause stale data to persist in Shopify after parts are replaced or jobs are re-run

## Related Files

- `dbConfig.json` — PostgreSQL connection configuration (gitignored, mounted via Secret Manager in Cloud Run)
- `credentials.json` — Google Sheets service account credentials (gitignored, mounted via Secret Manager in Cloud Run)
- Cloud Scheduler job: `sql-order-status-sync-sheets` — triggers `GET /run-job`
- `requests.http` — VS Code REST Client file for all local test endpoints

## Owner & Maintenance

- **Owner:** Wyatt Chamberlin
- **Last Updated:** 2026-04-24
