---
title: Adding New Endpoints
description: Step-by-step process on how to add new endpoints to the Finale Webhook backend
sidebar_position: 2
---

# Guide: Adding New Webhook Endpoints

This guide walks you through creating new webhook endpoints in the Finale Webhooks service using the handlers architecture.

---

## 📋 Overview

The service is organized like this:

```
finale-webhooks/
├── server.js                        # Main app - register route groups here
├── src/
│   ├── routes/                      # Route groups (HTTP layer)
│   │   ├── sales-orders.js          # All sales order endpoints
│   │   ├── purchase-orders.js       # All purchase order endpoints
│   │   └── products.js              # All product endpoints
│   ├── handlers/                    # Business logic
│   │   ├── sales-orders/
│   │   │   ├── damage.js            # Damage order handler
│   │   │   ├── cancel.js            # Cancel order handler
│   │   │   └── common.js            # Shared utilities
│   │   ├── purchase-orders/
│   │   └── products/
│   └── utils/
│       └── finale.js                # Finale API utilities
└── test.http                        # Tests for all endpoints
```

**Architecture Pattern:**

- **Routes** = Grouped by category (validation + HTTP handling)
- **Handlers** = Business logic (pure functions, testable, reusable)
- **URLs** = `/webhook/{category}/{action}` (e.g., `/webhook/sales-orders/damage`)

**Benefits:**

- ✅ Routes stay thin (~20-30 lines)
- ✅ Business logic is reusable and testable
- ✅ Easy to add multiple related endpoints

---

## 🛠️ Step-by-Step: Adding a New Endpoint

Let's add a "cancel" endpoint for sales orders at `/webhook/sales-orders/cancel`.

---

### Step 1: Create the Handler

**Create:** `src/handlers/sales-orders/cancel.js`

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
		// Detect tenant
		const tenant = detectTenant(orderId);
		if (!tenant) {
			return {
				ok: false,
				error: "Unable to detect tenant from orderId",
			};
		}

		console.log(`[${execId}] Canceling ${tenant} order: ${orderId}`);

		// Fetch the order
		const orderResult = await fetchOrder(tenant, orderId);
		if (!orderResult.ok) {
			return {
				ok: false,
				step: "fetch-order",
				error: orderResult.error,
			};
		}

		const order = orderResult.order;

		// Validate order can be canceled
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
		return {
			ok: false,
			error: err.message || String(err),
			stack: err.stack,
		};
	}
}

module.exports = {
	handleCancelOrder,
};
```

**Note:** This handler uses `common.js` utilities - no need to rewrite fetch/validate logic!

---

### Step 2: Add the Route

**Edit:** `src/routes/sales-orders.js`

Add the new route to the existing file:

```javascript
const express = require("express");
const router = express.Router();

// Import handlers
const { handleDamageOrder } = require("../handlers/sales-orders/damage");
const { handleCancelOrder } = require("../handlers/sales-orders/cancel"); // ← Add this
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

		// Validate input
		if (!orderId) {
			return res.status(400).json({
				ok: false,
				execId,
				error: "orderId required",
			});
		}

		// Call handler
		const result = await handleCancelOrder({ orderId, reason, execId });

		const statusCode = result.ok ? 200 : 500;
		res.status(statusCode).json(result);
	} catch (err) {
		console.error(`[${execId}] Error:`, err);
		res.status(500).json({
			ok: false,
			execId,
			error: err.message || String(err),
		});
	}
});

module.exports = router;
```

**That's it!** No changes needed to `server.js` - the route is already registered under `/webhook/sales-orders`.

> **⚠️ NOTE:** If a new route group is created (e.g. `routes/purchase-orders.js`), you will need to register it in `server.js` like this:
>
> ```javascript
> app.use("/webhook/purchase-orders", purchaseOrderRoutes);
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

```powershell
# Start the server
npm start
```

In VS Code:

1. Open `test.http`
2. Click "Send Request" above your cancel test
3. Check the response
4. Check console logs

---

### Step 6: Commit Your Changes

```powershell
git pull --rebase origin main
git add .
git commit -m "Add sales order cancel endpoint"
git push origin main
```

---

### Step 7: Deploy to Production

```powershell
gcloud run deploy finale-webhooks `
  --source . `
  --region us-central1 `
  --allow-unauthenticated `
  --platform managed
```

Wait for deployment to complete (2-5 minutes).

---

### Step 8: Test Production

Stream logs:

```powershell
gcloud run services logs tail finale-webhooks --region us-central1
```

Test in `test.http`:

```http
### Test Cancel Order - Production
POST https://finale-webhooks-648477666631.us-central1.run.app/webhook/sales-orders/cancel
Content-Type: application/json

{
  "orderId": "U123456",
  "reason": "Test cancellation"
}
```

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
	// Your product update logic here
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
// At the top
const productRoutes = require("./src/routes/products");

// After other route registrations
app.use("/webhook/products", productRoutes);
```

Now you have `/webhook/products/update` available!

---

## 🔐 Environment Variables

Access environment variables in your handler:

```javascript
const myConfig = process.env.MY_CONFIG_VALUE;
const damageFacility = process.env.FINALE_US_DAMAGE_FACILITY_ID;
```

To add new environment variables:

1. **Add to `.env.example`** (template for team)
2. **Add to your `.env`** (your local values)
3. **Add to Cloud Run:**
   ```powershell
   gcloud run services update finale-webhooks `
     --region us-central1 `
     --set-env-vars "MY_CONFIG_VALUE=my-value"
   ```

---

## ✅ Checklist for New Endpoints

Before submitting a PR:

- [ ] Created handler file in `src/handlers/{category}/`
- [ ] Created or updated route file in `src/routes/`
- [ ] Registered route in `server.js` (if new category)
- [ ] Added endpoint to health check endpoint list
- [ ] Reused common utilities where possible
- [ ] Added tests in `test.http`
- [ ] Tested locally with `npm start`
- [ ] Added proper error handling
- [ ] Committed and pushed to GitHub
- [ ] Deployed to Cloud Run
- [ ] Tested in production
- [ ] Updated documentation if needed

---

Happy coding! 🚀
