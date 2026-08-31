---
name: land-pr
description: Merge an authorized green ZenUml/tldraw-confluence PR, then verify the exact main SHA and Forge staging result without publishing a release. Use when the user explicitly asks to land or merge a ready PR.
---

# Land PR

Merge one authorized PR into main and verify the resulting main pipeline. Production promotion is always separate.

## Read-only preflight

Resolve only the explicit PR or current-branch PR. Run:

    gh repo view --json nameWithOwner,defaultBranchRef,mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed
    gh pr view PR_NUMBER --repo ZenUml/tldraw-confluence --json number,title,url,state,isDraft,headRefName,headRefOid,baseRefName,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup
    gh pr merge --help

Require:

- Repository ZenUml/tldraw-confluence and base main
- Open PR and unambiguous user merge authorization
- No requested-changes review or merge conflict
- Repository merge requirements satisfied
- The Build and Unit Test job succeeded for the exact headRefOid
- pnpm validate passed for that head
- Required runtime UI assertions have evidence; WP1 process-only work may be SKIPPED — no runtime change

If the PR is Draft and the user explicitly asked to land it, invoke ready-pr, then use babysit-pr to verify the new Build and Unit Test run for the unchanged head SHA. Otherwise stop.

Check whether any open PR uses this head branch as its base:

    gh pr list --repo ZenUml/tldraw-confluence --state open --base HEAD_BRANCH --json number,title,url

Do not delete the branch when a stacked child exists.

## Merge — VALIDATED 2026-08-31

Exercised on PRs #6, #7, #8, #9 and #10. Merge commit strategy each time, `--delete-branch`, then the
PR re-read to `MERGED` with `mergeCommit.oid` captured, and the exact-SHA `main` push run located from
that oid. The staging half of this skill was also exercised: every one of those runs reported
`Build and Unit Test: success`, and `Deploy to Forge Staging` failed for a reason outside this
repository — see the access boundary section of `docs/ops/pipeline-port-status.md`. Report
`MAIN CI FAILED` in that situation, as the skill already requires; do not treat it as a merge defect.

Proceed only after all preconditions and merge authorization are present.

1. Select an enabled merge strategy. Honor a user-specified enabled strategy. Otherwise
   inspect `mergeCommitAllowed`, `squashMergeAllowed`, and `rebaseMergeAllowed`: use
   the sole enabled strategy when only one is available; when several are available,
   prefer merge commit, then squash, then rebase. If none is enabled, stop.
2. Map that choice to `--merge`, `--squash`, or `--rebase` and merge the exact PR.
   Add branch deletion only when the stacked-PR check is empty.
3. Re-read the PR until state is MERGED and capture `mergeCommit.oid`. Timeout after 5 minutes.
   Do not report LANDED before this succeeds; if the timeout expires, report the last
   observed state without retrying the merge command.

Do not use auto-merge to bypass a currently failing or pending precondition.

## Verify main and staging

Find the Build, Test and Stage push run whose headSha exactly equals mergeCommit.oid:

    gh run list --repo ZenUml/tldraw-confluence --workflow "Build, Test and Stage" --event push --branch main --limit 20 --json databaseId,headSha,status,conclusion,url

Watch that run and re-read its jobs. Require:

- Build and Unit Test: success
- Stage tested main commit / Deploy to Forge Staging: success

Do not dispatch staging yourself.

Prepare Draft Release is manual and evidence-gated. Query it and draft releases read-only if relevant. If no exact-SHA draft exists, report Draft release: NOT STARTED; do not treat that as a staging failure. Never dispatch the draft workflow, create a draft, publish a release, or deploy production from this skill.

## Output

Always pair the PR number with its title or purpose. Report one of:

- LANDED — merge SHA, exact main run, Build and Unit Test, Forge staging, draft status, production not performed
- MERGE BLOCKED — failed precondition
- MAIN CI FAILED — merge completed but exact main run or staging failed

Do not auto-rollback. Report the merge SHA, run URL, failed job, and evidence.
