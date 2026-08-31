---
name: validate-branch
description: Validate a ZenUml/tldraw-confluence branch locally before push or PR submission. Use for branch checks, preflight, tests, builds, or readiness questions in this repository.
---

# Validate Branch

Run the repository's authoritative local validation contract and report UI evidence separately.

## Scope

- Work from the ZenUml/tldraw-confluence repository root.
- The authoritative command is:

    pnpm validate

- It is the secretless/offline contract used by pull-request CI. It must not require
  Forge credentials or call the official Forge CLI lint.
- It includes `pnpm validate:manifest`, backed by the repository-pinned internal
  `@forge/manifest` package. Treat that as deterministic structural validation, not
  the complete official Forge lint or proof of platform acceptance.
- Do not replace it with a hand-picked subset of checks.
- Do not weaken tests, lint rules, or validation scripts to manufacture a pass.
- In WP1, pnpm test:e2e:list collects one non-product sentinel. Collection is not browser execution, product coverage, or UI evidence.

## Preflight

Confirm the checkout and inspect changes without modifying them:

    git rev-parse --show-toplevel
    git status --short --branch
    git diff --name-only
    git diff --cached --name-only

If the working tree contains unrelated changes, preserve them. Do not restore, stash, clean, or switch over another session's work.

## Run validation

Run:

    pnpm validate

Stop on failure. Identify the first failing stage from the command output and report the relevant error. A later successful subcommand does not erase an earlier failure.

Do not add credentials to make this command pass. If authenticated platform
validation is relevant, run official `pnpm forge:lint` separately only when local
Forge credentials already exist. Protected staging and production jobs must run it
immediately before deploy; pull-request jobs receive no Forge secrets. A missing
local Forge login does not relabel a successful secretless branch validation as a
failure.

## Classify UI validation

After local validation, classify user-visible evidence independently:

1. Determine the branch base and inspect both committed and uncommitted paths.
2. For WP1 process-only changes, confirm that no guarded runtime path changed:
   - manifest.yml
   - src/**
   - static/spa/src/**
   - static/spa/public/**
   - atlassian-migration/index.js
3. If the change has no runtime or user-visible effect, report exactly:

    UI validation: SKIPPED — no runtime change

4. If runtime or user-visible behavior changed, invoke the spot-check skill. A UI PASS requires actual screenshot, accessibility snapshot, or network-intercept evidence for every UI assertion.
5. If there is no approved authenticated fixture, report UI validation as SKIPPED or BLOCKED with the reason. Never infer a UI PASS from pnpm validate, unit tests, a build, or E2E collection.

## Result

Report:

    Local validation: PASS | FAIL
    Manifest structural validation: PASS | FAIL
    Official Forge lint: PASS | FAIL | NOT RUN — authenticated deployment check
    UI validation: PASS with evidence | SKIPPED — no runtime change | BLOCKED with reason
    Branch readiness: READY | BLOCKED

A branch with a required but blocked UI check is not ready to ship.
