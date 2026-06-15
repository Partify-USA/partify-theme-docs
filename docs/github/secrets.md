---
title: Secrets
description: Registry of the secrets used by Partify GitHub Actions workflows — names and purpose only, never values, plus where each is stored and rotated. Cloud Run / Secret Manager secrets live on the Cloud Services Secrets page.
sidebar_position: 4
---

# Secrets

## Purpose

A name-and-purpose registry of every secret the GitHub Actions workflows rely
on, and where it lives. **No secret values appear here, ever** — this is a map,
not a vault. For the secrets the Cloud Run services consume (Google Secret
Manager + Finale Webhooks env), see
[Cloud Services → Secrets](../cloud-services/secrets.md).

> ⚠️ **Never commit secret values** to any repo (including test files like
> `test.http` or client-side React source). Store them in GitHub Actions secrets
> or Google Secret Manager and reference them.

## GitHub Actions Secrets

| Secret | Used by | Purpose |
| --- | --- | --- |
| `GITHUB_TOKEN` | docs deploy, theme sync + dashboard | Built-in token for pushing to `gh-pages` and store branches |
| `SLACK_WEBHOOK_URL` | `partify-theme` (sync, editor-notify) | Posts manual-sync / conflict / theme-editor alerts to Slack |
| `CLAUDE_CODE_OAUTH_TOKEN` | `partify-theme` (`claude-review.yml`) | Auth for the Claude PR review action |

`order-tracking-api`, `adamsearch-fitment-proxy`, and the six
storefront-supporting repos (`garage-vin-service-node`, `license-to-vin`,
`bumperdotcom-api`, `tax-exemption-signup`, `customer-account-data`,
`update-customer-account-info`) authenticate to GCP via **Workload Identity
Federation** (a `workload_identity_provider` + `service_account` in each
workflow) — there is **no** long-lived GCP key stored as a GitHub secret.

## Rotation

- **GitHub secrets:** repo (or org) **Settings → Secrets and variables → Actions**.
- After rotating, confirm the dependent workflow still authenticates.

## Related Pages

- [GitHub Overview](overview.md) · [Actions & Deploys](actions-and-deploys.md)
- [Cloud Services → Secrets](../cloud-services/secrets.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-15
