# Tldraw Confluence Renovation and conf-app Convergence Design

**Status:** Approved by the user on 2026-08-31

**Repository:** `ZenUml/tldraw-confluence`

**Reference repository:** `ZenUml/conf-app`

**Confirmed programme decisions:** renovate the standalone repository before merging; upgrade the modern tldraw SDK before merging; develop independent streams in parallel while promoting releases serially.

**WP1 package-manager decision (approved by the user on 2026-08-31):** use one
shared pnpm lockfile and accept exactly three `static/spa` build-graph convergence
differences: `jest-worker > @types/node` moves from 18.11.9 to 22.13.9,
`randombytes > safe-buffer` moves from 5.1.2 to 5.2.1, and
`@types/node@22.13.9` adds `undici-types@6.20.0`. This is Option A. It is not a
general dependency-upgrade authorization; every other product or runtime resolution
drift remains prohibited in WP1.

## 1. Objective

Renovate `tldraw-confluence` in its existing repository until it is operationally and technically close enough to `conf-app` to merge as a fifth product variant. The standalone app must be upgraded and proven under its existing Forge identity before the codebase merge.

The final merge must preserve the installed app's continuity:

- Forge app ID `368b610d-bac1-4e2a-9311-6ec0adca5e49`;
- macro key `whiteboard`;
- access to documents already stored under the existing Forge KVS namespace;
- a single Whiteboard listing and installation lineage;
- no new Forge scopes solely for renovation.

The internal product identifier remains `tldraw` where `conf-app` needs a `PRODUCT_TYPE`. New code and neutral domain terminology use `whiteboard`. The public Marketplace name is decided at the SDK licensing gate in section 11.

## 2. Design principles

1. **Renovate before merging.** Skills, validation, release automation, data safety, build isolation, and the modern SDK are established in the standalone repository first.
2. **Parallel development, serial releases.** Independent workstreams may run concurrently, but data-safety, bundler, and SDK changes ship in separate releases.
3. **Atlassian Forge KVS continuity.** Forge KVS remains the system of record during this programme. A later move to Confluence custom content is a separate project.
4. **No blank overwrite.** A missing document, a failed read, and an invalid document are distinct states. None may silently become an editable empty board.
5. **Preserve identity before improving semantics.** The first waves do not change app ID, macro key, legacy key derivation, scopes, or existing KVS values.
6. **UI evidence for UI claims.** A Whiteboard UI assertion passes only with browser-visible or network-intercept evidence, not only a unit test.
7. **Adapt rather than copy.** `conf-app` practices are ported only when they apply to this single Forge app. Cloudflare, D1, paywall, and unrelated product-variant machinery are excluded.

## 3. Current-state evidence

The current main branch has these relevant properties:

- `manifest.yml` declares the `whiteboard` macro, the `main` resource at `static/spa/build`, `storage:app`, and the existing Forge app ID.
- `src/index.js` derives the KVS key from the last segment of Forge `context.localId`.
- The active editor recognizes a raw tldraw v1 document or an object containing `compressedJson`; obsolete resolver operations may also have left unsupported array values.
- A failed KVS read is currently converted to `[]`, so missing, failed reads, and array residue from obsolete resolver operations are not safely distinguished.
- `static/spa/src/AppFactory.js` mounts a default document before the read has been proven successful, does not await saves, mutates document objects in place, clears `assets`, and logs document payloads.
- The frontend uses React 18, Create React App 5, and `@tldraw/tldraw` 1.26.2.
- The repository has separate npm lockfiles, no committed CI workflows, no E2E suite, and no project skills.
- Deployment is exposed only through local Forge CLI scripts; the production install command currently names a staging site and must not be used as release automation.
- The `atlassian-migration` helper references an undefined variable and is not a usable migration path.
- The README still describes a Jira todo example and is not an accurate operating guide.

These observations define the renovation baseline. Unmerged branches are not treated as production data contracts.

## 4. Gap disposition

