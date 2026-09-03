---
name: release-app
description: Release the single Whiteboard Forge app in ZenUml/tldraw-confluence through its main-generated draft, production workflow, PVT, and delta-driven spot check. Use only for an explicit production release request.
---

# Release Whiteboard App

Use the same authorization model as `conf-app`: a successful main workflow creates a
SHA-pinned draft automatically, explicit publication authorizes production, the
release workflow deploys it, then PVT and the delta-driven spot check validate it.
This repository has one app, so there is no product selection or variant ordering.

## Authorization

Publishing the GitHub release is the production authorization boundary. Never infer
that authority from a merge, staging request, PR approval, or readiness inspection.
Ask for explicit confirmation immediately before publishing the exact draft.

Draft creation is automatic and does not require a separate reviewer. Production
starts from the release publication and does not require a second environment
approval. The `production-tldraw` environment remains only to supply its existing
Forge credential.

## 1. Select the main-generated draft

List recent releases and select the newest usable draft matching
`vYYYY.MM.DDHHMM-tldraw`:

    gh release list --repo ZenUml/tldraw-confluence --limit 30 \
      --json tagName,isDraft

Read its exact metadata:

    gh release view TAG --repo ZenUml/tldraw-confluence \
      --json tagName,isDraft,isPrerelease,targetCommitish,body,url,publishedAt

Require the draft to be less than 24 hours old from its UTC tag timestamp. Require
`targetCommitish` to resolve to an exact commit SHA on `main`, and require the matching
`Build, Test and Stage` main-push run to have passed `Build and Unit Test`, `Deploy to
Forge Staging`, and `Draft: Whiteboard`. Never publish a draft targeting a movable
branch or an earlier main SHA.

If no usable draft exists, dispatch `Build, Test and Stage` on `main` only when its
workflow supports that trigger; otherwise report `BLOCKED — no current main-generated
draft`. Never create or move a tag by hand.

## 2. Establish the release delta and notes

Resolve the previous published `-tldraw` tag. If one exists, compute the commit delta
from that tag to the draft SHA and require forward ancestry. For the first GitHub
release, review the currently shipping change set instead. Classify commits as:

- `behavioral` — reachable user behavior;
- `instrumentation` — analytics or diagnostics only;
- `infra/test/docs` — no shipped behavior.

Replace the generated placeholder with concise, privacy-safe notes under `## Changes`.
Do not include tenant, page, board, credential, or private evidence details. Do not
update the draft before the publication confirmation.

## 3. Confirm and publish

Show the user:

- exact draft tag and SHA;
- previous published tag, if any;
- successful main run and staging evidence status;
- proposed release notes;
- planned production PVT and delta-driven assertions.

Ask for explicit confirmation to update and publish this exact draft. After the user
confirms, update the same draft body and publish it. Re-read it and verify that it is
stable, no longer a draft or prerelease, and still resolves to the approved SHA. Do
not create a replacement release or move its tag.

## 4. Watch the production deploy

Find the `Release` workflow run caused by that publication using the release event and
exact tag:

    gh run list --repo ZenUml/tldraw-confluence --workflow "Release" \
      --event release --branch "TAG" --limit 20 \
      --json databaseId,workflowName,event,headBranch,headSha,createdAt,status,conclusion,url

Require workflowName == `Release`, event == `release`, the exact tag/ref, and the
approved SHA. Watch that exact run, then re-read its job result. A deploy failure stops
the release session; never roll back, unpublish, or redeploy automatically.

## 5. Run PVT

Invoke the project `pvt` skill immediately after production deploy succeeds. Require
the approved synthetic fixture, expected release tag, visible build identity,
edit/save/reload behavior, and UI evidence. A BLOCKED or FAIL result is not a
successful release validation.

## 6. Run the delta-driven spot check

Pass the Step 2 classification to `spot-check`. Exercise each behavioral commit and
either exercise or explicitly skip each instrumentation commit. Pure infra/test/docs
changes may have no focused UI assertion when the reason is recorded. Never rewrite
the plan after observing a failure.

## Report

Report the tag and exact SHA, release notes, production workflow result, PVT result,
delta-driven spot-check result, any blocker or mutation, and `rollback: not performed`.
