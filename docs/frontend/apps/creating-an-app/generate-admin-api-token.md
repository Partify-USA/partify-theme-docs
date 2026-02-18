---
title: Generate Shopify Admin API Token
description: End-to-end flow to create a custom app, connect it to Google Apps Script, and obtain a Shopify Admin API access token.
---

## Purpose

Document the end-to-end process for creating a **custom Shopify app**, wiring it to our **Google Apps Script tools**, and safely obtaining a **Shopify Admin API access token** for a specific store.

## Key Logic Areas

### 1. Create and Configure the Custom App (Dev Dashboard)

- Access the **Shopify Dev Dashboard** via Shopify Partners.
- Create a **new app** and explicitly make it a **custom app**.
- After creation, open the app **Settings** in the Dev Dashboard to obtain:
  - Client ID
  - Client secret

### 2. Wire Credentials into Google Apps Script

- Open the Apps Script project for **Create Shopify Admin API Key**.
- In `Code.gs`, update the configuration to use the **Client ID** and **Client secret** from the Dev Dashboard.

### 3. Define Scopes and Redirect URL via App Versioning

- In the Dev Dashboard, go to the app’s **Versions** area and click **Create a version**.
- Use **Select scopes** to enable all required Admin API permissions for this app.
- Copy the selected scopes and paste them into the Apps Script configuration so scopes match on both sides.
- Deploy the Apps Script project as a **web app** to obtain the Web App URL.
- Set this Web App URL as a **Redirect URL** inside **Create a version**.
- Uncheck **Embed app in Shopify admin** so the app runs as a non-embedded app.
- Click **Release** to release the new version with the updated scopes and redirect URL.

### 4. Install the Custom App on a Store

- In Shopify Partners, within the same app, navigate to **Distribution**.
- Generate a **custom install link** for the app.
- Open the install link in a new browser tab.
- When prompted, choose the target store and install the app.

### 5. Generate OAuth URL and Retrieve the Admin API Token

- In the Apps Script project, open `urlgenerator.gs`.
- Update `redirectUri` to match the **deployed Web App URL**.
- Run the function `testGenerateShopifyUrl` to generate the Shopify OAuth URL.
- Copy the generated URL from the **execution log**, open it in a new tab, and load it.
- If everything is configured correctly, Shopify will redirect and Apps Script will:
  - Show a success message such as `200: App installed successfully. Access token stored.`
  - Store the Admin API access token, and log it.
- If the token is not visible in the browser response, check the Apps Script **Executions** logs for an entry like:
  - `SHOPIFY_ACCESS_TOKEN_FOR partify-usa-123.myshopify.com => shpca_...`

## High-Level Flow Diagram

| Phase | Location                        | Summary                                                                                 |
| ----- | ------------------------------- | --------------------------------------------------------------------------------------- |
| 1     | Shopify Partners / Dev Dash     | Create custom app and obtain Client ID + Client secret.                                 |
| 2     | Google Apps Script              | Update `Code.gs` with Client ID, Client secret, and prepare to use Admin API scopes.    |
| 3     | Dev Dash → Versions             | Create version, select scopes, set redirect URL to Apps Script Web App, release version |
| 4     | Shopify Partners → Distribution | Generate and use custom install link to install app on the target store.                |
| 5     | Google Apps Script              | Update `urlgenerator.gs`, generate OAuth URL, complete flow, and capture access token.  |

## Detailed Step-by-Step Procedure

1. Access the **Shopify Dev Dashboard** (via Shopify Partners).
2. Create a **new app**.
3. Configure it as a **custom app**.
4. After the app is created, in the Dev Dashboard open the app **Settings** and note the **Client ID** and **Client secret**.
5. Open the Google Apps Script project for the script named **Create Shopify Admin API Key**.
6. In `Code.gs`, update the configuration with the new **Client ID** and **Client secret**.
7. Back in the Dev Dashboard for this app, go to **Versions** and click **Create a version**.
8. Within **Create a version**, click **Select scopes** and check all required Admin API permissions.
9. After selecting all necessary scopes, copy the list and paste it into the Apps Script configuration so scopes match.
10. In Apps Script, deploy the project as a **Web App** and copy the deployed Web App URL.
11. In the Dev Dashboard **Create a version** screen, paste the Web App URL into **Redirect URLs**.
12. Still in **Create a version**, uncheck **Embed app in Shopify admin**, since this is not an embedded app.
13. Click **Release** to finalize the new version with the updated scopes and redirect URL.
14. In Shopify Partners, ensure you are viewing this app, then go to **Distribution**.
15. Follow the UI to create a **custom install link**.
16. Copy the custom install link, paste it into a new browser tab, and press Enter.
17. When prompted, select the target store and complete the app installation for that store.
18. After installation, return to the Apps Script project and open `urlgenerator.gs`.
19. In `urlgenerator.gs`, update `redirectUri` so it points to the deployed Web App URL (the same redirect URL used in the Dev Dashboard).
20. Run the function `testGenerateShopifyUrl`.
21. In the Apps Script execution log, copy the generated Shopify URL.
22. Open a new browser tab, paste the URL, and press Enter to complete the OAuth flow.
23. Confirm you see a message such as `200: App installed successfully. Access token stored.` (the access token may also be shown).
24. If the token is not shown in the browser, open Apps Script **Executions**, inspect the latest run, and copy the token from a log line like: `SHOPIFY_ACCESS_TOKEN_FOR <store>.myshopify.com => shpca_...`.

## Known Constraints & Gotchas

- The **redirect URL** must match exactly between Apps Script and the Dev Dashboard version; mismatches will break OAuth.
- The **scopes** pasted into Apps Script must match the scopes selected in the Dev Dashboard.
- Changing scopes later requires creating a **new version** and reinstalling or re-authorizing the app.
- Admin API access tokens are **sensitive secrets**; tokens shown in logs must be handled securely and never committed.
- The app must remain configured as **non-embedded**; enabling "Embed app in Shopify admin" changes how redirects work.

## Safe to Change

- Adding or removing scopes **as long as** you:
  - Update both the Dev Dashboard version and Apps Script configuration
  - Release a new version and re-run the install/authorization flow
- Re-deploying the Apps Script Web App, provided you:
  - Update the redirect URL in the Dev Dashboard version configuration
- Re-running `testGenerateShopifyUrl` to generate a fresh OAuth URL for troubleshooting

## Dangerous to Change

- Client ID and Client secret values once the app is in active use
- Redirect URL (`redirectUri` in `urlgenerator.gs` and the Dev Dashboard configuration)
- Logic that stores or logs the Admin API access token in Apps Script
- How the custom install link is generated or altered, which can cause installs to target the wrong store

## Related Files

- `Code.gs` (Create Shopify Admin API Key script)
- `urlgenerator.gs` (generates Shopify OAuth URL and uses the redirect URI)

## Owner & Maintenance

- **Owner:** Wyatt Chamberlin
- **Last Updated:** 2026-02-03
