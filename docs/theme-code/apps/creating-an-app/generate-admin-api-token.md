---
title: Generate Shopify Admin API Token
description: End-to-end flow to create a custom Shopify Partner app and obtain a permanent Admin API access token for a store using the get_token.py local OAuth script.
---

## Purpose

Document how to obtain a **permanent Shopify Admin API access token** for a
specific store. A custom **Shopify Partner app** is created once, then the
[`get_token.py`](#related-files) script runs the OAuth flow locally and prints
the token. Run the script **once per store** (US, then CA with CA values).

This replaces the older Google Apps Script web-app flow — there is no Apps Script
project to deploy anymore; the OAuth callback is handled by a short-lived local
HTTP server on `localhost:3456`.

## Prerequisites

- **Python 3** installed
- `python-dotenv`: `pip install python-dotenv`
- A **Shopify Partner** account
- The `admin-api-python` script folder (contains `get_token.py` and `.env.example`)

## How It Works

`get_token.py` does the whole OAuth exchange on your machine:

1. Builds the Shopify authorize URL from your `.env` (`client_id`, `scope`,
   `redirect_uri`, plus a random `state` for CSRF protection) and opens it in a
   browser.
2. Starts a local HTTP server on `localhost:3456` that handles **one** request —
   the OAuth callback Shopify redirects to.
3. Validates the returned `state`, then exchanges the `code` for a token at
   `https://<shop>/admin/oauth/access_token`.
4. Prints the `shpat_…` access token to the terminal and exits.

The redirect URI is hardcoded to `http://localhost:3456/callback`, and the
requested scopes are set in the `SCOPES` constant at the top of the script
(currently `read_metaobject_definitions,write_metaobject_definitions,read_metaobjects,read_products,write_products`).

## Step-by-Step Procedure

### 1. Create a Partner App

1. Go to [partners.shopify.com](https://partners.shopify.com) → **Apps** →
   **Create app**.
2. Give it a name (e.g. `Partify Token Generator`).
3. On the app config screen, set:
   - **Redirect URL:** `http://localhost:3456/callback`
   - **Scopes:** add what you need (must match the `SCOPES` in `get_token.py`)

### 2. Choose a Distribution Method

In the app's sidebar, open **Distribution** and select **Custom distribution**
(allow multi-store install). This is the right choice for internal use.

### 3. Install the App on the Store

Open the generated **custom install link** in a new browser tab and install the
app on the target store. The OAuth flow will fail if the app is not installed
first.

### 4. Set Up `.env`

Copy `.env.example` to `.env` and fill in your values:

```dotenv
US_SHOPIFY_CLIENT_ID=your_client_id
US_SHOPIFY_SECRET=your_client_secret
US_SHOPIFY_SHOP=partify-usa-123.myshopify.com
```

The **Client ID** and **Client secret** are on the app's overview page in the
Partner dashboard.

### 5. Run the Script

```bash
python get_token.py
```

- A browser window opens for authorization.
- Shopify redirects to `http://localhost:3456/callback`; the script catches it
  automatically and closes the local server.
- The terminal prints the access token.

### 6. Save the Token

The script outputs the token and a suggested variable name:

```
Variable name:  US_SHOPIFY_TOKEN
Variable value: shpat_xxxxxxxxxxxxxxxxxxxx
```

Save it somewhere secure (a secrets manager or an OS environment variable).
**It will not be shown again.**

## High-Level Flow

| Phase | Location                          | Summary                                                            |
| ----- | --------------------------------- | ------------------------------------------------------------------ |
| 1     | Shopify Partners                  | Create a custom app; set redirect URL + scopes.                    |
| 2     | Shopify Partners → Distribution   | Custom distribution → generate the install link.                   |
| 3     | Target store                      | Open the install link and install the app.                         |
| 4     | `admin-api-python/.env`           | Fill in Client ID, Client secret, and shop domain.                 |
| 5     | Terminal (`python get_token.py`)  | Browser OAuth → local callback → token printed.                    |
| 6     | Your secrets store                | Save the `shpat_…` token (shown once).                             |

## Known Constraints & Gotchas

- **One token per store.** The token is scoped to a single store. Repeat the
  whole flow with CA values to get a CA token.
- **Scopes must match.** The scopes selected on the Partner app must match the
  `SCOPES` constant in `get_token.py`, or Shopify rejects the authorization.
- **App must be installed first** (Step 3) or the OAuth callback fails.
- **Redirect URL is fixed.** The script listens on `http://localhost:3456/callback`;
  that exact URL must be in the app's Redirect URLs.
- **Token is sensitive** and shown only once. Never commit it (or `.env`) to any
  repo — see [Secrets](../../../cloud-services/secrets.md).

## Safe to Change

- The `SCOPES` constant in `get_token.py` — as long as you also update the app's
  scopes in the Partner dashboard to match.
- The app name and the variable name you save the token under.

## Dangerous to Change

- The Client ID / Client secret once the app is in active use.
- The redirect URI (`http://localhost:3456/callback`) — changing it in the
  script without updating the Partner app (and vice versa) breaks OAuth.
- The token-exchange / `state`-validation logic in the callback handler.

## Related Files

- `get_token.py` — the OAuth token generator (in the `admin-api-python` folder)
- `.env.example` — template for the required `US_SHOPIFY_*` values

## Owner & Maintenance

- **Owner:** Cloud / Backend
- **Last Updated:** 2026-06-15
