---
title: Adding New Endpoints
description: Step-by-step process on how to add new endpoints to the Finale Webhook backend
sidebar_position: 2
---

# Guide: Adding New Webhook Endpoints

This guide walks you through creating new webhook endpoints in the Finale Webhooks service.

---

## 📋 Overview

The service is organized like this:

```
finale-webhooks/
├── server.js                    # Main app - register routes here
├── src/
│   ├── routes/                  # Endpoint handlers (one file per endpoint)
│   │   ├── damage.js           # Example: damage webhook
│   │   └── inventory.js        # Example: your new endpoint
│   └── utils/
│       └── finale.js           # Shared Finale API utilities
└── test.http                   # Tests for all endpoints
```

**Pattern:** One route file = One endpoint

---

## 🛠️ Step-by-Step: Adding a New Endpoint

Let's say you want to add an inventory update webhook at `/webhook/inventory`.

---

### Step 1: Create the Route File

**Create:** `src/routes/inventory.js`

```javascript
/**
 * Inventory webhook route handler
 * Description of what this endpoint does
 */

const express = require("express");
const router = express.Router();
const { createFinaleConfig, finaleGet, randomId } = require("../utils/finale");

/**
 * POST /webhook/inventory
 * Description of endpoint
 *
 * Body: {
 *   productId: "SKU123",
 *   quantity: 10,
 *   facilityId: "12345"
 * }
 */
router.post("/", async (req, res) => {
	const execId = `INV_EXEC_${new Date().toISOString()}_${randomId()}`;

	try {
		// 1. Validate input
		const { productId, quantity, facilityId } = req.body;

		if (!productId) {
			return res.status(400).json({
				ok: false,
				execId,
				error: "productId required",
			});
		}

		console.log(`[${execId}] Processing inventory update for ${productId}`);

		// 2. Your business logic here
		const result = await handleInventoryUpdate({
			productId,
			quantity,
			facilityId,
		});

		// 3. Return response
		res.status(200).json({
			ok: true,
			execId,
			result,
		});
	} catch (err) {
		console.error(`[${execId}] Error:`, err);
		res.status(500).json({
			ok: false,
			execId,
			error: err.message || String(err),
		});
	}
});

/**
 * Core business logic
 */
async function handleInventoryUpdate(params) {
	const { productId, quantity, facilityId } = params;

	// Get Finale configuration (US or CA based on your needs)
	const cfg = createFinaleConfig("US");

	// Make API calls, process data, etc.
	// Example: fetch product info
	const productUrl = cfg.productUrl(productId);
	const productRes = await finaleGet(cfg, productUrl);

	if (productRes.code !== 200) {
		throw new Error("Product not found");
	}

	// Your logic here...

	return {
		productId,
		updatedQuantity: quantity,
		status: "success",
	};
}

module.exports = router;
```

---

### Step 2: Register the Route in server.js

**Edit:** `server.js`

Add these lines:

```javascript
// At the top with other requires
const inventoryRoute = require("./src/routes/inventory");

// After other app.use() lines
app.use("/webhook/inventory", inventoryRoute);
```

**Full example:**

```javascript
require("dotenv").config();
const express = require("express");
const damageRoute = require("./src/routes/damage");
const inventoryRoute = require("./src/routes/inventory"); // ← Add this

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// ... logging middleware ...

app.get("/", (req, res) => {
	res.json({
		status: "ok",
		service: "finale-webhooks",
		timestamp: new Date().toISOString(),
		endpoints: [
			"POST /webhook/damage - Create damaged replacement order",
			"POST /webhook/inventory - Update inventory", // ← Update this list
		],
	});
});

app.use("/webhook/damage", damageRoute);
app.use("/webhook/inventory", inventoryRoute); // ← Add this

// ... error handlers ...
```

---

### Step 3: Add Tests

**Edit:** `test.http`

Add your test cases:

```http
### Test Inventory Webhook - Success Case
POST http://localhost:8080/webhook/inventory
Content-Type: application/json

{
  "productId": "SKU123",
  "quantity": 10,
  "facilityId": "12345"
}

### Test Inventory Webhook - Missing productId (should fail)
POST http://localhost:8080/webhook/inventory
Content-Type: application/json

{
  "quantity": 10
}

### Test Inventory Webhook - Production
POST https://finale-webhooks-648477666631.us-central1.run.app/webhook/inventory
Content-Type: application/json

{
  "productId": "REAL-SKU-HERE",
  "quantity": 5,
  "facilityId": "100730"
}
```

---

### Step 4: Test Locally

```powershell
# Start the server
npm start
```

In VS Code:

1. Open `test.http`
2. Click "Send Request" above your new test
3. Check the response
4. Check console logs for your `console.log()` messages

---

### Step 5: Commit Your Changes

```powershell
git add .
git commit -m "Add inventory webhook endpoint"
git push
```

---

### Step 6: Deploy to Production

```powershell
gcloud run deploy finale-webhooks `
  --source . `
  --region us-central1 `
  --allow-unauthenticated `
  --platform managed
```

Wait for deployment to complete (2-5 minutes).

