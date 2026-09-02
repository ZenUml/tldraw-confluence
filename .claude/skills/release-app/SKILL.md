---
name: release-app
description: Release the single Whiteboard Forge app in ZenUml/tldraw-confluence through its exact-SHA draft, production workflow, PVT, and delta-driven spot check. Use only for an explicit production release request.
---

# Release Whiteboard App

Promote one staged Whiteboard commit through the same lifecycle boundaries used by
`conf-app`: SHA-pinned draft, release notes, explicit publication, production deploy,
PVT, and a spot check derived from the release delta. This repository has one app;
there is no product selection, tier ordering, or adjacent release.

## Authorization and current gate

Publishing a GitHub release is the first production authorization boundary. Never
infer that authority from a merge, a staging request, a PR approval, or a request to
inspect release readiness. Ask for explicit confirmation immediately before
publication. The required reviewer on the protected `production-tldraw` environment
is a second independent authorization. Publication never authorizes this agent to
approve, bypass, weaken, or impersonate that environment review.

Before changing a draft, verify read-only:

    gh repo view --repo ZenUml/tldraw-confluence --json nameWithOwner,defaultBranchRef,url
    gh variable get TLDRAW_PRODUCTION_RELEASE_ENABLED --repo ZenUml/tldraw-confluence
    gh api repos/ZenUml/tldraw-confluence/environments/production-tldraw

Require repository validation to enforce the fixed public manifest title
`Whiteboard for Confluence`. Public naming has no separate approval variable.

Also require the checked-in port-status record to show that production deployment,
immutable UI provenance, an approved production fixture, visible build identity, and
Whiteboard PVT are live. It must also identify a tamper-resistant authoritative
record of the last-successful production SHA and active release/tag deletion
governance; the mutable GitHub release list is not that record. During WP1 these
preconditions deliberately fail. Report:

    BLOCKED — production release disabled in WP1

Then stop before editing a draft, publishing, rerunning CI, changing variables or
environments, or invoking a deploy command. Never weaken or set a gate from this
skill.

The remaining sections define the enabled flow once those prerequisites are closed.

## 1. Select the exact staged draft

List recent releases and choose only a draft whose tag matches
`vYYYY.MM.DDHHMM-tldraw`:

    gh release list --repo ZenUml/tldraw-confluence --limit 30 \
      --json tagName,isDraft

For the selected draft, fetch its exact metadata:

    gh release view TAG --repo ZenUml/tldraw-confluence \
      --json tagName,isDraft,isPrerelease,targetCommitish,body,url,publishedAt

Derive draft freshness from the UTC timestamp required in the tag by the protected
draft-workflow contract, not GitHub release `createdAt` ([GitHub defines that field
as the release commit
date](https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28)).
Require the tag timestamp to be within the last 24 hours at selection time. Require
`targetCommitish` to resolve to one exact commit SHA on `main`. Read the referenced
`Build, Test and Stage` push run and prove that this same SHA passed both `Build and
Unit Test` and `Deploy to Forge Staging`, completed before the tag was generated, and
is also within the last 24 hours. Require the release body to begin with the
staging-run ID and approved evidence reference. Never use a draft targeting a movable
branch, an earlier green SHA, or an unverified rerun.

Resolve the previous published `-tldraw` release SHA. When one exists, require it to
be an ancestor of the selected draft SHA with `git merge-base --is-ancestor`. This
normal release path is forward-only. An older or divergent commit requires a
separately designed and authorized rollback path; never publish it through this
skill by treating it as a normal release.

If there is no usable draft, report `BLOCKED — no verified staged draft`. Do not push
a synthetic commit, dispatch staging, create a replacement draft, or select another
release.

## 2. Establish the release delta and notes

Resolve the previous published `-tldraw` tag and compute one commit delta from it to
the selected draft SHA. Read unclear diffs. Classify every commit as:

- `behavioral` — reachable user behavior;
- `instrumentation` — analytics or diagnostics only;
- `infra/test/docs` — no shipped behavior.

Use that same classification for release notes and the later spot-check plan. Compose
concise user-facing notes locally. Preserve the machine-readable provenance header
as the first two lines, add a blank line, then add `## Changes` and the delta-derived
notes. Never put a tenant, page, board body, credential, or private evidence location
in the public release body.

The `## Changes` section is mandatory. If the delta has no behavioral changes, write
explicit privacy-safe maintenance text such as `- Maintenance release; no user-facing
changes.` rather than leaving the section empty.

Do not update the draft yet.

## 3. Confirm and publish

Show the user the tag, exact SHA, prior tag, staging run, evidence status, release
notes, production gates, and planned PVT/spot-check assertions. Ask for explicit
confirmation to update and publish this exact draft.

After confirmation, update the body and publish the same draft. Re-read the release,
record its `publishedAt`, and verify that it is stable, not a draft or prerelease,
still uses the approved tag, and still resolves to the selected SHA. Publication
starts the workflow but does not satisfy or authorize the protected environment's
independent reviewer gate. Do not create a new tag or move an existing tag.
The staging completion, tag timestamp, and publication must each still be less than
24 hours old when that reviewer allows the deploy job to proceed. The workflow
carries their earliest expiry across the approval wait; after it passes, the job
fails closed and a fresh staged draft is required.

## 4. Watch the exact production deploy

Find the workflow run caused by that publication using the `Release` workflow, the
`release` event, and the exact tag/ref:

    gh run list --repo ZenUml/tldraw-confluence --workflow "Release" \
      --event release --branch "TAG" --limit 20 \
      --json databaseId,workflowName,event,headBranch,headSha,createdAt,status,conclusion,url

Require workflowName == `Release` and event == `release`, plus the exact tag/ref,
`headSha` equal to the selected SHA, and the run `createdAt` at or after the release
`publishedAt`. Do not select only by SHA: multiple releases can share one commit. If
pending, watch it, then re-read the run and jobs; never trust only a watch command's
exit code.

Treat the production deploy job independently from later validation. When the deploy
job succeeds, proceed immediately to PVT. If it fails, capture the failed logs,
report the category and run URL, and stop. The release may already be public; never
unpublish, roll back, or redeploy automatically.

After the independent environment approval and immediately before deploy, require
the workflow to prove again that this is the unique latest stable Whiteboard release
and that its unambiguous predecessor is an ancestor. A newer or same-time ambiguous
release blocks the older job instead of allowing an out-of-order deployment.

## 5. Run PVT

Invoke the project `pvt` skill as soon as the production deploy job is green. PVT is
mandatory. Require its approved fixture, expected release tag, and UI evidence. A
BLOCKED or FAIL result stops this release session and must not be described as a
successful release validation.

## 6. Run the delta-driven spot check

Pass the Step 2 commit classification to `spot-check`. Before opening a browser,
write at least one observable assertion for every reachable `behavioral` commit and
either an assertion or explicit skip reason for each `instrumentation` commit. Pure
`infra/test/docs` deltas may report no focused UI assertions with a concrete reason.

Run only the smallest set that exercises what shipped. Each UI PASS requires actual
evidence. If PVT or a focused assertion fails, stop and report; do not alter the plan
after observing the result and do not roll back automatically.

## Report

Always report:

- tag and exact SHA;
- release delta and notes status;
- production workflow and deploy-job result;
- PVT result with evidence classification;
- delta-driven spot-check results;
- any blocker or mutation performed;
- rollback: not performed.
