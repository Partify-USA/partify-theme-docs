---
title: Theme Git Workflow
sidebar_position: 999
---

**Partify Theme Git Workflow**

**Branch Structure**

- `main` — source of truth, all development happens here
- `main-usa` — connected to the USA Shopify store
- `main-ca` — connected to the CA Shopify store

**Before Starting Any Work on Main**
Check if there are any theme editor changes on `main-usa` that aren't on `main` yet:

```bash
git fetch --all
git log origin/main..origin/main-usa --oneline
```

If there are real commits (ignore any "Merge branch" commits — those are action noise), cherry-pick them into `main`:

```bash
git cherry-pick <commit-hash>
git push origin main
```

Then pull `main` as normal:

```bash
git pull origin main
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
If a change is store-specific, always work on a branch off `main-ca` or `main-usa` rather than directly on the branch. This keeps the store branch clean and prevents conflicts with the auto-sync action:

```bash
git checkout main-ca
git checkout -b bugfix/ca-specific-fix
# do your work
git add .
git commit -m "your message"
git push origin bugfix/ca-specific-fix
```

Then open a PR into `main-ca` on GitHub. Do not push store-specific changes to `main`.

**Working on a Fix That Affects Both Stores**

If you find an issue on one store that also needs to be applied to the other, use cherry-pick to bring the fix into `main` and let the action handle the rest.

1. In your `main-ca` or `main-usa` worktree, stage and commit your fix (Do not push to remote!):

```bash
git add .
git commit -m "your message"
```

2. Grab the commit hash:

```bash
git log --oneline
```

3. Go to your `main` worktree and cherry-pick the commit:

```bash
git cherry-pick <commit-hash>
```

4. Push to `main` — the action will auto-sync to both stores:

```bash
git push origin main
```

5. Navigate to the store branch worktree and reset it to discard the unpushed commit since `main` is now handling it:

```bash
# in your main-ca worktree
git reset --hard origin/main-ca

# or in your main-usa worktree
git reset --hard origin/main-usa
```
