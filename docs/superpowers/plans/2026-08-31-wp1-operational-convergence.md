# WP1 Operational Convergence Implementation Plan

> This plan is the manual fallback for the unavailable `writing-plans` skill. Execute it task by task on a feature branch; do not combine WP2 persistence or SDK work with it.

**Goal:** Give `ZenUml/tldraw-confluence` a deterministic toolchain, honest validation contract, project guidance, adapted agent skills, and gated CI/staging/release workflows modelled on `conf-app` without changing product runtime behavior.

**Architecture:** One pnpm workspace and lockfile drive the existing Forge resolver, CRA Whiteboard build, repository contract tests, and an offline-collectable Playwright harness. GitHub Actions consume the same root commands. Production deployment remains disabled until the branding, production-fixture, PVT, and explicit-promotion gates in the approved programme design are closed.

**Reference:** `docs/superpowers/specs/2026-08-31-tldraw-confluence-renovation-design.md`

**Approved dependency decision (Option A, 2026-08-31):** keep one pnpm lockfile
and allow exactly three `static/spa` build-graph convergence differences:
`jest-worker > @types/node` 18.11.9 to 22.13.9,
`randombytes > safe-buffer` 5.1.2 to 5.2.1, and the new
`@types/node@22.13.9 > undici-types@6.20.0` edge. All other product/runtime
resolution drift remains blocked.

## Scope guard

WP1 must not change:

- `manifest.yml`;
- `src/**`;
- `static/spa/src/**`;
- `static/spa/public/**`;
- `atlassian-migration/index.js`;
- Forge app ID, macro key, scopes, resource wiring, or runtime;
- legacy KVS key derivation or value formats;
- tldraw, React, CRA, Forge runtime SDK, or other product dependency behavior.

The package-manager conversion preserves the complete currently resolved
product/runtime package graph, including transitive packages, not only direct
dependencies. The sole approved `static/spa` build exceptions are the three Option A
entries above. Development-tool changes required to make the frozen toolchain
installable and explicitly reviewed package-manager representation differences stay
separately classified. None of these exceptions authorizes another product/runtime
version or edge drift. Do not run `npm audit fix`, broad dependency updates, or
formatters over runtime source.

## Frozen interfaces

| Contract | Value |
|---|---|
| Package manager | `pnpm@10.34.5` |
| Local/authoritative CI Node | `22.22.3` |
| Forge runtime | existing `nodejs22.x` |
| PR check | `Build and Unit Test` |
| Staging environment | `staging-tldraw` |
| Draft-approval environment | `staging-tldraw-release` |
| Production environment | `production-tldraw` |
| Draft tag | `vYYYY.MM.DDHHMM-tldraw` |
| Frontend output | `static/spa/build` with relative asset URLs |
| Secretless/offline root contract | `lint`, `test:unit`, `build:whiteboard`, `validate:resource-output`, `validate:manifest`, `test:e2e:list`, `validate` |
| Authenticated Forge command | `forge:lint` — local with existing credentials or protected staging/production immediately before deploy |

## Parallel ownership

After Task 1, Tasks 4–8 may be drafted concurrently using these exclusive boundaries:

| Owner | Exclusive files |
|---|---|
| Toolchain | package manifests, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, Node/package-manager pins, `.gitignore`, root validation configs/scripts |
| E2E harness | Playwright config, specs, docs, and ignore rules under `tests/e2e-tests/**`; the Toolchain owner alone creates its `package.json` and changes the lock |
| Guidance | `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`, `docs/policies/**` |
| Skills | `.claude/skills/**` |
| Workflows | `.github/**`, `docs/ops/forge-environments.md`, `docs/ops/forge-release.md` |
| Integrator | cross-references and `docs/ops/pipeline-port-status.md` after owner handoff |

Only the Toolchain owner edits package manifests or the lockfile. Only the Workflows owner edits workflow files. Workers do not commit independently in the shared checkout; the integrator stages scoped commits.

## Task 1 — Establish the implementation branch and baseline guard