---

### Step 7: Test in Production

```powershell
# Stream logs in one terminal
gcloud run services logs tail finale-webhooks --region us-central1
```

In another terminal or using REST Client, send a test request to production.

---

## 🎨 Common Patterns

### Pattern 1: Simple Webhook (No Finale API Calls)

```javascript
router.post("/", async (req, res) => {
	const { data } = req.body;

	// Do something with data
	console.log("Received:", data);

	res.json({ ok: true, message: "Processed" });
});
```

### Pattern 2: Call Finale API

```javascript
const { createFinaleConfig, finaleGet } = require("../utils/finale");

async function doSomething() {
	const cfg = createFinaleConfig("US");
	const url = cfg.orderBaseUrl("U123456");
	const response = await finaleGet(cfg, url);

	if (response.code === 200) {
		const order = response.json;
		// Do something with order
	}
}
```

### Pattern 3: Multi-Tenant (US and CA)

```javascript
const { detectTenant, createFinaleConfig } = require("../utils/finale");

async function handle(orderId) {
	const tenant = detectTenant(orderId); // Returns 'US' or 'CA'

	if (!tenant) {
		throw new Error("Unknown tenant");
	}

	const cfg = createFinaleConfig(tenant);
	// Now use cfg for API calls
}
```

### Pattern 4: Background Processing

```javascript
router.post("/", async (req, res) => {
	const { data } = req.body;

	// Respond immediately
	res.json({ ok: true, message: "Processing in background" });

	// Process in background (don't await)
	processInBackground(data).catch((err) => {
		console.error("Background error:", err);
	});
});

async function processInBackground(data) {
	// Long-running task here
}
```

---

## 📦 Available Utility Functions

From `src/utils/finale.js`:

```javascript
const {
	createFinaleConfig, // Get API config for tenant
	finaleGet, // GET request to Finale
	createOrder, // POST order to Finale
	getSupplierIdFromProduct, // GraphQL query for supplier
	pickDamagedId, // Find free /D1, /D2, etc.
	stripDamagedSuffix, // Remove /D# from orderId
	detectTenant, // US or CA from orderId
	toFinaleTimestamp, // Format date for Finale
	compactObject, // Remove null/empty fields
	numOrUndef, // Safe number conversion
	randomId, // Generate random ID
} = require("../utils/finale");
```

---

## 🔐 Environment Variables

Access environment variables in your route:

```javascript
const myConfig = process.env.MY_CONFIG_VALUE;
const usStore = process.env.FINALE_US_STORE;
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

- [ ] Created route file in `src/routes/`
- [ ] Registered route in `server.js`
- [ ] Added endpoint to health check endpoint list
- [ ] Added tests in `test.http`
- [ ] Tested locally with `npm start`
- [ ] Added proper error handling
- [ ] Added logging with `console.log()` for debugging
- [ ] Validated all required fields
- [ ] Documented expected request body format
- [ ] Committed and pushed to GitHub
- [ ] Deployed to Cloud Run
- [ ] Tested in production
- [ ] Updated documentation if needed

---

## 🐛 Debugging Tips

### View logs while developing:

```powershell
# Terminal 1: Run server with logs visible
npm start

# Terminal 2: Send test requests
# Use test.http file in VS Code
```

### View production logs:

```powershell
# Stream live
gcloud run services logs tail finale-webhooks --region us-central1

# View recent
gcloud run logs read finale-webhooks --region us-central1 --limit 50

# Filter errors only
gcloud run logs read finale-webhooks --region us-central1 --log-filter="severity>=ERROR"
```

### Test with real data:

- Use Postman or REST Client
- Save common test cases in `test.http`
- Use real order IDs from Finale (for testing, not production!)

---

## 📚 Additional Resources

- **Express.js Routing:** https://expressjs.com/en/guide/routing.html
- **Cloud Run Docs:** https://cloud.google.com/run/docs
- **Finale API Docs:** [Your Finale API documentation link]

---

## 🆘 Common Issues

### Route not working

- Did you register it in `server.js`?
- Did you restart the server after changes?
- Check for typos in the path

### 500 errors

- Check logs: `gcloud run logs read finale-webhooks --region us-central1 --limit 10`
- Look for stack traces
- Verify environment variables are set in Cloud Run

### Changes not deploying

- Make sure you committed and pushed to GitHub
- Verify the deployment completed: `gcloud run services describe finale-webhooks --region us-central1`
- Check build logs if it failed

### Can't test locally

- Make sure `.env` file exists with valid credentials
- Run `npm install` if you just pulled changes
- Check port 8080 isn't already in use

---

## 💡 Pro Tips

1. **Use execId for tracking** - Every request gets a unique ID for log correlation
2. **Always validate input** - Return 400 errors for bad requests
3. **Log important steps** - Makes debugging production issues easier
4. **Test error cases** - Not just happy path
5. **Keep routes small** - Move complex logic to separate functions
6. **Use utility functions** - Don't duplicate code from other routes
7. **Document as you go** - Future you will thank you!

---

Happy coding! 🚀
