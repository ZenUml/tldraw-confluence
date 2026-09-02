# Public Whiteboard Naming Implementation Plan

> Manual fallback for the unavailable `writing-plans` skill. Execute sequentially
> on the dedicated branding worktree. Every deploy, browser mutation, Marketplace
> edit, PR transition, and merge keeps its normal explicit authorization boundary.

**Goal:** Remove the obsolete brand-approval release gate, present the existing app
as **Whiteboard for Confluence**, and prove that drawing, Forge identity, and KVS
persistence remain intact.

**Design:**
`docs/superpowers/specs/2026-09-03-public-whiteboard-branding-design.md`

**Starting branch:** `renovate/public-whiteboard-branding-design`

**Starting base:** current `origin/main`; re-verify immediately before
implementation because another session owns uncommitted WP2 runtime work.

## Scope and invariants

Modify only the public naming and obsolete gate contracts. Do not change:

- Forge app ID `368b610d-bac1-4e2a-9311-6ec0adca5e49`;
- macro key `whiteboard`, resource/resolver keys, or `storage:app`;
- legacy KVS key derivation, stored values, or document formats;
- `@tldraw/tldraw`, the `Tldraw` React component, or drawing behavior;
- internal repository, command, environment, tag, package, fixture, or debug
  identifiers containing `tldraw`;
- runtime dependencies or the shared lockfile;
- another worktree's uncommitted files.

No product analytics event is added: this work changes naming and release
configuration, not a runtime outcome or persistence behavior.

## Expected repository files

**Modify:**

- `manifest.yml`
- `.github/workflows/release.yml`
- `.claude/skills/release-app/SKILL.md`
- `tests/unit/operational-contract.spec.mjs`
- `tests/unit/workflow-contract.spec.mjs`
- `tests/unit/release-skill-contract.spec.mjs`
- `docs/ops/forge-environments.md`
- `docs/ops/forge-release.md`
- `docs/ops/pipeline-port-status.md`
- `docs/superpowers/specs/2026-08-31-tldraw-confluence-renovation-design.md`
- `docs/superpowers/plans/2026-08-31-wp1-operational-convergence.md`

**Do not modify:**

- `src/**`
- `static/spa/src/**`
- `static/spa/public/**`
- `package.json`, workspace package manifests, or `pnpm-lock.yaml`
- `atlassian-migration/**`

The evidence register receives only facts already observed during implementation.
Post-merge staging and Marketplace evidence is recorded later in a separate,
evidence-only branch because it does not exist before the first PR merges.

## Task 1 — Re-verify ownership and synchronize safely

1. Fetch remote refs and inspect every worktree.
2. Confirm the branding worktree contains only the two approved design commits and
   this plan.
3. Inspect the active WP2 runtime worktree without changing it. Record its modified
   paths and timestamps.
4. Compare `origin/main` with the branding branch.
5. If WP2 or another branch has since changed `manifest.yml`, read both intents and
   integrate normally. Never restore, reset, stash, clean, or copy the other
   worktree's uncommitted file.
6. Stop if the current branch contains unexplained changes.

Commands:

```bash
git fetch --prune
git status --short --branch
git worktree list --porcelain
git log --oneline --decorate origin/main..HEAD
git diff --name-status origin/main...HEAD
git -C ../tldraw-confluence-wp2-runtime status --short --branch
```

Expected: isolated owned changes and an explicit integration decision before any
shared-file edit.

## Task 2 — Add failing repository contracts

### 2.1 Fix the public-name contract

In `tests/unit/operational-contract.spec.mjs`, extend the existing Forge identity
test to require:

```js
expect(macro.title).toBe('Whiteboard for Confluence');
```

Keep the existing app ID, runtime, macro-key, resource, and scope assertions
unchanged.

### 2.2 Reject the obsolete workflow gate

In `tests/unit/workflow-contract.spec.mjs`:

- retain the production-release enable-switch assertion;
- remove the assertion expecting a brand-approval environment entry;
- assert the parsed preflight and deploy authorization environments have no
  brand-approval field;
- assert the workflow source contains no obsolete brand-approval identifier or
  branded-gate error message;
- retain all exact-SHA, stable-release, freshness, lineage, credential, and protected
  environment assertions.

### 2.3 Reject the obsolete skill contract

In `tests/unit/release-skill-contract.spec.mjs`:

- replace the positive obsolete-variable assertion with a negative assertion;
- retain the production-enable switch, WP1 fail-closed state, exact draft/SHA,
  publication confirmation, production review, PVT, spot-check, and rollback
  assertions.

