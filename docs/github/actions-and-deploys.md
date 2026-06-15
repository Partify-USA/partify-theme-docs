---
title: Actions & Deploys
description: Every GitHub Actions workflow across the Partify repos — what triggers it, what it does, and the deploy pipelines that push to Cloud Run, Shopify, and GitHub Pages.
sidebar_position: 2
---

# Actions & Deploys

## Purpose

This page documents every GitHub Actions workflow and how code reaches
production across the Partify repos.

## Summary

| Repo | Workflow | Trigger | Effect |
| --- | --- | --- | --- |
| `order-tracking-api` | `deploy.yml` | push to `main` | Build + deploy `sql-order-status-tracking-sheets` to Cloud Run |
| `adamsearch-fitment-proxy` | `deploy.yml` | push to `main` | Build + deploy `fitment-proxy-us` and `fitment-proxy-ca` to Cloud Run |
| `garage-vin-service-node` | `deploy.yml` | push to `main` | Build + deploy `garage-vin-service-node` to Cloud Run (project `ontime-eta`) |
| `license-to-vin` | `deploy.yml` | push to `main` | Build + deploy `license-to-vin` to Cloud Run (project `bumper-license-to-vin`) |
| `bumperdotcom-api` | `deploy.yml` | push to `main` | Build + deploy `bumperdotcom-api` to Cloud Run (project `bumperdotcom-api`) |
| `tax-exemption-signup` | `deploy.yml` | push to `main` | Build + deploy `tax-exemption-signup` to Cloud Run |
| `customer-account-data` | `deploy.yml` | push to `main` | Build + deploy `customer-account-data` to Cloud Run (project `customer-account-info`) |
| `update-customer-account-info` | `deploy.yml` | push to `main` | Build + deploy `update-customer-account-info` to Cloud Run |
| `partify-theme-docs` | `deploy.yml` | push to `main`, manual | Build Docusaurus + publish to `gh-pages` |
| `partify-theme` | `sync-deploy-branches.yml` | push to `main` | Cherry-pick `main` → `main-usa`/`main-ca` (allowlisted files) |
| `partify-theme` | `notify-theme-editor-changes.yml` | push to `main-usa`/`main-ca` | Slack alert when the Shopify theme editor (`shopify[bot]`) edits a deploy branch |
| `partify-theme` | `update-sync-dashboard.yml` | after sync workflow / push to store branches | Rebuild + publish the sync-status dashboard to `gh-pages` |
| `partify-theme` | `claude-review.yml` | pull request | Automated Claude PR review (revert detection) |
| `finale-webhooks` | _none_ | push to `main` | Deploys via a **Cloud Build trigger** (no GH Action) |

## Cloud Run deploys (GitHub Actions)

`order-tracking-api`, `adamsearch-fitment-proxy`, and the six
storefront-supporting repos share the same pattern:

1. Authenticate to GCP via **Workload Identity Federation** (no static
   service-account key stored in GitHub).
2. `docker build`, tag with the commit SHA + `latest`, push to **Artifact Registry**.
3. `gcloud run deploy` the service(s).

- `order-tracking-api` → `sql-order-status-tracking-sheets` (project
  `alpine-sentry-448804-d4`, region `us-east5`), mounting Secret Manager secrets.
- `adamsearch-fitment-proxy` → `fitment-proxy-us` **and** `fitment-proxy-ca`
  (project `partify-fitment-proxy`, region `us-central1`), each with its own
  store env vars and secrets.
- **Storefront-supporting repos** (each its own GCP project, region `us-east5`,
  `functions-framework` HTTP function, Secret Manager secrets injected as env
  vars): `garage-vin-service-node` (`ontime-eta`), `license-to-vin`
  (`bumper-license-to-vin`), `bumperdotcom-api` (`bumperdotcom-api`),
  `tax-exemption-signup` (`tax-exemption-signup`), `customer-account-data`
  (`customer-account-info`), `update-customer-account-info`
  (`update-customer-account-info`). The workflow runtime flags (cpu, memory,
  scaling, service account, auth posture) are set explicitly to match each
  service's original console-deployed configuration. See the
  [Cloud Services Overview](../cloud-services/overview.md) for per-service detail.

`finale-webhooks` has **no** workflow: it deploys through a Cloud Run **source
deploy / Cloud Build trigger** configured in the GCP console, on push to `main`.

## Docs site deploy

`partify-theme-docs/deploy.yml` runs on push to `main` (or manually): `npm ci`,
`npm run build`, then publishes `./build` to the `gh-pages` branch with
`peaceiris/actions-gh-pages`. Uses the built-in `GITHUB_TOKEN`.

## Theme branch sync (`sync-deploy-branches.yml`)

The most involved workflow. On push to `main` it carries changes into the store
deploy branches:

- **Commit-message tokens:** `[no-sync]` skips the sync entirely; `[usa-only]`
  and `[ca-only]` restrict the sync to a single store.
- **File allowlist:** only known-safe paths are auto-synced. `account-drawer.js`
  and `member-sidebar.js` are **US-only**; `snippets/`, `sections/`, a set of
  named `assets/*`, and `locales/en.default.json` / `es.json` are **both stores**.
- **Blocked files:** any changed file not on the allowlist blocks the auto-sync
  and posts a **"manual sync required"** Slack message listing the files.
- **Merge:** allowed changes are cherry-picked into `main-usa` and `main-ca` and
  pushed; a cherry-pick conflict posts a Slack alert and fails the job.

> This exists because two devs push frequently to one theme serving two stores;
> the allowlist + tokens prevent a change meant for one store leaking into the
> other.

> See the [Theme Git Workflow](theme-git-workflow.md) page for the hands-on side
> of this: syncing branches before work, the commit-message tags, and how to
> manually cherry-pick when the auto-sync is blocked.

## Theme editor back-port (`notify-theme-editor-changes.yml`)

Shopify's theme editor commits directly to the connected deploy branches
(`main-usa` / `main-ca`) as `shopify[bot]`. This workflow detects those commits
and posts a Slack reminder to cherry-pick the change back into `main` so it isn't
lost on the next sync.

## Sync dashboard (`update-sync-dashboard.yml`)

Runs after `sync-deploy-branches` completes (and on direct pushes to store
branches). It runs `scripts/build-sync-data.js` to snapshot the state of `main`
vs `main-usa` vs `main-ca`, then publishes `index.html` + `data.json` to
`gh-pages` — a dashboard showing whether the branches are in sync.

## Claude PR review (`claude-review.yml`)

On every PR, runs `anthropics/claude-code-action` with Claude Haiku to review the
diff, focused primarily on **unintentional reverts** (one dev overwriting
another's change), plus Liquid/JS/CSS issues. Non-blocking — it skips on rate
limit. Uses `CLAUDE_CODE_OAUTH_TOKEN`.

## Open Questions (to confirm)

- The exact **Cloud Build trigger** configuration for `finale-webhooks` (it is in
  the GCP console, not in the repo).
- What `scripts/build-sync-data.js` reads and where the dashboard is viewable.

## Related Pages

- [GitHub Overview](overview.md) · [Secrets](secrets.md)
- [Cloud Services Overview](../cloud-services/overview.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-15
