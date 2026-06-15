---
title: Secrets
description: Registry of the secrets the Partify Cloud Run services rely on — Google Secret Manager entries and the Finale Webhooks env — names and purpose only, never values, plus where each is stored and rotated.
sidebar_position: 10
---

# Secrets

## Purpose

A name-and-purpose registry of every secret the Cloud Run services rely on, and
where it lives. **No secret values appear here, ever** — this is a map, not a
vault. For the secrets the GitHub Actions workflows consume (CI/CD), see
[GitHub → Secrets](../github/secrets.md).

> ⚠️ **Never commit secret values** to any repo (including test files like
> `test.http` or client-side React source). Store them in Google Secret Manager
> (or GitHub Actions secrets) and reference them.

## Google Secret Manager (Cloud Run)

Secrets are stored per GCP project and surfaced to Cloud Run as file mounts or
env vars.

| Secret | Service / project | Surfaced as |
| --- | --- | --- |
| `order-status-credentials-json` | order-status (`alpine-sentry-448804-d4`) | file `/credentials/credentials.json` |
| `order-status-db-config-json` | order-status | file `/dbconfig/dbConfig.json` |
| `SHOPIFY_TOKEN_US`, `SHOPIFY_TOKEN_CA` | order-status | env vars |
| `fitment-proxy-us-admin-token`, `fitment-proxy-ca-admin-token` | fitment proxy (`partify-fitment-proxy`) | env var `SHOPIFY_ADMIN_TOKEN` |
| `fitment-proxy-us-refresh-secret`, `fitment-proxy-ca-refresh-secret` | fitment proxy | env var `REFRESH_SECRET` |
| `garage-vin-shopify-admin-token`, `garage-vin-chromedata-app-id`, `garage-vin-chromedata-shared-secret` | garage-vin-service-node (`ontime-eta`) | env vars `SHOPIFY_ADMIN_TOKEN`, `CHROMEDATA_APP_ID`, `CHROMEDATA_SHARED_SECRET` |
| `license-to-vin-bumper-api-key` | license-to-vin (`bumper-license-to-vin`) | env var `BUMPER_API_KEY` |
| `bumperdotcom-api-bumper-api-key` | bumperdotcom-api (`bumperdotcom-api`) | env var `BUMPER_API_KEY` |
| `tax-exemption-signup-shopify-admin-token` | tax-exemption-signup (`tax-exemption-signup`) | env var `SHOPIFY_ADMIN_TOKEN` |
| `customer-account-data-shopify-client-id`, `…-shopify-client-secret`, `…-shopify-admin-access-token` | customer-account-data (`customer-account-info`) | env vars |
| `update-customer-account-info-shopify-client-id`, `…-shopify-client-secret`, `…-shopify-admin-access-token` | update-customer-account-info (`update-customer-account-info`) | env vars |

## Finale Webhooks env (project `finale-jobs`)

`finale-webhooks` reads a larger set of values (set as Cloud Run env vars; see
its `.env.example`): Finale per-tenant keys/secrets/webhook tokens, `PARTIFY_SECRET`
(endpoint shared secret), Postgres `DB_*`, Google OAuth client (`GOOGLE_*`,
`SESSION_SECRET`, `ALLOWED_EMAIL_DOMAINS`), Shopify client/store vars, Yotpo keys,
Redo per-tenant store IDs/secrets, and `SLACK_WEBHOOK_URL`.

## Rotation

- **Cloud Run secrets:** **Google Secret Manager** — add a new version, then
  redeploy (or let the next deploy pick `:latest`).
- After rotating, confirm the dependent service still authenticates.

## Related Pages

- [Cloud Services Overview](overview.md)
- [GitHub → Secrets](../github/secrets.md) · [Actions & Deploys](../github/actions-and-deploys.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-15
