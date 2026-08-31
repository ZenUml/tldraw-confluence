# Git workflow policy

## Use feature branches

Never commit feature or operational work directly to `main`. Start from an up-to-date
`main` and use a focused branch whose name describes the outcome.

Before editing:

```bash
git status --short --branch
git fetch --prune
```

If the current checkout is clean, create the branch normally. If it contains changes
you did not create, do not move or destroy them. Create a separate worktree instead:

```bash
git worktree add ../tldraw-confluence-<feature> -b <feature-branch> main
```

Replace both placeholders with narrow, explicit names. Never use a broad directory,
an unresolved variable, or an existing worktree path as the target.

## Preserve other sessions

Do not use `git reset --hard`, `git checkout --`, `git restore`, `git clean`, or
`git stash` on changes that may belong to another session. Inspect the diff and work
around it or move your own work to a new worktree.

Only the assigned owner edits a shared package manifest, lockfile, workflow, or other
exclusive file. Integrators stage and commit shared-checkout work by scoped path; a
worker must not revert another worker's edits.

## Validate and submit

Run the repository contract before opening a pull request:

```bash
pnpm validate
git diff --check
```

Describe actual evidence in the pull request. A process-only WP1 change reports UI
validation as `SKIPPED — no runtime change`; it does not turn test collection into a UI
pass.

Merging, release publication, production deployment, app installation, and tenant
content changes are separate authorization boundaries. Creating a pull request does
not authorize any of them.
