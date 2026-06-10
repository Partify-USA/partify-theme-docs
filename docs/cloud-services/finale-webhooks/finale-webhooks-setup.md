---
title: Getting Set Up
description: Step-by-step process on how to get set up with Finale Webhook backend
sidebar_position: 3
---

# Developer Onboarding Guide

## Finale Webhooks Cloud Run Service

Welcome! This guide will help you get set up to work on the Finale Webhooks service.

> For what the service actually does end-to-end, read [Finale Webhooks — Architecture](finale-webhooks.md) first.

---

## 🚀 Initial Setup (One-Time Setup - 30 minutes)

### Prerequisites

- Windows computer
- VS Code installed
- Git for Windows installed
- Node.js 18+ installed
- Access to the `finale-jobs` Google Cloud project

---

## Part 1: Install Required Tools

### Step 1: Install Git (if not already installed)

1. Check if you have Git: Open PowerShell and type `git --version`
2. If you get an error, download: https://git-scm.com/download/win
3. Run installer with default settings
4. Restart VS Code

### Step 2: Install Node.js (if not already installed)

1. Check if you have Node: `node --version`
2. If you need it, download LTS version: https://nodejs.org/
3. Run installer with default settings
4. Restart VS Code
5. Verify: `node --version` (should show v18 or higher)

### Step 3: Install Google Cloud CLI

1. Download: https://cloud.google.com/sdk/docs/install#windows
2. Run `GoogleCloudSDKInstaller.exe`
3. Follow installer (check all boxes)
4. Let it complete the initialization in the command window
5. Restart VS Code
6. Verify: `gcloud --version`

### Step 4: Install VS Code Extensions (Optional but Recommended)

Open VS Code and install these extensions:

- **REST Client** by Huachao Mao (for testing endpoints)

---

## Part 2: Clone and Setup the Project

### Step 5: Authenticate with Google Cloud

Open PowerShell in VS Code (Terminal → New Terminal):

```powershell
# Login with your Partify Google account
gcloud auth login
```

Browser will open - sign in with your **@partify.store** email.

```powershell
# Set application default credentials
gcloud auth application-default login
```

Again, sign in with your **@partify.store** email.

```powershell
# Set the project
gcloud config set project finale-jobs

# Verify it's set correctly
gcloud config list
```

You should see:

- `account = your-email@partify.store`
- `project = finale-jobs`

### Step 6: Clone the Repository

```powershell
# Navigate to where you keep your projects
cd C:\Users\YourName\Projects

# Clone the repo (replace YOUR_USERNAME with actual GitHub username)
git clone https://github.com/Partify-USA/finale-webhooks.git

# Navigate into the project
cd finale-webhooks
```

### Step 7: Install Dependencies

```powershell
npm install
```

You should see "added X packages" when it completes.

### Step 8: Set Up Environment Variables

1. **Copy the example file:**

   ```powershell
   Copy-Item .env.example .env
   ```

2. **Get credentials** - Ask for the values behind every key in `.env.example`.
   The service has grown well beyond the original damage webhook, so the
   credential set spans several integrations (Finale, Postgres, Google OAuth,
   Shopify, Yotpo, Redo, Slack).

3. **Edit `.env` file** in VS Code and fill in the values. `.env.example` is the
   authoritative list; the current groups are:

   ```
   # Slack
   SLACK_WEBHOOK_URL=

   # Finale store identifiers
   US_FINALE_STORE=
   CA_FINALE_STORE=
   PAINT_FINALE_STORE=

   # Google Cloud - Postgres SQL
   DB_HOST=
   DB_NAME=
   DB_USER=
   DB_PASSWORD=

   # Finale API keys/secrets + webhook tokens (per tenant)
   US_FINALE_SORDAMAGE_KEY=
   US_FINALE_SORDAMAGE_SECRET=
   US_FINALE_WEBHOOK_TOKEN=
   CA_FINALE_SORDAMAGE_KEY=
   CA_FINALE_SORDAMAGE_SECRET=
   CA_FINALE_WEBHOOK_TOKEN=
   PAINT_FINALE_SORDAMAGE_KEY=
   PAINT_FINALE_SORDAMAGE_SECRET=

   # Endpoint auth (shared secret for /webhook + /jobs)
   PARTIFY_SECRET=

   # Google OAuth (Paint Match UI)
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GOOGLE_CALLBACK_URL=
   ALLOWED_EMAIL_DOMAINS=
   SESSION_SECRET=

   # Shopify (Admin API per store)
   SHOPIFY_CLIENT_ID=
   SHOPIFY_CLIENT_SECRET=
   SHOPIFY_US_STORE=
   SHOPIFY_CA_STORE=
   SHOPIFY_EBAY_STORE=

   # Yotpo (reviews import)
   YOTPO_US_APP_KEY=
   YOTPO_US_SECRET_KEY=

   # Redo (returns sync, per tenant)
   REDO_US_STORE_ID=
   REDO_US_API_SECRET=
   REDO_CA_STORE_ID=
   REDO_CA_API_SECRET=

   # Server
   PORT=8080
   ```

4. **Save the file** (Ctrl+S)

**⚠️ IMPORTANT:** Never commit the `.env` file to Git! It's already in `.gitignore`.

---

## Part 3: Test Your Setup

### Step 9: Run Locally

```powershell
npm start
```

You should see pino log output similar to:

```
[HH:MM:SS.MMM] INFO: Finale webhooks service started
    port: 8080
    environment: "development"
```

**Keep this terminal running.**

### Step 10: Test Locally

Open a **new** terminal (Terminal → New Terminal) and run:

```powershell
# Test health check (should work even without valid credentials)
curl http://localhost:8080/

If you see a response with status code 200, you are all set! ✅

Press `Ctrl+C` in the first terminal to stop the server.

## Part 4: View Production Logs

## 🎉 You're All Set!

You can now:

- ✅ Run the service locally
- ✅ Test endpoints
- ✅ Start developing new features
```