| Capability from `conf-app` | Target state | Decision |
|---|---:|---|
| Project guidance (`AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`) | Absent | Adapt a Whiteboard-specific subset |
| Deterministic Node/pnpm toolchain | Absent | Port the conventions and use one workspace lockfile |
| Root validation contract | Absent | Add secretless/offline lint, unit, build, pinned manifest validation, E2E-list, and validate commands; keep official Forge lint in authenticated deployment preflight |
| PR CI | Absent | Add a single authoritative build/test check |
| Automatic staging deployment | Absent | Add after PR validation is reproducible |
| Draft and production release flow | Absent | Adapt for one Forge app and tag-pinned builds |
| Branch/PR/release skills | Absent | Adapt only the applicable skills |
| Playwright E2E and UI evidence | Absent | Add a minimal Whiteboard journey and failure coverage |
| Release/version observability | Absent | Add build metadata and Whiteboard analytics |
| Cloudflare Pages, Workers, D1, paywall, multi-app release loops | Not applicable | Skip |
| Custom-content persistence | Not used | Defer to a separate post-merge design |

## 5. Target architecture

### 5.1 Repository and build boundary

The repository becomes a pnpm workspace with a single frozen lockfile. The existing Forge backend and Whiteboard frontend remain independently buildable:

- the Forge resolver owns context validation and KVS access;
- a pure TypeScript document package owns key derivation, legacy decoding, validation, migration, and modern snapshot encoding;
- the Whiteboard frontend owns editor lifecycle, UI state, resize behavior, and user-visible errors;
- E2E tests interact only through published UI and resolver/network boundaries.

The Whiteboard frontend becomes an isolated React 18 Vite build and continues producing the resource path expected by the standalone manifest. When merged into `conf-app`, it remains a dedicated workspace and Forge static resource. It does not import React components from `conf-app/src`, and `conf-app` does not import Whiteboard React components. Only framework-neutral TypeScript modules may cross that boundary.

This lets the Whiteboard use a modern SDK without first upgrading the rest of `conf-app` from React 17.

### 5.2 Forge identity boundary

Renovation releases use the current app ID, macro key, KVS scope, and legacy key derivation. Normal deployment never runs `forge install`; installation is a separately named bootstrap operation for an approved test tenant.

After convergence, `conf-app` gains a fifth generated variant:

- `PRODUCT_TYPE=tldraw`;
- the existing Whiteboard app ID;
- the existing `whiteboard` macro key;
- a dedicated Whiteboard resource and build command;
- release routing for that single Marketplace identity.

The retained identity is an invariant, not a migration option.

## 6. Persistence and migration design

### 6.1 Legacy contract

The legacy key is the final segment of `context.localId`. Phase 1 and Phase 2 preserve that mapping for valid IDs exactly while adding tests around it. Missing, non-string, empty-segment, and trailing-slash IDs fail explicitly and never access an empty KVS key. Page-copy and macro-copy isolation semantics are established from real Forge context evidence before any new key scheme is considered.

The decoder returns a typed result rather than a document-or-empty-array value:

- `missing` — no stored value exists;
- `legacy-raw` — a validated raw v1 document;
- `legacy-compressed` — a successfully decompressed and validated v1 document;
- `modern` — a validated modern snapshot;
- `unsupported` — a recognized residue or document feature that this app cannot preserve safely;
- `invalid` — storage returned an unsupported or corrupt value;
- `read-error` — Forge KVS could not be read.

Only `missing` may lead to a new empty board. `unsupported`, `invalid`, and `read-error` render a non-editable error/retry state and cause zero writes.

Legacy array values are `unsupported`; objects that match neither recognized wire contract are `invalid`. They are not treated as missing and are never overwritten implicitly.

Non-empty legacy asset records are `unsupported` in this programme. Their original KVS value remains untouched, the editable canvas does not mount, and the UI explains that the board cannot yet be edited safely. Supporting or adding assets requires a separate persistence design.

### 6.2 Write discipline

The editor lifecycle is `loading -> ready | error`. Persistence is disabled until `ready`, and an initial render is never considered a user edit.

Writes must:

- occur only after an explicit editor or resize change;
- be awaited and ordered so an older request cannot overwrite a newer state;
- validate the encoded value before calling KVS;
- leave the last confirmed document in memory when a save fails;
- show a retryable, user-visible failure without clearing the canvas;
- avoid logging document bodies, compressed payloads, raw Forge context, or raw error messages.