Run only the targeted tests:

```bash
pnpm vitest run \
  tests/unit/operational-contract.spec.mjs \
  tests/unit/workflow-contract.spec.mjs \
  tests/unit/release-skill-contract.spec.mjs
```

Expected: failures for the current manifest/workflow/skill, proving the tests detect
the old behavior. Do not weaken unrelated contracts to obtain red or green.

## Task 3 — Remove the workflow and skill gate

### 3.1 Production workflow

In `.github/workflows/release.yml`:

- remove the brand-approval variable from the preflight environment;
- remove its shell check and branding-specific error;
- remove it from the post-environment-approval recheck;
- retain the production-enable switch in both checks;
- retain stable release, tag format, exact SHA, main ancestry, previous-release
  ancestry, freshness, credential presence, protected environment, and raw Forge
  production deployment controls.

Do not add Marketplace credentials, listing APIs, page scraping, or a replacement
brand variable.

### 3.2 Release lifecycle skill

In `.claude/skills/release-app/SKILL.md`:

- remove the brand-variable preflight command and requirement;
- state that public naming is a fixed validated manifest contract;
- preserve the initial fail-closed checks for production enablement, immutable UI
  provenance, approved fixture, visible build identity, PVT, production lineage, and
  release/tag governance;
- preserve the explicit publication confirmation and independent production reviewer.

Run the targeted tests again. Expected: workflow and skill tests pass; the manifest
title test remains red.

Suggested commit after Task 3:

```text
ci: remove obsolete brand approval gate
```

## Task 4 — Fix the public manifest name without touching drawing code

1. Change only the existing `whiteboard` macro title in `manifest.yml` to
   `Whiteboard for Confluence`.
2. Do not change macro configuration, functions, resources, permissions, app ID,
   storage entities, or runtime.
3. Do not edit `src/**` or `static/spa/**`.
4. Re-run the three targeted tests.

Expected: all targeted tests pass.

Verify the runtime boundary explicitly:

```bash
git diff origin/main...HEAD -- manifest.yml
git diff --exit-code origin/main -- src static/spa/src static/spa/public atlassian-migration
rg -n '"@tldraw/tldraw"|<Tldraw' static/spa/package.json static/spa/src
```

If WP2 has landed a legitimate manifest storage schema meanwhile, compare against
the new `origin/main` rather than discarding it.

Suggested commit after Task 4:

```text
refactor: name the product Whiteboard for Confluence
```

## Task 5 — Align current documentation without rewriting technical identities

Update current operator and programme guidance:

- `docs/ops/forge-environments.md`: remove instructions to create or check the
  obsolete brand variable; retain the production-enable switch and every fixture,
  PVT, evidence, credential, and environment boundary.
- `docs/ops/forge-release.md`: describe fixed manifest naming and keep production
  disabled for the remaining prerequisites.
- `docs/ops/pipeline-port-status.md`: record only locally verified naming/gate
  changes; also replace stale staging statements only when the exact run evidence is
  cited.
- Parent programme design: record the 2026-09-03 decision that public naming is
  Whiteboard and no brand-approval variable exists; keep SDK licensing separate.
- WP1 implementation plan: mark its former brand-variable instruction as superseded
  rather than leaving an active operator command.
- `.claude/skills/release-app/SKILL.md`: ensure its report vocabulary says public
  naming rather than Tldraw branding.

Do not replace technical `tldraw` identifiers in repository paths, package names,
commands, environments, tags, dependency documentation, or SDK references.

Run:

```bash
rg -n 'TLDRAW_BRAND_APPROVED|BRAND_APPROVED|branding gate' \
  .github .claude docs tests manifest.yml
git diff --check
```

Expected: no active repository instruction or contract references the obsolete gate.
Any historical wording deliberately retained must not look executable or current;
prefer removing the obsolete identifier entirely.

Suggested commit after Task 5:

```text
docs: align Whiteboard naming and release guidance
```

## Task 6 — Run complete local validation

Run the authoritative contract from the repository root:

```bash
pnpm validate
git diff --check
git status --short --branch
```

Classify results separately:

- Local validation: PASS only when the entire `pnpm validate` command exits zero.
- Manifest structural validation: report its actual errors and warnings.
- Official Forge lint: do not infer it from the structural validator; it runs with
  existing credentials locally or in the protected deploy path.
- UI validation: required, because the manifest title is user-visible.
- E2E collection: never call the sentinel product UI evidence.

