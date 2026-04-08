---
title: Theme Git Workflow
sidebar_position: 999
---

**Partify Theme Git Workflow**

**Branch Structure**

- `main` — source of truth, all development happens here
- `main-usa` — connected to the USA Shopify store
- `main-ca` — connected to the CA Shopify store

**Before Starting Any Work**
Always sync `main` with `main-usa` first to catch any theme editor changes:

```bash
git checkout main
git pull origin main-usa
git push origin main
```

**Making Changes**

- All changes go to `main` (or a branch off `main` via PR)
- When you push to `main`, the GitHub Action automatically merges allowlisted files into both `main-usa` and `main-ca`
- If your push includes non-allowlisted files, you'll get a Slack notification listing the files that need to be manually carried over

**Allowlisted Files (auto-sync to both stores)**

- `snippets/*`
- `sections/*`
- `assets/product-page-component-library.js`
- `assets/product-page-header-progress.js`
- `assets/global-library.js`
- `locales/en.default.json`
- `locales/es.json`

**Everything else** requires manual carry-over to `main-usa` and `main-ca` after pushing to `main`.

**CA/USA Specific Changes**
If a change is store-specific, make it directly on `main-ca` or `main-usa` via a branch and PR — don't push it to `main`.