### 6.3 Modern document slot

The modern SDK does not overwrite the legacy value. A deterministic, version-prefixed key derived from the legacy key stores the modern snapshot. The exact key serialization is encapsulated by one function and tested against Forge KVS key constraints.

Read order is:

1. read and validate the modern slot;
2. read the legacy slot only when the modern slot is confirmed `missing`;
3. convert a supported legacy document in memory;
4. write the modern slot only after an explicit user edit and successful modern encoding.

An invalid modern value or modern-slot read error fails closed and never falls back to possibly stale legacy data. Loading alone never migrates storage. Unsupported shapes, bindings, pages, assets, camera state, or viewport state stop migration rather than being silently dropped.

The legacy slot preserves the pre-upgrade source document, but it does not preserve edits made later with the modern SDK. Therefore production activation of modern writes is forward-only. Emergency releases must retain the modern decoder and storage slot; reverting to the old v1 binary after customer edits is prohibited. Test-only canaries may remain read-only until this emergency path has been exercised.

## 7. Parallel workstreams and integration gates

A short serial contract freeze precedes all work. It fixes:

- `pnpm@10.34.5`, Node `>=22`, Node `22.22.3` for local install/build/test and authoritative CI artifacts, and the existing Forge `nodejs22.x` runtime;
- secretless/offline root commands `pnpm lint`, `pnpm test:unit`,
  `pnpm build:whiteboard`, `pnpm validate:manifest`, `pnpm test:e2e:list`, and
  `pnpm validate`, plus the separately authenticated `pnpm forge:lint` command;
- deploy commands `pnpm forge:deploy:tldraw:staging` and `pnpm forge:deploy:tldraw:production`;
- frontend build output;
- CI check name;
- staging and production GitHub environment names;
- release tag format `vYYYY.MM.DDHHMM-tldraw`;
- version/SHA injection interface.

After that freeze, four streams run concurrently:

| Stream | Exclusive ownership | Output |
|---|---|---|
| A. Delivery pipeline | package manifests/lockfile, `.github/**`, `.claude/skills/**` with explicit sub-ownership | deterministic validation, PR CI, staging, draft, production, adapted skills |
| B. Data safety | document codec, KVS adapter, storage unit/integration tests, E2E fixtures | proven legacy reads, ordered writes, no-blank-overwrite behavior |
| C. SDK readiness | isolated frontend build, license/trademark review, converter spike | React boundary and evidence that supported legacy data converts without semantic loss |
| D. Observability and privacy | analytics catalog/types, build metadata, logging policy | lifecycle telemetry without user content and visible release identity |

Within Stream A, one owner alone changes package manifests and lockfiles. Workflow owners consume the frozen root commands; skills owners do not edit workflows. This prevents package and CI conflicts disguised as parallel work.

The serial integration path is:

```text
contract freeze
    -> deterministic validation and legacy fixtures
    -> current CRA behavioral E2E baseline
    -> KVS safety release
    -> CRA-to-Vite equivalence release
    -> Forge platform dependency release
    -> modern SDK staging candidate
    -> staging read/write canary
    -> explicit production-promotion approval
    -> modern SDK production release and PVT
    -> conf-app fifth-variant merge
```

Vite and the SDK major are never introduced in the same release.

## 8. Work packages

### WP1 — Operational convergence

WP1 changes process and tooling without changing runtime behavior, storage schema, Forge identity, or SDK version.

The package-manager conversion preserves currently resolved product and runtime
dependency versions except for the user's 2026-08-31 Option A decision. In one
shared lockfile, only these `static/spa` build-graph differences are approved:

- `jest-worker > @types/node`: 18.11.9 to 22.13.9;
- `randombytes > safe-buffer`: 5.1.2 to 5.2.1;
- `@types/node@22.13.9` adds `undici-types@6.20.0`.

Any minimal tooling-only peer-dependency correction is isolated and documented.
The three approved convergence entries do not authorize another product/runtime
version or edge drift, and general dependency renovation is not bundled into WP1.

Deliverables:

- Node/pnpm/workspace contract and one lockfile;
- local Forge CLI dependency and non-interactive root commands;
- lint, unit-test, build, pinned local manifest validation, E2E-list, and a
  secretless/offline `validate` script;