**Files:** No product files change.

1. Confirm the design branch is clean and contains approval commit `a3393e1`.
2. Create `renovate/wp1-operational-convergence` from that commit.
3. Record the baseline SHA in the work log.
4. Record hashes or a baseline diff target for the scope-guard paths.

Commands:

```bash
git status --short --branch
git rev-parse HEAD
git switch -c renovate/wp1-operational-convergence
git diff --exit-code a3393e1 -- manifest.yml src static/spa/src static/spa/public atlassian-migration/index.js
```

Expected: a clean feature branch and an empty guarded-path diff.

## Task 2 — Convert to one deterministic pnpm workspace

**Files:**

- Modify: `package.json`
- Modify: `static/spa/package.json`
- Modify: `atlassian-migration/package.json`
- Modify: `.gitignore`
- Create: `pnpm-workspace.yaml`
- Create: `scripts/capture-npm-resolution-baseline.mjs`
- Create: `scripts/check-package-manager-resolutions.mjs`
- Create: `tests/fixtures/wp1/npm-resolution-baseline.json`
- Create: `docs/ops/wp1-package-resolution-allowlist.json`
- Generate: `pnpm-lock.yaml`
- Delete: `package-lock.json`
- Delete: `static/spa/package-lock.json`
- Delete: `atlassian-migration/package-lock.json`

Steps:

1. Before changing the npm locks, generate and check in an immutable baseline graph from all three. It records each importer, direct dependency category, resolved package path/name/version, dependency edges, and runtime/build/dev reachability. It is an audit fixture, not an active lockfile.
2. Add `packageManager: pnpm@10.34.5`, `engines.node: >=22`, and `volta.node: 22.22.3` at the root.
3. Define workspace importers for `.`, `static/spa`, `atlassian-migration`, and `tests/e2e-tests`.
4. Pin existing direct runtime/build dependencies to their currently resolved versions during the conversion. In particular, retain `@tldraw/tldraw` 1.26.2, React/ReactDOM 18.2.0, and CRA 5.0.1.
5. Retain ESLint 9.21.0 and make the minimal peer correction from `eslint-plugin-react-hooks` 4.x to 5.2.0. Add development-only `@eslint/js` 9.21.0, `globals` 15.14.0, `@forge/cli` 12.20.1, Vitest 2.1.9, and YAML 2.9.0.
6. Configure pnpm build approvals only for dependencies proven necessary by a clean install; do not broadly enable install scripts.
7. Use `pnpm import` while all npm locks still exist, then regenerate one workspace lockfile.
8. Add a comparison script that reads the checked-in baseline graph and current pnpm lock. Compare importer-by-importer direct resolutions and reachable dependency edges, retaining runtime/build/dev classification, direct specifiers, required/optional materialization, peer ranges, and peer optionality; a global `name@version` union is insufficient. Every topology allowlist entry freezes both baseline and pnpm versions and edge kinds. A canonical post-convergence pnpm peer-declaration contract freezes additions, removals, ranges, optionality, and metadata-only keys that the old npm baseline cannot represent.
9. Require every old product/runtime edge to resolve to the same version except for
   the user's three approved `static/spa` build-graph convergence entries:
   - `jest-worker > @types/node`: 18.11.9 to 22.13.9;
   - `randombytes > safe-buffer`: 5.1.2 to 5.2.1;
   - `@types/node@22.13.9` adds `undici-types@6.20.0`.
   Record those entries explicitly with their scope and approval date. The remaining
   allowlist may contain only the hooks peer correction, newly added development
   tools, and proven package-manager topology-only differences, each with a reason.
   Any other tldraw, React, CRA, Forge runtime, compression, Mixpanel, or transitive
   product/runtime edge/version difference blocks WP1.
10. Retain the comparison counts for Task 10's `docs/ops/pipeline-port-status.md`, then remove the three npm locks.
11. Ignore generated CRA output, local environment files, auth state, test results, and Playwright reports while keeping `.env.example` trackable.

Validation:

```bash
volta run --node 22.22.3 node --version
volta run --node 22.22.3 corepack pnpm --version
volta run --node 22.22.3 corepack pnpm install --frozen-lockfile
volta run --node 22.22.3 corepack pnpm list -r --depth 0
node scripts/check-package-manager-resolutions.mjs
if rg --files -g package-lock.json | rg -q .; then exit 1; fi
git diff --exit-code a3393e1 -- manifest.yml src static/spa/src static/spa/public atlassian-migration/index.js
```

Expected: Node 22.22.3, pnpm 10.34.5, no npm lockfiles, one reproducible pnpm lock, and no guarded-path changes.

Commit after Task 3: `chore: standardize whiteboard toolchain`

## Task 3 — Add the root validation contract

**Files:**

- Modify: `package.json`
- Create: `eslint.config.mjs`
- Create: `vitest.config.mjs`
- Create: `tests/unit/operational-contract.spec.mjs`
- Create: `scripts/validate-resource-output.mjs`
- Create: `scripts/validate-forge-manifest.mjs`

Steps:

1. Configure flat ESLint for the existing Node/Forge JSX and browser React source without auto-fixing it. Exclude generated output and the quarantined migration helper.
2. Configure Vitest for Node-based repository contract tests only.
3. Write a repository contract test that parses `manifest.yml` and asserts the existing app ID, `whiteboard` macro key, `storage:app`, `main -> static/spa/build`, tunnel port, and `nodejs22.x` runtime.
4. Assert that the frozen root commands exist and that the frontend still declares tldraw v1, React 18.2.0, CRA 5.0.1, and `homepage: "."`.
5. Add an output validator requiring `static/spa/build/index.html` and relative JS/CSS asset URLs. It must not rewrite the build.
6. Add exact root commands:
   - `pnpm check:resolutions`
   - `pnpm lint`
   - `pnpm test:unit`
   - `pnpm build:whiteboard`
   - `pnpm validate:resource-output`
   - `pnpm validate:manifest`
   - `pnpm forge:lint`
   - `pnpm test:e2e:list`
   - `pnpm validate`
   - `pnpm start:whiteboard`
   - development/staging/production Forge deploy, upgrade/bootstrap, and tunnel commands with no hard-coded tenant.
7. Make `validate` execute the resolution guard, lint, unit contracts, build,
   resource-output validation, local manifest validation, and E2E collection in that
   order. It is the secretless/offline PR contract and must not invoke official
   `forge:lint` or require Forge credentials.
8. Implement `validate:manifest` with the repository-pinned internal
   `@forge/manifest` package. Document and test it as deterministic structural
   validation only; it is not the complete official Forge CLI lint and does not
   replace authenticated platform validation.
9. Keep official `forge:lint` as a separate authenticated command. Disable Forge CLI
   usage analytics explicitly and non-interactively; do not hide lint failures when
   that command runs locally or in protected deployment jobs.

Validation:

```bash
pnpm lint
pnpm test:unit
pnpm check:resolutions
pnpm build:whiteboard
node scripts/validate-resource-output.mjs
pnpm validate:manifest
pnpm test:e2e:list
pnpm validate
```

Expected: each secretless/offline command succeeds separately;
`static/spa/build/index.html` exists; no Forge credentials are read; no runtime file
was edited. When local Forge credentials already exist, run `pnpm forge:lint`
separately and report its result as authenticated platform validation, not as part of
`pnpm validate`.

## Task 4 — Add an honest offline E2E collection harness

**Files:**

- Create by Toolchain owner from the E2E owner's specification: `tests/e2e-tests/package.json`
- Create: `tests/e2e-tests/playwright.config.ts`
- Create: `tests/e2e-tests/tests/harness-collection.spec.ts`
- Create: `tests/e2e-tests/.gitignore`
- Create: `tests/e2e-tests/.env.example`
- Create: `tests/e2e-tests/README.md`
- Toolchain owner updates `pnpm-lock.yaml`; the E2E owner does not edit either package file or lockfile

Steps:

