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
Check that all three branches are in sync by comparing their latest commits:

```bash
git fetch --all
git log --oneline -1 origin/main
git log --oneline -1 origin/main-usa
git log --oneline -1 origin/main-ca
```

If all three show the same commit message, you're in sync and can proceed. If any differ, check the rest of this doc for the appropriate cherry-pick process depending on which branch is behind.

Then pull `main` before starting work:

```bash
git pull origin main
```

**Making Changes**

- All changes go to `main` (or a branch off `main` via PR)
- When you push to `main`, the GitHub Action automatically cherry-picks the commit onto both `main-usa` and `main-ca` for allowlisted files
- If your push includes non-allowlisted files, you'll get a Slack notification listing the files that need to be manually carried over

**Allowlisted Files (auto-sync to both stores)**

- `snippets/*`
- `sections/*`
- `assets/product-page-component-library.js`
- `assets/product-page-header-progress.js`
- `assets/global-library.js`
- `locales/en.default.json`
- `locales/es.json`
- `...others not listed here`

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

**Working on a Fix on One Store That Affects Both Stores**

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

---

**Manually Syncing main to main-ca (when auto-sync fails)**

When a push to `main` includes blocked files (non-allowlisted), the GitHub Action skips the entire auto-sync and sends a Slack notification. When this happens, you need to manually carry the changes to `main-ca`.

The best approach is to cherry-pick the merge commit from `main` directly onto `main-ca`. The Slack notification includes the commit SHA.

> **Important:** Pushes to `main` via PR are merge commits. Cherry-picking a merge commit requires the `-m 1` flag to tell git which parent to diff against (`1` = `main`, which is always correct here).

1. Make sure your local `main-ca` is up to date:

```bash
# in your main-ca worktree
git pull origin main-ca
```

2. Cherry-pick the merge commit using the SHA from the Slack notification:

```bash
# in your main-ca worktree
git cherry-pick -m 1 <commit-sha>
```

3. Git will auto-merge all allowlisted files. For blocked files (e.g. `templates/*.json`, `layout/theme.liquid`), git will attempt to auto-merge them too — but if CA has a diverged version of any of those files, you'll get a conflict that needs to be resolved manually, preserving CA-specific logic while incorporating the new feature changes.

4. Once all conflicts are resolved:

```bash
# in your main-ca worktree
git add .
git cherry-pick --continue
```

5. Test locally with Shopify CLI before pushing:

```bash
# in your main-ca worktree
shopify theme dev
```

6. When satisfied, push to the live CA branch:

```bash
# in your main-ca worktree
git push origin main-ca
```

> **Why this works well:** Cherry-picking the merge commit lets git handle all the allowlisted files automatically. You only need to manually review the files that are intentionally different between stores.

---

**Important: Never merge a deploy branch back into main**

Never run `git merge main-usa` or `git merge main-ca` into `main`. The deploy branches can diverge from `main` (especially `main-ca`), and merging them back introduces that divergence into `main`, which then causes conflicts on every future auto-sync.

If you need changes from a deploy branch in `main`, use cherry-pick to bring over the specific commits — never a full merge.