- a separate official Forge-lint command that runs only with credentials locally or
  immediately before deploy in the protected staging/production jobs;
- PR CI with concurrency cancellation for superseded branch runs;
- main-branch staging deployment;
- SHA-pinned draft release and release-event production deployment;
- project guidance and an accurate README;
- adapted skills: `validate-branch`, the submit/ready/babysit/land/ship set, `forge-tunnel`, and `spot-check`;
- a recorded table of ported, validated, deferred, and skipped items.

`release-app`, Whiteboard smoke/PVT, `check-version`, and `health-check` land only after their required staging fixture, build metadata, and analytics signals exist.

### WP2 — Data safety and behavioral baseline

WP2 adds the typed codec, storage state machine, ordered saves, privacy-safe logging, purpose-built synthetic golden fixtures, unit tests, and the first Forge E2E journey while retaining CRA and tldraw v1. Customer-derived fixtures remain in approved private storage and require a separate privacy review even when they appear de-identified.

Fixtures cover raw v1, compressed v1, missing, KVS read error, corrupt Base64/JSON, unsupported arrays/objects, invalid `localId`, and non-empty-assets documents. Semantic fingerprints compare page, shape, binding, text, geometry, camera, viewport, and asset behavior rather than raw JSON strings.

### WP3 — Build isolation

WP3 migrates CRA to Vite and establishes the portable React 18 workspace/resource boundary. It retains the v1 SDK and both KVS contracts. The same WP2 E2E suite must pass in a real Forge iframe, including JS/CSS/font loading and bridge invocation.

### WP4 — Forge platform dependency convergence

WP4 upgrades `@forge/api`, `@forge/resolver`, and `@forge/bridge` toward the versions proven by `conf-app`, and replaces legacy `@forge/ui` macro configuration with a supported Custom UI configuration resource using `view.submit({ config })`. The reference baseline observed on 2026-08-31 is `@forge/api` 6.x, `@forge/resolver` 1.6.x, and `@forge/bridge` 5.16.x; the WP4 child design records exact tested versions. It preserves the required title field, macro identity, scopes, key derivation, and stored values. This is a separate release from Vite and from the editor SDK.

### WP5 — Modern tldraw SDK upgrade

WP5 pins one tested modern SDK version, implements and validates legacy-to-modern conversion, introduces the modern KVS slot, and ships the upgrade through staging canary and production PVT.

The SDK package is pinned exactly. Automated dependency tooling may open SDK update PRs but never auto-merge them because tldraw's release policy does not promise traditional semantic-versioning compatibility.

### WP6 — conf-app merge

WP6 imports the already-modern, already-proven Whiteboard workspace, document package, tests, manifest variant, skills, and release routing into `conf-app`. It does not redesign persistence or combine the Whiteboard React runtime with the existing application runtime.

A later custom-content migration is explicitly outside WP6.

## 9. CI, release, and skills design

The authoritative PR check performs a frozen install followed by the
secretless/offline `pnpm validate` contract: resolution guard, lint, unit tests,
build, resource-output validation, pinned local manifest validation, and E2E
collection. The local manifest validator uses the repository-pinned internal
`@forge/manifest` package; it is a deterministic structural validator, not the
complete official Forge CLI lint or a substitute for platform validation. Pull
requests receive no Forge credentials.

Official `pnpm forge:lint` requires Forge authentication. It may be run locally when
the credentials are already available, and is mandatory immediately before Forge
deploy in protected staging and production jobs. Browser E2E runs against a
controlled staging fixture rather than every untrusted pull request. Any runtime PR
that makes a UI claim must obtain trusted staging E2E evidence or a tunnel spot-check
before merge; test collection alone is not UI evidence.

Main-branch delivery is:

1. rebuild and run secretless/offline validation on the exact commit;
2. run authenticated official Forge lint in the protected staging job;
3. deploy the existing app to staging;
4. run a UI-evidenced Whiteboard smoke test;
5. create a SHA-pinned draft release only after success.

Publishing that release checks out the tag, rebuilds it, deploys production, and runs Whiteboard PVT. Production deployment uses a protected GitHub environment. It does not install or upgrade tenant installations as a normal step.

