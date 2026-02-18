---
title: Getting Set Up
description: Step-by-step process on how to get set up with Finale Webhook backend
sidebar_position: 1
---

# Developer Onboarding Guide

## Finale Webhooks Cloud Run Service

Welcome! This guide will help you get set up to work on the Finale Webhooks service.

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

2. **Get credentials from team lead** - Ask for:
   - Finale US API credentials
   - Finale CA API credentials
   - Webhook tokens (if applicable)

3. **Edit `.env` file** in VS Code and fill in the values:

   ```
   FINALE_US_STORE=partifyusa
   FINALE_US_API_KEY=your_actual_key_here
   FINALE_US_API_SECRET=your_actual_secret_here
   # ... etc
   ```

4. **Save the file** (Ctrl+S)

**⚠️ IMPORTANT:** Never commit the `.env` file to Git! It's already in `.gitignore`.

---

## Part 3: Test Your Setup

### Step 9: Run Locally

```powershell
npm start
```

You should see:

```
🚀 Finale webhooks service running on port 8080
Environment: development
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
