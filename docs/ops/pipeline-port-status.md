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

## WP2 production-readiness update — 2026-09-03

| Gate | Status | Evidence |
|---|---:|---|
| Exact-SHA Forge staging deployment | LIVE | Main run `33702738244` deployed merge SHA `6f74dc0468ad233ba33ecfbf8ac2251c3f9ee376` after validation and authenticated Forge lint |
| Visible staging build identity | LIVE | Approved synthetic fixture displayed `unreleased@6f74dc0 · SDK 1.26.2 · staging`; private iframe screenshot SHA-256 `62ed2063371cf08c63e3f1f814eb6fcf1709aa8a7318f0dd130baa729331dab1` |
| Saved-document reload | LIVE | The exact staging build automatically rendered the previously saved stroke, accepted a second controlled stroke, and rendered exactly two shapes with the toolbar present in a newly opened view; no fail-closed error appeared. |
| Approved production PVT fixture | LOCAL | The existing team-owned non-production Confluence fixture contains synthetic-only Whiteboard instances and is reachable through the authorized browser. Production identity/edit/reload evidence can exist only after the first production deploy. |
| Signed staging UI provenance | LOCAL | The protected draft workflow creates a canonical evidence statement and signs it with `actions/attest@v4`; production reconstructs and verifies its digest and signer. Live proof requires the next exact-SHA draft run. |
| Production lineage authority | LOCAL | Repository immutable releases are enabled. The release workflow verifies the latest successful protected production deployment's signed SHA ledger and ancestry; the first release is the sole no-ledger bootstrap and creates that ledger after deploy. |
| Production switch | BLOCKED | `TLDRAW_PRODUCTION_RELEASE_ENABLED` remains unset until the final release-candidate SHA repeats protected staging and exact-build UI verification. |

| Item | Decision | Status | Validation/evidence |
|---|---|---:|---|
| Node/pnpm workspace and one lock | Adapt | LOCAL | Clean frozen install passes; the resolution guard accepts exactly 31 reviewed entries, including the user's three Option A build-only convergence entries |
| Root validation commands | Adapt | LOCAL | Secretless/offline `pnpm validate` passes end to end; authenticated official Forge lint remains a separate protected-deploy gate |
| Repository contract tests | Adapt | LOCAL | Vitest: 99/99 covering dependency resolution, workflow/release semantics, persistence, codec, analytics, adapted skills, and manifest validation |
| Playwright harness | Adapt | LOCAL | Two synthetic browser tests cover empty load/edit/save/reload and fail-closed invalid-data recovery; both execute successfully, not merely collect |
| Project guidance | Adapt | LOCAL | Symlink, stale-text, privacy, all checked local-link, and whitespace checks pass; an unreferenced legacy PNG with an embedded non-placeholder tenant hostname was removed |
| PR CI | Adapt | LIVE | PR #28's exact head passed `Build and Unit Test`; merge SHA `6f74dc0468ad233ba33ecfbf8ac2251c3f9ee376` then passed the main job and protected staging deploy in run `33702738244` |
| Forge staging | Adapt | LIVE | Exact-SHA deployment, visible build identity, prior-save render, controlled edit, and post-save reload all passed on the approved synthetic fixture |
| GitHub protection configuration | Adapt | LIVE | Remote audit confirms branch-policy-gated staging plus required-reviewer gates on draft preparation and production; immutable releases are enabled |
| Draft release | Adapt | STRUCTURAL ONLY | Main-run, evidence-hash, freshness, required delta-notes, stable-release, and reviewer gates reviewed; no draft created |
| Production release | Adapt | STRUCTURAL ONLY | Public naming is fixed as Whiteboard; the fixture, PVT procedure, immutable provenance, lineage authority, and two independent publication/environment approval gates are present, while the repository switch remains fail-closed until the final candidate passes staging |
| Production lineage authority | Adapt | LOCAL | Repository immutable releases are enabled; signed staging evidence and signed successful-deployment ledger enforcement are implemented locally and await their protected workflow runs |
| `validate-branch` | Adapt | LOCAL | Skill contract passes and its first locally scoped, non-deploying path, `pnpm validate`, succeeds; UI is correctly `SKIPPED — no runtime change` |
| `forge-tunnel` | Adapt | BLOCKED | Skill schema and command contract pass; authenticated identity and environment/version discovery work, but Atlassian explicitly denies original-app install access, proving the available identity is not an app contributor |
| `spot-check` | Adapt | LIVE | A published Marketplace 3.4.0 baseline was exercised on an approved non-production synthetic fixture: create/edit/save/reload passed, and a fresh-`localId` same-page clone produced independent persisted rendered state through edits and reloads; this does not claim the WP1 branch artifact was deployed |
| PR lifecycle skill set | Adapt | LOCAL | Schemas and read-only GitHub discovery/help pass; all state-changing halves remain structural |
| Dependency updates | Adapt | LOCAL | Weekly dev-tool-only Dependabot contract present; product/runtime packages are excluded in WP1 |
| License metadata alignment | Defer | DEFERRED | `LICENSE.md` is Apache-2.0 while existing package metadata says MIT/ISC; owner/legal confirmation required before changing either |
| `release-app` | Adapt | LOCAL | Single-app fresh exact-SHA draft → signed evidence → explicit publish → independent production review → deploy → signed ledger → PVT → delta spot-check contract passes locally; exact-SHA staging reload is now LIVE |
| Whiteboard smoke/PVT | Adapt | LOCAL | The approved team-owned synthetic fixture and authorized browser are reachable; production identity/edit/reload evidence must run immediately after the first production deploy |
| `check-version` | Adapt | LIVE | The approved staging iframe visibly reported the expected full-SHA-correlated `unreleased@6f74dc0 · SDK 1.26.2 · staging` identity |
| `health-check` | Defer | DEFERRED | Needs deployed lifecycle events and a baseline |
| Cloudflare, D1, paywall, product-variant pipeline | Skip | SKIPPED | No equivalent infrastructure in this app |
| Source settings/hooks | Skip | SKIPPED | Machine/account-specific and not portable |