Staging and production PVT require explicitly configured, approved test fixtures. The current install scripts do not prove the identity of a production validation tenant, so no tenant is inferred from them.

Skills are rewritten for this repository rather than symlinked or copied verbatim. Conf-app-only assumptions about product variants, Cloudflare, D1, paywalls, or ZenUML-specific macros are removed.

## 10. Analytics and privacy

The WP2 load/save/error experience and the WP5 SDK migration are user-impacting features. Their complete analytics event definitions and typed properties land as the first implementation commit of the relevant feature branch, before runtime code:

For every later work package that changes user-visible behavior, the analytics catalog and typed properties are the first implementation commit for that work package.

Every event includes the applicable common properties: `feature_area=whiteboard`, `surface=confluence_macro`, `macro_type=whiteboard`, `release_version`, `sdk_version`, `environment`, and `outcome`. Failure events use a stable error code rather than raw exception text.

| Event | Trigger | Core properties |
|---|---|---|
| `whiteboard_load_requested` | a macro begins storage loading | release, SDK version, schema target |
| `whiteboard_load_succeeded` | a document is validated and ready | source format, duration bucket, size bucket |
| `whiteboard_load_failed` | read, decode, validation, or migration fails | phase, stable error code, source format |
| `whiteboard_save_requested` | an explicit user change is queued | release, SDK version, target schema |
| `whiteboard_save_succeeded` | the latest queued state is confirmed stored | duration bucket, size bucket |
| `whiteboard_save_failed` | storage rejects a write | stable error code, retryable flag |
| `whiteboard_migration_started` | a supported legacy document is converted in memory | schema from/to |
| `whiteboard_migration_succeeded` | conversion and semantic validation succeed | schema from/to, duration bucket |
| `whiteboard_migration_failed` | conversion or semantic validation fails | schema from/to, stable error code |
| `whiteboard_render_failed` | the editor cannot render a validated snapshot | SDK version, stable error code |
| `whiteboard_resize_succeeded` / `whiteboard_resize_failed` | viewport persistence resolves | size bucket, outcome |

No event or log contains board text, shape properties, compressed data, `localId`, tenant identifiers, complete Forge context, or raw exception text. Public repository fixtures are purpose-built synthetic data only.

## 11. Licensing and branding gates

Branding and SDK licensing are independent gates.

Before the next production release from any work package, the current manifest and Marketplace-facing `Tldraw` name must either be replaced with an approved neutral name such as “Whiteboard for Confluence,” or covered by written trademark permission. Internal repository and product identifiers may remain `tldraw`. Any Marketplace listing edit remains an explicit production-promotion action.

Modern tldraw production use requires an applicable license key. The recommended path is a commercial license injected at build time through a protected environment. The license key is never committed. Before any modern-SDK build is deployed to a non-local Forge environment, the selected commercial or trial key must permit that environment and be validated in the real Forge iframe host context, including any CSP or egress behavior.

Work on WP1 through WP4 and a local-only converter spike may proceed in parallel with the SDK license decision. WP5 cannot deploy to staging without a valid non-local key and cannot deploy to production without the approved production license. If the commercial-license path is not approved, the project pauses after WP4 with the v1 SDK; operational, data-safety, build, and Forge-platform renovations remain useful and releasable.

References:

