---
title: Adding New Endpoints
description: Step-by-step process on how to add new endpoints to the Finale Webhook backend
sidebar_position: 4
---

# Guide: Adding New Webhook Endpoints

This guide walks you through creating new endpoints in the Finale Webhooks service using the routes + handlers architecture. For the full service map, see [Finale Webhooks — Architecture](finale-webhooks.md).

---

## 📋 Overview

The service is organized like this:

```
finale_jobs/
├── server.js                        # Mounts route groups + auth middleware
├── src/
│   ├── middleware/
│   │   ├── auth.js                  # requireSecret (x-partify-secret header)
│   │   └── googleAuth.js            # requireAuth (Google OAuth, Paint Match)
│   ├── routes/                      # Route groups (HTTP layer)
│   │   ├── selling.js               # Sales-order webhooks AND /jobs/selling jobs
│   │   ├── inventory.js             # /jobs/products endpoints
│   │   └── paintMatch.js            # /paint-match UI + data
│   ├── handlers/                    # Business logic
│   │   └── selling/
│   │       ├── damage.js            # Damage order handler
│   │       ├── create.js            # Create order handler
│   │       ├── cancel.js            # Cancel order handler
│   │       ├── sync-orders.js       # Shopify → DB sync
│   │       └── common.js            # Shared cross-border helpers
│   └── utils/
│       └── finale.js                # Finale API utilities
└── test.http                        # Tests for all endpoints
```

**Architecture Pattern:**

- **Routes** = Grouped by domain (validation + HTTP handling)
- **Handlers** = Business logic (pure functions, testable, reusable)
- **URLs** = event webhooks at `/webhook/sales-orders/{action}` and scheduled
  jobs at `/jobs/selling/{action}` or `/jobs/products/{action}`

> **Two prefixes, one router:** `selling.js` is mounted at **both**
> `/webhook/sales-orders` and `/jobs/selling` in `server.js`, so any route you
> add there is reachable under both prefixes.
>
> **Auth:** all `/webhook/*` and `/jobs/*` routes sit behind `requireSecret` —
> callers must send the `x-partify-secret` header. The Paint Match UI uses
> `requireAuth` (Google OAuth) instead.
>
> **Dry-run:** every selling route reads a dry-run flag via `parseDryRunFlag`
> (`x-dry-run` header or `dryRun` in query/body) to skip Finale writes.

**Benefits:**

- ✅ Routes stay thin (~20-30 lines)
- ✅ Business logic is reusable and testable
- ✅ Easy to add multiple related endpoints

---

## 🛠️ Step-by-Step: Adding a New Endpoint

Let's add a "cancel" endpoint for sales orders at `/webhook/sales-orders/cancel`.

---

### Step 1: Create the Handler

**Create:** `src/handlers/selling/cancel.js`

```javascript
/**
 * Sales Order Cancel Handler
 * Business logic for canceling sales orders
 */

const { fetchOrder, validateOrder, canModifyOrder } = require("./common");
const { detectTenant, randomId } = require("../../utils/finale");

/**
 * Main entry point for canceling an order
 */
async function handleCancelOrder({ orderId, reason, execId }) {
	try {
		const tenant = detectTenant(orderId);
		if (!tenant) {
			return { ok: false, error: "Unable to detect tenant from orderId" };
		}

		console.log(`[${execId}] Canceling ${tenant} order: ${orderId}`);

		const orderResult = await fetchOrder(tenant, orderId);
		if (!orderResult.ok) {
			return { ok: false, step: "fetch-order", error: orderResult.error };
		}

		const order = orderResult.order;

		const canModify = canModifyOrder(order);
		if (!canModify.ok) {
			return {
				ok: false,
				step: "validate-status",
				error: canModify.reason,
				currentStatus: canModify.status,
			};
		}

		// TODO: Call Finale API to cancel the order
		// const cancelResult = await finaleUpdateOrder(cfg, orderId, { statusId: 'ORDER_CANCELLED' });

		console.log(`[${execId}] Order ${orderId} canceled successfully`);

		return {
			ok: true,
			orderId,
			reason,
			previousStatus: order.statusId,
			newStatus: "ORDER_CANCELLED",
		};
	} catch (err) {
		console.error(`handleCancelOrder error:`, err);
		return { ok: false, error: err.message || String(err), stack: err.stack };
	}
}

module.exports = { handleCancelOrder };
```