1. Create private workspace `@zenuml/tldraw-confluence-e2e` with pinned `@playwright/test` 1.59.1 and only a `test:list` command.
2. Configure one project named `collection`, one worker, zero retries, list reporter, and `forbidOnly` in CI. Do not load credentials, auth state, a base URL, or browser devices.
3. Add exactly one collection sentinel named `WP1 harness collection sentinel — no product behavior coverage`. It may assert the project name if executed, but it must not use `page` or access a network.
4. Document that WP1 has zero product UI assertions. WP2 deletes the sentinel and adds authentication, fixtures, real journeys, screenshots/traces, and `test:e2e`.
5. Ignore `.env`, auth state, and generated reports without ignoring `.env.example`.

Validation:

```bash
pnpm --filter @zenuml/tldraw-confluence-e2e test:list
pnpm test:e2e:list
CI=1 pnpm test:e2e:list
```

Expected: exactly one clearly labelled sentinel is collected from one file, no browser is installed/launched, no credentials are required, and no report/auth artifact is created. This is collection evidence, not an E2E or UI PASS.

Run `pnpm check:resolutions` again after the E2E package and final lock update; it must still pass before committing.

Commit: `test: add operational validation harness`

## Task 5 — Replace template documentation with project guidance

**Files:**

- Rewrite: `README.md`
- Rewrite: `CONTRIBUTING.md`
- Create: `CLAUDE.md`
- Create: `AGENTS.md` as a repository-relative symlink to `CLAUDE.md`
- Create: `CONTEXT.md`
- Create: `docs/policies/git-workflow.md`
- Create: `docs/policies/forge-only.md`
- Create: `docs/policies/client-privacy.md`
- Create: `docs/policies/persistence-safety.md`

Content requirements:

1. Describe the actual Confluence Whiteboard Forge app, its existing identity invariants, and the approved renovation roadmap.
2. Document Node/pnpm setup and only commands that exist and have been run.
3. State that WP1 unit tests cover repository contracts and E2E only collects a non-product sentinel.
4. Preserve pure Forge terminology; do not copy `conf-app`'s Forge-from-Connect exception.
5. Ban real customer tenant/page/cloud IDs and board bodies from public files. Use placeholders and authorized private/local evidence storage.
6. Ban full Forge context, document, shape text, raw JSON, and compressed payload logs in future runtime work.
7. Document feature analytics-first, UI-evidence, no-direct-main, and dirty-worktree rules.
8. Remove the Jira todo template text, broken npm/deploy commands, hard-coded install site, and unverified Atlassian CLA claim.
9. Keep stable domain terminology in `CONTEXT.md`; describe modern storage as planned, not implemented.

Validation:

```bash
test "$(readlink AGENTS.md)" = "CLAUDE.md"
if rg -n "Jira issue panel|Todo app|Atlassian requires contributors" README.md CONTRIBUTING.md CLAUDE.md CONTEXT.md docs/policies; then exit 1; fi
git diff --check
```

Expected: the symlink resolves; source-only or stale claims have zero unexplained matches; every documented command exists.

Commit: `docs: add whiteboard project guidance`

## Task 6 — Adapt local validation and Forge-operation skills

**Files:**

- Create: `.claude/skills/validate-branch/SKILL.md`
- Create: `.claude/skills/forge-tunnel/SKILL.md`
- Create: `.claude/skills/spot-check/SKILL.md`

Steps:

1. Rewrite each skill for `ZenUml/tldraw-confluence`; copy no source-specific variant, Cloudflare, Vite, saved-profile, tenant, or account assumptions.
2. Make `validate-branch` run `pnpm validate`. For WP1 process-only changes it reports UI validation as `SKIPPED — no runtime change`, never PASS.
3. Make `forge-tunnel` verify credentials without printing them, prepare the local Forge CLI, inspect Forge identity/environment/install state, verify port 3000, build, and stop before deploy/install/start/kill in its non-deploying preflight. Disabling Forge analytics may update a local CLI setting and must be reported; it does not mutate remote state.
4. Make `spot-check` plan assertions first and require screenshot/snapshot/network evidence for every UI PASS. Without an approved fixture it reports SKIPPED/BLOCKED.
5. Keep every project skill as a real file, not a symlink.