## `conf-app` lifecycle parity

The target lifecycle deliberately keeps the same shape as the reference project:

`validate → submit Draft → ready → babysit exact SHA → land → main staging → SHA-pinned draft → release-app → production deploy → PVT → delta-driven spot-check`

The single Whiteboard app removes only product matrices, canary/soak ordering,
Cloudflare publication, manifest variant rewrites, and tenant-specific recipes.
Staging remains main-only. Draft creation requires reviewed UI evidence, and production
requires immutable signed staging evidence, an approved fixture, visible build
identity, an independently reviewed environment, immediate PVT, and a signed ledger
for the latest successful protected production deployment. The first production
release is the sole no-ledger bootstrap and creates that ledger after deploy.

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

The identity used by the earlier local audit was not a contributor to the original Whiteboard Forge app. Environment and version metadata were visible, but `forge install list --json` was explicitly denied for this app while the same identity succeeded against an app where it was a contributor. That local boundary did not authorize deploys. The protected GitHub staging job subsequently exercised its separately held Forge credential and deployed the exact main SHA; no installation or upgrade was performed.

The implemented secretless adaptation pins `@forge/manifest@12.7.0` and runs `validate(false, manifestPath)` through `pnpm validate:manifest`. The command fails only on diagnostics whose level is `error`; the current manifest reports zero errors and six existing warnings. This structural validator is narrower than full Forge CLI lint. Protected staging and production steps inject Forge credentials only into one step. That step disables Forge analytics once, runs the environment-explicit `pnpm forge:lint:tldraw:staging` or `pnpm forge:lint:tldraw:prod`, then the raw environment deploy script. Build/validation stays on Node 22.22.3; only the Forge CLI segment switches to Node 20 to match the reference pipeline's node-fetch workaround. The staging path is now LIVE; production remains gated.

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
- remote immutable releases: enabled; signed production-SHA ledger enforcement is implemented locally and becomes LIVE after the first protected production deploy;
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

UI validation for the historical WP1 tooling-only diff remains `SKIPPED — no runtime change`. The Marketplace 3.4.0 non-production baseline above is `LIVE`, but it is not an exact-SHA staging claim. Exact-SHA staging deployment, visible build identity, and saved-document reload are now `LIVE` as recorded in the WP2 table.

## Existing license-metadata discrepancy

`LICENSE.md` contains Apache License 2.0, while the root package declares `MIT` and the migration helper declares `ISC`. WP1 does not infer which metadata is authoritative and does not alter those declarations. The README points readers to `LICENSE.md` without making a new legal claim; alignment is deferred for owner/legal confirmation.

## Historical privacy cleanup

The current public tree no longer contains the unreferenced legacy PNG discovered by
the WP1 privacy scan. The blob already exists in published Git history; purging it
requires a separately authorized repository-history rewrite and coordinated
force-push. Do not repeat its embedded tenant identifier in a public issue or PR.
