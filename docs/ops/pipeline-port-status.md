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
| `forge-tunnel` | Adapt | BLOCKED | Skill schema and command contract pass; authenticated identity and environment/version discovery work, but Atlassian explicitly denies original-app install access, proving the available identity is not an app contributor |
| `spot-check` | Adapt | LIVE | A published Marketplace 3.4.0 baseline was exercised on an approved non-production synthetic fixture: create/edit/save/reload passed, and a fresh-`localId` same-page clone produced independent persisted rendered state through edits and reloads; this does not claim the WP1 branch artifact was deployed |
| PR lifecycle skill set | Adapt | LOCAL | Schemas and read-only GitHub discovery/help pass; all state-changing halves remain structural |
| Dependency updates | Adapt | LOCAL | Weekly dev-tool-only Dependabot contract present; product/runtime packages are excluded in WP1 |
| License metadata alignment | Defer | DEFERRED | `LICENSE.md` is Apache-2.0 while existing package metadata says MIT/ISC; owner/legal confirmation required before changing either |
| `release-app` | Adapt | STRUCTURAL ONLY | Single-app fresh exact-SHA draft → required delta notes → explicit publish → independent production review → deploy → PVT → delta spot-check contract exists; its fail-closed WP1 gate prevents publication |
| Whiteboard smoke/PVT | Adapt | BLOCKED | The non-production Marketplace baseline is live, but formal release PVT still needs an approved production fixture, visible build identity, and contributor access capable of deploying the exact release artifact |
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

## Forge lint and original-app access boundary

Forge CLI 12.20.1 requires authentication before `forge lint`; no authless CLI flag exists. An existing gitignored workspace credential was supplied explicitly for a read-only audit without copying it into this repository. With that identity, official `forge lint` passes with zero errors and the same six existing warnings reported by the structural validator. Pull-request validation still receives no Forge credentials.