Dry runs:

```bash
pnpm validate
pnpm validate:manifest
pnpm exec forge whoami
pnpm exec forge install list
pnpm exec forge tunnel --help
```

The first two commands are secretless/offline. The Forge CLI discovery commands are
separate authenticated checks and may report BLOCKED when credentials are absent;
that does not weaken or relabel the local validation result. Do not print credentials
or mutate remote Forge state during the preflight.

## Task 7 — Adapt the PR lifecycle skill set

**Files:**

- Create: `.claude/skills/submit-branch/SKILL.md`
- Create: `.claude/skills/ready-pr/SKILL.md`
- Create: `.claude/skills/babysit-pr/SKILL.md`
- Create: `.claude/skills/land-pr/SKILL.md`
- Create: `.claude/skills/ship-branch/SKILL.md`

Steps:

1. Bind every skill to `ZenUml/tldraw-confluence`, `pnpm validate`, and the exact CI/check names created in Task 8.
2. Remove all Lite/Full/Diagramly, Cloudflare, D1, paywall, and conf-app-specific duplicate-run assumptions.
3. Preserve state-change boundaries: submit does not merge; ready changes only Draft state; babysit monitors/fixes; land requires merge authorization; ship composes them but production is always separate.
4. Teach `land-pr` to monitor main staging/draft results after an authorized merge, but never publish a release or deploy production.
5. Mark state-changing halves `STRUCTURAL ONLY` until exercised on a real WP1 PR.

Dry runs:

```bash
gh repo view --json nameWithOwner
gh workflow list
gh pr list --limit 5
gh pr create --help
gh pr ready --help
gh pr merge --help
```

Expected: read-only repository discovery succeeds; no push, PR state change, rerun, merge, or release occurs.

Commit Tasks 6–7: `chore: adapt whiteboard agent skills`

## Task 8 — Add authoritative PR CI

**Files:**

- Create: `.github/workflows/build-test-deploy.yml`
- Create: `.github/pull_request_template.md`
- Create after workflow handoff, by Toolchain owner: `tests/unit/workflow-contract.spec.mjs`

Workflow contract:

1. Trigger pull requests on `opened`, `synchronize`, `reopened`, and `ready_for_review`, plus pushes to `main`; ignore tags.
2. Do not use `paths-ignore`: the stable `Build and Unit Test` context must report for every PR so it can later become required without leaving skipped checks Pending.
3. Deduplicate superseded non-main runs by branch; never cancel the default branch.
4. Give the build job exact display name `Build and Unit Test`, `contents: read`, a 15-minute timeout, Node 22.22.3, pnpm from `packageManager`, frozen install, and the secretless/offline `pnpm validate` contract.
5. Use `actions/checkout@v5`, `pnpm/action-setup@v5`, and `actions/setup-node@v5`.
6. Expose no Forge or browser secrets to pull-request jobs.
7. Keep the PR template to summary, validation evidence, UI-evidence classification, identity/storage impact, and release notes.

Local validation:

```bash
pnpm test:unit
pnpm validate
```

After the Workflows owner hands off the YAML, the Toolchain owner creates `tests/unit/workflow-contract.spec.mjs` to parse it and assert triggers, permissions, exact check names, and referenced commands. After push, verify workflow registration and the exact check name before adapting required-check settings.

Commit: `ci: add whiteboard validation workflow`

## Task 9 — Add staging, evidence-gated draft, and disabled-by-default production workflows

**Files:**

- Create: `.github/workflows/staging-deploy.yml`
- Create: `.github/workflows/prepare-draft-release.yml`
- Create: `.github/workflows/release.yml`
- Create: `docs/ops/forge-environments.md`
- Create: `docs/ops/forge-release.md`

### Staging

