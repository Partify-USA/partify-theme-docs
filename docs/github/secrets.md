---
title: Secrets
description: Registry of the secrets used across Partify GitHub Actions and Cloud Run services — names and purpose only, never values, plus where each is stored and rotated.
sidebar_position: 3
---

# Secrets

## Purpose

A name-and-purpose registry of every secret the pipelines and services rely on,
and where it lives. **No secret values appear here, ever** — this is a map, not a
vault.

> ⚠️ **Never commit secret values** to any repo (including test files like
> `test.http` or client-side React source). Store them in GitHub Actions secrets
> or Google Secret Manager and reference them.

## GitHub Actions Secrets

| Secret | Used by | Purpose |
| --- | --- | --- |
| `GITHUB_TOKEN` | docs deploy, theme sync + dashboard | Built-in token for pushing to `gh-pages` and store branches |
| `SLACK_WEBHOOK_URL` | `partify-theme` (sync, editor-notify) | Posts manual-sync / conflict / theme-editor alerts to Slack |
| `CLAUDE_CODE_OAUTH_TOKEN` | `partify-theme` (`claude-review.yml`) | Auth for the Claude PR review action |

`order-tracking-api` and `adamsearch-fitment-proxy` authenticate to GCP via
**Workload Identity Federation** (a `workload_identity_provider` + `service_account`
in the workflow) — there is **no** long-lived GCP key stored as a GitHub secret.

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

## Finale Webhooks env (project `finale-jobs`)

`finale-webhooks` reads a larger set of values (set as Cloud Run env vars; see
its `.env.example`): Finale per-tenant keys/secrets/webhook tokens, `PARTIFY_SECRET`
(endpoint shared secret), Postgres `DB_*`, Google OAuth client (`GOOGLE_*`,
`SESSION_SECRET`, `ALLOWED_EMAIL_DOMAINS`), Shopify client/store vars, Yotpo keys,
Redo per-tenant store IDs/secrets, and `SLACK_WEBHOOK_URL`.

## Rotation

- **GitHub secrets:** repo (or org) **Settings → Secrets and variables → Actions**.
- **Cloud Run secrets:** **Google Secret Manager** — add a new version, then
  redeploy (or let the next deploy pick `:latest`).
- After rotating, confirm the dependent workflow/service still authenticates.

## Open Questions (to confirm)

- Any secrets used by the unconfirmed `us-east5` storefront services
  (`garage-vin-service-node`, `bumperdotcom-api`, etc.).
- Whether the two flagged committed secrets have been rotated (fitment
  `REFRESH_SECRET` in `test.http`; ChromeData secret in the `chromedata-lookup`
  client bundle).

## Related Pages

- [GitHub Overview](overview.md) · [Actions & Deploys](actions-and-deploys.md)
- [Cloud Services Overview](../cloud-services/overview.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-10
