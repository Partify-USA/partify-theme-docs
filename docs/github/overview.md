---
title: GitHub Overview
description: Inventory of the Partify-USA GitHub repositories, what each one is, and where it deploys.
sidebar_position: 1
---

# GitHub Overview

## Purpose

All Partify code lives under the **`Partify-USA`** GitHub organization. This page
inventories the repositories, what each is for, and where it deploys, so a
newcomer can find the right repo fast.

## Repository Inventory

| Repo | What it is | Deploys to |
| --- | --- | --- |
| `Partify-USA/partify-theme` | The Shopify Liquid theme (storefront) for both stores | Shopify, via the `main-usa` / `main-ca` branches |
| `Partify-USA/partify-theme-docs` | This documentation site (Docusaurus) | GitHub Pages (`gh-pages`) |
| `Partify-USA/finale-webhooks` | [Finale Webhooks](../cloud-services/finale-webhooks/finale-webhooks.md) Cloud Run service | Cloud Run (`finale-jobs` project) via Cloud Build trigger |
| `Partify-USA/order-tracking-api` | [Order Status Sync](../cloud-services/order-status-sync.md) Cloud Run service | Cloud Run (`alpine-sentry-448804-d4`) via GitHub Action |
| `Partify-USA/adamsearch-fitment-proxy` | [Fitment Proxy](../cloud-services/fitment-proxy.md) Cloud Run service (`fitment-proxy-us/ca`) | Cloud Run (`partify-fitment-proxy`) via GitHub Action |

## Theme Branch Model

`partify-theme` uses a development branch plus per-store deploy branches:

| Branch | Role |
| --- | --- |
| `main` | Development branch — all work lands here first |
| `main-usa` | Deploy branch connected to the **US** Shopify store |
| `main-ca` | Deploy branch connected to the **CA** Shopify store |
| `gh-pages` | Published sync-status dashboard (and Pages output) |

Pushing to `main` triggers an Action that cherry-picks the change into
`main-usa` and `main-ca` for the files on its allowlist. See
[Actions & Deploys](actions-and-deploys.md) for the full rules.

## Not Yet Inventoried

The storefront also calls several Cloud Run services whose repos are **not in
the monorepo and not yet confirmed** — `garage-vin-service-node`,
`bumperdotcom-api`, `license-to-vin`, `tax-exemption-signup`,
`customer-account-data`, `update-customer-account-info`. See the
[Cloud Services Overview](../cloud-services/overview.md). Tracking down these
repos is an open task.

## Related Pages

- [Actions & Deploys](actions-and-deploys.md)
- [Secrets](secrets.md)

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-10
