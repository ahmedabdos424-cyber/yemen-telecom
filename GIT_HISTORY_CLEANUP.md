# Git History Cleanup — filter-repo

## Overview

3 secret-bearing files exist in git history (commits `ae657ed`, `412c91e`). `git-filter-repo` (v2.47.0) removes them from ALL commits.

## Impact Analysis

| Aspect | Detail |
|--------|--------|
| Commits affected | 2 (ae657ed, 412c91e + all 28 descendents rewritten) |
| Total commits | 28 |
| Tag v1.0.0 | **Will point to old history** — must be re-tagged |
| Remote | `origin` → `https://github.com/ahmedabdos424-cyber/yemen-telecom.git` |
| All collaborators | Must reclone after force push |
| Open PRs/branches | All branches become incompatible |

## Step-by-Step Commands

### Step 1: Create bare mirror backup (safe)

```bash
git clone --mirror https://github.com/ahmedabdos424-cyber/yemen-telecom.git backup-yemen-telecom.git
```

### Step 2: Run filter-repo

```bash
cd C:\Users\Ahmed\Desktop\yemen-telecom
git filter-repo --path AUDIT/MASTER_ISSUE_REGISTRY.md --path AUDIT/SECRET_INVENTORY.md --path SECRET_HISTORY_AUDIT.md --invert-paths
```

### Step 3: Verify removal

```bash
git log --all --oneline -- AUDIT/MASTER_ISSUE_REGISTRY.md
# Should return: (no output - file gone from all commits)
```

### Step 4: Force push (irreversible)

```bash
git remote add origin https://github.com/ahmedabdos424-cyber/yemen-telecom.git
git push --force-with-lease --force-if-includes origin main
git push --force-with-lease origin v1.0.0
```

### Step 5: Verify on GitHub

```bash
# Check that the secret file no longer appears:
curl -s "https://api.github.com/repos/ahmedabdos424-cyber/yemen-telecom/commits/412c91e" | grep "MASTER_ISSUE_REGISTRY"
# Should return: (empty)
```

## Rollback Plan

If something goes wrong:

```bash
# From the mirror backup:
cd backup-yemen-telecom.git
git push --mirror https://github.com/ahmedabdos424-cyber/yemen-telecom.git
# Then reclone fresh:
cd ..
rm -rf yemen-telecom
git clone https://github.com/ahmedabdos424-cyber/yemen-telecom.git
```

## Risks

1. **Force push required** — `main` branch history changes incompatibly
2. **Tag v1.0.0 detached** — must delete and re-push tag
3. **All collaborators must reclone** — `git pull` will fail with divergent history
4. **Render auto-deploy** — will trigger a fresh build on next push (good)
5. **No partial recovery** — once force-pushed, old history is gone from remote

## Status

🟡 **NOT EXECUTED** — Awaiting user approval