**Note:** This handler uses `common.js` utilities - no need to rewrite fetch/validate logic!

---

### Step 2: Add the Route

**Edit:** `src/routes/selling.js`

Add the new route to the existing file (it already contains the damage, create, cancel, and `/jobs/selling/*` routes):

```javascript
const express = require("express");
const router = express.Router();

// Import handlers
const { handleDamageOrder } = require("../handlers/selling/damage");
const { handleCancelOrder } = require("../handlers/selling/cancel"); // ← Add this
const { randomId } = require("../utils/finale");

// Existing damage route
router.post("/damage", async (req, res) => {
	// ... existing damage code
});

// NEW: Cancel route
router.post("/cancel", async (req, res) => {
	const execId = `CANCEL_EXEC_${new Date().toISOString()}_${randomId()}`;

	try {
		const { orderId, reason } = req.body;

		if (!orderId) {
			return res
				.status(400)
				.json({ ok: false, execId, error: "orderId required" });
		}

		const result = await handleCancelOrder({ orderId, reason, execId });
		const statusCode = result.ok ? 200 : 500;
		res.status(statusCode).json(result);
	} catch (err) {
		console.error(`[${execId}] Error:`, err);
		res
			.status(500)
			.json({ ok: false, execId, error: err.message || String(err) });
	}
});

module.exports = router;
```

**That's it!** No changes needed to `server.js` — `selling.js` is already mounted (under both `/webhook/sales-orders` and `/jobs/selling`), so the new route is live under both prefixes.

> **⚠️ NOTE:** If you create a *new* route group (e.g. `routes/purchase-orders.js`), register it in `server.js` **with the secret middleware** like the others:
>
> ```javascript
> const purchaseOrderRoutes = require("./src/routes/purchase-orders");
> app.use("/webhook/purchase-orders", requireSecret, purchaseOrderRoutes);
> ```

---

### Step 3: Update Health Check

**Edit:** `server.js`

Update the endpoints list:

```javascript
app.get("/", (req, res) => {
	res.json({
		status: "ok",
		service: "finale-webhooks",
		timestamp: new Date().toISOString(),
		endpoints: [
			"POST /webhook/sales-orders/damage - Create damaged replacement order",
			"POST /webhook/sales-orders/cancel - Cancel a sales order", // ← Add this
		],
	});
});
```

---

### Step 4: Add Tests

**Edit:** `test.http`

Add your test cases:

```http
### Test Cancel Order - Local (US Order)
POST http://localhost:8080/webhook/sales-orders/cancel
Content-Type: application/json

{
  "orderId": "U123456",
  "reason": "Customer requested cancellation"
}

### Test Cancel Order - Local (Missing orderId - should fail)
POST http://localhost:8080/webhook/sales-orders/cancel
Content-Type: application/json

{
  "reason": "No order ID"
}

### Test Cancel Order - Production
POST https://finale-webhooks-648477666631.us-central1.run.app/webhook/sales-orders/cancel
Content-Type: application/json

{
  "orderId": "U123456",
  "reason": "Customer requested cancellation"
}
```

---

### Step 5: Test Locally

```bash
npm start
```

In VS Code:

1. Open `test.http`
2. Click "Send Request" above your cancel test
3. Check the response and console logs

---

### Step 6: Commit & Push to Deploy 🚀

> ✅ The service is connected to GitHub — pushing to main automatically deploys to Cloud Run. No manual deploy command needed.

```bash
git pull --rebase origin main
git add .
git commit -m "Add sales order cancel endpoint"
git push origin main
```