That identity is not a contributor to the original Whiteboard Forge app. Environment and version metadata are visible, but `forge install list --json` is explicitly denied for this app while the same identity succeeds against an app where it is a contributor. Atlassian documents that every app contributor can view installations, so the install-list denial is the decisive boundary; metadata visibility is not evidence of deploy authority. Exact-branch tunnel/deploy validation remains blocked until an original-app owner grants the identity an appropriate [contributor role](https://developer.atlassian.com/platform/forge/contributors/). No deploy, registration, installation, or upgrade was attempted during the audit.

The implemented secretless adaptation pins `@forge/manifest@12.7.0` and runs `validate(false, manifestPath)` through `pnpm validate:manifest`. The command fails only on diagnostics whose level is `error`; the unchanged manifest currently reports zero errors and six existing warnings. This structural validator is narrower than full Forge CLI lint. Protected staging and production steps inject Forge credentials only into one step. That step disables Forge analytics once, runs the environment-explicit `pnpm forge:lint:tldraw:staging` or `pnpm forge:lint:tldraw:prod`, then the raw environment deploy script. Build/validation stays on Node 22.22.3; only the Forge CLI segment switches to Node 20 to match the reference pipeline's node-fetch workaround. Those deployment paths remain `STRUCTURAL ONLY` until exercised live.

## Where each deploy job's Forge credential comes from

The staging and production jobs reach the same credential by different mechanisms. Measured on main,
not inferred:

- **Staging.** `build-test-deploy.yml` invokes `staging-deploy.yml` with `uses:`, so the deploy job
  runs inside a **called** workflow. A called workflow's `secrets` context holds only what the caller
  passes. Declaring `environment: staging-tldraw` on that job brings the environment's variables and
  its protection rules, but **not** its secrets. Run 33395382680 reported
  `FORGE_EMAIL present: true` and `FORGE_API_TOKEN present: false` from that one job, while the
  repository held no repository-scoped secret or variable at all — so the environment was applied and
  its secret was still unavailable. The caller therefore passes `secrets: inherit`, and the token lives
  at **repository** scope.
- **Production.** `release.yml`'s deploy job is a normal job in the workflow the release event
  triggers, so `environment: production-tldraw` supplies both the variable and the secret directly.

Both jobs carry the same presence guard, which reports presence only — never a value, a length, or a
prefix, because this repository is public and its job logs are public. Do not align the two mechanisms
without re-reading this difference; the contract tests pin each one.

The GitHub documentation on reusing workflows states that an environment secret is used when the
called workflow's job declares `environment`. The measurement above contradicts that for this case,
and the measurement is what the workflows are built on.

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
- Forge tunnel help: PASS; authenticated identity and environment/version discovery work, original-app install discovery is denied for lack of contributor access, and port 3000 is free;
- guarded runtime diff against `a3393e1`: empty;
- `git diff --check`: PASS;
- official Forge lint: PASS with zero errors and six existing warnings when the external local credential is supplied; contributor-gated tunnel/deploy operations remain BLOCKED;
- full secretless/offline `pnpm validate`: PASS.

## Atlassian non-production baseline evidence

The published Marketplace 3.4.0 build was installed only on an approved team-owned, non-production Confluence tenant. A synthetic page and synthetic Whiteboard data were used; no customer or production content was changed.

- A freehand stroke was created, saved, and still present after reload (`[data-shape="draw"]` count `1`).
- An equivalent same-page copy fixture cloned the macro ADF node with a fresh `localId`. Before editing the clone, the current viewport rendered one `[data-shape="draw"]` element in the original and none in the clone.
- A different freehand stroke was then created in the clone. After save and reload, each current viewport rendered exactly one visible draw element, their semantic DOM fingerprints differed, and the original rendered fingerprint was unchanged. This is deliberately a rendered-state assertion, not a count of off-viewport records in the full tldraw document.
- The page ADF contained two extension nodes with distinct hashed `localId` values. Raw identifiers are intentionally omitted from this public evidence register.
- The post-reload browser error stream contained zero page errors and zero console errors. Atlassian emitted non-error warnings, so this is not a claim of a globally warning-free console.
- Privacy-safe iframe-only screenshots have SHA-256 values `90a0f9d34338ea21f41592d9d54c112c72df6e7fb837b480f7783262e71eea26` (original before copy edit), `dc215005f4d4e207190fedb6998957d2fc5cf155ac274cf99de85286e3c0f8d8` (copy after edit/reload), and `845d0e98909b487549fec8ba9e647dc08cc527a3a7a8dddd054581046f125a47` (original after copy edit/reload). The artifacts remain outside the public repository.

This proves a real Forge/Confluence persistence baseline and independent persisted rendered state for two macro nodes whose fixture deliberately has distinct `localId` values. It does not prove that every native Confluence copy surface always generates a fresh `localId`, inspect every off-viewport document record, or establish provenance for the WP1 branch artifact; those remain separate tests.

## WP1 guarded paths

WP1 must leave these paths byte-for-byte unchanged from approval commit `a3393e1`:

- `manifest.yml`
- `src/**`
- `static/spa/src/**`
- `static/spa/public/**`
- `atlassian-migration/index.js`

UI validation for WP1 tooling remains `SKIPPED — no runtime change`. The Marketplace 3.4.0 non-production baseline above is `LIVE`, but it is not an exact-SHA staging claim. Exact-branch staging UI validation remains blocked by original-app contributor access and visible build identity.

## Existing license-metadata discrepancy

`LICENSE.md` contains Apache License 2.0, while the root package declares `MIT` and the migration helper declares `ISC`. WP1 does not infer which metadata is authoritative and does not alter those declarations. The README points readers to `LICENSE.md` without making a new legal claim; alignment is deferred for owner/legal confirmation.

## Historical privacy cleanup

The current public tree no longer contains the unreferenced legacy PNG discovered by
the WP1 privacy scan. The blob already exists in published Git history; purging it
requires a separately authorized repository-history rewrite and coordinated
force-push. Do not repeat its embedded tenant identifier in a public issue or PR.
