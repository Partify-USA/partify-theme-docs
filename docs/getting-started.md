---
title: Getting Started
description: A map of the Partify technical documentation — what each section covers and where to go based on what you're trying to do.
slug: /getting-started
sidebar_position: 0
---

# Getting Started

Welcome. This site documents the **Partify technical stack** — the Shopify
storefront theme, the Google Cloud services behind it, the data and decoding
pipelines that feed it, and the GitHub workflows that ship it all.

This page is the map. Skim the overview, then jump to the section that matches
what you're trying to do.

## The Stack at a Glance

Partify sells custom-painted auto body parts. A customer identifies their
vehicle (by VIN, license plate, or year/make/model), the storefront figures out
which parts fit and what paint they need, and the order flows into automated
fulfillment and tracking. The documentation is organized around that flow:

| Layer          | What lives here                                                                                 | Section                                             |
| -------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Storefront** | The Shopify Liquid theme — fitment, paint, variant selection, plus the apps and tests around it | [Theme Code](/docs/category/theme-code)             |
| **Backend**    | The Google Cloud Run services — order automation, Finale, tracking, the fitment proxy           | [Cloud Services](/docs/category/cloud-services)     |
| **Data**       | VIN and paint decoding, Google Sheets logging                                                   | [Data & Decoding](/docs/category/data-and-decoding) |
| **Delivery**   | Repositories, GitHub Actions, and the deploy pipelines                                          | [GitHub](/docs/category/github)                     |

## I'm trying to… (where to go)

| If you want to…                                                    | Start here                                                                                           |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Understand how a product page decides fitment, paint, and variants | [Theme Code → Pages → Product Page](/docs/category/theme-code)                                       |
| See how a VIN or license plate becomes a vehicle                   | [VIN Decoder](/docs/theme-code/pages/product-page/vin-decoder)                                       |
| Find out why a VIN decodes to the "wrong" model and how it's fixed | [Best Selling Products app](/docs/category/theme-code) (ChromeData → ACES mapping)                   |
| Run or write end-to-end browser tests for the storefront           | [Theme Code → Playwright Testing](/docs/category/theme-code)                                         |
| Understand the A/B testing setup                                   | [Theme Code → Intelligems Testing](/docs/category/theme-code)                                        |
| Learn how an order gets automated, synced, or tracked              | [Cloud Services](/docs/category/cloud-services)                                                      |
| Trace how parts data and paint codes are decoded                   | [Data & Decoding](/docs/category/data-and-decoding)                                                  |
| Know where a service deploys from and how                          | [GitHub → Actions & Deploys](/docs/github/actions-and-deploys)                                       |
| Find where a secret or credential lives                            | [Cloud Services → Secrets](/docs/cloud-services/secrets) or [GitHub → Secrets](/docs/github/secrets) |
| Add to these docs the right way                                    | [Contribution → Documentation Standards](/docs/contribution/documentation-rules)                     |

## What Each Section Covers

### Theme Code

The Shopify Liquid theme that powers the storefront. This is the largest
section. It covers the product-page pipeline (VIN/plate decoding, fitment,
quality, paint-code and unpainted flows, variant selection), global components,
the storefront-facing apps, and both testing setups — **Playwright** end-to-end
tests and **Intelligems** A/B tests.

### Cloud Services

The Google Cloud Run services that run the backend. Order automation, the Finale
inventory integration, order-status sync and tracking, the fitment proxy that
answers "does this part fit this vehicle," and the customer-account and
tax-exemption services. Also documents the GCP project layout and where secrets
live.

### Data & Decoding

The lookup logic that ties products to vehicles: VIN and paint decoding
(ChromeData and Bumper.com) and the Google Sheets logging used to track and
audit it.

### GitHub

The repository inventory, GitHub Actions workflows, and the deploy pipelines
that push to Cloud Run and to the theme — including the theme git workflow and
where deployment secrets are stored.

### Contribution

How to write and maintain these docs: the documentation standards, the page
template, and the rules that keep everything consistent. Read this before adding
a page.

## How to Read These Docs

- **Why before what.** Pages explain intent, constraints, and what breaks if
  something changes — the code already shows the _how_.
- **Each page names an owner and a last-updated date** at the bottom, so you know
  who to ask and how current it is.
- **Source files are referenced in `code formatting`, not linked** — links point
  only to other pages in this site.

## Owner & Maintenance

- **Owner:** Partify Engineering
- **Last Updated:** 2026-06-19
