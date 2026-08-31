# Pipeline Port Status

This is the evidence register for porting the `conf-app` development pipeline into `tldraw-confluence`. Update status only after the recorded validation has run.

Status vocabulary:

- `PENDING` — implementation or validation has not finished;
- `BLOCKED` — implementation exists, but an explicit contract conflict or missing capability prevents validation;
- `LOCAL` — non-destructive local validation passed;
- `LIVE` — the GitHub/Forge path was exercised with evidence;
- `STRUCTURAL ONLY` — the definition exists but its state-changing path was intentionally not run;
- `DEFERRED` — a later work package owns it;
- `SKIPPED` — not applicable to this app.

| Item | Decision | Status | Validation/evidence |
|---|---|---:|---|
| Node/pnpm workspace and one lock | Adapt | LOCAL | Clean frozen install passes; the resolution guard accepts exactly 31 reviewed entries, including the user's three Option A build-only convergence entries |
| Root validation commands | Adapt | LOCAL | Secretless/offline `pnpm validate` passes end to end; authenticated official Forge lint remains a separate protected-deploy gate |
| Repository contract tests | Adapt | LOCAL | Vitest: 32/32 covering dependency resolution, workflow/release semantics, adapted skills, and manifest validation |
| Playwright harness | Adapt | LOCAL | Normal and `CI=1` collection each find exactly one non-product sentinel in one file |
| Project guidance | Adapt | LOCAL | Symlink, stale-text, privacy, all checked local-link, and whitespace checks pass; an unreferenced legacy PNG with an embedded non-placeholder tenant hostname was removed |
| PR CI | Adapt | LOCAL | Every branch push and PR runs `Build and Unit Test`; branch-key concurrency deduplicates push/PR runs; staging remains main-only |
| Forge staging | Adapt | STRUCTURAL ONLY | Exact-SHA/protected-environment definition reviewed; build stays on Node 22.22.3, the Forge CLI uses the shared Node 20 workaround, and authenticated lint precedes raw deploy; no deploy or UI claim executed |
| GitHub protection configuration | Adapt | BLOCKED | Read-only remote audit found no environments, repository-level Actions variables/secrets, branch protection, or ruleset; configure the documented controls before merge |
| Draft release | Adapt | STRUCTURAL ONLY | Main-run, evidence-hash, freshness, required delta-notes, stable-release, and reviewer gates reviewed; no draft created |
| Production release | Adapt | STRUCTURAL ONLY | Disabled until branding, fixture, PVT, and two independent publication/environment approval gates close; normal releases enforce predecessor ancestry |
| Production lineage authority | Adapt | BLOCKED | Normal workflow races are guarded, but remote releases/tags are mutable and immutable releases are disabled; production enablement needs a tamper-resistant last-successful-production SHA record plus deletion/mutation governance |
| `validate-branch` | Adapt | LOCAL | Skill contract passes and its first locally scoped, non-deploying path, `pnpm validate`, succeeds; UI is correctly `SKIPPED — no runtime change` |
| `forge-tunnel` | Adapt | BLOCKED | Skill schema and command contract pass; Forge identity/install preflight needs local credentials not present in this checkout |
| `spot-check` | Adapt | STRUCTURAL ONLY | Skill schema and evidence rules pass; no approved fixture or runtime change was exercised |
| PR lifecycle skill set | Adapt | LOCAL | Schemas and read-only GitHub discovery/help pass; all state-changing halves remain structural |
| Dependency updates | Adapt | LOCAL | Weekly dev-tool-only Dependabot contract present; product/runtime packages are excluded in WP1 |
| License metadata alignment | Defer | DEFERRED | `LICENSE.md` is Apache-2.0 while existing package metadata says MIT/ISC; owner/legal confirmation required before changing either |
| `release-app` | Adapt | STRUCTURAL ONLY | Single-app fresh exact-SHA draft → required delta notes → explicit publish → independent production review → deploy → PVT → delta spot-check contract exists; its fail-closed WP1 gate prevents publication |
| Whiteboard smoke/PVT | Adapt | BLOCKED | Single-app PVT contract exists, but execution needs an approved production fixture and visible build identity from WP2 |
| `check-version` | Defer | DEFERRED | Needs a visible release tag/SHA |
| `health-check` | Defer | DEFERRED | Needs deployed lifecycle events and a baseline |
| Cloudflare, D1, paywall, product-variant pipeline | Skip | SKIPPED | No equivalent infrastructure in this app |
| Source settings/hooks | Skip | SKIPPED | Machine/account-specific and not portable |

## `conf-app` lifecycle parity

The target lifecycle deliberately keeps the same shape as the reference project:

`validate → submit Draft → ready → babysit exact SHA → land → main staging → SHA-pinned draft → release-app → production deploy → PVT → delta-driven spot-check`

The single Whiteboard app removes only product matrices, canary/soak ordering,
Cloudflare publication, manifest variant rewrites, and tenant-specific recipes. WP1
also retains three explicit temporary safety differences: staging is main-only, draft
creation waits for reviewed UI evidence while product E2E is absent, and production is
disabled until immutable evidence, an approved fixture, visible build identity, and
PVT exist. A tamper-resistant last-successful-production SHA record must also replace
the mutable release list as the deployment-history authority before production is
enabled. These differences must shrink as their prerequisites land; they are not a
second release model.

## Package-resolution evidence