Cloud Build will automatically trigger, build, and deploy. You can monitor progress at [console.cloud.google.com/cloud-build/builds](https://console.cloud.google.com/cloud-build/builds).

> 🛡️ **Safe to push:** If the build fails, your live service is unaffected. Cloud Run only routes traffic to a new revision after it passes a health check.

---

### Step 7: Verify the Deploy

Once the Cloud Build finishes (2-5 minutes), confirm the new revision is live:

```
https://finale-webhooks-648477666631.us-central1.run.app/
```

The health check should list your new endpoint.

To stream live logs:

```bash
gcloud alpha run services logs tail finale-webhooks --region us-central1
```

---

### Step 8: Test Production

In `test.http`, click "Send Request" on your production test case and confirm the response.

---

## 🎯 Adding a New Category (e.g., Products)

When you need a completely new category of endpoints:

### Step 1: Create Handler Directory

Create: `src/handlers/products/`

### Step 2: Create Handler File

**Create:** `src/handlers/products/update.js`

```javascript
const { createFinaleConfig, finaleGet } = require("../../utils/finale");

async function handleProductUpdate({ productId, data, execId }) {
	return { ok: true, productId, updated: true };
}

module.exports = { handleProductUpdate };
```

### Step 3: Create Route File

**Create:** `src/routes/products.js`

```javascript
const express = require("express");
const router = express.Router();
const { handleProductUpdate } = require("../handlers/products/update");
const { randomId } = require("../utils/finale");

router.post("/update", async (req, res) => {
	const execId = `PROD_UPDATE_${new Date().toISOString()}_${randomId()}`;
	const result = await handleProductUpdate({ ...req.body, execId });
	res.json(result);
});

module.exports = router;
```

### Step 4: Register in server.js

**Edit:** `server.js`

```javascript
const productRoutes = require("./src/routes/products");

// After other route registrations — include requireSecret like the other groups
app.use("/webhook/products", requireSecret, productRoutes);
```

Now you have `/webhook/products/update` available (behind the `x-partify-secret` header)!

---

## 🔐 Environment Variables

Access environment variables in your handler:

```javascript
const myConfig = process.env.MY_CONFIG_VALUE;
const damageFacility = process.env.FINALE_US_DAMAGE_FACILITY_ID;
```

To add a new environment variable:

1. **Add to `.env.example`** (template for the team)
2. **Add to your `.env`** (your local values — never committed to Git)
3. **Add to Cloud Run once via CLI:**
   ```bash
   gcloud run services update finale-webhooks \
     --region us-central1 \
     --set-env-vars "MY_CONFIG_VALUE=my-value"
   ```

Environment variables set in Cloud Run persist across all future auto-deploys. You only need to set them again if a value changes.

---

## ✅ Checklist for New Endpoints

Before submitting a PR:

- [ ] Created handler file in `src/handlers/{category}/`
- [ ] Created or updated route file in `src/routes/`
- [ ] Registered route in `server.js` (if new category)
- [ ] Added endpoint to health check list
- [ ] Reused common utilities where possible
- [ ] Added tests in `test.http`
- [ ] Tested locally with `npm start`
- [ ] Added proper error handling
- [ ] Pushed to main branch → auto-deploys to Cloud Run
- [ ] Verified build succeeded in Cloud Build console
- [ ] Tested production endpoint in `test.http`
- [ ] Updated documentation if needed

---

## 🔍 Searching Logs in Google Cloud

To look up logs for a specific order, go to [Logs Explorer](https://console.cloud.google.com/logs/query) in Google Cloud and use the following query, replacing the order ID as needed:

```
resource.type = "cloud_run_revision"
resource.labels.service_name = "finale-webhooks"
resource.labels.location = "us-central1"
severity>=DEFAULT
jsonPayload.originalOrderId="U170434A/D1"
```

or you can look it up by the execId with this query:

`jsonPayload.execId="DMG_EXEC_2026-03-16T19:14:24.604Z_or3cg6hi"`

The `jsonPayload.originalOrderId` field filters logs down to a specific order, making it easy to trace exactly what happened during a webhook execution.

---

Happy coding! 🚀
