---
name: babysit-pr
description: Monitor and, when explicitly authorized, fix ZenUml/tldraw-confluence PR CI for the exact head SHA. Use to watch a PR, diagnose Build and Unit Test failures, or carry a submitted PR to green.
---

# Babysit PR

Monitor the authoritative PR run and optionally make bounded repository-local fixes. This skill never merges and never performs a production release.

## Resolve the exact PR and SHA

Use the explicit PR number, otherwise the PR for the current branch. Do not fall back to an unrelated recent failure.

Run:

    gh repo view --json nameWithOwner
    gh pr view PR_NUMBER --repo ZenUml/tldraw-confluence --json number,title,url,state,isDraft,headRefName,headRefOid,baseRefName,mergeable,mergeStateStatus,statusCheckRollup

Require ZenUml/tldraw-confluence, an open PR targeting main, and record headRefOid. Always label the PR number with its title or purpose.

## Find the authoritative run

The PR workflow is Build, Test and Stage. The required PR job is exactly Build and Unit Test.

List runs:

    gh run list --repo ZenUml/tldraw-confluence --workflow "Build, Test and Stage" --event pull_request --branch HEAD_BRANCH --limit 20 --json databaseId,headSha,status,conclusion,url,createdAt

Select the newest run whose headSha exactly equals headRefOid. Do not reuse a green run from an earlier commit.

For both Draft and Ready PRs:

- Build and Unit Test must succeed.
- The main-only staging job is expected not to run on a PR.
- Do not expect a product E2E job in WP1.
- Do not treat pnpm test:e2e:list collection as UI evidence.

If the run is pending, watch it, then re-read its status and conclusion:

    gh run watch RUN_ID --repo ZenUml/tldraw-confluence
    gh run view RUN_ID --repo ZenUml/tldraw-confluence --json status,conclusion,headSha,jobs,url

Use the re-read result as authoritative rather than relying only on the watch command's exit status.

## Diagnose a failure

Read failed logs:

    gh run view RUN_ID --repo ZenUml/tldraw-confluence --log-failed

Classify the failure before acting:

- Repository code or contract failure reproducible with pnpm validate
- Workflow/configuration failure
- Dependency installation or runner/network failure
- Missing repository/environment configuration
- Merge conflict or stale head SHA

Run pnpm validate locally only in a checkout of the same head. Do not switch over a dirty shared checkout. If safe local reproduction is unavailable, report the blocker instead of claiming a diagnosis.

## Fix and retry — STRUCTURAL ONLY / UNVALIDATED

This state-changing half remains structural until exercised on a real ZenUml/tldraw-confluence WP1 PR.

- Monitoring/status requests are read-only. They do not authorize edits, commits, pushes, or reruns.
- When the user explicitly asks to fix CI, make only the smallest repository-local correction supported by the logs and local reproduction.
- Run pnpm validate before every push.
- Commit only scoped files and use a regular push; never force-push.
- Count each fix-and-push or manual rerun as one attempt. Stop after at most three attempts.
- Re-read the PR head SHA after every push and monitor only its matching run.
- A manual rerun is appropriate only for evidence-backed transient infrastructure failure and only when no run is active.
- Never auto-resolve merge conflicts, modify secrets/environments, weaken validation, merge the PR, dispatch staging, create/publish a release, or deploy production.

## Report

Report:

- PR number plus label and URL
- Exact head SHA and run URL
- Build and Unit Test: PASS, FAIL, PENDING, or BLOCKED
- Failure category and evidence
- Local pnpm validate result, if run
- Fixes/reruns and attempt count
- UI evidence: separate from CI
- Merge and production: not performed