The checked-in npm baseline records importer-specific dependency edges and reachability. Baseline sizes are root 236 nodes/334 edges, frontend 1,521/3,361, and migration helper 11/10. The clean frozen pnpm install contains 1,919 packages across four workspace projects, reports no ignored build scripts, and has lock SHA-256 `b4fc1cc120de7be9f2c3d0e5801ef8b3d56d5cbecaa55b5abe96a8efca37f92f`.

On 2026-08-31 the user selected Option A: retain one pnpm lock and approve exactly three `static/spa` build-graph convergence entries:

- `jest-worker@27.5.1 -> @types/node`: `18.11.9 -> 22.13.9`;
- `randombytes@2.1.0 -> safe-buffer`: `5.1.2 -> 5.2.1`;
- new `@types/node@22.13.9 -> undici-types@6.20.0` edge.

The corresponding new build nodes are covered only through those exact edge entries. The old root and frontend npm locks require opposite children for the same two regular package snapshots; pnpm's shared lock can store only one child-edge map per snapshot. Global parent overrides merely reverse which importer drifts. The checked-in guard now passes with 31 reviewed entries: the prior 27 development/topology entries, the three approved Option A entries, and pinned development-only `@forge/manifest@12.7.0`. Its schema-v2 npm baseline records all 427 peer edges, including 47 optional peers, and every topology allowlist entry freezes both baseline and pnpm edge kinds. The schema-v3 allowlist also pins a canonical count and SHA-256 for all 526 pnpm peer declarations, including pnpm-only declarations and orphan metadata keys. The guard rejects unapproved direct-specifier, direct required/optional, peer-addition/removal/range/optionality, and transitive required/optional materialization drift; it also fails if any reviewed allowlist entry is left unused. A no-change `pnpm install --lockfile-only --ignore-scripts` preserves the recorded lock hash. All other product/runtime graph drift remains forbidden.

The isolated npm and clean pnpm builds each contain 14 files. Their final filenames and SHA values differ because webpack chunk/module IDs follow the install layout. After normalizing package paths, all 547 JavaScript and one CSS source-map modules have the same source set and contents; only two webpack-generated chunk-loading/startup runtime sections differ. This evidence narrows risk but does not waive the frozen graph contract.

## Forge lint authentication boundary

Forge CLI 12.20.1 requires authentication before `forge lint`; no authless CLI flag exists. The local checkout has no Forge credentials, so the official command is correctly recorded as locally `BLOCKED`, not failed or bypassed. Pull-request validation receives no Forge credentials.

The implemented secretless adaptation pins `@forge/manifest@12.7.0` and runs `validate(false, manifestPath)` through `pnpm validate:manifest`. The command fails only on diagnostics whose level is `error`; the unchanged manifest currently reports zero errors and six existing warnings. This structural validator is narrower than full Forge CLI lint. Protected staging and production steps inject Forge credentials only into one step. That step disables Forge analytics once, runs raw `pnpm forge:lint`, then the raw environment deploy script. Build/validation stays on Node 22.22.3; only the Forge CLI segment switches to Node 20 to match the reference pipeline's node-fetch workaround. Those deployment paths remain `STRUCTURAL ONLY` until exercised live.

## Local validation evidence

- Node `22.22.3` and pnpm `10.34.5`;
- frozen install: PASS, including after all three npm locks were removed;
- ESLint: PASS with zero errors and 13 pre-existing source warnings;
- Vitest: PASS, 32 tests across four files;
- Whiteboard build and relative resource-output check: PASS;
- pinned offline Forge manifest validation: PASS with zero errors and six existing warnings;
- Playwright collection: PASS locally and under `CI=1`, one sentinel in one file;
- all ten repository skills pass the bundled `skill-creator` structural validator;
- all four workflow files plus `manifest.yml` parse as YAML, and all 16 checked local Markdown links resolve;
- read-only GitHub repository/PR/help discovery: PASS; no workflow is registered on `main` before this branch lands;
- remote immutable releases: disabled; authoritative production-SHA ledger: absent and required before production enablement;
- Forge tunnel help: PASS; identity/environment/install discovery is BLOCKED because the three required local inputs are missing, and port 3000 is free;
- guarded runtime diff against `a3393e1`: empty;
- `git diff --check`: PASS;
- official Forge lint: locally BLOCKED because authentication is absent; structurally required immediately before both protected deploy commands;
- full secretless/offline `pnpm validate`: PASS.

## WP1 guarded paths

WP1 must leave these paths byte-for-byte unchanged from approval commit `a3393e1`:

- `manifest.yml`
- `src/**`
- `static/spa/src/**`
- `static/spa/public/**`
- `atlassian-migration/index.js`

UI validation for WP1 tooling is `SKIPPED — no runtime change`. A staging UI claim remains PENDING until a real screenshot, snapshot, or network/resolver intercept is captured.

## Existing license-metadata discrepancy

`LICENSE.md` contains Apache License 2.0, while the root package declares `MIT` and the migration helper declares `ISC`. WP1 does not infer which metadata is authoritative and does not alter those declarations. The README points readers to `LICENSE.md` without making a new legal claim; alignment is deferred for owner/legal confirmation.

## Historical privacy cleanup

The current public tree no longer contains the unreferenced legacy PNG discovered by
the WP1 privacy scan. The blob already exists in published Git history; purging it
requires a separately authorized repository-history rewrite and coordinated
force-push. Do not repeat its embedded tenant identifier in a public issue or PR.
