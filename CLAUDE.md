# Confluence Whiteboard agent guidance

## Project orientation

This repository is the standalone ZenUML Whiteboard Forge app for Confluence Cloud.
The internal build identifier is `tldraw`; product and domain prose should use
**Whiteboard** unless it refers to the SDK package or existing repository identity.

The approved programme renovates this app under its existing Forge identity and then
merges it into `ZenUml/conf-app` as an isolated fifth product variant. Read the
[programme design](docs/superpowers/specs/2026-08-31-tldraw-confluence-renovation-design.md)
before planning cross-work-package changes.

## Hard rules

### Preserve installation and storage identity

- Keep Forge app ID `368b610d-bac1-4e2a-9311-6ec0adca5e49`.
- Keep macro key `whiteboard` and the `storage:app` scope.
- Keep the legacy KVS key derived from the final segment of `context.localId` until a
  later migration has its own approved design and evidence.
- Forge KVS is the Whiteboard-body system of record during this programme. Do not
  introduce D1, Cloudflare, or custom-content body storage.
- Do not register a replacement app or create a second listing lineage.

See [persistence safety](docs/policies/persistence-safety.md).

### Pure Forge

This app is Forge-only. Do not add Connect runtime code, `AP.*`, Connect hosts, or
Connect environment detection. Unlike `conf-app`, this app has no Forge-from-Connect
manifest exception to copy. Use Forge APIs and `@forge/bridge` at their documented
boundaries. See [the Forge-only policy](docs/policies/forge-only.md).

### UI evidence is mandatory for UI claims

A visible Whiteboard assertion passes only after observing the UI through a
screenshot/snapshot or a relevant resolver/network intercept. Unit tests, a build,
and `playwright test --list` are not UI evidence. If an approved fixture or browser
path is unavailable, report `SKIPPED` or `BLOCKED` with the reason.

Forge Custom UI runs in a cross-origin iframe. Use the adapted `spot-check` or
`forge-tunnel` skill once it has been locally validated. Do not invent a saved browser
profile, tenant, page, selector, or authentication command.

### Client privacy

Never place a real tenant hostname or prefix, customer page title or ID, cloud ID,
credential, authenticated browser state, board body, or identifying screenshot in a
public file. Use placeholders and synthetic fixtures. See
[client privacy](docs/policies/client-privacy.md).

New or modified runtime code must not log full Forge context, document bodies, shape
text or properties, raw JSON, compressed payloads, or raw exception messages. The
existing payload logging is known WP2 remediation; do not copy or expand it.

### Plan analytics before product behavior

Before implementing a user-visible feature, define event names, triggers, and typed
properties. Events use stable outcome/error codes and must never contain customer or
board content. WP1 changes process and tooling only and therefore adds no product
analytics.

### Protect other sessions and `main`

Never commit feature work directly to `main`. If the current checkout has changes you
did not make, do not checkout, reset, restore, clean, or stash them. Create a separate
worktree from `main`. Follow [the git workflow](docs/policies/git-workflow.md).

## WP1 scope boundary

WP1 establishes operational convergence only. It must not change:

- `manifest.yml`;
- `src/**`;
- `static/spa/src/**` or `static/spa/public/**`;
- `atlassian-migration/index.js`;
- runtime dependencies, Forge identity, permissions, storage behavior, or document
  formats.

The user selected the single-lock Option A on 2026-08-31. Its only dependency-graph
exceptions are within the `static/spa` build graph:

- `jest-worker > @types/node`: 18.11.9 to 22.13.9;
- `randombytes > safe-buffer`: 5.1.2 to 5.2.1;
- `@types/node@22.13.9` adds `undici-types@6.20.0`.

Do not treat this decision as permission for another product/runtime resolution
change.

WP1 unit tests validate repository contracts. Its Playwright workspace collects one
sentinel named `WP1 harness collection sentinel — no product behavior coverage` and
contains zero product UI assertions. WP2 owns the typed persistence lifecycle,
synthetic fixtures, real browser journeys, and UI evidence.

## Architecture and layout

- `manifest.yml` defines the existing `whiteboard` macro, static resource, Forge
  functions, permissions, app identity, and runtime.
- `src/index.js` contains the Forge resolver, macro configuration, and current KVS
  access.
- `static/spa/` is the current React 18 / Create React App 5 / tldraw v1 frontend.
- `tests/e2e-tests/` is collection-only in WP1.
- `docs/superpowers/` contains the approved programme design and implementation plans.
- `docs/policies/` contains stable safety rules.

Vite, a modern tldraw snapshot, a modern KVS slot, and `PRODUCT_TYPE=tldraw` are
planned later states. Do not describe them as current implementation.

## Toolchain and commands

Use Node `22.22.3` and pnpm `10.34.5`, from the repository root.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test:unit
pnpm build:whiteboard
pnpm validate:resource-output
pnpm validate:manifest
pnpm test:e2e:list
pnpm validate
```

`pnpm validate` is the secretless/offline local and PR contract. It includes
`pnpm validate:manifest`, which uses the repository-pinned internal
`@forge/manifest` implementation for deterministic structural checks. That command
is intentionally narrower than the official Forge CLI lint and must not be described
as complete platform validation.

Run official `pnpm forge:lint` separately only on a local machine with existing Forge
credentials or in a protected staging/production deploy job. Those jobs run it
immediately before deploy. Never expose Forge credentials to a pull-request job.

`pnpm test:e2e:list` only checks offline collection. It does not install or launch a
browser, authenticate to Confluence, or prove product behavior.

## Git, CI, and release operation

- Use a feature branch and pull request for every change.
- Run `pnpm validate` before submission.
- The authoritative PR check is `Build and Unit Test`.
- Every branch push and pull request runs that check; push/PR events for the same
  branch share one concurrency key. Only a successful `main` push can call staging.
- The PR check is secretless and receives no Forge credentials. Protected staging
  and production jobs own authenticated official Forge lint immediately before
  deploy.
- Normal deployment never installs or upgrades an app installation. Bootstrap and
  upgrade commands require a separately approved test tenant.
- Never infer a tenant from old scripts or documentation.
- Production promotion is disabled during WP1 and remains a separate authorized
  action after branding, fixture, PVT, and approval gates close.
- Keep lifecycle skills aligned with `conf-app`:
  `validate-branch` → `submit-branch` → `ready-pr` → `babysit-pr` → `land-pr` →
  `release-app` → `pvt` → release-delta `spot-check`. Remove product-matrix
  assumptions, but preserve every authorization and verification boundary.
- Always label a PR reference with its purpose, never only a bare number.

Project skills live under `.claude/skills/`. Treat a skill as available only after its
first locally scoped, non-deploying preflight has been recorded; otherwise label it structural or
deferred.

## Domain language

Use [CONTEXT.md](CONTEXT.md) for stable vocabulary. Do not call a KVS value custom
content, a collection sentinel product E2E, or the seeded v1 document a verified
empty board.
