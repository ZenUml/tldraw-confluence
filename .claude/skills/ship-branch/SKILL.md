---
name: ship-branch
description: Carry a ZenUml/tldraw-confluence branch through validation, Ready PR submission, exact-SHA CI monitoring, authorized merge, and staging verification. Use for an explicit ship request; production remains separate.
---

# Ship Branch

Compose validate-branch, submit-branch, babysit-pr, and land-pr with hard boundaries. Shipping ends after the merged SHA is verified on Forge staging; it never publishes or deploys production.

## Read-only preflight

Run:

    git status --short --branch
    git fetch --prune
    git remote -v
    gh repo view --json nameWithOwner,defaultBranchRef
    gh pr list --limit 5

Verify:

- Repository is ZenUml/tldraw-confluence and base is main.
- Changes are scoped and owned by this task.
- No other session's dirty work would be switched, stashed, restored, cleaned, or overwritten.
- All composed skill files exist.

If the current branch is main, create or move the work only through the repository's branch/worktree policy before committing. Never commit feature work directly to main.

## Shipping flow — STRUCTURAL ONLY / UNVALIDATED

The state-changing portions remain structural until exercised on a real ZenUml/tldraw-confluence WP1 PR.

### 1. Validate

Invoke validate-branch. It runs pnpm validate.

- Stop on local failure.
- For WP1 process-only work, UI is SKIPPED — no runtime change.
- For runtime/user-visible work, stop unless spot-check produced evidence for every required UI assertion.

### 2. Commit and submit as Ready

Commit only the scoped change on a non-main branch when the ship request authorizes committing it.

Invoke submit-branch but override its Draft default: create the PR Ready for Review. If a matching Draft PR already exists, invoke ready-pr. This avoids treating Draft as a hidden test gate; WP1 runs the same Build and Unit Test contract for both states.

Submit does not merge.

### 3. Babysit the exact head

Invoke babysit-pr for the labelled PR. Require Build and Unit Test success for the exact head SHA.

- If the request authorizes fixes, babysit-pr may use its bounded three-attempt loop.
- Otherwise monitoring remains read-only.
- Stop on exhausted retries, merge conflicts, missing configuration, or a changed/unverified head.

### 4. Land

An explicit request such as ship, ship it, land, or merge supplies merge authorization for this flow. If the request was only submit, ready, or check, ask before invoking land-pr.

Invoke land-pr. It rechecks authorization and merge preconditions, merges, and verifies the exact main SHA plus Deploy to Forge Staging.

### 5. Stop before release

Report the evidence-gated Prepare Draft Release state as created, not started, or failed when observable. Do not dispatch it. Never publish a release or run the Release workflow.

## Stop conditions

Each boundary must succeed before the next starts. Do not skip validation, accept CI for an earlier SHA, infer UI success, force-push, auto-resolve conflicts, auto-rollback, or broaden a fix beyond the branch's purpose.

## Output

Always pair the PR number with its title or purpose. Report:

    Validation: PASS or FAIL
    UI evidence: PASS with evidence | SKIPPED — no runtime change | BLOCKED
    PR: labelled number, URL, Ready state
    PR CI: Build and Unit Test result for exact head SHA
    Merge: result and merge SHA
    Main staging: Build and Unit Test plus Deploy to Forge Staging
    Draft release: CREATED | NOT STARTED | FAILED
    Production: NOT PERFORMED
