---
name: submit-branch
description: Push a ZenUml/tldraw-confluence feature branch and create or reuse its pull request without merging. Use when the user asks to submit, push, or open a PR for this repository.
---

# Submit Branch

Publish a scoped branch to ZenUml/tldraw-confluence. This skill never merges a PR and never publishes or deploys a production release.

## Read-only preflight

Run:

    git status --short --branch
    git remote -v
    gh repo view --json nameWithOwner,defaultBranchRef,url
    gh pr list --limit 5
    gh pr create --help

Require nameWithOwner to be ZenUml/tldraw-confluence and the base branch to be main.

Then verify:

- The current branch is not main.
- The working tree contains no mixed or unexplained changes.
- All intended changes are committed. This skill does not guess what to stage or commit.
- The branch has passed validate-branch, whose authoritative command is pnpm validate.
- Any required runtime UI check has evidence; WP1 process-only work may say SKIPPED — no runtime change.

If another session owns changes in the checkout, do not stash, restore, clean, switch, or overwrite them. Stop or use an isolated worktree that already contains only the intended branch.

Find an existing PR for the exact head branch:

    gh pr list --head HEAD_BRANCH --state open --json number,title,url,isDraft,headRefName,baseRefName

Reuse it only when headRefName and baseRefName match the intended branch and main.

## Submit — STRUCTURAL ONLY / UNVALIDATED

This state-changing half remains structural until exercised on a real ZenUml/tldraw-confluence WP1 PR.

Proceed only when the user asked to submit or create a PR.

1. Push normally; never force-push:

    git push -u origin HEAD_BRANCH

2. Reuse the matching open PR, or create one against main.
3. Default a newly created PR to Draft for collaboration. If the user explicitly asks for Ready, omit the draft flag.
4. Use the repository PR template. Include the pnpm validate result, UI-evidence classification, identity/storage impact, and release notes.
5. After creation, invoke babysit-pr in monitoring mode for the exact PR and head SHA. The authoritative PR workflow is Build, Test and Stage and its required job is Build and Unit Test.
6. Do not fix CI unless the request also authorizes fixes. Do not mark Ready, merge, dispatch staging, create/publish a release, or deploy production.

## Output

Always pair the PR number with its title or purpose. Report:

- SUBMITTED or FAILED
- PR number plus label and URL
- Branch and Draft/Ready state
- pnpm validate result
- Build and Unit Test status for the submitted head SHA
- UI evidence classification
- Explicitly: Merge not performed; production not deployed
