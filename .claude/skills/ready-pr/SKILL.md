---
name: ready-pr
description: Mark a ZenUml/tldraw-confluence Draft pull request Ready for Review without pushing, fixing CI, or merging. Use when the user asks to ready or open an existing PR for review.
---

# Ready PR

Change only the Draft state of one ZenUml/tldraw-confluence PR.

## Read-only preflight

Resolve the PR in this order:

1. The explicit PR number supplied by the user.
2. The PR for the current branch.

Do not select an unrelated recent PR.

Run:

    gh repo view --json nameWithOwner
    gh pr view PR_NUMBER --repo ZenUml/tldraw-confluence --json number,title,url,state,isDraft,headRefName,headRefOid,baseRefName
    gh pr ready --help

Require:

- The repository is ZenUml/tldraw-confluence.
- The PR is open and targets main.
- The PR is still Draft. If already Ready, report it and make no change.
- Local validation evidence for the same head exists when the head branch is checked out. The repository contract is pnpm validate.

This skill does not switch branches to manufacture local evidence. If the local checkout is not the PR head, report that local validation was not re-run; the Build and Unit Test job remains the authoritative remote check.

## Mark Ready — STRUCTURAL ONLY / UNVALIDATED

This state-changing half remains structural until exercised on a real ZenUml/tldraw-confluence WP1 PR.

Proceed only when the user authorized the Draft-to-Ready transition:

    gh pr ready PR_NUMBER --repo ZenUml/tldraw-confluence

Re-read the PR and verify isDraft is false.

The ready_for_review event starts Build, Test and Stage. In WP1 this runs Build and Unit Test for the PR; it does not prove product UI behavior or deploy the PR to staging.

## Boundaries

- Change only Draft state.
- Do not push commits, re-run jobs manually, edit the PR, merge, dispatch a staging workflow, create/publish a release, or deploy production.
- Always pair a PR number with its title or purpose in reports.

Report the resulting state and the new Build and Unit Test run as pending until babysit-pr verifies the exact head SHA.