1. Support `workflow_call` from the validated default-branch pipeline only. Do not expose `workflow_dispatch`; feature-branch code must not request staging credentials.
2. Use protected environment `staging-tldraw`, `FORGE_EMAIL` from environment variables, and `FORGE_API_TOKEN` from environment secrets.
3. Check out the exact SHA, install frozen dependencies, run secretless/offline
   `pnpm validate`, then run authenticated official `pnpm forge:lint` immediately
   before `pnpm forge:deploy:tldraw:staging`, and upload the unchanged manifest plus
   generated frontend build.
4. Never install the app, rewrite the manifest, override the app ID, or invoke Cloudflare.
5. Call staging automatically from the main-push workflow only after the authoritative build succeeds.

### Draft preparation

WP1 has no real product E2E, so it must not pretend to have an automatic smoke gate.

1. Use manual dispatch with required `commit_sha`, `main_run_id`, and `ui_evidence_sha256` inputs. The evidence hash must be a 64-character lowercase SHA-256 of UI evidence held in approved private storage; never accept or publish a tenant/page/screenshot URL.
2. In a `preflight` job, use `actions: read` to verify the named main-push CI run concluded successfully for the exact SHA and that its Forge staging job succeeded. Validate the evidence-hash syntax.
3. In a separate `draft` job, require `needs: preflight` and protected environment `staging-tldraw-release`. Its reviewer confirms the private evidence corresponds to the asserted SHA and behavior.
4. Create a draft `vYYYY.MM.DDHHMM-tldraw` pinned to that exact SHA. Its body may contain only the main run ID and evidence hash, never a tenant/page URL or customer identifier.
5. Grant exactly `actions: read` and `contents: write`; explicit permissions must not erase the run-query permission.
6. WP2 replaces this manual human evidence gate with the trusted Whiteboard browser journey and a privacy-safe artifact contract.

### Production

1. Trigger only when a release is published and accept only timestamped `-tldraw` tags.
2. Use a `preflight` job with no GitHub environment. It fails unless repository variable `TLDRAW_PRODUCTION_RELEASE_ENABLED` is exactly `true` and `TLDRAW_BRAND_APPROVED` is exactly `true`, then checks out the tag, frozen-installs, and runs `pnpm validate`.
3. Use a separate `deploy` job with `needs: preflight` and job-level protected environment `production-tldraw`.
4. Map `FORGE_EMAIL` from the `production-tldraw` environment variable and `FORGE_API_TOKEN` from its secret into the deploy job without printing either value.
5. The deploy job checks out and rebuilds the same tag, runs authenticated official
   `pnpm forge:lint`, then immediately uses
   `pnpm forge:deploy:tldraw:production`; it never installs, rewrites the manifest,
   parses variants, or deploys Cloudflare.
6. Use checkout/setup actions at the same pinned major versions as PR CI and `actions/upload-artifact@v6` where artifacts are uploaded.
7. Keep `TLDRAW_PRODUCTION_RELEASE_ENABLED` unset throughout WP1. WP2 may enable it only after a production validation fixture and PVT path exist.
8. Label production deployment `STRUCTURAL ONLY / UNVALIDATED` in the port-status record. Do not publish a release in WP1.

Validation:

- parse workflows locally;
- verify their command references exist;
- after push, confirm workflow registration;
- verify staging remains callable only from the successful default-branch pipeline;
- capture actual UI evidence before creating any draft;
- do not publish a draft or run production.

Commit: `ci: add gated whiteboard delivery workflows`

## Task 10 — Add dependency hygiene and record port status

**Files:**

- Create: `.github/dependabot.yml`
- Create: `docs/ops/pipeline-port-status.md`

Steps:

1. Configure one weekly npm-ecosystem entry at `/` for the shared pnpm lock.
2. Group patch/minor development-tool updates only; never auto-merge.
3. Ignore all update types during WP1 for `@tldraw/tldraw`, React/ReactDOM, CRA, the Forge runtime packages (`@forge/api`, `@forge/resolver`, `@forge/bridge`, `@forge/ui`), and the current SPA product/build dependencies. Their child work packages remove the relevant ignore deliberately. They must never enter the routine group.
4. Record each gap-list item as ported/adapted/deferred/skipped, its dependency, local/live validation state, and evidence.
5. Port fail-closed single-app `release-app` and PVT contracts now, but mark their live
   operation structural/blocked until immutable evidence, an approved production
   fixture, visible build identity, and a tamper-resistant last-successful-production
   SHA record exist. Keep `check-version` and `health-check` deferred with their exact
   unlock conditions; do not copy a source-specific smoke-test recipe.
6. Record that Cloudflare, D1, paywall, product-variant, and source-specific skills were deliberately skipped.

Validation:

```bash
rg -n "tldraw|react|react-dom|react-scripts|@forge" .github/dependabot.yml
rg -n "UNVALIDATED|STRUCTURAL ONLY|DEFERRED|SKIPPED" docs/ops/pipeline-port-status.md
```

Commit: `chore: add dependency and pipeline governance`

## Task 11 — Run integrated local verification

Run from a clean Node 22.22.3 environment:

```bash
volta run --node 22.22.3 corepack pnpm install --frozen-lockfile
volta run --node 22.22.3 corepack pnpm check:resolutions
volta run --node 22.22.3 corepack pnpm lint
volta run --node 22.22.3 corepack pnpm test:unit
volta run --node 22.22.3 corepack pnpm build:whiteboard
volta run --node 22.22.3 corepack pnpm validate:resource-output
volta run --node 22.22.3 corepack pnpm validate:manifest
volta run --node 22.22.3 corepack pnpm test:e2e:list
volta run --node 22.22.3 corepack pnpm validate
git diff --exit-code a3393e1 -- manifest.yml src static/spa/src static/spa/public atlassian-migration/index.js
git diff --check
```

Additional assertions:

- no nested npm/pnpm lockfiles exist;
- no project skill is a symlink;
- `AGENTS.md` alone is the intentional repository-local symlink;
- every Markdown local link resolves;
- every README/skill command exists;
- no real tenant hostname, page ID, cloud ID, credential, board text, or payload is committed;
- source-only terms have no unexplained matches;
- the E2E output is reported as collection only;
- no runtime UI assertion is marked PASS.

`pnpm validate` and every command in this integrated local block are
secretless/offline after the frozen install. Official `pnpm forge:lint` is a separate
authenticated check: run it locally only when credentials already exist, and always
run it in each protected staging/production deploy job immediately before deploy.
Do not give Forge credentials to the PR job or weaken local completion because a
developer does not have them.

Update `docs/ops/pipeline-port-status.md` with exact command outputs and limitations, then commit: `docs: record WP1 validation evidence`.

## Task 12 — Validate the external staging path and hand off

This task is allowed to stop at an evidenced external gate; it must not convert a missing fixture or credential into a PASS.

1. Push the WP1 branch and create a labelled Draft PR only after local validation.
2. Confirm the authoritative `Build and Unit Test` run for the head SHA succeeds.
3. Confirm all three documented GitHub environments, their reviewer/branch controls, Forge credentials, and `main` required-check protection exist without exposing secret values. Their absence blocks merge and live staging.
4. After a separately authorized merge, verify the automatic main staging run used the exact SHA, generated artifact, unchanged manifest identity, and successful Forge deploy result.
5. Use the adapted spot-check procedure against an approved staging macro page. Capture screenshot/snapshot/network evidence that the existing Whiteboard iframe loads; do not edit customer content.
6. If no approved page/auth fixture exists, mark staging UI `BLOCKED` with the missing dependency and do not create a draft.
7. Do not exercise draft creation before an independently authorized merge produces a successful main staging run.
8. Do not enable production variables, create/publish a release, deploy production, or merge without the later authorization required by the applicable lifecycle skill.

WP1 is locally complete when Task 11 passes. It is live-validated only when Task 12 has staging and UI evidence. Production remains explicitly outside WP1 completion.