- [tldraw SDK installation](https://tldraw.dev/installation)
- [tldraw SDK licensing](https://tldraw.dev/community/license)
- [tldraw trademarks](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md)
- [tldraw persistence](https://tldraw.dev/sdk-features/persistence)
- [tldraw release policy](https://github.com/tldraw/tldraw/blob/main/RELEASES.md)

## 12. Verification gates

### WP1 exit

- clean frozen install succeeds;
- all secretless/offline root validation commands work locally;
- the pinned internal `@forge/manifest` validator passes while remaining explicitly
  classified as narrower than official Forge CLI lint;
- protected staging and production deploy jobs run authenticated official Forge lint
  immediately before deploy, without exposing Forge credentials to pull requests;
- workflows parse and reference existing commands;
- each ported skill passes its first locally scoped, non-deploying preflight;
- Playwright collects the intended tests;
- no runtime, identity, scope, or KVS-format change is present.

### WP2 exit

- all legacy fixtures decode or fail closed as specified;
- loading, unsupported, invalid, and read-error paths perform zero writes;
- only explicit changes write;
- concurrent edits preserve the newest state;
- save failure is visible and retryable;
- existing non-empty raw and compressed boards with empty asset maps load, edit, save, and reload in Forge UI;
- a non-empty-assets fixture shows the non-editable unsupported state and performs zero writes;
- failure tests include screenshot or network/resolver evidence;
- logs and analytics contain no board content or context identifiers.

### WP3 exit

- WP2's full suite passes unchanged on Vite;
- output still matches the manifest resource contract;
- app ID, macro key, scopes, legacy key function, and values are unchanged;
- static JS/CSS/font asset URLs and Forge bridge calls work in the real nested iframe.

### WP4 exit

- the current macro configuration behavior is reproduced through supported Custom UI APIs;
- `@forge/api`, `@forge/resolver`, and `@forge/bridge` match the approved target versions;
- `@forge/ui` is absent;
- WP3's storage and UI suite passes unchanged;
- the release changes no Forge identity, scope, key, or stored value.

### WP5 exit

- every supported legacy fixture converts with the same semantic fingerprint;
- unsupported data fails closed without writing;
- the environment-appropriate license and public naming gates are closed;
- modern-slot read/write, rapid edits, resize, reload, copy behavior, quota failure, and storage failure pass staging tests;
- the modern-compatible emergency release path has been exercised;
- the user has explicitly approved promotion of the forward-only modern write path;
- production PVT observes the UI and confirms persistence after reload.

### WP6 entry — “sufficiently close”

The standalone repository is ready to merge only when:

- its toolchain, validation commands, CI, release lifecycle, and core agent skills follow `conf-app` conventions;
- the dedicated Whiteboard React resource is portable without coupling to `conf-app` React components;
- the modern SDK is licensed, pinned, and stable under the existing app identity;
- legacy documents remain readable and protected by tested failure behavior;
- lifecycle analytics and privacy-safe diagnostics exist;
- staging and production PVT are repeatable;
- all intentionally skipped `conf-app` facilities are recorded with reasons.

### WP6 exit

- `PRODUCT_TYPE=tldraw` builds and validates inside `conf-app`;
- the generated manifest retains the existing app ID, macro key, scope, and dedicated resource;
- the staging variant reads the existing legacy and modern KVS fixtures;
- the imported unit, integration, E2E, release, and skill dry-run checks pass from `conf-app`;
- no Whiteboard code path depends on the existing React 17 application bundle.

## 13. Explicit non-goals

This programme does not:

- migrate document bodies from Forge KVS to D1, Cloudflare, or custom content;
- alter customer installation identity or create a replacement Marketplace listing;
- copy `conf-app`'s Cloudflare, paywall, AsyncAPI, or multi-variant runtime code into the standalone app;
- upgrade all of `conf-app` to React 18 or 19;
- add or edit image/file assets, or make non-empty legacy asset records editable, without a separately designed persistence model;
- silently adopt the unmerged cross-page storage branch as a production contract;
- combine the Vite and modern-SDK production changes into one release.

## 14. Delivery decomposition

This document is a programme roadmap, not one implementation plan. After the user approves it, only WP1 receives an implementation plan. WP2 through WP6 each require a focused child design, user review, and implementation plan before their runtime code begins.

After the shared contract freeze, branch development may proceed in parallel: WP1 implementation, read-only WP2 fixture inventory, and local-only WP5 licensing/converter research. Integration, staging promotion, and production release remain serial in WP1-to-WP6 order. No later work package may enter production before the preceding verification gate closes.

Before WP2 or WP5 coding, their child designs freeze the supported v1 versions and shape/binding/page types, semantic-fingerprint fields and geometry tolerances, camera/viewport rules, copy isolation semantics observed from real Forge context, and the exact modern key and snapshot schema. These are deliberately evidence-driven child-design inputs, not implementation-time choices.

The root integrator owns the shared contracts and final integration. Parallel workers receive exclusive file/module ownership and must not modify another stream's package manifests, lockfiles, or workflow files.