On a reproducible failure, make only the smallest in-scope correction and restart
`pnpm validate` from the beginning. Stop rather than changing dependencies,
credentials, persistence, or runtime behavior.

## Task 7 — Obtain pre-merge UI evidence

A runtime-visible branch cannot be shipped solely from unit/build evidence.

1. Write the spot-check assertions before browser use:
   - the exact branch SHA loads the existing Whiteboard Forge macro;
   - the customer-facing name is `Whiteboard for Confluence`;
   - an approved synthetic board renders in view and edit mode;
   - the drawing controls remain present;
   - the old customer-facing product name is absent.
2. Reuse only an approved authenticated Development fixture and browser mechanism.
   Do not infer a tenant, page, selector, or browser profile.
3. Request explicit authorization before deploying the exact branch SHA to Forge
   Development or mutating a synthetic board.
4. A non-mutating inspection is preferred. If drawing persistence must be exercised,
   define the reversible synthetic mutation and cleanup first and obtain its own
   authorization.
5. Capture a screenshot, accessibility snapshot, or relevant request intercept in
   private storage; publish only a digest and privacy-safe result.
6. Report BLOCKED rather than PASS if an approved fixture/browser cannot be reached.

Expected: every required assertion has actual exact-SHA evidence. Existing
Marketplace 3.4.0 baseline evidence does not prove this branch artifact.

## Task 8 — Submit and ship the repository change

Before submission:

1. Fetch and inspect `origin/main` again.
2. Resolve any overlap with landed WP2 work by preserving both designs.
3. Run `pnpm validate` on the final head.
4. Confirm the UI evidence refers to that exact head SHA.
5. Review the diff for identity/storage/runtime drift.

Use the normal lifecycle only after separate authorization:

`validate-branch → submit-branch Ready → babysit-pr exact SHA → land-pr → exact-main staging`

The PR body must report:

- public name and obsolete gate removal;
- no drawing, storage, app-ID, macro-key, scope, document-format, or dependency
  change;
- local validation result;
- exact-head UI evidence digest;
- official Forge lint classification;
- production remains disabled and is not deployed.

Do not publish a release or deploy production.

## Task 9 — Verify merged staging behavior

After the exact merge SHA passes main validation and Forge staging:

1. Re-read the main run and exact job results.
2. Run the smallest approved staging spot-check for:
   - the new macro name;
   - board rendering in view/edit mode;
   - drawing controls;
   - absence of the old public product name.
3. Capture privacy-safe evidence and its digest.
4. Do not install or upgrade an app installation.
5. Do not create or publish a release.

If staging UI evidence is unavailable, item 1 remains BLOCKED.

## Task 10 — Rename the existing Marketplace listing

This is an external, public production-promotion mutation and requires a new explicit
approval immediately before execution.

Preflight read-only:

1. Resolve the existing listing ID `1227080`.
2. Verify its current title and vendor identity.
3. Verify the authenticated browser is authorized to edit that exact listing.
4. Capture the planned one-field title change.
5. Confirm no new listing, app registration, version, install, upgrade, pricing, or
   listing-lineage operation is involved.

After approval, change only the existing listing title to
`Whiteboard for Confluence`. Re-read the public listing and record a privacy-safe
snapshot/digest. Stop on any unexpected field or permission request.

## Task 11 — Record terminal evidence in a follow-up documentation PR

Because staging and Marketplace evidence do not exist before the implementation PR
merges, create a separate evidence-only branch after both pass.

Update `docs/ops/pipeline-port-status.md` with:

- implementation PR and exact merge SHA;
- exact main workflow run;
- Build and Unit Test and Forge staging results;
- exact-SHA UI evidence classification and digest;
- existing Marketplace listing ID and verified public name;
- confirmation that the obsolete brand gate is absent;
- confirmation that production release remains disabled for unrelated blockers.

Run `pnpm validate`, submit the evidence PR, monitor exact-head CI, and request
separate merge authorization. This evidence-only PR does not deploy production.

## Completion report

Report:

- obsolete brand gate: REMOVED or BLOCKED;
- manifest public name: PASS or FAIL;
- drawing/runtime preservation: PASS with exact evidence or BLOCKED;
- identity/storage invariants: PASS or FAIL;
- implementation PR and merge SHA;
- main staging run and UI evidence;
- Marketplace existing-listing rename: PASS, NOT AUTHORIZED, or BLOCKED;
- evidence PR state;
- production: NOT PERFORMED;
- rollback: NOT PERFORMED.

